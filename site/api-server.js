const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const BASE = '/Users/wm/Documents/Codex/co/进出口首页';

// 静态文件 + API 服务
const MIME = {
  '.html':'text/html;charset=utf-8','.css':'text/css;charset=utf-8','.js':'application/javascript',
  '.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg',
  '.gif':'image/gif','.svg':'image/svg+xml','.ico':'image/x-icon','.mp4':'video/mp4','.webm':'video/webm'
};

// 内置新闻数据（来源：cms-list-loader.js 调用 /api/list-items）
const DATA = {
  logistics: [
    { id:1, title:"中远海运", link:"https://lines.coscoshipping.com/home/business" },
    { id:2, title:"马士基", link:"https://www.maersk.com" },
    { id:3, title:"地中海航运", link:"https://www.msc.com" },
    { id:4, title:"达飞轮船", link:"https://www.cma-cgm.com" },
    { id:5, title:"赫伯罗特", link:"https://www.hapag-lloyd.com" },
    { id:6, title:"东方海外", link:"https://www.oocl.com" }
  ],
  news: [
    { id:1, title:"马来JAKIM客户访惠发（临夏）基地及惠发（北京）公司", summary:"2025年1月，马来西亚JAKIM认证客户一行莅临惠发（临夏）基地及惠发（北京）公司进行实地考察。", date:"2025-01-16", category:"industry", image:"images/yewujieshao/xinwen/news-featured.png", link:"news-detail.html" },
    { id:2, title:"中国-东盟特色产业链出海平台上线", summary:"中国与东盟国家在特色产业链领域的合作不断深化，为区域经济发展注入新动能。", date:"2025-01-10", category:"industry", image:"images/yewujieshao/xinwen/news-featured.png", link:"news-detail.html" },
    { id:3, title:"协会赴广西调研口岸经济发展", summary:"协会代表团深入广西边境口岸，调研跨境贸易与物流通道建设情况。", date:"2025-01-05", category:"association", image:"images/yewujieshao/xinwen/news-featured.png", link:"news-detail.html" },
    { id:4, title:"惠发食品亮相东盟博览会", summary:"惠发食品携多款清真产品亮相东盟博览会，受到东南亚客商广泛关注。", date:"2024-12-28", category:"industry", image:"images/yewujieshao/xinwen/news-featured.png", link:"news-detail.html" },
    { id:5, title:"冷链物流体系升级完成", summary:"公司投资建设的新型冷链物流中心正式投入运营，仓储能力提升50%。", date:"2024-12-20", category:"association", image:"images/yewujieshao/xinwen/news-featured.png", link:"news-detail.html" },
    { id:6, title:"甘肃特色农产品出口创新高", summary:"依托平台优势，甘肃特色农产品出口额同比增长35%，覆盖东盟多国市场。", date:"2024-12-15", category:"industry", image:"images/yewujieshao/xinwen/news-featured.png", link:"news-detail.html" }
  ],
  expo_preview: [
    { id:1, title:"2025东盟食品博览会", summary:"汇聚东盟各国优质食品与农产品", date:"2025-06-15", image:"images/yewujieshao/xinwen/news-featured.png", link:"exhibition-detail.html" },
    { id:2, title:"中国-东盟经贸合作论坛", summary:"深化区域产业链合作", date:"2025-08-20", image:"images/yewujieshao/xinwen/news-featured.png", link:"exhibition-detail.html" }
  ],
  expo_review: [
    { id:3, title:"2024东盟博览会圆满落幕", summary:"硕果累累，签约金额突破50亿元", date:"2024-11-10", image:"images/yewujieshao/xinwen/news-featured.png", link:"exhibition-detail.html" }
  ]
};

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;

  // API 路由
  if (pathname === '/api/list-items') {
    const type = url.searchParams.get('type') || '';
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(DATA[type] || []));
    return;
  }

  // 静态文件
  let filePath = pathname === '/' ? '/sy-index.html' : pathname;
  filePath = BASE + filePath;
  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, buf) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(buf);
  });
}).listen(PORT, () => {
  console.log('🚀 Server running at http://localhost:' + PORT);
  console.log('📄 首页: http://localhost:' + PORT + '/sy-index.html');
});
