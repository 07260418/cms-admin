let allItems = [];
let allListItems = [];
let currentSection = null;
let currentTab = 'content';
let currentListType = 'news';
let currentListCategory = 'all';
let editingItemId = null;
let searchKeyword = '';
var productCategories = [];

async function api(url, opts) {
  const r = await fetch(url, opts);
  if (r.status === 401) { location.href = '/admin/static/login.html'; return null; }
  return r.json();
}

function stripVer(v) { return (v || '').split('?v=')[0]; }
function esc(s) { return (s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function typeLabel(t) { return { text: '文字', image: '图片', icon: '图标', banner: 'Banner' }[t] || t; }
function pageName(page) {
  return { home: '首页', partner: '合作招商', supply: '供应链', logistics: '物流保税', news: '新闻资讯', exhibition: '会展服务', park: '生产园区', events: '协会大事记', tourism: '文旅生态', development: '新品研发', testing: '产品检测', education: '教育合作', training: '培训', certification: '认证', 'supply-finance': '供应链金融' }[page] || page;
}
var pageOrder = ['home','supply-finance','tourism','development','testing','education','training','certification','events','supply','news','park','logistics','exhibition','partner'];

// ===================== 主标签切换 =====================
document.querySelectorAll('.main-tab').forEach(tab => {
  tab.onclick = () => {
    document.querySelectorAll('.main-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentTab = tab.dataset.tab;
    // 切换 tab 时重置当前列表类型
    if (tab.dataset.tab === 'news') currentListType = 'news';
    else if (tab.dataset.tab === 'product') { currentListType = 'product'; currentListCategory = 'all'; }
    else if (tab.dataset.tab === 'categories') currentListType = 'categories';
    else if (tab.dataset.tab === 'expo') currentListType = 'expo_preview';
    else if (tab.dataset.tab === 'milestone') currentListType = 'milestone';
    else if (tab.dataset.tab === 'logistics') currentListType = 'logistics';
    else if (tab.dataset.tab === 'info') currentListType = 'info';
    else if (tab.dataset.tab === 'settings') currentListType = 'settings';
    else if (tab.dataset.tab === 'users') currentListType = 'users';
    renderSidebar();
    renderContent();
  };
});

// ===================== 侧边栏 =====================
function renderSidebar() {
  const sidebar = document.getElementById('sidebar');
  const title = document.getElementById('sidebarTitle');
  const list = document.getElementById('pageList');
  list.innerHTML = '';

  if (currentTab === 'content') {
    title.textContent = '页面/区块';
    sidebar.style.display = '';
    const grouped = {};
    allItems.forEach(i => {
      if (!grouped[i.page]) grouped[i.page] = [];
      grouped[i.page].push(i);
    });
    var firstPage = true;
    // 业务介绍分组：将供应链金融~认证归入业务介绍下拉
    var bizPages = ['supply-finance','tourism','development','testing','education','training','certification'];
    var bizSections = {};
    bizPages.forEach(function(p) {
      if (grouped[p]) {
        grouped[p].forEach(function(i) { bizSections[i.section] = (bizSections[i.section] || 0) + 1; });
        delete grouped[p];
      }
    });
    var bizKeys = Object.keys(bizSections);
    // 先渲染首页，再渲染业务介绍，最后其他页面
    var pageList = Object.keys(grouped).sort(function(a,b){ return pageOrder.indexOf(a) - pageOrder.indexOf(b); });
    function renderOnePage(page) {
      var sections = {};
      grouped[page].forEach(function(i) { sections[i.section] = (sections[i.section] || 0) + 1; });
      if (page === 'home') {
        var hideSections = ['banner','供应链','生产园区','物流保税','会展服务','新闻资讯','合作伙伴'];
        hideSections.forEach(function(s) { if (s !== 'footer') delete sections[s]; });
      }
      var sectionKeys = Object.keys(sections);
      if (sectionKeys.length === 1) {
        var header = document.createElement('li');
        header.textContent = pageName(page);
        header.style.cssText = 'font-weight:600;color:#374151;margin-top:8px;pointer-events:none';
        list.appendChild(header);
        var sli = document.createElement('li');
        sli.textContent = sectionKeys[0] + ' (' + sections[sectionKeys[0]] + ')';
        sli.dataset.page = page;
        sli.dataset.section = sectionKeys[0];
        sli.style.paddingLeft = '20px';
        sli.onclick = function() { selectSection(page, sectionKeys[0], sli); };
        list.appendChild(sli);
      } else {
        var expanded = false;
        var header = document.createElement('li');
        header.style.cssText = 'font-weight:600;color:#374151;margin-top:8px;cursor:pointer;user-select:none';
        header.innerHTML = '<span class="page-toggle" style="display:inline-block;width:16px;text-align:center;margin-right:4px">' + (expanded ? '▼' : '▶') + '</span>' + pageName(page) + ' <span style="color:#9ca3af;font-weight:400;font-size:12px">(' + sectionKeys.length + ')</span>';
        list.appendChild(header);
        var wrap = document.createElement('div');
        wrap.style.cssText = expanded ? '' : 'display:none';
        sectionKeys.forEach(function(section) {
          var sli = document.createElement('li');
          sli.textContent = section + ' (' + sections[section] + ')';
          sli.dataset.page = page;
          sli.dataset.section = section;
          sli.style.paddingLeft = '20px';
          sli.onclick = function() { selectSection(page, section, sli); };
          wrap.appendChild(sli);
        });
        list.appendChild(wrap);
        header.onclick = function() {
          var isOpen = wrap.style.display !== 'none';
          wrap.style.display = isOpen ? 'none' : '';
          header.querySelector('.page-toggle').textContent = isOpen ? '▶' : '▼';
        };
        firstPage = false;
      }
    }
    // 1) 首页
    if (grouped['home']) renderOnePage('home');
    // 2) 业务介绍
    if (bizKeys.length > 0) {
      var expanded = false;
      var header = document.createElement('li');
      header.style.cssText = 'font-weight:600;color:#374151;margin-top:8px;cursor:pointer;user-select:none';
      header.innerHTML = '<span class="page-toggle" style="display:inline-block;width:16px;text-align:center;margin-right:4px">' + (expanded ? '▼' : '▶') + '</span>业务介绍 <span style="color:#9ca3af;font-weight:400;font-size:12px">(' + bizKeys.length + ')</span>';
      list.appendChild(header);
      var wrap = document.createElement('div');
      wrap.style.cssText = expanded ? '' : 'display:none';
      bizKeys.forEach(function(section) {
        var sli = document.createElement('li');
        sli.textContent = section + ' (' + bizSections[section] + ')';
        sli.dataset.page = 'home';
        sli.dataset.section = section;
        sli.style.paddingLeft = '20px';
        sli.onclick = function() { selectBizSection(section, sli); };
        wrap.appendChild(sli);
      });
      list.appendChild(wrap);
      header.onclick = function() {
        var isOpen = wrap.style.display !== 'none';
        wrap.style.display = isOpen ? 'none' : '';
        header.querySelector('.page-toggle').textContent = isOpen ? '▶' : '▼';
      };
      firstPage = false;
    }
    // 3) 其他页面
    pageList.forEach(function(page) {
      if (page === 'home' || page === 'supply-detail') return;
      renderOnePage(page);
});
  } else if (currentTab === 'news') {
    title.textContent = '新闻分类';
    sidebar.style.display = '';
    [{ k: 'all', n: '全部' }, { k: 'industry', n: '行业新闻' }, { k: 'association', n: '协会动态' }].forEach(cat => {
      const li = document.createElement('li');
      const count = cat.k === 'all' ? allListItems.filter(i => i.list_type === 'news').length : allListItems.filter(i => i.list_type === 'news' && i.category === cat.k).length;
      li.textContent = cat.n + ` (${count})`;
      li.onclick = () => { currentListType = 'news'; selectListCategory(cat.k, li); };
      list.appendChild(li);
    });
  } else if (currentTab === 'product') {
    title.textContent = '产品分类';
    sidebar.style.display = '';
    var prodCats = productCategories.length ? productCategories.map(function(c) { return { k: c.value, n: c.label }; }) : [{ k: 'frozen-products', n: '冷冻产成品类' }, { k: 'frozen-meat', n: '冷冻肉制品分割类' }, { k: 'frozen-fruit', n: '冷冻果蔬类' }];
    // 全部
    var allLi = document.createElement('li');
    var allCount = allListItems.filter(function(i) { return i.list_type === 'product'; }).length;
    allLi.textContent = '全部 (' + allCount + ')';
    if (currentListType === 'product' && currentListCategory === 'all') allLi.classList.add('active');
    allLi.onclick = function() { currentListType = 'product'; selectListCategory('all', allLi); };
    list.appendChild(allLi);
    // 各分类
    prodCats.forEach(function(cat) {
      var li = document.createElement('li');
      var count = allListItems.filter(function(i) { return i.list_type === 'product' && i.category === cat.k; }).length;
      li.textContent = cat.n + ' (' + count + ')';
      if (currentListType === 'product' && currentListCategory === cat.k) li.classList.add('active');
      li.onclick = function() { currentListType = 'product'; selectListCategory(cat.k, li); };
      list.appendChild(li);
    });
  } else if (currentTab === 'categories') {
    title.textContent = '分类管理';
    sidebar.style.display = '';
    var li = document.createElement('li');
    li.className = 'active';
    li.textContent = '产品分类';
    list.appendChild(li);
  } else if (currentTab === 'expo') {
    title.textContent = '会展分类';
    sidebar.style.display = '';
    [{ k: 'expo_preview', n: '会展预告' }, { k: 'expo_review', n: '会展回顾' }].forEach(cat => {
      const li = document.createElement('li');
      const count = allListItems.filter(i => i.list_type === cat.k).length;
      li.textContent = cat.n + ` (${count})`;
      li.onclick = () => { currentListType = cat.k; selectListCategory('all', li); };
      list.appendChild(li);
    });
  } else if (currentTab === 'milestone') {
    title.textContent = '历年事迹';
    sidebar.style.display = '';
    const count = allListItems.filter(i => i.list_type === 'milestone').length;
    const li = document.createElement('li');
    li.textContent = `全部大事记 (${count})`;
    li.className = 'active';
    li.onclick = () => { currentListType = 'milestone'; selectListCategory('all', li); };
    list.appendChild(li);
  } else if (currentTab === 'logistics') {
    title.textContent = '船公司列表';
    sidebar.style.display = '';
    const count = allListItems.filter(i => i.list_type === 'logistics').length;
    const li = document.createElement('li');
    li.textContent = '全部 (' + count + ')';
    li.className = 'active';
    list.appendChild(li);
  } else if (currentTab === 'info') {
    title.textContent = '信息采集';
    sidebar.style.display = '';
    const count = allInfoItems.length;
    const li = document.createElement('li');
    li.textContent = '全部提交 (' + count + ')';
    li.className = 'active';
    li.onclick = () => { loadInfoCollections(); };
    list.appendChild(li);
  } else if (currentTab === 'settings') {
    title.textContent = '系统设置';
    sidebar.style.display = 'none';
  } else if (currentTab === 'users') {
    title.textContent = '权限管理';
    sidebar.style.display = '';
    var li = document.createElement('li');
    li.className = 'active';
    li.textContent = '管理员列表';
    list.appendChild(li);
  }
}


function selectListCategory(cat, el) {
  document.querySelectorAll('.sidebar li').forEach(li => li.classList.remove('active'));
  el.classList.add('active');
  currentListCategory = cat;
  renderListItems();
}

function selectSection(page, section, el) {
  document.querySelectorAll('.sidebar li').forEach(li => li.classList.remove('active'));
  el.classList.add('active');
  currentSection = { page, section };
  const items = allItems.filter(i => i.page === page && i.section === section);
  renderItems(items);
}

function selectBizSection(section, el) {
  document.querySelectorAll('.sidebar li').forEach(li => li.classList.remove('active'));
  el.classList.add('active');
  var bizPages = ['supply-finance','tourism','development','testing','education','training','certification'];
  var items = allItems.filter(function(i) { return bizPages.indexOf(i.page) !== -1 && i.section === section; });
  currentSection = { page: '__biz__', section: section };
  renderItems(items);
}

// ===================== 内容管理渲染 =====================
function renderContent() {
  if (currentTab === 'content') {
    if (currentSection) {
      var items;
      if (currentSection.page === '__biz__') {
        var bizPages = ['supply-finance','tourism','development','testing','education','training','certification'];
        items = allItems.filter(function(i) { return bizPages.indexOf(i.page) !== -1 && i.section === currentSection.section; });
      } else {
        items = allItems.filter(i => i.page === currentSection.page && i.section === currentSection.section);
      }
      renderItems(items);
    } else {
      document.getElementById('items').innerHTML = '<p class="empty">请从左侧选择页面/区块</p>';
    }
  } else if (currentTab === 'info') {
    loadInfoCollections();
  } else if (currentTab === 'categories') {
    loadCategories();
  } else if (currentTab === 'settings') {
    loadSettings();
  } else if (currentTab === 'users') {
    loadUsers();
  } else {
    renderAddBar();
    renderListItems();
  }
}

function renderItems(items) {
  var box = document.getElementById('items');
  box.innerHTML = '';
  if (!items.length) { box.innerHTML = '<p class="empty">暂无可编辑内容</p>'; return; }
  var title = document.createElement('h2');
  title.className = 'section-title';
  title.textContent = currentSection.section;
  box.appendChild(title);

  // 多项内容时显示下拉切换
  var currentIndex = 0;
  function showItem(index) {
    box.querySelectorAll('.item').forEach(function(el,i){ el.style.display = (i === index || index === -1) ? '' : 'none'; });
  }

  if (items.length > 1) {
    var toolbar = document.createElement('div');
    toolbar.className = 'items-toolbar';
    toolbar.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:12px;padding:8px 12px;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb';
    var select = document.createElement('select');
    select.style.cssText = 'flex:1;padding:4px 8px;border:1px solid #d1d5db;border-radius:4px;font-size:14px';
    items.forEach(function(item, i) {
      var opt = document.createElement('option');
      opt.value = i;
      opt.textContent = typeLabel(item.type) + ' - ' + item.label + ' (' + item.key + ')';
      select.appendChild(opt);
    });
    select.onchange = function() {
      currentIndex = parseInt(this.value);
      showItem(currentIndex);
    };

    var showAllBtn = document.createElement('button');
    showAllBtn.className = 'btn btn-ghost btn-sm';
    showAllBtn.textContent = '展开全部';
    showAllBtn.onclick = function() { currentIndex = -1; showItem(-1); };

    toolbar.appendChild(select);
    toolbar.appendChild(showAllBtn);
    box.appendChild(toolbar);
  }

  items.forEach(function(item, idx) {
    // 跳过跳转链接项（已合入图片卡片内）
    if (item.key.endsWith('_link') && item.type === 'text') return;
    var div = document.createElement('div');
    div.className = 'item';
    var isImage = ['image', 'icon', 'banner'].includes(item.type);

    // 检查是否是横幅图片，查找对应的跳转链接
    var linkItem = null;
    if (isImage) {
      var linkKey = item.key + '_link';
      for (var j = 0; j < allItems.length; j++) {
        if (allItems[j].key === linkKey && allItems[j].type === 'text') {
          linkItem = allItems[j];
          break;
        }
      }
    }

    div.innerHTML = [
      '<div class="item-meta">',
      '  <div><span class="item-label">' + esc(item.label) + '</span><span class="item-type ' + item.type + '">' + typeLabel(item.type) + '</span></div>',
      '  <div class="item-key">' + esc(item.key) + '</div>',
      isImage ? '  <div class="item-preview"><img src="/' + stripVer(item.value) + '" alt=""></div>' : '  <div class="item-key">当前：' + esc(item.value) + '</div>',
      '</div>',
      '<div class="item-actions">',
      isImage
        ? '<input type="file" accept="image/*"><button class="btn btn-primary upload-btn">上传替换</button><div class="backups"></div><span class="saved"></span>'
          + (linkItem ? '<div class="item-link-row" style="margin-top:8px;border-top:1px solid #eee;padding-top:8px"><label style="font-size:12px;color:#6b7280;font-weight:500;display:block;margin-bottom:4px">跳转链接</label><div style="display:flex;gap:6px"><input type="text" class="link-input" value="' + esc(linkItem.value) + '" style="flex:1;padding:5px 8px;border:1px solid #d1d5db;border-radius:4px;font-size:13px;outline:none"><button class="btn btn-primary btn-sm link-save-btn">保存链接</button><span class="saved-link" style="font-size:12px;color:#0ea66a"></span></div></div>' : '')
        : (linkItem ? '' : '<input type="text" value="' + esc(item.value) + '"><button class="btn btn-primary save-btn">保存</button><div class="backups"></div><span class="saved"></span>'),
      '</div>'
    ].join('');
    if (isImage) {
      var fileInput = div.querySelector('input[type=file]');
      div.querySelector('.upload-btn').onclick = function() { uploadItem(item, fileInput, div); };
      loadBackups(item, div);
      // 跳转链接保存
      var linkSaveBtn = div.querySelector('.link-save-btn');
      if (linkSaveBtn) {
        linkSaveBtn.onclick = function() {
          var input = div.querySelector('.link-input');
          var savedSpan = div.querySelector('.saved-link');
          savedSpan.textContent = '保存中...';
          api('/api/content/' + linkItem.id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: input.value })
          }).then(function(d) {
            if (d && d.ok) savedSpan.textContent = '✓已保存';
            else savedSpan.textContent = '保存失败';
          }).catch(function() { savedSpan.textContent = '保存失败'; });
        };
      }
    } else if (!linkItem) {
      var textInput = div.querySelector('input[type=text]');
      div.querySelector('.save-btn').onclick = function() { saveText(item, textInput.value, div); };
      loadBackups(item, div);
    }
    box.appendChild(div);
  });
  // 默认只显示第一项
  if (items.length > 1) showItem(0);
}

// ===================== 搜索栏渲染（一次性） =====================
function renderAddBar() {
  const typeName = { news: '新闻', product: '产品', expo_preview: '会展预告', expo_review: '会展回顾', milestone: '大事记', logistics: '船公司' }[currentListType] || '项目';
  const bar = document.getElementById('addBar');
  if (!bar) return;

  // 仅首次渲染
  if (bar.dataset.rendered) {
    // 更新新增按钮文字
    var btn = document.getElementById('addBtn');
    if (btn) btn.textContent = '+ 新增' + typeName;
    return;
  }
  bar.dataset.rendered = '1';
  bar.innerHTML = `<div class="add-bar">
  <button class="btn btn-primary" id="addBtn">+ 新增${typeName}</button>
  <input type="text" id="searchInput" placeholder="搜索关键词..." style="margin-left:12px;padding:6px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:14px;width:200px;outline:none">
  <span style="flex:1"></span>
  <button class="btn btn-ghost" id="importBtn" style="margin-right:8px;display:none">导入CSV</button>
  <button class="btn btn-ghost" id="exportBtn" style="display:none">导出</button>
</div>`;
  document.getElementById('addBtn').onclick = () => openAddModal();
  document.getElementById('addBtn').textContent = '+ 新增' + typeName;

  var si = document.getElementById('searchInput');
  if (si) {
    si.oninput = function() {
      searchKeyword = this.value;
      renderListItems();
    };
    si.onkeydown = function(e) {
      if (e.key === 'Enter') {
        searchKeyword = this.value;
        renderListItems();
      }
    };
  }

  // 导入/导出
  var importBtn = document.getElementById('importBtn');
  var exportBtn = document.getElementById('exportBtn');
  if (importBtn && exportBtn) {
    exportBtn.onclick = function() {
      var a = document.createElement('a');
      a.href = '/api/list-items/export?type=product';
      a.download = 'products.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
    };
    importBtn.onclick = function() {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv';
      input.onchange = async function() {
        var file = input.files[0];
        if (!file) return;
        var fd = new FormData();
        fd.append('file', file);
        var r = await fetch('/api/list-items/import', { method: 'POST', body: fd, credentials: 'same-origin' });
        var d = await r.json();
        if (d && d.ok) {
          alert('成功导入 ' + d.imported + ' 条' + (d.errors ? '\n' + d.errors.length + ' 条错误' : ''));
          await loadListItems();
          renderSidebar(); renderListItems();
        } else { alert((d && d.error) || '导入失败'); }
      };
      input.click();
    };
  }

  // 从全局渲染中移除产品专属按钮控制
  updateAddBarButtons();
}

function updateAddBarButtons() {
  var importBtn = document.getElementById('importBtn');
  var exportBtn = document.getElementById('exportBtn');
  if (importBtn) importBtn.style.display = currentTab === 'product' ? '' : 'none';
  if (exportBtn) exportBtn.style.display = currentTab === 'product' ? '' : 'none';
}

// ===================== 列表管理渲染 =====================
function renderListItems() {
  const box = document.getElementById('items');
  let items = allListItems.filter(i => {
    if (currentTab === 'news') return i.list_type === 'news' && (currentListCategory === 'all' || i.category === currentListCategory);
    if (currentTab === 'product') return i.list_type === 'product' && (currentListCategory === 'all' || i.category === currentListCategory);
    if (currentTab === 'expo') return i.list_type === currentListType;
    if (currentTab === 'milestone') return i.list_type === 'milestone';
    if (currentTab === 'logistics') return i.list_type === 'logistics';
    if (currentTab === 'info') return false;
    return false;
  });

  const typeName = { news: '新闻', product: '产品', expo_preview: '会展预告', expo_review: '会展回顾', milestone: '大事记', logistics: '船公司' }[currentListType] || '项目';

  // 更新新增按钮文字和导入/导出状态
  var addBtn = document.getElementById('addBtn');
  if (addBtn) addBtn.textContent = '+ 新增' + typeName;
  updateAddBarButtons();

  box.innerHTML = '';

  if (!items.length) {
    box.innerHTML += '<p class="empty">暂无数据，点击上方按钮新增</p>';
  } else {
    // 搜索过滤
    if (searchKeyword) {
      var kw = searchKeyword.toLowerCase();
      items = items.filter(function(i) {
        return (i.title || '').toLowerCase().indexOf(kw) !== -1 ||
               (i.summary || '').toLowerCase().indexOf(kw) !== -1 ||
               (i.category || '').toLowerCase().indexOf(kw) !== -1 ||
               (i.country || '').toLowerCase().indexOf(kw) !== -1 ||
               (i.date || '').toLowerCase().indexOf(kw) !== -1 ||
               (i.link || '').toLowerCase().indexOf(kw) !== -1;
      });
      if (!items.length) { box.innerHTML += '<p class="empty">无匹配结果</p>'; }
    }
    if (!items.length) {
      return;
    }
    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'list-card';
      if (currentTab === 'logistics') {
        card.innerHTML = `
          <div class="list-card-body" style="flex:1">
            <div class="list-card-title">${esc(item.title)}</div>
            <div class="list-card-meta">
              链接：${item.link ? '<a href="' + esc(item.link) + '" target="_blank" rel="noopener" style="color:#2563eb">' + esc(item.link) + '</a>' : '-'}
              ${item.category || item.country ? ' · ' + (item.category === 'domestic' ? '国内' : item.category === 'international' ? '国际' : '') + '/' + esc(item.country) : ''}
              ${!item.visible ? ' · <span style="color:#dc2626">已隐藏</span>' : ''}
            </div>
          </div>
          <div class="list-card-actions">
            <button class="btn btn-ghost btn-sm edit-btn">编辑</button>
            <button class="btn btn-danger btn-sm del-btn">删除</button>
          </div>
        `;
        card.querySelector('.edit-btn').onclick = () => openEditModal(item);
        card.querySelector('.del-btn').onclick = () => deleteItem(item);
      } else if (currentTab === 'milestone') {
        card.innerHTML = `
          <div class="list-card-body" style="flex:1">
            <div class="list-card-title">[${esc(item.date)}] ${esc(item.title)}</div>
            <div class="list-card-meta">${item.summary ? esc(item.summary.substring(0, 120)) + (item.summary.length > 120 ? '...' : '') : ''}</div>
            ${!item.visible ? '<span style="color:#dc2626">已隐藏</span>' : ''}
          </div>
          <div class="list-card-actions">
            <button class="btn btn-ghost btn-sm edit-btn">编辑</button>
            <button class="btn btn-danger btn-sm del-btn">删除</button>
          </div>
        `;
        card.querySelector('.edit-btn').onclick = () => openEditModal(item);
        card.querySelector('.del-btn').onclick = () => deleteItem(item);
      } else {
      card.innerHTML = `
        <div class="list-card-img"><img src="/${stripVer(item.image)}" alt="" onerror="this.style.display='none'"></div>
        <div class="list-card-body">
          <div class="list-card-title">${esc(item.title)}</div>
          <div class="list-card-meta">
            ${item.date ? '日期：' + esc(item.date) + ' · ' : ''}
            ${item.category ? '分类：' + esc(item.category) : ''}
            ${!item.visible ? ' · <span style="color:#dc2626">已隐藏</span>' : ''}
          </div>
          ${item.summary ? '<div class="list-card-meta" style="margin-top:4px">' + esc(item.summary.substring(0, 80)) + (item.summary.length > 80 ? '...' : '') + '</div>' : ''}
        </div>
        <div class="list-card-actions">
          <button class="btn btn-ghost btn-sm edit-btn">编辑</button>
          <button class="btn btn-danger btn-sm del-btn">删除</button>
        </div>
      `;
      card.querySelector('.edit-btn').onclick = () => openEditModal(item);
      card.querySelector('.del-btn').onclick = () => deleteItem(item);
      }
      box.appendChild(card);
    });
  }
}

// ===================== 新增/编辑模态框 =====================
function openAddModal() {
  const type = currentListType;
  const typeName = { news: '新闻', product: '产品', expo_preview: '会展预告', expo_review: '会展回顾', milestone: '大事记', logistics: '船公司' }[type] || '项目';
  const isMilestone = type === 'milestone';
  const isLogistics = type === 'logistics';
  const categories = type === 'news'
    ? [{ v: 'industry', l: '行业新闻' }, { v: 'association', l: '协会动态' }]
    : type === 'product'
    ? (productCategories.length ? productCategories.map(function(c) { return { v: c.value, l: c.label }; }) : [{ v: 'frozen-products', l: '冷冻产成品类' }, { v: 'frozen-meat', l: '冷冻肉制品分割类' }, { v: 'frozen-fruit', l: '冷冻果蔬类' }])
    : [];

  // 物流两级分类
  const logiL1 = [{ v: 'domestic', l: '国内' }, { v: 'international', l: '国际' }];
  const logiCountryMap = {
    domestic: ['中国大陆','中国香港','中外合资','中国台湾','中国澳门'],
    international: [
      // 东盟
      '新加坡','马来西亚','印度尼西亚','泰国','越南','菲律宾','柬埔寨','老挝','缅甸','文莱',
      // 东亚
      '日本','韩国','朝鲜','蒙古',
      // 南亚
      '印度','巴基斯坦','孟加拉国','斯里兰卡','尼泊尔','马尔代夫','不丹',
      // 中亚
      '哈萨克斯坦','乌兹别克斯坦','吉尔吉斯斯坦','塔吉克斯坦','土库曼斯坦',
      // 西亚/中东
      '阿联酋','沙特阿拉伯','伊朗','伊拉克','科威特','卡塔尔','阿曼','巴林','也门','约旦','黎巴嫩','叙利亚','以色列','巴勒斯坦','土耳其','格鲁吉亚','亚美尼亚','阿塞拜疆',
      // 欧洲
      '英国','德国','法国','意大利','西班牙','葡萄牙','荷兰','比利时','卢森堡','瑞士','奥地利','瑞典','挪威','丹麦','芬兰','冰岛','爱尔兰','波兰','捷克','斯洛伐克','匈牙利','罗马尼亚','保加利亚','塞尔维亚','克罗地亚','斯洛文尼亚','波黑','黑山','北马其顿','阿尔巴尼亚','希腊','爱沙尼亚','拉脱维亚','立陶宛','白俄罗斯','乌克兰','摩尔多瓦','俄罗斯','马耳他','塞浦路斯',
      // 北美
      '美国','加拿大','墨西哥',
      // 中美洲/加勒比
      '古巴','牙买加','巴拿马','哥斯达黎加','危地马拉','洪都拉斯','萨尔瓦多','尼加拉瓜','多米尼加','特立尼达和多巴哥','巴哈马','巴巴多斯',
      // 南美
      '巴西','阿根廷','智利','哥伦比亚','秘鲁','委内瑞拉','厄瓜多尔','玻利维亚','巴拉圭','乌拉圭','圭亚那','苏里南',
      // 大洋洲
      '澳大利亚','新西兰','斐济','巴布亚新几内亚','所罗门群岛','瓦努阿图','萨摩亚','汤加','密克罗尼西亚','马绍尔群岛','帕劳','瑙鲁','基里巴斯','图瓦卢','库克群岛',
      // 非洲
      '埃及','南非','尼日利亚','肯尼亚','埃塞俄比亚','坦桑尼亚','加纳','摩洛哥','阿尔及利亚','突尼斯','利比亚','苏丹','南苏丹','乌干达','卢旺达','塞内加尔','科特迪瓦','喀麦隆','安哥拉','莫桑比克','赞比亚','津巴布韦','博茨瓦纳','纳米比亚','马达加斯加','毛里求斯','塞舌尔','佛得角','贝宁','多哥','布基纳法索','马里','尼日尔','乍得','中非','刚果（布）','刚果（金）','加蓬','赤道几内亚','毛里塔尼亚','几内亚','塞拉利昂','利比里亚','马拉维','莱索托','斯威士兰','科摩罗','吉布提','厄立特里亚','索马里',
      '其他'
    ]
  };

  const html = `
    <div class="modal-overlay" id="modalOverlay">
      <div class="modal">
        <h2>新增${typeName}</h2>
        <div class="modal-field">
          <label>${isLogistics ? '船公司名称' : '标题'} *</label>
          <input type="text" id="m_title" placeholder="${isLogistics ? '请输入船公司名称' : '请输入标题'}">
        </div>
        ${isLogistics ? `
        <div class="modal-field">
          <label>网站链接</label>
          <input type="url" id="m_link" placeholder="https://">
        </div>
        <div class="modal-field">
          <label>类别</label>
          <select id="m_logi_l1">
            ${logiL1.map(c => `<option value="${c.v}">${c.l}</option>`).join('')}
          </select>
        </div>
        <div class="modal-field">
          <label>国家/地区</label>
          <select id="m_logi_l2">
            ${logiCountryMap.domestic.map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
        </div>` : ''}
        ${(type === 'news' || isMilestone || type === 'expo_preview' || type === 'expo_review') ? `
        <div class="modal-field">
          <label>${isMilestone ? '描述' : '摘要'}</label>
          <textarea id="m_summary" placeholder="请输入${isMilestone ? '描述' : '摘要'}"></textarea>
        </div>` : ''}
        ${!isLogistics ? `
        <div class="modal-field">
          <label>${isMilestone ? '年份' : '日期'}</label>
          <input type="${isMilestone ? 'text' : 'date'}" id="m_date" placeholder="${isMilestone ? '如 2025' : ''}">
        </div>` : ''}
        ${categories.length && !isLogistics ? `
        <div class="modal-field">
          <label>分类</label>
          <select id="m_category">
            ${categories.map(c => `<option value="${c.v}">${c.l}</option>`).join('')}
          </select>
        </div>` : ''}
        ${!isMilestone && !isLogistics ? `
        <div class="modal-field">
          <label>图片</label>
          <input type="file" id="m_file" accept="image/*">
          <img class="modal-preview" id="m_preview" style="display:none">
        </div>` : ''}
        ${!isLogistics ? `
        <div class="modal-field">
          <label>链接</label>
          <input type="text" id="m_link" placeholder="详情页链接（可选）">
        </div>` : ''}
        ${type === 'product' ? `
        <div class="modal-field">
          <label>产品详情</label>
          <div class="editor-toolbar">
            <button type="button" class="btn btn-sm" onclick="openContentImageUpload()">📷 图片</button>
            <button type="button" class="btn btn-sm" onclick="openContentVideoInput()">🎬 视频</button>
            <span class="editor-hint">建议图片宽度≤1200px，视频≤50MB</span>
          </div>
          <div class="editor-area" id="m_content" contenteditable="true" data-placeholder="输入产品详情描述..."></div>
          <input type="file" id="m_content_file" accept="image/*,video/*" style="display:none">
        </div>` : ''}
        <div class="modal-actions">
          <button class="btn btn-ghost" id="m_cancel">取消</button>
          <button class="btn btn-primary" id="m_save">保存</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  const overlay = document.getElementById('modalOverlay');
  document.getElementById('m_cancel').onclick = () => overlay.remove();

  // 物流二级联动
  var logiL1Select = document.getElementById('m_logi_l1');
  if (logiL1Select) {
    logiL1Select.onchange = function() {
      var l2 = document.getElementById('m_logi_l2');
      var vals = logiCountryMap[this.value] || [];
      l2.innerHTML = vals.map(function(v) { return '<option value="' + v + '">' + v + '</option>'; }).join('');
    };
  }

  var mFile = document.getElementById('m_file');
  if (mFile) {
    mFile.onchange = (e) => {
      const f = e.target.files[0];
      if (f) { document.getElementById('m_preview').src = URL.createObjectURL(f); document.getElementById('m_preview').style.display = ''; }
    };
  }
  document.getElementById('m_save').onclick = () => saveNewItem(type, overlay);
}

function openEditModal(item) {
  const type = item.list_type;
  const typeName = { news: '新闻', product: '产品', expo_preview: '会展预告', expo_review: '会展回顾', milestone: '大事记', logistics: '船公司' }[type] || '项目';
  const isMilestone = type === 'milestone';
  const isLogistics = type === 'logistics';
  const categories = type === 'news'
    ? [{ v: 'industry', l: '行业新闻' }, { v: 'association', l: '协会动态' }]
    : type === 'product'
    ? (productCategories.length ? productCategories.map(function(c) { return { v: c.value, l: c.label }; }) : [{ v: 'frozen-products', l: '冷冻产成品类' }, { v: 'frozen-meat', l: '冷冻肉制品分割类' }, { v: 'frozen-fruit', l: '冷冻果蔬类' }])
    : [];

  // 物流两级分类
  const logiL1 = [{ v: 'domestic', l: '国内' }, { v: 'international', l: '国际' }];
  const logiCountryMap = {
    domestic: ['中国大陆','中国香港','中外合资','中国台湾','中国澳门'],
    international: [
      // 东盟
      '新加坡','马来西亚','印度尼西亚','泰国','越南','菲律宾','柬埔寨','老挝','缅甸','文莱',
      // 东亚
      '日本','韩国','朝鲜','蒙古',
      // 南亚
      '印度','巴基斯坦','孟加拉国','斯里兰卡','尼泊尔','马尔代夫','不丹',
      // 中亚
      '哈萨克斯坦','乌兹别克斯坦','吉尔吉斯斯坦','塔吉克斯坦','土库曼斯坦',
      // 西亚/中东
      '阿联酋','沙特阿拉伯','伊朗','伊拉克','科威特','卡塔尔','阿曼','巴林','也门','约旦','黎巴嫩','叙利亚','以色列','巴勒斯坦','土耳其','格鲁吉亚','亚美尼亚','阿塞拜疆',
      // 欧洲
      '英国','德国','法国','意大利','西班牙','葡萄牙','荷兰','比利时','卢森堡','瑞士','奥地利','瑞典','挪威','丹麦','芬兰','冰岛','爱尔兰','波兰','捷克','斯洛伐克','匈牙利','罗马尼亚','保加利亚','塞尔维亚','克罗地亚','斯洛文尼亚','波黑','黑山','北马其顿','阿尔巴尼亚','希腊','爱沙尼亚','拉脱维亚','立陶宛','白俄罗斯','乌克兰','摩尔多瓦','俄罗斯','马耳他','塞浦路斯',
      // 北美
      '美国','加拿大','墨西哥',
      // 中美洲/加勒比
      '古巴','牙买加','巴拿马','哥斯达黎加','危地马拉','洪都拉斯','萨尔瓦多','尼加拉瓜','多米尼加','特立尼达和多巴哥','巴哈马','巴巴多斯',
      // 南美
      '巴西','阿根廷','智利','哥伦比亚','秘鲁','委内瑞拉','厄瓜多尔','玻利维亚','巴拉圭','乌拉圭','圭亚那','苏里南',
      // 大洋洲
      '澳大利亚','新西兰','斐济','巴布亚新几内亚','所罗门群岛','瓦努阿图','萨摩亚','汤加','密克罗尼西亚','马绍尔群岛','帕劳','瑙鲁','基里巴斯','图瓦卢','库克群岛',
      // 非洲
      '埃及','南非','尼日利亚','肯尼亚','埃塞俄比亚','坦桑尼亚','加纳','摩洛哥','阿尔及利亚','突尼斯','利比亚','苏丹','南苏丹','乌干达','卢旺达','塞内加尔','科特迪瓦','喀麦隆','安哥拉','莫桑比克','赞比亚','津巴布韦','博茨瓦纳','纳米比亚','马达加斯加','毛里求斯','塞舌尔','佛得角','贝宁','多哥','布基纳法索','马里','尼日尔','乍得','中非','刚果（布）','刚果（金）','加蓬','赤道几内亚','毛里塔尼亚','几内亚','塞拉利昂','利比里亚','马拉维','莱索托','斯威士兰','科摩罗','吉布提','厄立特里亚','索马里',
      '其他'
    ]
  };

  const html = `
    <div class="modal-overlay" id="modalOverlay">
      <div class="modal">
        <h2>编辑${typeName}</h2>
        <div class="modal-field">
          <label>${isLogistics ? '船公司名称' : '标题'} *</label>
          <input type="text" id="m_title" value="${esc(item.title)}">
        </div>
        ${isLogistics ? `
        <div class="modal-field">
          <label>网站链接</label>
          <input type="url" id="m_link" value="${esc(item.link)}" placeholder="https://">
        </div>
        <div class="modal-field">
          <label>类别</label>
          <select id="m_logi_l1">
            ${logiL1.map(c => `<option value="${c.v}" ${(item.category === c.v || (item.category === 'domestic' && c.v === 'domestic') || (item.category !== 'domestic' && c.v === 'international')) ? 'selected' : ''}>${c.l}</option>`).join('')}
          </select>
        </div>
        <div class="modal-field">
          <label>国家/地区</label>
          <select id="m_logi_l2">
            ${logiCountryMap[item.category === 'international' ? 'international' : 'domestic'].map(c => `<option value="${c}" ${c === item.country ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>` : ''}
        ${(type === 'news' || isMilestone || type === 'expo_preview' || type === 'expo_review') ? `
        <div class="modal-field">
          <label>${isMilestone ? '描述' : '摘要'}</label>
          <textarea id="m_summary">${esc(item.summary)}</textarea>
        </div>` : ''}
        ${!isLogistics ? `
        <div class="modal-field">
          <label>${isMilestone ? '年份' : '日期'}</label>
          <input type="${isMilestone ? 'text' : 'date'}" id="m_date" value="${esc(item.date)}">
        </div>` : ''}
        ${categories.length && !isLogistics ? `
        <div class="modal-field">
          <label>分类</label>
          <select id="m_category">
            ${categories.map(c => `<option value="${c.v}" ${c.v === item.category ? 'selected' : ''}>${c.l}</option>`).join('')}
          </select>
        </div>` : ''}
        ${!isMilestone && !isLogistics ? `
        <div class="modal-field">
          <label>当前图片</label>
          <img class="modal-preview" src="/${stripVer(item.image)}" onerror="this.style.display='none'">
        </div>
        <div class="modal-field">
          <label>替换图片</label>
          <input type="file" id="m_file" accept="image/*">
        </div>` : ''}
        ${!isLogistics ? `
        <div class="modal-field">
          <label>链接</label>
          <input type="text" id="m_link" value="${esc(item.link)}">
        </div>` : ''}
        ${type === 'product' ? `
        <div class="modal-field">
          <label>产品详情</label>
          <div class="editor-toolbar">
            <button type="button" class="btn btn-sm" onclick="openContentImageUpload()">📷 图片</button>
            <button type="button" class="btn btn-sm" onclick="openContentVideoInput()">🎬 视频</button>
            <span class="editor-hint">建议图片宽度≤1200px，视频≤50MB</span>
          </div>
          <div class="editor-area" id="m_content" contenteditable="true">${item.content || ''}</div>
          <input type="file" id="m_content_file" accept="image/*,video/*" style="display:none">
        </div>` : ''}
        <div class="modal-field">
          <label>排序</label>
          <input type="number" id="m_sort" value="${item.sort_order}">
        </div>
        <div class="modal-field">
          <label>显示</label>
          <select id="m_visible">
            <option value="1" ${item.visible ? 'selected' : ''}>显示</option>
            <option value="0" ${!item.visible ? 'selected' : ''}>隐藏</option>
          </select>
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" id="m_cancel">取消</button>
          <button class="btn btn-primary" id="m_save">保存</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  const overlay = document.getElementById('modalOverlay');
  editingItemId = item.id;
  document.getElementById('m_cancel').onclick = () => overlay.remove();

  // 物流二级联动
  var logiL1Select = document.getElementById('m_logi_l1');
  if (logiL1Select) {
    logiL1Select.onchange = function() {
      var l2 = document.getElementById('m_logi_l2');
      var vals = logiCountryMap[this.value] || [];
      l2.innerHTML = vals.map(function(v) { return '<option value="' + v + '">' + v + '</option>'; }).join('');
    };
  }

  document.getElementById('m_save').onclick = () => updateItem(item, overlay);
}

async function saveNewItem(type, overlay) {
  const title = document.getElementById('m_title').value.trim();
  if (!title) { alert('请输入标题'); return; }
  const summary = document.getElementById('m_summary') ? document.getElementById('m_summary').value : '';
  const date = document.getElementById('m_date') ? document.getElementById('m_date').value : '';
  const isLogistics = type === 'logistics';
  let category, country;
  if (isLogistics) {
    category = document.getElementById('m_logi_l1') ? document.getElementById('m_logi_l1').value : '';
    country = document.getElementById('m_logi_l2') ? document.getElementById('m_logi_l2').value : '';
  } else {
    category = document.getElementById('m_category') ? document.getElementById('m_category').value : '';
    country = '';
  }
  const link = document.getElementById('m_link') ? document.getElementById('m_link').value || '' : '';
  const content = document.getElementById('m_content') ? document.getElementById('m_content').innerHTML || '' : '';
  const fileInput = document.getElementById('m_file');
  const sortOrder = allListItems.filter(i => i.list_type === type).length + 1;

  const body = { list_type: type, title, summary, date, category, link, content, sort_order: sortOrder, country };
  const data = await api('/api/list-items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!data || !data.ok) { alert((data && data.error) || '保存失败'); return; }

  // 如果有图片文件，上传
  if (fileInput && fileInput.files[0] && data.item) {
    const fd = new FormData();
    fd.append('file', fileInput.files[0]);
    await fetch(`/api/list-items/${data.item.id}/upload`, { method: 'POST', body: fd });
  }

  overlay.remove();
  await loadListItems();
  renderSidebar();
  renderListItems();
}

async function updateItem(item, overlay) {
  const title = document.getElementById('m_title').value.trim();
  if (!title) { alert('请输入标题'); return; }
  const summary = document.getElementById('m_summary') ? document.getElementById('m_summary').value : '';
  const date = document.getElementById('m_date') ? document.getElementById('m_date').value : '';
  const isLogistics = item.list_type === 'logistics';
  let category, country;
  if (isLogistics) {
    category = document.getElementById('m_logi_l1') ? document.getElementById('m_logi_l1').value : item.category;
    country = document.getElementById('m_logi_l2') ? document.getElementById('m_logi_l2').value : item.country;
  } else {
    category = document.getElementById('m_category') ? document.getElementById('m_category').value : undefined;
    country = undefined;
  }
  const link = document.getElementById('m_link') ? document.getElementById('m_link').value : '';
  const content = document.getElementById('m_content') ? document.getElementById('m_content').innerHTML || '' : '';
  const sortOrder = parseInt(document.getElementById('m_sort').value) || 0;
  const visible = parseInt(document.getElementById('m_visible').value);
  const fileInput = document.getElementById('m_file');

  const body = { title, summary, date, link, content, sort_order: sortOrder, visible };
  if (category !== undefined) body.category = category;
  if (country !== undefined) body.country = country;
  const data = await api(`/api/list-items/${item.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!data || !data.ok) { alert((data && data.error) || '保存失败'); return; }

  if (fileInput && fileInput.files[0]) {
    const fd = new FormData();
    fd.append('file', fileInput.files[0]);
    await fetch(`/api/list-items/${item.id}/upload`, { method: 'POST', body: fd });
  }

  overlay.remove();
  await loadListItems();
  renderSidebar();
  renderListItems();
}

async function openImageUpload(item) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async () => {
    if (!input.files[0]) return;
    const fd = new FormData();
    fd.append('file', input.files[0]);
    const r = await fetch(`/api/list-items/${item.id}/upload`, { method: 'POST', body: fd });
    if (r.status === 401) { location.href = '/admin/static/login.html'; return; }
    const data = await r.json();
    if (data && data.ok) {
      await loadListItems();
      renderListItems();
    } else {
      alert((data && data.error) || '上传失败');
    }
  };
  input.click();
}

async function deleteItem(item) {
  if (!confirm(`确定删除「${item.title}」吗？`)) return;
  const data = await api(`/api/list-items/${item.id}`, { method: 'DELETE' });
  if (data && data.ok) {
    await loadListItems();
    renderSidebar();
    renderListItems();
  } else {
    alert((data && data.error) || '删除失败');
  }
}

// ===================== 内容项操作 =====================
async function saveText(item, value, div) {
  const saved = div.querySelector('.saved');
  saved.textContent = '保存中...';
  const data = await api(`/api/content/${item.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value })
  });
  if (data && data.ok) {
    saved.textContent = '已保存';
    item.value = value;
  } else {
    saved.textContent = '保存失败';
  }
}

async function uploadItem(item, fileInput, div) {
  const saved = div.querySelector('.saved');
  if (!fileInput.files[0]) { saved.textContent = '请先选择图片'; return; }
  saved.textContent = '上传中...';
  const fd = new FormData();
  fd.append('file', fileInput.files[0]);
  const r = await fetch(`/api/upload/${item.id}`, { method: 'POST', body: fd });
  if (r.status === 401) { location.href = '/admin/static/login.html'; return; }
  const data = await r.json();
  if (data && data.ok) {
    saved.textContent = '已替换';
    item.value = data.item.value;
    div.querySelector('.item-preview img').src = stripVer(data.item.value);
    loadBackups(item, div);
  } else {
    saved.textContent = (data && data.error) || '上传失败';
  }
}

async function loadBackups(item, div) {
  const box = div.querySelector('.backups');
  if (!box) return;
  const data = await api(`/api/backups/${item.id}`);
  if (!data || !data.length) { box.innerHTML = ''; return; }
  box.innerHTML = '历史：' + data.map((b, i) => `<a data-id="${b.id}">回滚${i + 1}</a>`).join('');
  box.querySelectorAll('a').forEach(a => {
    a.onclick = async () => {
      const d = await api(`/api/rollback/${a.dataset.id}`, { method: 'POST' });
      if (d && d.ok) {
        item.value = d.item.value;
        const img = div.querySelector('.item-preview img');
        if (img) img.src = stripVer(d.item.value);
        const ti = div.querySelector('input[type=text]');
        if (ti) ti.value = d.item.value;
        loadBackups(item, div);
      }
    };
  });
}

// ===================== 产品详情富文本编辑器 =====================
function openContentImageUpload() {
  var input = document.getElementById('m_content_file');
  if (!input) return;
  input.click();
  input.onchange = async function() {
    var file = input.files[0];
    if (!file) return;
    var isVideo = file.type.startsWith('video/');
    var fd = new FormData();
    fd.append('file', file);
    var editor = document.getElementById('m_content');
    editor.focus();
    document.execCommand('insertText', false, ' [正在上传' + (isVideo ? '视频' : '图片') + '...] ');
    try {
      var r = await fetch('/api/upload-content-image', { method: 'POST', body: fd, credentials: 'same-origin' });
      var d = await r.json();
      if (d.ok && d.url) {
        var sel = window.getSelection();
        if (sel && sel.rangeCount) {
          sel.deleteFromDocument();
          if (isVideo) {
            var vw = document.createElement('video');
            vw.src = '/' + d.url;
            vw.controls = true;
            vw.style.maxWidth = '100%';
            vw.style.margin = '8px 0';
            vw.style.borderRadius = '6px';
            var range = sel.getRangeAt(0);
            range.insertNode(vw);
          } else {
            var img = document.createElement('img');
            img.src = '/' + d.url;
            img.style.maxWidth = '100%';
            img.style.margin = '8px 0';
            img.alt = '产品详情图片';
            var range = sel.getRangeAt(0);
            range.insertNode(img);
          }
          range.collapse(false);
        }
      } else {
        alert('上传失败：' + (d.error || '未知错误'));
      }
    } catch(e) {
      alert('上传失败：' + e.message);
    }
    input.value = '';
  };
}

// 插入视频链接
function openContentVideoInput() {
  var url = prompt('请输入视频链接（支持 YouTube、B站、MP4 直链等）\n推荐尺寸：16:9，分辨率≥720p');
  if (!url) return;
  var editor = document.getElementById('m_content');
  if (!editor) return;
  editor.focus();
  var sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  var range = sel.getRangeAt(0);

  // 尝试识别常见视频平台
  var embedHtml = '';
  var ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  var biliMatch = url.match(/bilibili\.com\/video\/(BV[\w]+)/);
  var mp4Match = url.match(/\.(mp4|webm|ogg)(\?|$)/i);

  if (ytMatch) {
    embedHtml = '<iframe width="100%" height="400" src="https://www.youtube.com/embed/' + ytMatch[1] + '" frameborder="0" allowfullscreen style="border-radius:8px;margin:8px 0"></iframe>';
  } else if (biliMatch) {
    embedHtml = '<iframe width="100%" height="400" src="https://player.bilibili.com/player.html?bvid=' + biliMatch[1] + '" frameborder="0" allowfullscreen style="border-radius:8px;margin:8px 0"></iframe>';
  } else if (mp4Match || url.startsWith('http')) {
    embedHtml = '<video controls style="max-width:100%;margin:8px 0;border-radius:6px"><source src="' + url + '" type="video/mp4">您的浏览器不支持视频播放</video>';
  } else {
    embedHtml = '<a href="' + url + '" target="_blank" rel="noopener">' + url + '</a>';
  }

  var temp = document.createElement('div');
  temp.innerHTML = embedHtml;
  while (temp.firstChild) {
    range.insertNode(temp.firstChild);
  }
  range.collapse(false);
}

// ===================== 数据加载 =====================
async function loadContent() {
  const data = await api('/api/content');
  if (data) allItems = data;
}

async function loadListItems() {
  const data = await api('/api/list-items');
  if (data) allListItems = data;
}

document.getElementById('logoutBtn').onclick = async () => {
  await fetch('/api/logout', { method: 'POST' });
  location.href = '/admin/static/login.html';
};

// ===================== 信息采集管理 =====================
var allInfoItems = [];

async function loadInfoCollections() {
  const r = await fetch('/api/info-collections');
  allInfoItems = await r.json();
  renderInfoList();
}

function renderInfoList() {
  const box = document.getElementById('items');
  box.innerHTML = '<div class="add-bar"><span style="font-size:14px;color:#6b7280">共 ' + allInfoItems.length + ' 条提交记录</span></div>';
  allInfoItems.forEach(function(data) {
    const card = document.createElement('div');
    card.className = 'list-card';
    card.innerHTML =
      '<div class="list-card-body" style="flex:1">' +
        '<div class="list-card-title">' + esc(data.name) + ' (' + esc(data.company) + ')</div>' +
        '<div class="list-card-meta">' + esc(data.contact) + (data.address ? ' · ' + esc(data.address) : '') + ' · ' + esc(data.roles) + '</div>' +
        '<div class="list-card-meta" style="color:#9ca3af;font-size:12px">' + data.created_at + '</div>' +
      '</div>' +
      '<div class="list-card-actions">' +
        '<button class="btn btn-ghost btn-sm view-btn">查看</button>' +
        '<button class="btn btn-danger btn-sm del-btn">删除</button>' +
      '</div>';
    card.querySelector('.view-btn').onclick = function() { openInfoDetail(data); };
    card.querySelector('.del-btn').onclick = function() { deleteInfoItem(data.id); };
    box.appendChild(card);
  });
}

function openInfoDetail(data) {
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center';
  overlay.innerHTML =
    '<div style="background:#fff;border-radius:12px;padding:32px;width:480px;max-width:calc(100vw - 32px);max-height:80vh;overflow-y:auto">' +
      '<h2 style="margin:0 0 20px;font-size:18px">提交详情</h2>' +
      '<table style="width:100%;border-collapse:collapse">' +
        '<tr><td style="padding:8px 12px;color:#6b7280;font-size:13px;border-bottom:1px solid #f3f4f6">姓名</td><td style="padding:8px 12px;font-size:14px;border-bottom:1px solid #f3f4f6">' + esc(data.name) + '</td></tr>' +
        '<tr><td style="padding:8px 12px;color:#6b7280;font-size:13px;border-bottom:1px solid #f3f4f6">手机号</td><td style="padding:8px 12px;font-size:14px;border-bottom:1px solid #f3f4f6">' + esc(data.contact) + '</td></tr>' +
        '<tr><td style="padding:8px 12px;color:#6b7280;font-size:13px;border-bottom:1px solid #f3f4f6">公司名称</td><td style="padding:8px 12px;font-size:14px;border-bottom:1px solid #f3f4f6">' + esc(data.company) + '</td></tr>' +
        '<tr><td style="padding:8px 12px;color:#6b7280;font-size:13px;border-bottom:1px solid #f3f4f6">地址</td><td style="padding:8px 12px;font-size:14px;border-bottom:1px solid #f3f4f6">' + (data.address ? esc(data.address) : '-') + '</td></tr>' +
        '<tr><td style="padding:8px 12px;color:#6b7280;font-size:13px;border-bottom:1px solid #f3f4f6">身份类型</td><td style="padding:8px 12px;font-size:14px;border-bottom:1px solid #f3f4f6">' + esc(data.roles) + '</td></tr>' +
        '<tr><td style="padding:8px 12px;color:#6b7280;font-size:13px;border-bottom:1px solid #f3f4f6">提交时间</td><td style="padding:8px 12px;font-size:14px;border-bottom:1px solid #f3f4f6">' + data.created_at + '</td></tr>' +
      '</table>' +
      '<div style="text-align:center;margin-top:20px"><button class="btn btn-ghost" id="closeInfoDetail">关闭</button></div>' +
    '</div>';
  document.body.appendChild(overlay);
  document.getElementById('closeInfoDetail').onclick = function() { overlay.remove(); };
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
}

async function deleteInfoItem(id) {
  if (!confirm('确定删除该提交记录吗？')) return;
  const r = await fetch('/api/info-collections/' + id, { method: 'DELETE' });
  const data = await r.json();
  if (data.ok) {
    await loadInfoCollections();
  } else {
    alert((data && data.error) || '删除失败');
  }
}

// ===================== 分类管理 =====================
var allCategories = [];

async function loadCategories() {
  const data = await api('/api/categories?type=product');
  if (data) { allCategories = data; productCategories = data; }
  renderCategoryList();
  if (currentTab === 'product' || currentTab === 'categories') renderSidebar();
}

function renderCategoryList() {
  var box = document.getElementById('items');
  box.innerHTML = '<div class="add-bar"><button class="btn btn-primary" id="addCatBtn">+ 新增分类</button><span style="flex:1"></span><span style="font-size:14px;color:#6b7280">共 ' + allCategories.length + ' 个分类</span></div>';
  if (!allCategories.length) {
    box.innerHTML += '<p class="empty">暂无分类</p>';
  } else {
    allCategories.forEach(function(cat) {
      var card = document.createElement('div');
      card.className = 'list-card';
      card.innerHTML = '<div class="list-card-body" style="flex:1"><div class="list-card-title">' + esc(cat.label) + '</div><div class="list-card-meta">标识：' + esc(cat.value) + ' · 排序：' + cat.sort_order + '</div></div>' +
        '<div class="list-card-actions"><button class="btn btn-ghost btn-sm edit-cat-btn">编辑</button><button class="btn btn-danger btn-sm del-cat-btn">删除</button></div>';
      card.querySelector('.edit-cat-btn').onclick = function() { openCategoryModal(cat); };
      card.querySelector('.del-cat-btn').onclick = function() { deleteCategory(cat); };
      box.appendChild(card);
    });
  }
  document.getElementById('addCatBtn').onclick = function() { openCategoryModal(); };
}

function openCategoryModal(cat) {
  var isEdit = !!cat;
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center';
  overlay.innerHTML = '<div style="background:#fff;border-radius:12px;padding:32px;width:420px;max-width:calc(100vw - 32px)">' +
    '<h2 style="margin:0 0 20px;font-size:18px">' + (isEdit ? '编辑分类' : '新增分类') + '</h2>' +
    '<div class="modal-field"><label>名称 *</label><input type="text" id="m_cat_label" value="' + (isEdit ? esc(cat.label) : '') + '" placeholder="显示名称"></div>' +
    (isEdit ? '' : '<div class="modal-field"><label>标识 *</label><input type="text" id="m_cat_value" placeholder="英文标识，如 frozen-products"></div>') +
    '<div class="modal-field"><label>排序</label><input type="number" id="m_cat_sort" value="' + (isEdit ? cat.sort_order : '0') + '"></div>' +
    '<div class="modal-actions" style="margin-top:20px;display:flex;gap:8px;justify-content:flex-end">' +
    '<button class="btn btn-ghost" id="m_cat_cancel">取消</button>' +
    '<button class="btn btn-primary" id="m_cat_save">保存</button></div></div>';
  document.body.appendChild(overlay);
  document.getElementById('m_cat_cancel').onclick = function() { overlay.remove(); };
  document.getElementById('m_cat_save').onclick = async function() {
    var label = document.getElementById('m_cat_label').value.trim();
    if (!label) { alert('请输入名称'); return; }
    if (isEdit) {
      var sort = parseInt(document.getElementById('m_cat_sort').value) || 0;
      var data = await api('/api/categories/' + cat.id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label: label, sort_order: sort }) });
      if (data && data.ok) { overlay.remove(); await loadCategories(); }
      else { alert((data && data.error) || '保存失败'); }
    } else {
      var value = document.getElementById('m_cat_value').value.trim();
      if (!value) { alert('请输入标识'); return; }
      var sort = parseInt(document.getElementById('m_cat_sort').value) || 0;
      var data = await api('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'product', value: value, label: label, sort_order: sort }) });
      if (data && data.ok) { overlay.remove(); await loadCategories(); }
      else { alert((data && data.error) || '保存失败'); }
    }
  };
}

async function deleteCategory(cat) {
  if (!confirm('确定删除分类「' + cat.label + '」吗？')) return;
  var data = await api('/api/categories/' + cat.id, { method: 'DELETE' });
  if (data && data.ok) { await loadCategories(); }
  else { alert((data && data.error) || '删除失败'); }
}

// ===================== 系统设置 =====================
var allSettings = [];

async function loadSettings() {
  var data = await api('/api/settings');
  if (data) allSettings = data;
  renderSettings();
}

function renderSettings() {
  var box = document.getElementById('items');
  box.innerHTML = '<h2 style="margin:0 0 20px;font-size:18px">系统设置</h2>';
  if (!allSettings.length) {
    box.innerHTML += '<p class="empty">暂无设置项</p>';
    return;
  }
  allSettings.forEach(function(s) {
    var div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = '<div class="item-meta"><div><span class="item-label">' + esc(s.label) + '</span></div><div class="item-key">' + esc(s.key) + '</div></div>' +
      '<div class="item-actions"><input type="text" class="setting-input" data-key="' + esc(s.key) + '" value="' + esc(s.value) + '" style="flex:1;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:14px">' +
      '<button class="btn btn-primary save-setting-btn" style="margin-left:8px">保存</button><span class="saved"></span></div>';
    var input = div.querySelector('.setting-input');
    div.querySelector('.save-setting-btn').onclick = async function() {
      var saved = div.querySelector('.saved');
      saved.textContent = '保存中...';
      var body = {};
      body[input.dataset.key] = input.value;
      var data = await api('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      saved.textContent = data && data.ok ? '已保存' : '保存失败';
    };
    box.appendChild(div);
  });
}

// ===================== 权限管理 =====================
var allUsers = [];

async function loadUsers() {
  var data = await api('/api/users');
  if (data) allUsers = data;
  renderUserList();
}

function renderUserList() {
  var box = document.getElementById('items');
  box.innerHTML = '<div class="add-bar"><button class="btn btn-primary" id="addUserBtn">+ 新增管理员</button><span style="flex:1"></span><span style="font-size:14px;color:#6b7280">共 ' + allUsers.length + ' 个用户</span></div>';
  if (!allUsers.length) {
    box.innerHTML += '<p class="empty">暂无用户</p>';
  } else {
    allUsers.forEach(function(u) {
      var card = document.createElement('div');
      card.className = 'list-card';
      var roleLabel = u.role === 'admin' ? '超级管理员' : u.role === 'editor' ? '编辑' : u.role;
      card.innerHTML = '<div class="list-card-body" style="flex:1"><div class="list-card-title">' + esc(u.username) + '</div>' +
        '<div class="list-card-meta">角色：' + roleLabel + ' · 创建时间：' + (u.created_at || '-') + '</div></div>' +
        '<div class="list-card-actions"><button class="btn btn-ghost btn-sm reset-user-btn">重置</button>' +
        (u.username !== 'admin' ? '<button class="btn btn-danger btn-sm del-user-btn">删除</button>' : '') + '</div>';
      card.querySelector('.reset-user-btn').onclick = function() { openUserModal(u); };
      if (u.username !== 'admin') {
        card.querySelector('.del-user-btn').onclick = function() { deleteUser(u); };
      }
      box.appendChild(card);
    });
  }
  document.getElementById('addUserBtn').onclick = function() { openUserModal(); };
}

function openUserModal(user) {
  var isEdit = !!user;
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center';
  overlay.innerHTML = '<div style="background:#fff;border-radius:12px;padding:32px;width:420px;max-width:calc(100vw - 32px)">' +
    '<h2 style="margin:0 0 20px;font-size:18px">' + (isEdit ? '重置用户' : '新增管理员') + '</h2>' +
    (isEdit ? '' : '<div class="modal-field"><label>用户名 *</label><input type="text" id="m_user_name" placeholder="登录用户名"></div>') +
    '<div class="modal-field"><label>' + (isEdit ? '新密码（留空不修改）' : '密码 *') + '</label><input type="password" id="m_user_pwd" placeholder="' + (isEdit ? '留空则不修改' : '请输入密码') + '"></div>' +
    '<div class="modal-field"><label>角色</label><select id="m_user_role">' +
    '<option value="admin" ' + (isEdit && user.role === 'admin' ? 'selected' : '') + '>超级管理员</option>' +
    '<option value="editor" ' + (isEdit && user.role === 'editor' ? 'selected' : '') + '>编辑</option></select></div>' +
    '<div class="modal-actions" style="margin-top:20px;display:flex;gap:8px;justify-content:flex-end">' +
    '<button class="btn btn-ghost" id="m_user_cancel">取消</button>' +
    '<button class="btn btn-primary" id="m_user_save">保存</button></div></div>';
  document.body.appendChild(overlay);
  document.getElementById('m_user_cancel').onclick = function() { overlay.remove(); };
  document.getElementById('m_user_save').onclick = async function() {
    if (isEdit) {
      var pwd = document.getElementById('m_user_pwd').value;
      var role = document.getElementById('m_user_role').value;
      var body = { role: role };
      if (pwd) body.password = pwd;
      var data = await api('/api/users/' + user.id + '/reset', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (data && data.ok) { overlay.remove(); await loadUsers(); }
      else { alert((data && data.error) || '保存失败'); }
    } else {
      var name = document.getElementById('m_user_name').value.trim();
      var pwd = document.getElementById('m_user_pwd').value;
      var role = document.getElementById('m_user_role').value;
      if (!name || !pwd) { alert('用户名和密码必填'); return; }
      var data = await api('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: name, password: pwd, role: role }) });
      if (data && data.ok) { overlay.remove(); await loadUsers(); }
      else { alert((data && data.error) || '保存失败'); }
    }
  };
}

async function deleteUser(user) {
  if (!confirm('确定删除用户「' + user.username + '」吗？')) return;
  var data = await api('/api/users/' + user.id, { method: 'DELETE' });
  if (data && data.ok) { await loadUsers(); }
  else { alert((data && data.error) || '删除失败'); }
}

(async function init() {
  const me = await api('/api/me');
  if (!me || !me.user) { location.href = '/admin/static/login.html'; return; }


  await loadContent();
  await loadListItems();
  // 预加载产品分类，供产品管理侧边栏使用
  var catData = await api('/api/categories?type=product');
  if (catData) productCategories = catData;
  renderSidebar();
  renderContent();
})();
