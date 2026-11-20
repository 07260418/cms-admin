AOS.init({ duration: 800, once: true, offset: 80, easing: 'ease-out-cubic' });

// Hero carousel
const heroSlides = document.querySelectorAll('.hero-slide');
const heroDots = document.querySelectorAll('.hero-dot');
let heroIndex = 0;
let heroTimer = null;

function heroGo(i){
  heroSlides[heroIndex].classList.remove('active');
  heroDots[heroIndex].classList.remove('active');
  heroIndex = (i + heroSlides.length) % heroSlides.length;
  heroSlides[heroIndex].classList.add('active');
  heroDots[heroIndex].classList.add('active');
}
function heroStart(){
  clearInterval(heroTimer);
  heroTimer = setInterval(()=>heroGo(heroIndex+1), 5000);
}
function heroStop(){ clearInterval(heroTimer); }

heroDots.forEach(d => d.addEventListener('click', ()=>{ heroGo(+d.dataset.index); heroStop(); heroStart(); }));
document.querySelector('.hero')?.addEventListener('mouseenter', heroStop);
document.querySelector('.hero')?.addEventListener('mouseleave', heroStart);
heroStart();

// Header scroll shadow
const header = document.querySelector('header');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 50);
}, { passive: true });

// 二级页面：根据 URL 高亮对应导航项
(function(){
  const navs = document.querySelectorAll('nav a');
  const path = location.pathname.split('/').pop() || 'index.html';
  if(path === 'index.html' || path === '') return;
  navs.forEach(a => {
    const href = a.getAttribute('href');
    if(!href || href.startsWith('#')) return;
    const target = href.split('/').pop();
    if(target === path) a.classList.add('nav-active');
  });
})();

// News tabs
document.querySelectorAll('.ntab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.ntab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    flashTitle(tab);
  });
});

// Expo tabs
document.querySelectorAll('.expo-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.expo-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    flashTitle(tab);
  });
});

// 标题闪绿动效
function flashTitle(tab){
  const sec = tab.closest('section');
  const h2 = sec?.querySelector('.sec-head h2');
  if(!h2) return;
  h2.classList.remove('title-flash');
  void h2.offsetWidth; // 触发重排，重启动画
  h2.classList.add('title-flash');
}

// Expo carousel (已移至 cms-list-loader.js 动态加载)

// 供应链卡片：悬停播放动画
(function(){
  document.querySelectorAll('.supply-card').forEach(card => {
    const v = card.querySelector('.supply-video');
    if(!v) return;
    card.addEventListener('mouseenter', () => { v.currentTime = 0; v.play().catch(() => {}); });
    card.addEventListener('mouseleave', () => { v.pause(); v.currentTime = 0; v.load(); });
  });
})();

// 业务介绍卡片：悬停切换 active + 大卡片视频播放 + 点击跳转
(function(){
  // 6 张服务卡片：hover 切换 active，click 跳转
  var bizCards = document.querySelectorAll('.biz-card');
  bizCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      bizCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
    });
    card.addEventListener('mouseleave', () => {
      card.classList.remove('active');
    });
    card.addEventListener('click', () => {
      var href = card.getAttribute('data-href');
      if(href) window.location.href = href;
    });
  });

  // 大卡片：hover 播放视频 + click 跳转
  var bigCard = document.querySelector('.biz-bigcard');
  if(bigCard){
    var video = bigCard.querySelector('.biz-bigcard-video');
    if(video){
      bigCard.addEventListener('mouseenter', () => { video.currentTime = 0; video.play().catch(() => {}); });
      bigCard.addEventListener('mouseleave', () => { video.pause(); video.currentTime = 0; video.load(); });
    }
    bigCard.addEventListener('click', () => {
      var href = bigCard.getAttribute('data-href');
      if(href) window.location.href = href;
    });
  }
})();

// 滚动触发：绿色线条展开 + 数字滚动
(function(){
  // 绿色线条展开
  const lines = document.querySelectorAll('.green-line');
  lines.forEach(l => { l.style.width = '0'; l.style.overflow = 'visible'; });

  // 数字滚动
  const statNums = document.querySelectorAll('.logi-stat strong, .stat-item strong');
  const counters = [];
  statNums.forEach(el => {
    const html = el.innerHTML;
    const match = html.match(/^(\d+)/);
    if(!match) return;
    const target = parseInt(match[1]);
    const suffix = html.replace(match[1], '');
    el.dataset.target = target;
    el.dataset.suffix = suffix;
    el.innerHTML = '0' + suffix;
    counters.push(el);
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(!entry.isIntersecting) return;
      const el = entry.target;

      // 绿色线条展开
      if(el.classList.contains('green-line')){
        el.style.transition = 'width .8s cubic-bezier(.4,0,.2,1)';
        el.style.width = '63px';
        observer.unobserve(el);
      }

      // 数字滚动
      if(el.dataset.target){
        const target = parseInt(el.dataset.target);
        const suffix = el.dataset.suffix;
        const dur = 1200;
        const start = performance.now();
        function tick(now){
          const p = Math.min((now - start) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.innerHTML = Math.round(target * eased) + suffix;
          if(p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.3 });

  lines.forEach(l => observer.observe(l));
  counters.forEach(c => observer.observe(c));
})();

// 首页物流卡片：点击选中（单选 radio 行为）
document.querySelectorAll('.logi-card').forEach(card => {
  card.addEventListener('click', function(){
    document.querySelectorAll('.logi-card.active').forEach(c => c.classList.remove('active'));
    this.classList.add('active');
  });
});
