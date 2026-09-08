(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ───────── 함께한 날 (한국 시간 기준, 만난 날 = 1일) ───────── */
  const START_UTC = Date.UTC(2024, 4, 23);
  function daysTogether() {
    const now = new Date();
    const kst = new Date(now.getTime() + (now.getTimezoneOffset() + 540) * 60000);
    const today = Date.UTC(kst.getFullYear(), kst.getMonth(), kst.getDate());
    return Math.round((today - START_UTC) / 864e5) + 1;
  }

  /* ───────── 토스트 ───────── */
  let toastTimer;
  function toast(msg, ms = 1300) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  }

  function buzz(pattern) {
    try { navigator.vibrate && navigator.vibrate(pattern); } catch (_) { /* ignore */ }
  }

  /* ───────── 폭죽 ───────── */
  const canvas = $('#confetti');
  const ctx = canvas.getContext('2d');
  let parts = [];
  let raf = null;
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function confetti({ count = 160, hearts = false, x = innerWidth / 2, y = innerHeight * 0.55 } = {}) {
    resizeCanvas();
    const colors = ['#f28ba0', '#ffd88a', '#bfe5d6', '#c4b5fd', '#ffb4a2', '#ffffff', '#ff9fb8'];
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
      const speed = 7 + Math.random() * 11;
      parts.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        g: 0.32,
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 8,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.35,
        color: colors[(Math.random() * colors.length) | 0],
        life: 1,
        heart: hearts && Math.random() < 0.7,
        sway: Math.random() * Math.PI * 2,
      });
    }
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function tick() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter(p => p.life > 0 && p.y < innerHeight + 40);
    for (const p of parts) {
      p.vy += p.g;
      p.vx *= 0.985;
      p.sway += 0.08;
      p.x += p.vx + Math.sin(p.sway) * 0.6;
      p.y += p.vy;
      p.rot += p.vr;
      if (p.y > innerHeight * 0.55) p.life -= 0.012;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.heart) {
        ctx.font = `${p.w + 8}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('♥', 0, 0);
      } else {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      ctx.restore();
    }
    if (parts.length) raf = requestAnimationFrame(tick);
    else { raf = null; ctx.clearRect(0, 0, innerWidth, innerHeight); }
  }

  /* ───────── 1. 봉투 열기 ───────── */
  const invite = $('#invite');
  const envelope = $('#envelope');
  const seal = $('#seal');
  envelope.classList.add('closed');

  seal.addEventListener('click', () => {
    if (envelope.classList.contains('opening')) return;
    envelope.classList.add('opening');
    invite.classList.add('opened');
    buzz(20);
    setTimeout(() => {
      envelope.classList.remove('closed');
      // display:none 해제 후 한 프레임 뒤에 등장 애니메이션 시작
      setTimeout(() => envelope.classList.add('open'), 40);
    }, 550);
    setTimeout(() => envelope.classList.add('done'), 1600);
  });

  /* ───────── 도망가는 "노우" 버튼 ───────── */
  const yes = $('#yes');
  const no = $('#no');
  let tries = 0;
  let accepted = false;
  const taunts = [
    '어딜 눌러 😳', '노우는 없어', '자꾸 그러면 삐진다', '예쓰 눌러, 빨리!',
    '포기하면 편해', '😤😤😤', '거의 다 왔어 (예쓰 쪽으로)', '그냥 예쓰 누르자, 응?',
  ];
  const overlaps = (a, b) => !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);

  function flee(e) {
    if (accepted) return;
    if (e && e.cancelable) e.preventDefault();
    if (no.classList.contains('gaveup')) { accept(); return; }
    tries++;

    if (!no.classList.contains('fleeing')) {
      const r = no.getBoundingClientRect();
      no.classList.add('fleeing');
      document.body.appendChild(no); // 카드 밖(뷰포트 기준)으로 빼서 자유롭게 도망
      no.style.left = r.left + 'px';
      no.style.top = r.top + 'px';
    }
    const w = no.offsetWidth, h = no.offsetHeight, pad = 16;
    const yr = yes.getBoundingClientRect();
    const avoid = { left: yr.left - 70, right: yr.right + 70, top: yr.top - 70, bottom: yr.bottom + 70 };
    let x, y, n = 0;
    do {
      x = pad + Math.random() * Math.max(1, innerWidth - w - pad * 2);
      y = pad + 40 + Math.random() * Math.max(1, innerHeight - h - pad * 2 - 40);
      n++;
    } while (n < 40 && overlaps({ left: x, right: x + w, top: y, bottom: y + h }, avoid));
    no.style.left = x + 'px';
    no.style.top = y + 'px';

    const s = Math.max(0.42, 1 - tries * 0.07);
    no.style.transform = `scale(${s}) rotate(${Math.round(Math.random() * 40 - 20)}deg)`;
    yes.style.transform = `scale(${Math.min(1.32, 1 + tries * 0.045)})`;
    toast(taunts[Math.min(tries - 1, taunts.length - 1)]);
    buzz(15);

    if (tries >= taunts.length + 1) {
      no.textContent = '예쓰 💖';
      no.classList.add('gaveup');
      no.style.transform = 'scale(1)';
      toast('노우 버튼도 예쓰가 됐어요 🫠', 1800);
    }
  }
  no.addEventListener('touchstart', flee, { passive: false });
  no.addEventListener('mouseenter', flee);
  no.addEventListener('click', e => { e.preventDefault(); flee(e); });
  // 손가락이 근처에만 와도 도망
  document.addEventListener('touchmove', e => {
    if (!no.classList.contains('fleeing') || no.classList.contains('gaveup') || accepted) return;
    const t = e.touches[0];
    const r = no.getBoundingClientRect();
    if (t.clientX > r.left - 36 && t.clientX < r.right + 36 && t.clientY > r.top - 36 && t.clientY < r.bottom + 36) flee();
  }, { passive: true });

  /* ───────── 예쓰! ───────── */
  const main = $('#main');
  function accept() {
    if (accepted) return;
    accepted = true;
    $('#inviteCard').classList.add('accepted');
    no.hidden = true;
    yes.textContent = '고마워 💖';
    buzz([30, 40, 30]);
    const r = yes.getBoundingClientRect();
    confetti({ hearts: true, count: 120, x: r.left + r.width / 2, y: r.top + r.height / 2 });
    setTimeout(() => invite.classList.add('out'), 700);
    setTimeout(() => {
      invite.hidden = true;
      main.hidden = false;
      window.scrollTo(0, 0);
      initMain();
    }, 1250);
  }
  yes.addEventListener('click', accept);

  /* ───────── 2. 메인 초기화 ───────── */
  let mainReady = false;
  function initMain() {
    if (mainReady) return;
    mainReady = true;
    const days = daysTogether();
    $$('.days-inline').forEach(el => (el.textContent = days.toLocaleString('ko-KR')));
    countUp($('#daysHero'), days, 1700);
    renderCollage();
    initReveal();
    initCake();
  }

  function countUp(el, target, dur) {
    const t0 = performance.now();
    const ease = t => 1 - Math.pow(1 - t, 3);
    (function step(now) {
      const p = Math.min(1, (now - t0) / dur);
      el.textContent = Math.round(target * ease(p)).toLocaleString('ko-KR');
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  /* ───────── 스크롤 등장 ───────── */
  let io;
  function initReveal() {
    io = new IntersectionObserver(entries => {
      for (const en of entries) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    $$('.reveal').forEach(el => io.observe(el));
    $$('.polaroid').forEach(el => io.observe(el));
  }

  /* ───────── 랜덤 폴라로이드 갤러리 ───────── */
  const WIDE = new Set([11, 14, 22]);
  const PHOTOS = Array.from({ length: 24 }, (_, i) => ({
    src: `assets/photos/p${String(i + 1).padStart(2, '0')}.jpg`,
    wide: WIDE.has(i + 1),
  }));
  const TAPES = ['rgba(242,139,160,.65)', 'rgba(191,229,214,.85)', 'rgba(255,216,138,.8)', 'rgba(196,181,253,.7)', 'rgba(255,200,170,.8)'];
  const DOODLES = ['♥', '우리', '☀️', '🍀', '😆', '📸', '✨', '🐶', '🐱', '같이', '히히', '♥♥', '기억나?', '이날!'];
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function renderCollage() {
    const c = $('#collage');
    c.innerHTML = '';
    shuffle([...PHOTOS]).forEach((p, i) => {
      const fig = document.createElement('figure');
      fig.className = 'polaroid' + (p.wide ? ' wide' : '');
      fig.style.setProperty('--r', (Math.random() * 10 - 5).toFixed(1) + 'deg');
      fig.style.setProperty('--y', ((Math.random() * 16 - 8) | 0) + 'px');
      fig.style.setProperty('--tape', TAPES[(Math.random() * TAPES.length) | 0]);
      fig.style.transitionDelay = (i % 2) * 90 + 'ms';
      fig.innerHTML = `<img src="${p.src}" alt="" loading="lazy" decoding="async"><figcaption>${DOODLES[(Math.random() * DOODLES.length) | 0]}</figcaption>`;
      fig.addEventListener('click', () => openLightbox(p.src));
      c.appendChild(fig);
      if (io) io.observe(fig);
    });
  }
  $('#shuffle').addEventListener('click', () => {
    renderCollage();
    toast('섞었어! 🔀');
    buzz(15);
  });

  /* ───────── 라이트박스 ───────── */
  const lb = $('#lightbox');
  const lbImg = $('#lightboxImg');
  function openLightbox(src) {
    lbImg.src = src;
    lb.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => lb.classList.add('show')));
  }
  function closeLightbox() {
    lb.classList.remove('show');
    setTimeout(() => { lb.hidden = true; lbImg.src = ''; }, 250);
  }
  lb.addEventListener('click', closeLightbox);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !lb.hidden) closeLightbox(); });

  /* ───────── 케이크 & 촛불 ───────── */
  function initCake() {
    const section = $('#cakeSection');
    const candles = $$('.candle');
    const msg = $('#cakeMsg');
    const hint = $('#cakeHint');
    const relight = $('#relight');

    function litCount() { return candles.filter(c => !c.classList.contains('out')).length; }

    candles.forEach(c => {
      $('.flame-hit', c).addEventListener('click', () => {
        if (c.classList.contains('out')) return;
        c.classList.add('out');
        buzz(25);
        if (litCount() > 0) {
          msg.textContent = '후— 하나 껐다! 하나 더 🕯️';
          msg.classList.add('show');
        } else {
          allOut();
        }
      });
    });

    function allOut() {
      section.classList.remove('dark');
      msg.innerHTML = '🎉 소원 빌었지?<br>이뤄지게 종팔이가 옆에서 열심히 도울게';
      msg.classList.add('show');
      hint.innerHTML = '촛불 다 껐다! 생일 축하해 구러이 🎂<br>이제 아래로 내려가 보자 👇';
      relight.hidden = false;
      buzz([40, 60, 40, 60, 80]);
      const r = section.getBoundingClientRect();
      const y = Math.min(innerHeight * 0.6, Math.max(80, r.top + r.height * 0.45));
      confetti({ count: 200, x: innerWidth / 2, y });
      setTimeout(() => confetti({ count: 90, hearts: true, x: innerWidth * 0.25, y: y - 40 }), 350);
      setTimeout(() => confetti({ count: 90, hearts: true, x: innerWidth * 0.75, y: y - 40 }), 600);
    }

    relight.addEventListener('click', () => {
      candles.forEach(c => c.classList.remove('out'));
      section.classList.add('dark');
      msg.classList.remove('show');
      hint.innerHTML = '촛불을 하나씩 눌러서 꺼줘.<br>소원 비는 거 잊지 말고 🙏';
      relight.hidden = true;
      buzz(15);
    });
  }

  window.addEventListener('resize', () => { if (raf) resizeCanvas(); });
})();
