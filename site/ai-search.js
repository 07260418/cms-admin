/* ============================================================
   AI 智能搜索 — 全站内容搜索
   支持产品/新闻/会展/大事记 模糊匹配 + 智能排序
   ============================================================ */
(function () {
  // 避免重复加载
  if (window.__aiSearchLoaded) return;
  window.__aiSearchLoaded = true;

  // ===================== 样式注入 =====================
  var style = document.createElement('style');
  style.textContent = `
    .ai-search-overlay {
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(0,0,0,.45); backdrop-filter: blur(4px);
      display: none; align-items: flex-start; justify-content: center;
      padding-top: 80px;
    }
    .ai-search-overlay.open { display: flex; }
    .ai-search-panel {
      background: #fff; border-radius: 16px;
      width: 640px; max-width: calc(100vw - 40px);
      max-height: calc(100vh - 120px);
      box-shadow: 0 16px 64px rgba(0,0,0,.2);
      overflow: hidden;
      animation: aiSearchSlide .3s ease-out;
    }
    @keyframes aiSearchSlide {
      from { opacity: 0; transform: translateY(-20px) scale(.97); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .ai-search-input-wrap {
      display: flex; align-items: center; gap: 12px;
      padding: 16px 20px; border-bottom: 1px solid #e5e7eb;
    }
    .ai-search-input-wrap svg { flex-shrink: 0; opacity: .4; }
    .ai-search-input {
      flex: 1; border: none; outline: none;
      font-size: 16px; font-family: inherit;
      color: #1f2937; background: transparent;
    }
    .ai-search-input::placeholder { color: #9ca3af; }
    .ai-search-close {
      width: 32px; height: 32px; border: none; background: #f3f4f6;
      border-radius: 50%; cursor: pointer; font-size: 18px;
      display: flex; align-items: center; justify-content: center;
      color: #6b7280; transition: all .2s; flex-shrink: 0;
    }
    .ai-search-close:hover { background: #e5e7eb; color: #1f2937; }
    .ai-search-results {
      overflow-y: auto; max-height: calc(100vh - 240px);
      padding: 8px 0;
    }
    .ai-search-empty {
      padding: 48px 20px; text-align: center;
      color: #9ca3af; font-size: 14px;
    }
    .ai-search-empty strong { color: #6b7280; }
    .ai-search-group-title {
      padding: 8px 20px 4px; font-size: 11px; font-weight: 600;
      color: #9ca3af; text-transform: uppercase; letter-spacing: .5px;
    }
    .ai-search-item {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 20px; cursor: pointer;
      transition: background .15s; text-decoration: none; color: inherit;
    }
    .ai-search-item:hover { background: #f9fafb; }
    .ai-search-item-img {
      width: 40px; height: 30px; border-radius: 4px;
      object-fit: cover; border: 1px solid #e5e7eb;
      background: #f3f4f6; flex-shrink: 0;
    }
    .ai-search-item-body { flex: 1; min-width: 0; }
    .ai-search-item-title {
      font-size: 14px; font-weight: 500; color: #1f2937;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .ai-search-item-desc {
      font-size: 12px; color: #9ca3af;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      margin-top: 1px;
    }
    .ai-search-item-tag {
      font-size: 10px; padding: 2px 6px; border-radius: 4px;
      background: #ecfdf5; color: #0a7d52; flex-shrink: 0;
    }
    .ai-search-shortcut {
      display: flex; align-items: center; gap: 16px;
      padding: 10px 20px; border-top: 1px solid #e5e7eb;
      font-size: 12px; color: #9ca3af;
    }
    .ai-search-shortcut kbd {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 22px; height: 22px; padding: 0 4px;
      background: #f3f4f6; border: 1px solid #d1d5db;
      border-radius: 4px; font-size: 11px; font-family: inherit;
      color: #6b7280;
    }
    .ai-search-highlight { color: #0a7d52; font-weight: 600; }
  `;
  document.head.appendChild(style);

  // ===================== 键盘快捷键 =====================
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      toggleSearch();
    }
    if (e.key === 'Escape' && overlay) {
      overlay.classList.remove('open');
    }
  });

  // ===================== 构建 UI =====================
  var overlay = document.createElement('div');
  overlay.className = 'ai-search-overlay';
  overlay.id = 'aiSearchOverlay';
  overlay.innerHTML =
    '<div class="ai-search-panel">' +
      '<div class="ai-search-input-wrap">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>' +
        '<input type="text" class="ai-search-input" id="aiSearchInput" placeholder="搜索产品、新闻、会展..." autofocus>' +
        '<button class="ai-search-close" id="aiSearchClose">&times;</button>' +
      '</div>' +
      '<div class="ai-search-results" id="aiSearchResults">' +
        '<div class="ai-search-empty">输入关键词开始搜索</div>' +
      '</div>' +
      '<div class="ai-search-shortcut">' +
        '<span><kbd>Ctrl+K</kbd> 打开搜索</span>' +
        '<span><kbd>&uarr;</kbd> <kbd>&darr;</kbd> 导航</span>' +
        '<span><kbd>Esc</kbd> 关闭</span>' +
      '</div>' +
    '</div>';

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) overlay.classList.remove('open');
  });
  document.body.appendChild(overlay);

  var input = document.getElementById('aiSearchInput');
  var results = document.getElementById('aiSearchResults');
  var closeBtn = document.getElementById('aiSearchClose');

  closeBtn.onclick = function () { overlay.classList.remove('open'); };

  // ===================== 搜索逻辑 =====================
  var allData = [];
  var searchTimer = null;

  function highlightText(text, keyword) {
    if (!text || !keyword) return esc(text || '');
    var re = new RegExp('(' + keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    return esc(text).replace(re, '<span class="ai-search-highlight">$1</span>');
  }

  function esc(s) {
    return (s || '').replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function stripVer(v) { return (v || '').split('?v=')[0]; }

  function loadData() {
    var fetches = [
      fetch('/api/list-items?type=product').then(function (r) { return r.ok ? r.json() : []; }),
      fetch('/api/list-items?type=news').then(function (r) { return r.ok ? r.json() : []; }),
      fetch('/api/list-items?type=expo_preview').then(function (r) { return r.ok ? r.json() : []; }),
      fetch('/api/list-items?type=expo_review').then(function (r) { return r.ok ? r.json() : []; }),
      fetch('/api/list-items?type=milestone').then(function (r) { return r.ok ? r.json() : []; })
    ];
    return Promise.all(fetches).then(function (results) {
      allData = [];
      results[0].forEach(function (i) { i._type = 'product'; i._typeLabel = '产品'; allData.push(i); });
      results[1].forEach(function (i) { i._type = 'news'; i._typeLabel = '新闻'; allData.push(i); });
      results[2].forEach(function (i) { i._type = 'expo'; i._typeLabel = '会展预告'; allData.push(i); });
      results[3].forEach(function (i) { i._type = 'expo'; i._typeLabel = '会展回顾'; allData.push(i); });
      results[4].forEach(function (i) { i._type = 'milestone'; i._typeLabel = '大事记'; allData.push(i); });
    });
  }

  function getItemLink(item) {
    if (item._type === 'product') return 'supply-detail.html?name=' + encodeURIComponent(item.title);
    if (item._type === 'news') return item.link || 'news-detail.html';
    if (item._type === 'expo') return item.link || 'exhibition-detail.html';
    if (item._type === 'milestone') return item.link || 'events.html';
    return '#';
  }

  function getItemImage(item) {
    if (item._type === 'milestone') return '';
    return item.image ? '/' + stripVer(item.image) : '';
  }

  function doSearch(keyword) {
    if (!keyword.trim()) {
      results.innerHTML = '<div class="ai-search-empty">输入关键词开始搜索</div>';
      return;
    }

    var kw = keyword.toLowerCase();
    var hits = [];
    var seen = {};

    allData.forEach(function (item) {
      // 避免重复
      var key = item._type + '-' + item.id;
      if (seen[key]) return;
      seen[key] = true;

      var title = (item.title || '').toLowerCase();
      var summary = (item.summary || '').toLowerCase();
      var category = (item.category || '').toLowerCase();
      var content = (item.content || '').toLowerCase();

      var score = 0;
      if (title === kw) score += 100;
      else if (title.indexOf(kw) !== -1) {
        score += 50;
        // 标题前面匹配加分
        if (title.indexOf(kw) === 0) score += 20;
      }
      if (summary.indexOf(kw) !== -1) score += 10;
      if (category.indexOf(kw) !== -1) score += 5;
      if (content.indexOf(kw) !== -1) score += 2;
      // 模糊匹配（逐字匹配）
      var chars = kw.split('');
      var matchCount = 0;
      var lastIdx = -1;
      for (var ci = 0; ci < chars.length; ci++) {
        var idx = title.indexOf(chars[ci], lastIdx + 1);
        if (idx > lastIdx) { matchCount++; lastIdx = idx; }
      }
      if (matchCount === chars.length && title !== kw) score += 15;

      if (score > 0) {
        hits.push({ item: item, score: score });
      }
    });

    // 按分数排序
    hits.sort(function (a, b) { return b.score - a.score; });
    // 取前 20 条
    hits = hits.slice(0, 20);

    if (!hits.length) {
      results.innerHTML = '<div class="ai-search-empty">没有找到与 <strong>' + esc(keyword) + '</strong> 相关的内容</div>';
      return;
    }

    // 按类型分组
    var groups = {};
    var groupOrder = ['product', 'news', 'expo', 'milestone'];
    var groupLabels = { product: '产品', news: '新闻资讯', expo: '会展活动', milestone: '大事记' };

    hits.forEach(function (hit) {
      var t = hit.item._type;
      if (!groups[t]) groups[t] = [];
      groups[t].push(hit);
    });

    var html = '';
    groupOrder.forEach(function (type) {
      if (!groups[type]) return;
      html += '<div class="ai-search-group-title">' + groupLabels[type] + '</div>';
      groups[type].forEach(function (hit) {
        var item = hit.item;
        var img = getItemImage(item);
        html += '<a class="ai-search-item" href="' + getItemLink(item) + '">';
        if (img) {
          html += '<img class="ai-search-item-img" src="' + img + '" alt="" onerror="this.style.display=\'none\'">';
        } else {
          html += '<div class="ai-search-item-img" style="display:flex;align-items:center;justify-content:center;font-size:14px;color:#9ca3af">' +
            (item._type === 'milestone' ? '📅' : '📄') + '</div>';
        }
        html += '<div class="ai-search-item-body">';
        html += '<div class="ai-search-item-title">' + highlightText(item.title, keyword) + '</div>';
        html += '<div class="ai-search-item-desc">' + highlightText((item.summary || item.date || '').substring(0, 60), keyword) + '</div>';
        html += '</div>';
        html += '<span class="ai-search-item-tag">' + item._typeLabel + '</span>';
        html += '</a>';
      });
    });

    results.innerHTML = html;
  }

  function toggleSearch() {
    var isOpen = overlay.classList.contains('open');
    if (isOpen) {
      overlay.classList.remove('open');
    } else {
      overlay.classList.add('open');
      setTimeout(function () { input.focus(); input.select(); }, 100);
      if (!allData.length) loadData();
    }
  }

  // 搜索防抖
  input.addEventListener('input', function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () { doSearch(input.value); }, 200);
  });

  // 键盘导航
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      var items = results.querySelectorAll('.ai-search-item');
      if (!items.length) return;
      var current = results.querySelector('.ai-search-item:hover') || results.querySelector('.ai-search-item');
      var idx = Array.from(items).indexOf(current);
      if (e.key === 'ArrowDown') idx = Math.min(idx + 1, items.length - 1);
      else idx = Math.max(idx - 1, 0);
      items[idx].scrollIntoView({ block: 'nearest' });
      items[idx].style.background = '#f3f4f6';
      Array.from(items).forEach(function (el, i) {
        if (i !== idx) el.style.background = '';
      });
    }
    if (e.key === 'Enter') {
      var hovered = results.querySelector('.ai-search-item[style*="background: #f3f4f6"]') ||
                    results.querySelector('.ai-search-item');
      if (hovered) { window.location.href = hovered.getAttribute('href'); }
    }
  });

  // 预加载数据
  loadData();

  // 暴露全局方法
  window.aiSearch = { toggle: toggleSearch, open: function () { toggleSearch(); } };

  console.log('🔍 AI 智能搜索已加载 (Ctrl+K 打开)');
})();
