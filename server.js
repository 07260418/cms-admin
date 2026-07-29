const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { db, init } = require('./db');

init();

const SITE_DIR = process.env.SITE_DIR || path.join(__dirname, 'site');
const UPLOAD_DIR = path.join(SITE_DIR, 'images');
const BACKUP_DIR = path.join(UPLOAD_DIR, '_backup');
fs.mkdirSync(BACKUP_DIR, { recursive: true });

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'cms-admin-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 }
}));

app.use('/admin/static', function(req, res, next) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
}, express.static(path.join(__dirname, 'public')));
app.use('/', express.static(SITE_DIR));

function auth(req, res, next) {
  if (req.session && req.session.user) return next();
  res.status(401).json({ error: '未登录' });
}

// ===================== 登录/登出 =====================
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.status(401).json({ error: '账号或密码错误' });
  }
  req.session.user = { id: user.id, username: user.username };
  res.json({ ok: true, user: req.session.user });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/me', (req, res) => {
  res.json({ user: req.session.user || null });
});

// ===================== 内容项（文字/图片/Banner） =====================
app.get('/api/content', (req, res) => {
  const { page, batch } = req.query;
  if (batch) {
    const pages = batch.split(',').filter(Boolean);
    if (pages.length === 1) {
      return res.json(db.prepare('SELECT * FROM content WHERE page = ? ORDER BY id').all(pages[0]));
    }
    const placeholders = pages.map(() => '?').join(',');
    return res.json(db.prepare(`SELECT * FROM content WHERE page IN (${placeholders}) ORDER BY page, id`).all(...pages));
  }
  const rows = page
    ? db.prepare('SELECT * FROM content WHERE page = ? ORDER BY id').all(page)
    : db.prepare('SELECT * FROM content ORDER BY page, id').all();
  res.json(rows);
});

app.get('/api/pages', (req, res) => {
  const rows = db.prepare('SELECT page, section, COUNT(*) c FROM content GROUP BY page, section ORDER BY page, section').all();
  res.json(rows);
});

app.put('/api/content/:id', auth, (req, res) => {
  const { value } = req.body || {};
  const item = db.prepare('SELECT * FROM content WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: '内容项不存在' });
  db.prepare('INSERT INTO backups (content_id, old_value, operator) VALUES (?, ?, ?)')
    .run(item.id, item.value, req.session.user.username);
  db.prepare("UPDATE content SET value = ?, updated_at = datetime('now','localtime') WHERE id = ?")
    .run(value, item.id);
  db.prepare('INSERT INTO op_logs (operator, action, detail) VALUES (?, ?, ?)')
    .run(req.session.user.username, 'update_text', `key=${item.key}`);
  res.json({ ok: true, item: db.prepare('SELECT * FROM content WHERE id = ?').get(item.id) });
});

// 图片上传替换（content 表）
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const item = db.prepare('SELECT * FROM content WHERE id = ?').get(req.params.id);
      const base = item ? path.basename(item.value) : file.originalname;
      cb(null, base);
    }
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(png|jpe?g|gif|webp|svg\+xml)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('仅支持图片文件'));
  }
});

app.post('/api/upload/:id', auth, upload.single('file'), (req, res) => {
  const item = db.prepare('SELECT * FROM content WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: '内容项不存在' });
  if (!req.file) return res.status(400).json({ error: '未收到文件' });

  const relPath = 'images/' + req.file.filename;
  const absPath = path.join(SITE_DIR, relPath);

  const oldAbs = path.join(SITE_DIR, item.value.split('?v=')[0]);
  if (fs.existsSync(oldAbs) && oldAbs !== absPath) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `${path.basename(item.value, path.extname(item.value))}_${ts}${path.extname(item.value)}`;
    fs.copyFileSync(oldAbs, path.join(BACKUP_DIR, backupName));
  }

  db.prepare('INSERT INTO backups (content_id, old_value, operator) VALUES (?, ?, ?)')
    .run(item.id, item.value, req.session.user.username);
  db.prepare('INSERT INTO assets (content_id, filename, stored_path) VALUES (?, ?, ?)')
    .run(item.id, req.file.filename, relPath);

  const versioned = relPath + '?v=' + Date.now();
  db.prepare("UPDATE content SET value = ?, updated_at = datetime('now','localtime') WHERE id = ?")
    .run(versioned, item.id);
  db.prepare('INSERT INTO op_logs (operator, action, detail) VALUES (?, ?, ?)')
    .run(req.session.user.username, 'upload_image', `key=${item.key}, file=${req.file.filename}`);

  res.json({ ok: true, item: db.prepare('SELECT * FROM content WHERE id = ?').get(item.id) });
});

app.get('/api/backups/:id', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM backups WHERE content_id = ? ORDER BY id DESC LIMIT 10').all(req.params.id);
  res.json(rows);
});

app.post('/api/rollback/:backupId', auth, (req, res) => {
  const backup = db.prepare('SELECT * FROM backups WHERE id = ?').get(req.params.backupId);
  if (!backup) return res.status(404).json({ error: '备份不存在' });
  const item = db.prepare('SELECT * FROM content WHERE id = ?').get(backup.content_id);
  if (!item) return res.status(404).json({ error: '内容项不存在' });
  db.prepare('INSERT INTO backups (content_id, old_value, operator) VALUES (?, ?, ?)')
    .run(item.id, item.value, req.session.user.username);
  db.prepare("UPDATE content SET value = ?, updated_at = datetime('now','localtime') WHERE id = ?")
    .run(backup.old_value, item.id);
  res.json({ ok: true, item: db.prepare('SELECT * FROM content WHERE id = ?').get(item.id) });
});

// ===================== 列表项 CRUD（新闻/产品/会展） =====================

// 查询列表项
app.get('/api/list-items', (req, res) => {
  const { type, category } = req.query;
  let sql = 'SELECT * FROM list_items WHERE 1=1';
  const params = [];
  if (type) { sql += ' AND list_type = ?'; params.push(type); }
  if (category) { sql += ' AND category = ?'; params.push(category); }
  sql += ' ORDER BY sort_order, id';
  res.json(db.prepare(sql).all(...params));
});

// 新增列表项
app.post('/api/list-items', auth, (req, res) => {
  const { list_type, title, summary, date, category, image, link, sort_order, country, content } = req.body || {};
  if (!list_type || !title) return res.status(400).json({ error: 'list_type 和 title 必填' });
  const info = db.prepare(`
    INSERT INTO list_items (list_type, title, summary, date, category, image, link, sort_order, visible, country, content)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(list_type, title, summary || '', date || '', category || '', image || '', link || '', sort_order || 0, country || '');
  db.prepare('INSERT INTO op_logs (operator, action, detail) VALUES (?, ?, ?)')
    .run(req.session.user.username, 'create_item', `type=${list_type}, title=${title}`);
  res.json({ ok: true, item: db.prepare('SELECT * FROM list_items WHERE id = ?').get(info.lastInsertRowid) });
});

// 修改列表项
app.put('/api/list-items/:id', auth, (req, res) => {
  const item = db.prepare('SELECT * FROM list_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: '列表项不存在' });
  const { title, summary, date, category, link, sort_order, visible, country, content } = req.body || {};
  // 备份快照
  db.prepare('INSERT INTO item_backups (item_id, snapshot, operator) VALUES (?, ?, ?)')
    .run(item.id, JSON.stringify(item), req.session.user.username);
  db.prepare(`
    UPDATE list_items SET
      title = ?, summary = ?, date = ?, category = ?, link = ?, sort_order = ?, visible = ?, country = ?, content = ?,
      updated_at = datetime('now','localtime')
    WHERE id = ?
  `).run(
    title !== undefined ? title : item.title,
    summary !== undefined ? summary : item.summary,
    date !== undefined ? date : item.date,
    category !== undefined ? category : item.category,
    link !== undefined ? link : item.link,
    sort_order !== undefined ? sort_order : item.sort_order,
    visible !== undefined ? visible : item.visible,
    country !== undefined ? country : item.country,
    content !== undefined ? content : item.content,
    req.params.id
  );
  db.prepare('INSERT INTO op_logs (operator, action, detail) VALUES (?, ?, ?)')
    .run(req.session.user.username, 'update_item', `id=${req.params.id}, title=${title || item.title}`);
  res.json({ ok: true, item: db.prepare('SELECT * FROM list_items WHERE id = ?').get(req.params.id) });
});


// ===================== 产品导入导出 (CSV) =====================
// 导出 CSV
app.get('/api/list-items/export', auth, (req, res) => {
  const type = req.query.type || '';
  const items = type
    ? db.prepare('SELECT * FROM list_items WHERE list_type = ? ORDER BY sort_order, id').all(type)
    : db.prepare('SELECT * FROM list_items ORDER BY list_type, sort_order, id').all();
  const headers = ['id','list_type','title','summary','date','category','image','link','sort_order','visible','created_at','updated_at'];
  const escCsv = v => {
    const s = String(v || '');
    return (s.includes(',') || s.includes('"') || s.includes('\n')) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const rows = items.map(item => headers.map(h => escCsv(item[h])).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="' + (type || 'all') + '_items.csv"');
  res.send('\uFEFF' + csv);
});

// CSV 导入
const csvStorage = multer.memoryStorage();
const csvImport = multer({ storage: csvStorage, limits: { fileSize: 5 * 1024 * 1024 } });
app.post('/api/list-items/import', auth, csvImport.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请上传 CSV 文件' });
  var csvText = req.file.buffer.toString('utf-8').replace(/^\uFEFF/, '');
  var csvLines = csvText.split('\n').filter(function(l) { return l.trim(); });
  if (csvLines.length < 2) return res.status(400).json({ error: 'CSV 文件为空' });
  var csvHeaders = csvLines[0].split(',').map(function(h) { return h.trim().replace(/^"|"$/g, ''); });

  function parseCSVLine(line) {
    var result = [], cur = '', q = false;
    for (var i = 0; i < line.length; i++) {
      var c = line[i];
      if (q) {
        if (c === '"') { if (i+1 < line.length && line[i+1] === '"') { cur += '"'; i++; } else { q = false; } }
        else { cur += c; }
      } else {
        if (c === '"') { q = true; }
        else if (c === ',') { result.push(cur); cur = ''; }
        else { cur += c; }
      }
    }
    result.push(cur);
    return result;
  }

  var insertStmt = db.prepare('INSERT INTO list_items (list_type, title, summary, date, category, image, link, sort_order, visible, country, content) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  var toInsert = [], csvErrors = [];
  for (var i = 1; i < csvLines.length; i++) {
    var vals = parseCSVLine(csvLines[i]);
    var row = {};
    csvHeaders.forEach(function(h, idx) { row[h] = (vals[idx] || '').trim(); });
    if (!row.title) { csvErrors.push('第' + (i+1) + '行：缺少标题'); continue; }
    if (!row.list_type) row.list_type = 'product';
    toInsert.push([row.list_type, row.title, row.summary||'', row.date||'', row.category||'', row.image||'', row.link||'', parseInt(row.sort_order)||0, row.visible !== undefined ? parseInt(row.visible) : 1, row.country||'', row.content||'']);
  }
  var insertMany = db.transaction(function(items) {
    for (var j = 0; j < items.length; j++) insertStmt.run.apply(insertStmt, items[j]);
  });
  if (toInsert.length) insertMany(toInsert);
  res.json({ ok: true, imported: toInsert.length, errors: csvErrors.length ? csvErrors : undefined });
});

// 删除列表项
app.delete('/api/list-items/:id', auth, (req, res) => {
  const item = db.prepare('SELECT * FROM list_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: '列表项不存在' });
  db.prepare('INSERT INTO item_backups (item_id, snapshot, operator) VALUES (?, ?, ?)')
    .run(item.id, JSON.stringify(item), req.session.user.username);
  db.prepare('DELETE FROM list_items WHERE id = ?').run(req.params.id);
  db.prepare('INSERT INTO op_logs (operator, action, detail) VALUES (?, ?, ?)')
    .run(req.session.user.username, 'delete_item', `id=${req.params.id}, title=${item.title}`);
  res.json({ ok: true });
});

// 列表项图片上传
const itemUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = 'cms_' + Date.now() + ext;
      cb(null, name);
    }
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(png|jpe?g|gif|webp|svg\+xml)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('仅支持图片文件'));
  }
});

// 内容图片上传（返回可直接嵌入的图片路径）
app.post('/api/upload-content-image', auth, itemUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '未收到文件' });
  const url = 'images/' + req.file.filename;
  res.json({ ok: true, url });
});

// 公开接口：按名称获取产品详情内容
app.get('/api/list-items/product-content', (req, res) => {
  const title = req.query.title;
  if (!title) return res.status(400).json({ error: '缺少 title 参数' });
  const item = db.prepare("SELECT content FROM list_items WHERE list_type = 'product' AND title = ?").get(title);
  if (!item) return res.json({ ok: true, content: '' });
  res.json({ ok: true, content: item.content || '' });
});

app.post('/api/list-items/:id/upload', auth, itemUpload.single('file'), (req, res) => {
  const item = db.prepare('SELECT * FROM list_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: '列表项不存在' });
  if (!req.file) return res.status(400).json({ error: '未收到文件' });
  const relPath = 'images/' + req.file.filename;
  // 备份旧图片引用
  db.prepare('INSERT INTO item_backups (item_id, snapshot, operator) VALUES (?, ?, ?)')
    .run(item.id, JSON.stringify(item), req.session.user.username);
  db.prepare('UPDATE list_items SET image = ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?')
    .run(relPath + '?v=' + Date.now(), req.params.id);
  db.prepare('INSERT INTO op_logs (operator, action, detail) VALUES (?, ?, ?)')
    .run(req.session.user.username, 'upload_item_image', `id=${req.params.id}, file=${req.file.filename}`);
  res.json({ ok: true, item: db.prepare('SELECT * FROM list_items WHERE id = ?').get(req.params.id) });
});

// 列表项历史
app.get('/api/list-items/:id/backups', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM item_backups WHERE item_id = ? ORDER BY id DESC LIMIT 10').all(req.params.id);
  res.json(rows);
});

// 列表项回滚
app.post('/api/list-items/:id/rollback/:backupId', auth, (req, res) => {
  const backup = db.prepare('SELECT * FROM item_backups WHERE id = ? AND item_id = ?').get(req.params.backupId, req.params.id);
  if (!backup) return res.status(404).json({ error: '备份不存在' });
  const item = db.prepare('SELECT * FROM list_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: '列表项不存在' });
  const snap = JSON.parse(backup.snapshot);
  db.prepare('INSERT INTO item_backups (item_id, snapshot, operator) VALUES (?, ?, ?)')
    .run(item.id, JSON.stringify(item), req.session.user.username);
  db.prepare(`
    UPDATE list_items SET
      title = ?, summary = ?, date = ?, category = ?, image = ?, link = ?, sort_order = ?, visible = ?,
      updated_at = datetime('now','localtime')
    WHERE id = ?
  `).run(snap.title, snap.summary, snap.date, snap.category, snap.image, snap.link, snap.sort_order, snap.visible, req.params.id);
  res.json({ ok: true, item: db.prepare('SELECT * FROM list_items WHERE id = ?').get(req.params.id) });
});

// 后台入口

// ===================== 分类管理 =====================
app.get('/api/categories', auth, (req, res) => {
  const type = req.query.type || '';
  let sql = 'SELECT * FROM categories WHERE 1=1';
  const params = [];
  if (type) { sql += ' AND type = ?'; params.push(type); }
  sql += ' ORDER BY sort_order, id';
  res.json(db.prepare(sql).all(...params));
});

app.post('/api/categories', auth, (req, res) => {
  const { type, value, label, sort_order } = req.body || {};
  if (!type || !value || !label) return res.status(400).json({ error: 'type, value, label 必填' });
  try {
    db.prepare('INSERT INTO categories (type, value, label, sort_order) VALUES (?, ?, ?, ?)').run(type, value, label, sort_order || 0);
    res.json({ ok: true });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: '该标识已存在' });
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/categories/:id', auth, (req, res) => {
  const { label, sort_order } = req.body || {};
  if (!label) return res.status(400).json({ error: 'label 必填' });
  db.prepare('UPDATE categories SET label = ?, sort_order = ? WHERE id = ?').run(label, sort_order || 0, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/categories/:id', auth, (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ===================== 系统设置 =====================
app.get('/api/settings', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM settings ORDER BY id').all());
});

app.put('/api/settings', auth, (req, res) => {
  const settings = req.body || {};
  const stmt = db.prepare('UPDATE settings SET value = ?, updated_at = datetime(\'now\',\'localtime\') WHERE key = ?');
  const tx = db.transaction(function(items) {
    for (const key in items) {
      stmt.run(String(items[key]), key);
    }
  });
  tx(settings);
  res.json({ ok: true });
});

// ===================== 用户/权限管理 =====================
app.get('/api/users', auth, (req, res) => {
  const users = db.prepare('SELECT id, username, role, created_at FROM users ORDER BY id').all();
  res.json(users);
});

app.post('/api/users', auth, (req, res) => {
  const { username, password, role } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: '用户名和密码必填' });
  const hash = require('bcryptjs').hashSync(password, 10);
  try {
    db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(username, hash, role || 'editor');
    const user = db.prepare('SELECT id, username, role, created_at FROM users WHERE username = ?').get(username);
    res.json({ ok: true, user });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: '用户名已存在' });
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/users/:id/reset', auth, (req, res) => {
  const { password, role } = req.body || {};
  const hash = password ? require('bcryptjs').hashSync(password, 10) : null;
  if (hash) db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.params.id);
  if (role) db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/users/:id', auth, (req, res) => {
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});
app.get('/admin', (req, res) => res.redirect('/admin/static/login.html'));

// Multer 错误处理（文件太大、格式不对时返回 JSON）
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '文件大小不能超过 20MB' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message || '上传失败' });
  }
  next();
});

const PORT = process.env.PORT || 3000;
app.post('/api/info-collection', (req, res) => {
  const { name, contact, company, address, roles } = req.body || {};
  if (!name || !contact || !company || !roles || !roles.length) {
    return res.json({ ok: false, error: '请填写完整信息' });
  }
  try {
    db.prepare(`CREATE TABLE IF NOT EXISTS info_collections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact TEXT NOT NULL,
      company TEXT NOT NULL,
      address TEXT DEFAULT '',
      roles TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )`).run();
    db.prepare('INSERT INTO info_collections (name, contact, company, address, roles) VALUES (?, ?, ?, ?, ?)')
      .run(name, contact, company, address || '', roles.join(','));
    res.json({ ok: true });
  } catch(e) {
    res.json({ ok: false, error: '提交失败' });
  }
});

app.get('/api/info-collections', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM info_collections ORDER BY created_at DESC').all();
    res.json(rows);
  } catch(e) {
    res.json([]);
  }
});

app.delete('/api/info-collections/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM info_collections WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch(e) {
    res.json({ ok: false, error: '删除失败' });
  }
});

app.listen(PORT, () => {
  console.log(`CMS 后台已启动: http://localhost:${PORT}/admin`);
  console.log(`网站预览: http://localhost:${PORT}/sy-index.html`);
});

// ---- 崩溃自动重启防护 ----
process.on('uncaughtException', (err) => {
  console.error('[CRASH] Uncaught Exception:', err.message);
  console.error(err.stack);
  setTimeout(() => process.exit(1), 1000);
});
process.on('unhandledRejection', (reason) => {
  console.error('[CRASH] Unhandled Rejection:', reason);
  setTimeout(() => process.exit(1), 1000);
});
