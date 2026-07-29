(function () {
  var path = location.pathname.split('/').pop() || 'sy-index.html';

  function stripVer(v) { return (v || '').split('?v=')[0]; }
  function esc(s) { return (s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmtDate(s) { return (s || '').replace(/-/g, '.'); }

  // ===================== 新闻列表（news.html） =====================
  if (path === 'news.html') {
    fetch('/api/list-items?type=news')
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (items) {
        if (!items.length) return;
        var container = document.querySelector('.news-list');
        if (!container) return;
        var html = '';
        items.forEach(function (item, i) {
          var d = (item.date || '').split('-');
          var day = d[2] || '';
          var month = d[0] + '-' + (d[1] || '');
          var img = esc(stripVer(item.image)).replace(/ /g, "%20");
          var link = esc(item.link || 'news-detail.html');
          if (i === 0) {
            // 首条：Featured 大卡片（左图右文）
            html += '<a href="' + link + '" class="news-featured" data-category="' + esc(item.category || 'industry') + '" data-aos="fade-up">' +
              '<div class="news-featured-img"><img src="' + img + '" alt=""></div>' +
              '<div class="news-featured-body">' +
              '<h3>' + esc(item.title) + '</h3>' +
              '<p>' + esc(item.summary) + '</p>' +
              '<span class="news-featured-date">' + esc(item.date) + '</span>' +
              '<span class="news-more">阅读详情 <span class="news-arrow">→</span></span>' +
              '</div></a>';
          } else {
            html += '<a href="' + link + '" class="news-item" data-category="' + esc(item.category || 'industry') + '" data-aos="fade-up" data-aos-delay="' + ((i % 8) * 50) + '">' +
              '<div class="news-date"><span class="news-day">' + esc(day) + '</span><span class="news-month">' + esc(month) + '</span></div>' +
              '<div class="news-item-body">' +
              '<h3>' + esc(item.title) + '</h3>' +
              '<p>' + esc(item.summary) + '</p>' +
              '<span class="news-item-date">' + esc(item.date) + '</span>' +
              '</div>' +
              '<div class="news-item-thumb"><img src="' + img + '" alt=""></div>' +
              '</a>';
          }
        });
        container.innerHTML = html;
        if (window.AOS) AOS.refresh();
        reinitNews();
      })
      .catch(function () {});
  }

  // ===================== 产品列表（supply.html） =====================
  if (path === 'supply.html') {
    fetch('/api/list-items?type=product')
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (items) {
        if (!items.length) return;
        var grid = document.getElementById('supplyGrid');
        if (!grid) return;
        grid.innerHTML = items.map(function (item, i) {
          return '<div class="supply-card" data-category="' + esc(item.category || 'frozen-products') + '" data-aos="fade-up" data-aos-delay="' + ((i % 8) * 50) + '">' +
            '<div class="supply-card-img"><img src="' + esc(stripVer(item.image)).replace(/ /g,"%20") + '" alt="' + esc(item.title) + '" loading="lazy"></div>' +
            '<div class="supply-card-body"><h3>' + esc(item.title) + '</h3></div>' +
            '</div>';
        }).join('');
        reinitSupply();
      })
      .catch(function () {});
  }

  // ===================== 会展列表（exhibition.html） =====================
  if (path === 'exhibition.html') {
    Promise.all([
      fetch('/api/list-items?type=expo_preview').then(function (r) { return r.ok ? r.json() : []; }),
      fetch('/api/list-items?type=expo_review').then(function (r) { return r.ok ? r.json() : []; })
    ])
      .then(function (results) {
        var previewItems = results[0];
        var reviewItems = results[1];

        if (previewItems.length) {
          var previewGrid = document.querySelector('#tab-preview .expo-grid');
          if (previewGrid) {
            previewGrid.innerHTML = previewItems.map(function (item) {
              return '<a href="' + esc(item.link || 'exhibition-detail.html') + '" class="expo-card">' +
                '<div class="expo-card-img"><img src="' + esc(stripVer(item.image)).replace(/ /g,"%20") + '" alt="' + esc(item.title) + '"></div>' +
                '<div class="expo-card-body"><h3>' + esc(item.title) + '</h3><span class="expo-card-date">' + esc(item.date) + '</span></div>' +
                '</a>';
            }).join('');
          }
        }

        if (reviewItems.length) {
          var reviewGrid = document.querySelector('#tab-review .expo-grid');
          if (reviewGrid) {
            reviewGrid.innerHTML = reviewItems.map(function (item) {
              return '<a href="' + esc(item.link || 'exhibition-detail.html') + '" class="expo-card">' +
                '<div class="expo-card-img"><img src="' + esc(stripVer(item.image)).replace(/ /g,"%20") + '" alt="' + esc(item.title) + '"></div>' +
                '<div class="expo-card-body"><h3>' + esc(item.title) + '</h3><span class="expo-card-date">' + esc(item.date) + '</span></div>' +
                '</a>';
            }).join('');
          }
        }

        if (previewItems.length || reviewItems.length) {
          reinitExpo();
        }
      })
      .catch(function () {});
  }

  // ===================== 物流页面（logistics.html） =====================
  if (path === 'logistics.html') {
    fetch('/api/list-items?type=logistics')
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (items) {
        if (!items.length) return;
        // Build COUNTRIES structure from flat logistics data
        var countryMap = {};
        items.forEach(function (item) {
          var country = item.country || '';
          var region = item.category || 'international';
          if (!countryMap[country]) {
            countryMap[country] = { companies: [], region: region };
          }
          countryMap[country].companies.push({
            name: item.title,
            url: item.link || '#'
          });
        });
        // Convert to array and expose globally for inline script
        window._logisticsData = [];
        // Sort by a consistent order (domestic first, then international)
        for (var cn in countryMap) {
          window._logisticsData.push({
            cn: cn,
            region: countryMap[cn].region,
            companies: countryMap[cn].companies
          });
        }
        // Notify inline script if it's already loaded
        if (typeof window._reinitLogistics === 'function') window._reinitLogistics();
      });
  }

  // ===================== 协会大事记（events.html） =====================
  if (path === 'events.html') {
    fetch('/api/list-items?type=milestone')
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (items) {
        if (!items.length) return;
        var container = document.getElementById('milestoneContainer');
        if (!container) return;
        container.innerHTML = items.map(function (item, i) {
          var aos = i % 2 === 0 ? 'fade-right' : 'fade-left';
          return '<div class="tl-item" data-aos="' + aos + '">' +
            '<div class="tl-badge">' + esc(item.date) + '</div>' +
            '<div class="tl-card"><div class="tl-card-body">' +
            '<h3><a href="' + esc(item.link || 'exhibition-detail.html') + '" style="color:inherit;text-decoration:none">' + esc(item.title) + '</a></h3>' +
            '<p>' + esc(item.summary) + '</p>' +
            '</div></div></div>';
        }).join('');
        if (window.AOS) AOS.refresh();
      })
      .catch(function () {});
  }

  // ===================== 首页（sy-index.html）—— 新闻 + 会展动态调取 =====================
  if (path === 'sy-index.html') {
    var homeNewsItems = [];

    function renderHomeNews(cat) {
      var layout = document.getElementById('homeNewsLayout');
      if (!layout) return;
      var filtered = cat === 'all' ? homeNewsItems : homeNewsItems.filter(function (i) { return i.category === cat; });
      var top = filtered.slice(0, 5);
      if (!top.length) { layout.innerHTML = ''; return; }
      var html = '';
      // Featured（第1条）
      if (top[0]) {
        var link0 = esc(top[0].link || 'news-detail.html');
        var img0 = esc(stripVer(top[0].image)).replace(/ /g, '%20');
        html += '<div class="news-featured" data-aos="fade-up" onclick="location.href=\'' + link0 + '\'">' +
          '<div class="news-featured-img"><img src="' + img0 + '" alt=""></div>' +
          '<div class="news-featured-body"><h3>' + esc(top[0].title) + '</h3><p>' + esc(top[0].summary) + '</p>' +
          '<time>' + fmtDate(top[0].date) + '</time>' +
          '<span class="read-more">阅读详情 <span class="arrow-r-g">→</span></span></div></div>';
      }
      // Standard（第2条）
      if (top[1]) {
        var link1 = esc(top[1].link || 'news-detail.html');
        var img1 = esc(stripVer(top[1].image)).replace(/ /g, '%20');
        html += '<div class="news-standard" data-aos="fade-up" data-aos-delay="150" onclick="location.href=\'' + link1 + '\'">' +
          '<div class="news-standard-img"><img src="' + img1 + '" alt=""></div>' +
          '<div class="news-standard-body"><h3>' + esc(top[1].title) + '</h3><p>' + esc(top[1].summary) + '</p>' +
          '<time>' + fmtDate(top[1].date) + '</time>' +
          '<span class="read-more">阅读详情 <span class="arrow-r-g">→</span></span></div></div>';
      }
      // Stacked（第3-5条）
      if (top.length > 2) {
        html += '<div class="news-stacked" data-aos="fade-up" data-aos-delay="300">';
        for (var i = 2; i < Math.min(top.length, 5); i++) {
          html += '<div class="ns-item"><h3><a href="' + esc(top[i].link || 'news-detail.html') + '">' + esc(top[i].title) + '</a></h3><p>' + esc(top[i].summary) + '</p><time>' + fmtDate(top[i].date) + '</time></div>';
        }
        html += '</div>';
      }
      layout.innerHTML = html;
      if (window.AOS) AOS.refresh();
    }

    fetch('/api/list-items?type=news')
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (items) {
        homeNewsItems = items;
        renderHomeNews('all');
      })
      .catch(function () {});

    // 新闻 Tab 切换
    document.querySelectorAll('.ntab').forEach(function (tab) {
      tab.onclick = function () {
        document.querySelectorAll('.ntab').forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        var cat = tab.textContent.indexOf('\u884c\u4e1a') !== -1 ? 'industry' : 'association';
        renderHomeNews(cat);
      };
    });

    // ===================== 首页会展 =====================
    var homeExpoItems = [];
    var homeExpoTimer = null;
    var homeExpoCurrent = 0;

    function renderHomeExpoText(item) {
      var textArea = document.getElementById('homeExpoText');
      if (!textArea || !item) return;
      var d = (item.date || '').split('-');
      var day = d[2] || '';
      var ym = d[0] + '.' + (d[1] || '');
      textArea.innerHTML =
        '<div class="expo-date"><strong>' + esc(day) + '</strong><span>' + esc(ym) + '</span></div>' +
        '<h3><a href="' + esc(item.link || 'exhibition-detail.html') + '" style="color:inherit;text-decoration:none">' + esc(item.title) + '</a></h3>' +
        '<p>' + esc(item.summary || '') + '</p>' +
        '<a href="' + esc(item.link || 'exhibition-detail.html') + '" class="btn-outline-sm">\u4e86\u89e3\u8be6\u60c5 <span class="arrow-r">\u2192</span></a>';
    }

    function homeExpoGoTo(index) {
      var carousel = document.getElementById('homeExpoCarousel');
      if (!carousel) return;
      var slides = carousel.querySelectorAll('.carousel-slide');
      var dots = carousel.querySelectorAll('.carousel-dot');
      if (!slides.length) return;
      if (index < 0) index = slides.length - 1;
      if (index >= slides.length) index = 0;
      slides.forEach(function (s) { s.classList.remove('active'); });
      dots.forEach(function (d) { d.classList.remove('active'); });
      slides[index].classList.add('active');
      if (dots[index]) dots[index].classList.add('active');
      homeExpoCurrent = index;
      if (homeExpoItems[index]) renderHomeExpoText(homeExpoItems[index]);
    }

    function renderHomeExpo(type) {
      fetch('/api/list-items?type=' + type)
        .then(function (r) { return r.ok ? r.json() : []; })
        .then(function (items) {
          homeExpoItems = items.slice(0, 3);
          if (!homeExpoItems.length) return;
          var track = document.querySelector('#homeExpoCarousel .carousel-track');
          var dotsContainer = document.querySelector('#homeExpoCarousel .carousel-dots');
          if (track) {
            track.innerHTML = homeExpoItems.map(function (item, i) {
              return '<a href="' + esc(item.link || 'exhibition-detail.html') + '" class="carousel-slide' + (i === 0 ? ' active' : '') + '" style="background:url(\'' + esc(stripVer(item.image)).replace(/ /g,"%20") + '\') center/cover no-repeat;display:block"></a>';
            }).join('');
          }
          if (dotsContainer) {
            dotsContainer.innerHTML = homeExpoItems.map(function (item, i) {
              return '<span class="carousel-dot' + (i === 0 ? ' active' : '') + '"></span>';
            }).join('');
            dotsContainer.querySelectorAll('.carousel-dot').forEach(function (dot, i) {
              dot.onclick = function () {
                homeExpoGoTo(i);
                if (homeExpoTimer) clearInterval(homeExpoTimer);
                homeExpoTimer = setInterval(function () { homeExpoGoTo(homeExpoCurrent + 1); }, 5000);
              };
            });
          }
          homeExpoCurrent = 0;
          renderHomeExpoText(homeExpoItems[0]);
          if (homeExpoTimer) clearInterval(homeExpoTimer);
          homeExpoTimer = setInterval(function () { homeExpoGoTo(homeExpoCurrent + 1); }, 5000);
        })
        .catch(function () {});
    }

    // 初始加载：取会展前3条（回顾+预告合并）
    Promise.all([
      fetch('/api/list-items?type=expo_preview').then(function (r) { return r.ok ? r.json() : []; }),
      fetch('/api/list-items?type=expo_review').then(function (r) { return r.ok ? r.json() : []; })
    ])
      .then(function (results) {
        var all = results[0].concat(results[1]);
        all.sort(function (a, b) { return (a.sort_order || 999) - (b.sort_order || 999) || a.id - b.id; });
        homeExpoItems = all.slice(0, 3);
        if (!homeExpoItems.length) return;
        var track = document.querySelector('#homeExpoCarousel .carousel-track');
        var dotsContainer = document.querySelector('#homeExpoCarousel .carousel-dots');
        if (track) {
          track.innerHTML = homeExpoItems.map(function (item, i) {
            return '<a href="' + esc(item.link || 'exhibition-detail.html') + '" class="carousel-slide' + (i === 0 ? ' active' : '') + '" style="background:url(\'' + esc(stripVer(item.image)).replace(/ /g,"%20") + '\') center/cover no-repeat;display:block"></a>';
          }).join('');
        }
        if (dotsContainer) {
          dotsContainer.innerHTML = homeExpoItems.map(function (item, i) {
            return '<span class="carousel-dot' + (i === 0 ? ' active' : '') + '"></span>';
          }).join('');
          dotsContainer.querySelectorAll('.carousel-dot').forEach(function (dot, i) {
            dot.onclick = function () { homeExpoGoTo(i); };
          });
        }
        homeExpoCurrent = 0;
        renderHomeExpoText(homeExpoItems[0]);
        if (homeExpoTimer) clearInterval(homeExpoTimer);
        homeExpoTimer = setInterval(function () { homeExpoGoTo(homeExpoCurrent + 1); }, 5000);
      })
      .catch(function () {});

    // 会展 Tab 切换
    document.querySelectorAll('.expo-tab').forEach(function (tab) {
      tab.onclick = function () {
        document.querySelectorAll('.expo-tab').forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        var tabType = tab.getAttribute('data-tab');
        renderHomeExpo(tabType === 'preview' ? 'expo_preview' : 'expo_review');
      };
    });
  }

  // ===================== 首页物流 =====================
  if (path === 'sy-index.html') {
    fetch('/api/list-items?type=logistics')
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (items) {
        if (!items.length) return;
        var grid = document.getElementById('logisticsGrid');
        if (!grid) return;
        grid.innerHTML = items.slice(0, 6).map(function (item, i) {
          var delays = [0, 80, 160, 240, 0, 80, 160, 240];
          var delay = delays[i] || 0;
          var domain = (item.link || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
          return '<a class="logi-card" href="' + esc(item.link) + '" target="_blank" rel="noopener" data-aos="fade-up" data-aos-delay="' + delay + '">' +
            '<div class="logi-bg"></div>' +
            '<div class="logi-info">' +
            '<img src="images/iconwuliu.png" alt="" class="logi-icon" onerror="this.style.display=\'none\'">' +
            '<span class="logi-name">' + esc(item.title) + '</span>' +
            '<span class="logi-url">' + esc(domain) + '</span></div></a>';
        }).join('');
        if (window.AOS) AOS.refresh();
      });
  }

  // ===================== 重新初始化函数 =====================

  function reinitNews() {
    var allItems = Array.from(document.querySelectorAll('.news-featured, .news-item'));
    var searchInput = document.getElementById('newsSearch');
    var searchBtn = document.getElementById('newsSearchBtn');
    var currentFilter = 'all';
    var currentKeyword = '';
    var currentPage = 1;
    var pageSize = 8;

    function getFilteredItems() {
      return allItems.filter(function (item) {
        var catMatch = (currentFilter === 'all' || item.getAttribute('data-category') === currentFilter);
        var text = item.textContent.toLowerCase();
        var keyMatch = !currentKeyword || text.indexOf(currentKeyword) !== -1;
        return catMatch && keyMatch;
      });
    }

    function showPage() {
      var filtered = getFilteredItems();
      var total = filtered.length;
      var pages = Math.max(1, Math.ceil(total / pageSize));
      if (currentPage > pages) currentPage = pages;
      allItems.forEach(function (c) { c.style.display = 'none'; });
      var start = (currentPage - 1) * pageSize;
      var end = Math.min(start + pageSize, total);
      for (var i = start; i < end; i++) { filtered[i].style.display = ''; }
      renderPagination(pages, total);
    }

    function renderPagination(pages, total) {
      var pag = document.getElementById('newsPagination');
      if (!pag) return;
      var html = '';
      html += '<button class="logi-page-btn' + (currentPage <= 1 ? ' disabled' : '') + '" data-action="prev">&lt;</button>';
      for (var i = 1; i <= pages; i++) {
        html += '<button class="logi-page-btn' + (i === currentPage ? ' active' : '') + '" data-page="' + i + '">' + i + '</button>';
      }
      html += '<button class="logi-page-btn' + (currentPage >= pages ? ' disabled' : '') + '" data-action="next">&gt;</button>';
      html += '<span class="logi-page-info-text">共 ' + total + ' 条</span>';
      pag.innerHTML = html;
      pag.querySelectorAll('.logi-page-btn:not(.disabled)').forEach(function (btn) {
        btn.onclick = function () {
          var action = this.getAttribute('data-action');
          var page = parseInt(this.getAttribute('data-page'));
          if (action === 'prev') currentPage = Math.max(1, currentPage - 1);
          else if (action === 'next') currentPage = Math.min(pages, currentPage + 1);
          else if (page) currentPage = page;
          showPage();
          var list = document.querySelector('.news-list');
          if (list) window.scrollTo({ top: list.offsetTop - 100, behavior: 'smooth' });
        };
      });
    }

    function doSearch() {
      currentKeyword = searchInput ? searchInput.value.trim().toLowerCase() : '';
      currentPage = 1;
      showPage();
    }

    if (searchInput) {
      var timer = null;
      searchInput.oninput = function () { clearTimeout(timer); timer = setTimeout(doSearch, 200); };
    }
    if (searchBtn) searchBtn.onclick = doSearch;

    var filters = document.querySelectorAll('.news-filter');
    filters.forEach(function (f) {
      f.onclick = function () {
        filters.forEach(function (b) { b.classList.remove('active'); });
        f.classList.add('active');
        currentFilter = f.getAttribute('data-filter');
        currentPage = 1;
        showPage();
      };
    });

    // URL 参数预选
    var params = new URLSearchParams(window.location.search);
    var q = params.get('q');
    var f = params.get('filter');
    if (f) {
      filters.forEach(function (b) { b.classList.remove('active'); });
      var target = document.querySelector('.news-filter[data-filter="' + f + '"]');
      if (target) { target.classList.add('active'); currentFilter = f; }
    }
    if (q && searchInput) {
      searchInput.value = q;
    }

    showPage();
  }

  function reinitSupply() {
    var currentCategory = 'all';
    var currentPage = 1;
    var pageSize = 8;
    var allCards = Array.from(document.querySelectorAll('.supply-card'));

    function getFilteredCards() {
      if (currentCategory === 'all') return allCards;
      return allCards.filter(function (c) { return c.getAttribute('data-category') === currentCategory; });
    }

    function showPage() {
      var filtered = getFilteredCards();
      var total = filtered.length;
      var pages = Math.max(1, Math.ceil(total / pageSize));
      if (currentPage > pages) currentPage = pages;
      allCards.forEach(function (c) { c.style.display = 'none'; });
      var start = (currentPage - 1) * pageSize;
      var end = Math.min(start + pageSize, total);
      for (var i = start; i < end; i++) { filtered[i].style.display = ''; }
      var empty = document.getElementById('supplyEmpty');
      if (empty) empty.style.display = total === 0 ? '' : 'none';
      var totalEl = document.getElementById('supplyTotal');
      if (totalEl) totalEl.textContent = total;
      renderPagination(pages, total);
    }

    function renderPagination(pages, total) {
      var pag = document.getElementById('supplyPagination');
      if (!pag) return;
      var html = '';
      html += '<button class="logi-page-btn' + (currentPage <= 1 ? ' disabled' : '') + '" data-action="prev">&lt;</button>';
      for (var i = 1; i <= pages; i++) {
        html += '<button class="logi-page-btn' + (i === currentPage ? ' active' : '') + '" data-page="' + i + '">' + i + '</button>';
      }
      html += '<button class="logi-page-btn' + (currentPage >= pages ? ' disabled' : '') + '" data-action="next">&gt;</button>';
      html += '<span class="logi-page-info-text">共 <span id="supplyTotal">' + total + '</span> 条</span>';
      pag.innerHTML = html;
      pag.querySelectorAll('.logi-page-btn:not(.disabled)').forEach(function (btn) {
        btn.onclick = function () {
          var action = this.getAttribute('data-action');
          var page = parseInt(this.getAttribute('data-page'));
          if (action === 'prev') currentPage = Math.max(1, currentPage - 1);
          else if (action === 'next') currentPage = Math.min(pages, currentPage + 1);
          else if (page) currentPage = page;
          showPage();
          var grid = document.querySelector('.supply-grid');
          if (grid) window.scrollTo({ top: grid.offsetTop - 100, behavior: 'smooth' });
        };
      });
    }

    var filters = document.querySelectorAll('.supply-filter');
    filters.forEach(function (f) {
      f.onclick = function () {
        filters.forEach(function (b) { b.classList.remove('active'); });
        f.classList.add('active');
        currentCategory = f.getAttribute('data-category');
        currentPage = 1;
        showPage();
      };
    });

    allCards.forEach(function (card) {
      card.style.cursor = 'pointer';
      card.onclick = function () {
        var img = card.querySelector('.supply-card-img img');
        var name = card.querySelector('.supply-card-body h3');
        var cat = card.getAttribute('data-category');
        var src = img ? img.getAttribute('src') : '';
        window.location.href = 'supply-detail.html?name=' + encodeURIComponent(name ? name.textContent : '') + '&cat=' + cat + '&img=' + encodeURIComponent(src);
      };
    });

    showPage();
  }

  function reinitExpo() {
    var filters = document.querySelectorAll('.expo-filter');
    var preview = document.getElementById('tab-preview');
    var review = document.getElementById('tab-review');
    var searchInput = document.getElementById('expoSearch');
    var searchBtn = document.getElementById('expoSearchBtn');

    function doSearch() {
      var keyword = searchInput.value.trim().toLowerCase();
      var activeTab = preview.style.display === 'none' ? review : preview;
      var cards = activeTab.querySelectorAll('.expo-card');
      cards.forEach(function (card) {
        var text = card.textContent.toLowerCase();
        card.style.display = (!keyword || text.indexOf(keyword) !== -1) ? '' : 'none';
      });
    }

    if (searchInput) {
      var timer = null;
      searchInput.oninput = function () { clearTimeout(timer); timer = setTimeout(doSearch, 200); };
    }
    if (searchBtn) searchBtn.onclick = doSearch;

    filters.forEach(function (f) {
      f.onclick = function () {
        filters.forEach(function (b) { b.classList.remove('active'); });
        f.classList.add('active');
        var tab = f.getAttribute('data-tab');
        if (tab === 'preview') { preview.style.display = ''; review.style.display = 'none'; }
        else { preview.style.display = 'none'; review.style.display = ''; }
        doSearch();
      };
    });
  }
})();
