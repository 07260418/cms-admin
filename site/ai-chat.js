/* ============================================================
   AI 智能客服 — 浮窗聊天机器人
   ============================================================ */
(function () {
  if (window.__aiChatLoaded) return;
  window.__aiChatLoaded = true;

  // ===================== 配置 =====================
  var CONFIG = {
    title: '智能客服',
    subtitle: '您好，有什么可以帮您的？',
    welcomeMsg: '您好！我是 AI 客服助手，可以帮您：\n\n• 查询产品和分类\n• 了解公司业务\n• 解答常见问题\n• 获取联系方式\n\n请直接输入您的问题。',
    apiEndpoint: '/api/ai-chat',   // 后续可对接 AI API
    botName: '小海',
    primaryColor: '#0a7d52'
  };

  // ===================== 常见问题 =====================
  var FAQ = [
    { q: '你们有哪些产品', a: '我们主要经营冷冻食品，包括：冷冻水饺、包子、馄饨、春卷、汤圆等冷冻产成品，以及冷冻牛肉、羊肉、鸡肉分割品，还有冷冻果蔬类产品如草莓、蓝莓、玉米粒等。您可以在「供应链」页面查看全部产品。' },
    { q: '怎么联系你们', a: '您可以拨打咨询电话 400-1237-6666，或发送邮件至 bengh@in2foods.com。办公地址：北京市海淀区中关村科技园区88号。' },
    { q: '公司做什么的', a: '我们是「中国-东盟特色产业链出海平台」，致力于为中国与东盟国家之间的食品贸易提供供应链、物流、金融、认证等一站式服务。主要业务包括：供应链金融、文旅生态、新品研发、产品检测、教育合作、培训、认证等。' },
    { q: '清真认证', a: '我们提供清真认证服务，帮助企业获得 Halal 认证，使产品能够进入东盟及中东穆斯林市场。认证流程包括资料审核、现场检查、产品检测等环节。' },
    { q: '物流服务', a: '我们与多家国际船公司合作，提供国内及国际物流服务。国内覆盖中国大陆、香港、台湾，国际覆盖东盟、东亚、欧洲、北美、非洲等主要航线。' }
  ];

  // ===================== 样式注入 =====================
  var style = document.createElement('style');
  style.textContent = `
    .ai-chat-btn {
      position: fixed; bottom: 24px; right: 24px;
      z-index: 9998;
      width: 56px; height: 56px; border-radius: 50%;
      background: ${CONFIG.primaryColor};
      color: #fff; border: none; cursor: pointer;
      box-shadow: 0 4px 20px rgba(10,125,82,.35);
      display: flex; align-items: center; justify-content: center;
      transition: all .3s cubic-bezier(.4,0,.2,1);
      font-size: 24px;
    }
    .ai-chat-btn:hover { transform: scale(1.08); box-shadow: 0 8px 28px rgba(10,125,82,.4); }
    .ai-chat-btn .ai-chat-badge {
      position: absolute; top: -4px; right: -4px;
      width: 18px; height: 18px; border-radius: 50%;
      background: #ef4444; color: #fff;
      font-size: 10px; display: flex; align-items: center; justify-content: center;
    }
    .ai-chat-window {
      position: fixed; bottom: 92px; right: 24px;
      z-index: 9998;
      width: 360px; max-width: calc(100vw - 32px);
      height: 520px; max-height: calc(100vh - 120px);
      background: #fff; border-radius: 16px;
      box-shadow: 0 8px 40px rgba(0,0,0,.15);
      display: none; flex-direction: column;
      overflow: hidden;
      animation: aiChatIn .3s ease-out;
    }
    .ai-chat-window.open { display: flex; }
    @keyframes aiChatIn {
      from { opacity: 0; transform: translateY(16px) scale(.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .ai-chat-header {
      padding: 16px 20px;
      background: ${CONFIG.primaryColor};
      color: #fff;
      display: flex; align-items: center; gap: 10px;
    }
    .ai-chat-header-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: rgba(255,255,255,.2);
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; flex-shrink: 0;
    }
    .ai-chat-header-info { flex: 1; min-width: 0; }
    .ai-chat-header-title { font-size: 14px; font-weight: 600; }
    .ai-chat-header-sub { font-size: 11px; opacity: .8; margin-top: 1px; }
    .ai-chat-header-close {
      width: 28px; height: 28px; border: none; background: rgba(255,255,255,.15);
      border-radius: 50%; cursor: pointer; color: #fff;
      font-size: 16px; display: flex; align-items: center; justify-content: center;
      transition: background .2s; flex-shrink: 0;
    }
    .ai-chat-header-close:hover { background: rgba(255,255,255,.25); }
    .ai-chat-body {
      flex: 1; overflow-y: auto; padding: 16px;
      background: #f9fafb;
    }
    .ai-chat-msg {
      margin-bottom: 12px; display: flex; gap: 8px;
      animation: aiMsgIn .3s ease-out;
    }
    @keyframes aiMsgIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .ai-chat-msg.bot { }
    .ai-chat-msg.user { justify-content: flex-end; }
    .ai-chat-msg-avatar {
      width: 28px; height: 28px; border-radius: 50%;
      background: ${CONFIG.primaryColor};
      color: #fff; font-size: 12px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; align-self: flex-end;
    }
    .ai-chat-msg-bubble {
      max-width: 80%; padding: 10px 14px;
      border-radius: 14px; font-size: 13px; line-height: 1.6;
      white-space: pre-wrap; word-break: break-word;
    }
    .ai-chat-msg.bot .ai-chat-msg-bubble {
      background: #fff; color: #1f2937;
      border-bottom-left-radius: 4px;
      box-shadow: 0 1px 4px rgba(0,0,0,.06);
    }
    .ai-chat-msg.user .ai-chat-msg-bubble {
      background: ${CONFIG.primaryColor}; color: #fff;
      border-bottom-right-radius: 4px;
    }
    .ai-chat-msg-time {
      font-size: 10px; color: #9ca3af; margin-top: 4px;
      text-align: right;
    }
    .ai-chat-typing {
      display: flex; gap: 4px; padding: 12px 16px;
      align-items: center;
    }
    .ai-chat-typing span {
      width: 6px; height: 6px; border-radius: 50%;
      background: #9ca3af; animation: aiTyping 1.4s infinite;
    }
    .ai-chat-typing span:nth-child(2) { animation-delay: .2s; }
    .ai-chat-typing span:nth-child(3) { animation-delay: .4s; }
    @keyframes aiTyping {
      0%, 60%, 100% { opacity: .3; transform: scale(1); }
      30% { opacity: 1; transform: scale(1.2); }
    }
    .ai-chat-footer {
      padding: 12px 16px; border-top: 1px solid #e5e7eb;
      display: flex; gap: 8px; align-items: center;
      background: #fff;
    }
    .ai-chat-footer input {
      flex: 1; border: 1px solid #d1d5db; border-radius: 20px;
      padding: 8px 14px; font-size: 13px; font-family: inherit;
      outline: none; transition: border-color .2s;
    }
    .ai-chat-footer input:focus { border-color: ${CONFIG.primaryColor}; }
    .ai-chat-footer button {
      width: 36px; height: 36px; border-radius: 50%;
      border: none; background: ${CONFIG.primaryColor}; color: #fff;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: all .2s; flex-shrink: 0;
    }
    .ai-chat-footer button:hover { transform: scale(1.05); }
    .ai-chat-footer button:disabled { opacity: .4; cursor: not-allowed; transform: none; }
    .ai-chat-faq {
      display: flex; flex-wrap: wrap; gap: 6px; padding: 12px 16px 0;
    }
    .ai-chat-faq-btn {
      font-size: 11px; padding: 4px 10px; border-radius: 12px;
      border: 1px solid #d1d5db; background: #fff; cursor: pointer;
      color: #6b7280; transition: all .2s;
    }
    .ai-chat-faq-btn:hover { border-color: ${CONFIG.primaryColor}; color: ${CONFIG.primaryColor}; }

    @media (max-width: 480px) {
      .ai-chat-window {
        right: 8px; bottom: 80px;
        width: calc(100vw - 16px); height: calc(100vh - 100px);
        border-radius: 12px;
      }
      .ai-chat-btn { bottom: 16px; right: 16px; width: 48px; height: 48px; font-size: 20px; }
    }
  `;
  document.head.appendChild(style);

  // ===================== 构建 UI =====================
  var btn = document.createElement('button');
  btn.className = 'ai-chat-btn';
  btn.id = 'aiChatBtn';
  btn.innerHTML = '💬';
  btn.setAttribute('aria-label', '打开智能客服');
  document.body.appendChild(btn);

  var window = document.createElement('div');
  window.className = 'ai-chat-window';
  window.id = 'aiChatWindow';
  window.innerHTML =
    '<div class="ai-chat-header">' +
      '<div class="ai-chat-header-avatar">🤖</div>' +
      '<div class="ai-chat-header-info">' +
        '<div class="ai-chat-header-title">' + CONFIG.title + '</div>' +
        '<div class="ai-chat-header-sub">' + CONFIG.subtitle + '</div>' +
      '</div>' +
      '<button class="ai-chat-header-close" id="aiChatClose">&times;</button>' +
    '</div>' +
    '<div class="ai-chat-body" id="aiChatBody">' +
      '<div class="ai-chat-msg bot">' +
        '<div class="ai-chat-msg-avatar">🤖</div>' +
        '<div class="ai-chat-msg-bubble">' + CONFIG.welcomeMsg.replace(/\n/g, '<br>') + '</div>' +
      '</div>' +
      '<div class="ai-chat-faq" id="aiChatFAQ">' +
        FAQ.map(function (faq) {
          return '<button class="ai-chat-faq-btn" data-q="' + faq.q + '">' + faq.q + '</button>';
        }).join('') +
      '</div>' +
    '</div>' +
    '<div class="ai-chat-footer">' +
      '<input type="text" id="aiChatInput" placeholder="输入您的问题..." autocomplete="off">' +
      '<button id="aiChatSend">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 2-11 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>' +
      '</button>' +
    '</div>';
  document.body.appendChild(window);

  var chatBody = document.getElementById('aiChatBody');
  var chatInput = document.getElementById('aiChatInput');
  var chatSend = document.getElementById('aiChatSend');
  var chatClose = document.getElementById('aiChatClose');
  var chatFAQ = document.getElementById('aiChatFAQ');

  // ===================== 状态 =====================
  var isWaiting = false;

  // ===================== 聊天逻辑 =====================
  function findAnswer(q) {
    var lower = q.toLowerCase();
    // 精确匹配 FAQ
    for (var i = 0; i < FAQ.length; i++) {
      if (lower.indexOf(FAQ[i].q.toLowerCase()) !== -1) {
        return FAQ[i].a;
      }
    }
    // 关键词匹配
    var keywords = [
      { words: ['产品', '商品', '卖', '买', '价格'], answer: FAQ[0].a },
      { words: ['联系', '电话', '邮箱', '地址', '怎么找'], answer: FAQ[1].a },
      { words: ['公司', '业务', '介绍', '做什么', '平台'], answer: FAQ[2].a },
      { words: ['清真', 'halal', '认证', '证书'], answer: FAQ[3].a },
      { words: ['物流', '运输', '船', '海运', '货代'], answer: FAQ[4].a }
    ];
    for (var j = 0; j < keywords.length; j++) {
      for (var k = 0; k < keywords[j].words.length; k++) {
        if (lower.indexOf(keywords[j].words[k]) !== -1) {
          return keywords[j].answer;
        }
      }
    }
    return null;
  }

  function addMessage(text, isUser) {
    var msg = document.createElement('div');
    msg.className = 'ai-chat-msg ' + (isUser ? 'user' : 'bot');
    if (isUser) {
      msg.innerHTML = '<div class="ai-chat-msg-bubble">' + text + '</div>';
    } else {
      msg.innerHTML = '<div class="ai-chat-msg-avatar">🤖</div><div class="ai-chat-msg-bubble">' + text.replace(/\n/g, '<br>') + '</div>';
    }
    chatBody.appendChild(msg);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function showTyping() {
    var div = document.createElement('div');
    div.className = 'ai-chat-msg bot';
    div.id = 'aiChatTyping';
    div.innerHTML = '<div class="ai-chat-msg-avatar">🤖</div><div class="ai-chat-msg-bubble"><div class="ai-chat-typing"><span></span><span></span><span></span></div></div>';
    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function hideTyping() {
    var typing = document.getElementById('aiChatTyping');
    if (typing) typing.remove();
  }

  function handleSend() {
    var text = chatInput.value.trim();
    if (!text || isWaiting) return;
    chatInput.value = '';
    isWaiting = true;
    chatSend.disabled = true;

    // 隐藏 FAQ
    chatFAQ.style.display = 'none';

    // 显示用户消息
    addMessage(text, true);

    // 显示输入中
    showTyping();

    // 模拟 AI 思考
    setTimeout(function () {
      hideTyping();

      var answer = findAnswer(text);
      if (answer) {
        addMessage(answer, false);
      } else {
        addMessage('抱歉，我暂时无法回答这个问题。您可以直接拨打咨询电话 **400-1237-6666** 或发送邮件至 **bengh@in2foods.com** 获取人工帮助。', false);
      }

      isWaiting = false;
      chatSend.disabled = false;
    }, 800 + Math.random() * 600);
  }

  // ===================== 事件绑定 =====================
  btn.onclick = function () {
    window.classList.toggle('open');
    if (window.classList.contains('open')) {
      setTimeout(function () { chatInput.focus(); }, 300);
    }
  };

  chatClose.onclick = function () { window.classList.remove('open'); };

  chatSend.onclick = handleSend;
  chatInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') handleSend();
  });

  // FAQ 快捷按钮
  chatFAQ.addEventListener('click', function (e) {
    var btn = e.target.closest('.ai-chat-faq-btn');
    if (btn) {
      chatInput.value = btn.getAttribute('data-q');
      handleSend();
    }
  });

  console.log('💬 AI 智能客服已加载');
})();
