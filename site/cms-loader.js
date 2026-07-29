(function () {
  // 根据当前页面文件名推断 page key
  var pageMap = {
    'sy-index.html': 'home',
    'supply.html': 'supply',
    'supply-detail.html': 'supply-detail',
    'news.html': 'news',
    'exhibition.html': 'exhibition',
    'logistics.html': 'logistics',
    'park.html': 'park',
    'partner.html': 'partner',
    'events.html': 'events',
    'tourism.html': 'tourism',
    'development.html': 'development',
    'testing.html': 'testing',
    'education.html': 'education',
    'training.html': 'training',
    'certification.html': 'certification',
    'supply-finance.html': 'supply-finance'
  };
  var path = location.pathname.split('/').pop() || 'sy-index.html';
  var page = pageMap[path] || 'home';

  function stripVer(v) { return (v || '').split('?v=')[0]; }

  function applyContent(list) {
    var map = {};
    list.forEach(function (c) { map[c.key] = c.value; });
    document.querySelectorAll('[data-cms]').forEach(function (el) {
      var key = el.getAttribute('data-cms');
      var val = map[key];
      if (val === undefined || val === '') return;
      var mode = el.getAttribute('data-cms-mode') || 'auto';
      if (el.tagName === 'IMG' || mode === 'src') {
        el.src = val;
      } else if (mode === 'bg') {
        el.style.backgroundImage = "url('" + stripVer(val) + "')";
      } else if (mode === 'html') {
        el.innerHTML = val;
      } else {
        el.textContent = val;
      }
    });
    // Banner 背景替换：data-cms-banner="page.banner"
    document.querySelectorAll('[data-cms-banner]').forEach(function (el) {
      var key = el.getAttribute('data-cms-banner');
      var val = map[key];
      if (val === undefined || val === '') return;
      el.style.backgroundImage = "url('" + stripVer(val) + "')";
    });
    // Banner 跳转链接：data-cms-link="page.bannerX_link"
    document.querySelectorAll('[data-cms-link]').forEach(function (el) {
      var key = el.getAttribute('data-cms-link');
      var val = map[key];
      if (val === undefined || val === '') return;
      if (el.tagName === 'A') {
        el.href = val;
        el.target = '_blank';
        el.rel = 'noopener';
      }
    });
  }

  // 拉取当前页面 + home（home 有公共内容如 logo、页脚）
  var pages = page === 'home' ? 'home' : 'home,' + page;
  fetch('/api/content?batch=' + encodeURIComponent(pages))
    .then(function (r) {
      if (!r.ok) {
        // fallback: 逐页拉取
        return Promise.all(pages.split(',').map(function (p) {
          return fetch('/api/content?page=' + encodeURIComponent(p)).then(function (r) { return r.ok ? r.json() : []; });
        })).then(function (arr) { return arr.flat(); });
      }
      return r.json();
    })
    .then(applyContent)
    .catch(function () { /* 静态默认值兜底 */ });
})();
