import './style.css';

(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ───────── 설정 ───────── */
  const START_UTC = Date.UTC(2024, 4, 23);   // 만난 날 (KST)
  const BIRTHDAY_MD = '09-18';                  // 구러이 생일 'MM-DD' (예: '09-20'). 넣으면 카운트다운에 '다음 생일'이 추가됨
  const REPLY_PHONE = '';                    // 종팔이 번호 (예: '01012345678'). 넣으면 '문자로 보내기' 버튼이 생김

  /* ───────── 함께한 날 (한국 시간 기준, 만난 날 = 1일) ───────── */
  function kstTodayUTC() {
    const now = new Date();
    const kst = new Date(now.getTime() + (now.getTimezoneOffset() + 540) * 60000);
    return Date.UTC(kst.getFullYear(), kst.getMonth(), kst.getDate());
  }
  function daysTogether() {
    return Math.round((kstTodayUTC() - START_UTC) / 864e5) + 1;
  }
  const storage = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* ignore */ } },
  };

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
    bgm.start();
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
    initCountdown();
    initCoupons();
    initReply();
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

    function blowOut(c) {
      if (c.classList.contains('out')) return;
      c.classList.add('out');
      buzz(25);
      if (litCount() > 0) {
        msg.textContent = '후— 하나 껐다! 하나 더 🕯️';
        msg.classList.add('show');
      } else {
        allOut();
      }
    }
    candles.forEach(c => $('.flame-hit', c).addEventListener('click', () => blowOut(c)));
    const mic = initBlowDetector(candles, blowOut);

    function allOut() {
      mic.pause();
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
      mic.resume();
    });
  }

  /* ───────── 입김 감지 (마이크) ───────── */
  function initBlowDetector(candles, blowOut) {
    const btn = $('#micBtn');
    const meter = $('#micMeter');
    const candlesEl = $('.cake-photo');
    let stream = null, actx = null, analyser = null, data = null, raf = null;
    let baseline = 0, calibN = 0, hot = 0, lastBlow = 0, paused = false;
    const CALIB = 40;   // 주변 소음 측정 프레임 수 (약 0.7초)

    async function start() {
      if (stream) { stop(); return; }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast('이 브라우저는 마이크를 못 써 😢 촛불을 탭해서 꺼줘', 2000); return;
      }
      btn.disabled = true;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        });
      } catch (_) {
        btn.disabled = false;
        toast('마이크 권한이 없어. 촛불을 탭해서 꺼줘!', 2000); return;
      }
      btn.disabled = false;
      actx = new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') { try { await actx.resume(); } catch (_) { /* ignore */ } }
      analyser = actx.createAnalyser();
      analyser.fftSize = 1024;
      actx.createMediaStreamSource(stream).connect(analyser);
      data = new Float32Array(analyser.fftSize);
      baseline = 0; calibN = 0; hot = 0; paused = false;
      btn.classList.add('on');
      btn.textContent = '🎤 듣는 중… 후— 불어봐!';
      meter.hidden = false;
      toast('촛불 가까이에서 후— 불어봐', 1600);
      loop();
    }

    function loop() {
      raf = requestAnimationFrame(loop);
      if (!analyser) return;
      analyser.getFloatTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
      const rms = Math.sqrt(sum / data.length);
      if (calibN < CALIB) { baseline = (baseline * calibN + rms) / (calibN + 1); calibN++; return; }
      const th = Math.max(baseline * 2.8, 0.045);   // 감도: 값이 작을수록 잘 꺼짐
      const level = Math.min(1, rms / (th * 1.8));
      meter.style.setProperty('--level', level.toFixed(2));
      candlesEl.style.setProperty('--blow', (level * -32).toFixed(1) + 'deg');
      candlesEl.style.setProperty('--blowY', (1 - level * 0.45).toFixed(2));
      if (paused) return;
      hot = rms > th ? hot + 1 : 0;
      if (hot >= 3 && performance.now() - lastBlow > 1300) {
        lastBlow = performance.now();
        hot = 0;
        const c = candles.find(x => !x.classList.contains('out'));
        if (c) blowOut(c);
      }
    }

    function stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = null;
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (actx) { try { actx.close(); } catch (_) { /* ignore */ } }
      stream = actx = analyser = null;
      btn.classList.remove('on');
      btn.textContent = '🎤 입김으로 끄기';
      meter.hidden = true;
      candlesEl.style.removeProperty('--blow');
      candlesEl.style.removeProperty('--blowY');
    }

    btn.addEventListener('click', start);
    document.addEventListener('visibilitychange', () => { if (document.hidden && stream) stop(); });
    return {
      pause() { paused = true; setTimeout(() => { if (paused) stop(); }, 1500); },
      resume() { paused = false; },
    };
  }

  /* ───────── 다음 기념일 카운트다운 ───────── */
  function initCountdown() {
    const DAY = 864e5;
    const today = kstTodayUTC();
    const items = [];
    for (const n of [900, 1000, 1111, 1500, 2000, 3000]) items.push({ label: `${n.toLocaleString('ko-KR')}일`, t: START_UTC + (n - 1) * DAY });
    for (let y = 3; y <= 10; y++) items.push({ label: `${y}주년`, t: Date.UTC(2024 + y, 4, 23) });
    if (BIRTHDAY_MD) {
      const [m, d] = BIRTHDAY_MD.split('-').map(Number);
      const ty = new Date(today).getUTCFullYear();
      let bt = Date.UTC(ty, m - 1, d);
      if (bt <= today) bt = Date.UTC(ty + 1, m - 1, d);
      items.push({ label: '구러이 생일 🎂', t: bt });
    }
    const upcoming = items.filter(i => i.t > today).sort((a, b) => a.t - b.t);
    if (!upcoming.length) return;
    const [first, ...rest] = upcoming;
    const fmt = t => {
      const d = new Date(t);
      const w = ['일', '월', '화', '수', '목', '금', '토'][d.getUTCDay()];
      return `${d.getUTCFullYear()}. ${String(d.getUTCMonth() + 1).padStart(2, '0')}. ${String(d.getUTCDate()).padStart(2, '0')} (${w})`;
    };
    $('#countLabel').textContent = first.label;
    $('#countDate').textContent = fmt(first.t);
    $('#countList').innerHTML = rest.slice(0, 4).map(i =>
      `<li><span>${i.label}</span><em>D-${Math.round((i.t - today) / DAY)}</em><small>${fmt(i.t)}</small></li>`).join('');

    const dEl = $('#countD'), tickEl = $('#countTick');
    const targetMs = first.t - 9 * 3600e3; // 그날 KST 자정
    function tick() {
      const left = targetMs - Date.now();
      if (left <= 0) { dEl.textContent = 'D-DAY'; tickEl.textContent = '오늘이야! 🎉'; return; }
      const days = Math.floor(left / DAY);
      const h = Math.floor((left % DAY) / 3600e3), m = Math.floor((left % 3600e3) / 60e3), sec = Math.floor((left % 60e3) / 1000);
      dEl.textContent = `D-${Math.round((first.t - today) / DAY)}`;
      tickEl.textContent = `${days}일 ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')} 남았어`;
      setTimeout(tick, 1000 - (Date.now() % 1000));
    }
    tick();
  }

  /* ───────── 쿠폰북 (긁기 + 사용) ───────── */
  const COUPONS = [
    { id: 'piggy',   icon: '🐴', title: '목마 5분 이용권',    desc: '종팔이 어깨 위에서 5분, 연장 불가' },
    { id: 'crave',   icon: '🍗', title: '땡기는 음식 바로 먹기권', desc: '지금 먹고 싶은 거, 시간 불문 바로' },
    { id: 'nag',     icon: '🙊', title: '잔소리 프리패스',    desc: '무슨 짓을 해도 그날은 노코멘트' },
    { id: 'side',    icon: '🛡️', title: '무조건 내 편 권',    desc: '네가 틀려도 그날은 네 편' },
    { id: 'massage', icon: '💆', title: '마사지 10분권',      desc: '어깨, 다리, 발 중 골라서' },
    { id: 'date',    icon: '🗺️', title: '데이트 전권 위임권', desc: '코스도 메뉴도 전부 구러이 마음대로' },
    { id: 'sorry',   icon: '🙇', title: '먼저 사과권',        desc: '싸우면 이유 불문 종팔이가 먼저 사과' },
    { id: 'sleep',   icon: '😴', title: '늦잠 보장권',        desc: '안 깨움. 절대. 점심까지도' },
  ];
  const COUPON_KEY = 'gurui-coupons-v1';

  function initCoupons() {
    const wrap = $('#coupons');
    const state = storage.get(COUPON_KEY, { revealed: [], used: {} });
    const save = () => storage.set(COUPON_KEY, state);
    const fmtDate = iso => { const d = new Date(iso); return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`; };

    COUPONS.forEach((c, i) => {
      const el = document.createElement('div');
      el.className = 'coupon';
      el.dataset.id = c.id;
      el.style.setProperty('--r', ((i % 2 ? 1 : -1) * (1 + Math.random() * 1.5)).toFixed(1) + 'deg');
      el.innerHTML = `
        <div class="coupon-inner">
          <span class="coupon-no">No.${String(i + 1).padStart(2, '0')}</span>
          <span class="coupon-icon">${c.icon}</span>
          <h4>${c.title}</h4>
          <p>${c.desc}</p>
          <button class="coupon-use" type="button">사용하기</button>
          <div class="coupon-stamp"><b>사용완료</b><small></small><a href="#" class="coupon-undo">실수야? 되돌리기</a></div>
        </div>
        <canvas class="scratch" aria-label="긁어서 쿠폰 확인"></canvas>`;
      wrap.appendChild(el);

      const useBtn = $('.coupon-use', el);
      const stamp = $('.coupon-stamp', el);
      const canvas = $('.scratch', el);

      function render() {
        const used = state.used[c.id];
        el.classList.toggle('used', !!used);
        if (used) $('small', stamp).textContent = fmtDate(used) + ' 사용';
      }
      render();

      // 사용하기: 두 번 눌러야 확정
      let armed = null;
      useBtn.addEventListener('click', () => {
        if (armed) {
          clearTimeout(armed); armed = null;
          state.used[c.id] = new Date().toISOString(); save(); render();
          useBtn.textContent = '사용하기';
          useBtn.classList.remove('armed');
          buzz([20, 30, 20]);
          toast('사용 완료! 종팔이한테 이 화면 보여줘 📸', 2200);
          confetti({ count: 60, hearts: true, x: innerWidth / 2, y: innerHeight * 0.5 });
        } else {
          useBtn.textContent = '진짜? 한 번 더 누르면 사용돼';
          useBtn.classList.add('armed');
          armed = setTimeout(() => { armed = null; useBtn.textContent = '사용하기'; useBtn.classList.remove('armed'); }, 3000);
        }
      });
      $('.coupon-undo', el).addEventListener('click', e => {
        e.preventDefault();
        delete state.used[c.id]; save(); render();
        toast('되돌렸어. 아직 안 쓴 걸로!');
      });

      if (state.revealed.includes(c.id)) { el.classList.add('revealed'); canvas.remove(); }
      else initScratch(canvas, () => { state.revealed.push(c.id); save(); el.classList.add('revealed'); buzz(20); setTimeout(() => canvas.remove(), 600); });
      if (io) io.observe(el);
    });
  }

  function initScratch(canvas, onReveal) {
    const ctx2 = canvas.getContext('2d', { willReadFrequently: true });
    let w = 0, h = 0, drawing = false, strokes = 0, done = false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function paint() {
      const r = canvas.getBoundingClientRect();
      w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
      const g = ctx2.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#d9d4dc'); g.addColorStop(0.45, '#f3f0f4'); g.addColorStop(0.55, '#c9c3cf'); g.addColorStop(1, '#e6e1ea');
      ctx2.fillStyle = g; ctx2.fillRect(0, 0, w, h);
      ctx2.fillStyle = 'rgba(255,255,255,.35)';
      for (let i = 0; i < 40; i++) ctx2.fillRect(Math.random() * w, Math.random() * h, 2, 2);
      ctx2.fillStyle = '#7a6f84';
      ctx2.font = '700 20px Gaegu, sans-serif';
      ctx2.textAlign = 'center'; ctx2.textBaseline = 'middle';
      ctx2.fillText('긁어서 확인 ✨', w / 2, h / 2 - 8);
      ctx2.font = '14px Gaegu, sans-serif';
      ctx2.fillText('손가락으로 문질러 봐', w / 2, h / 2 + 16);
    }
    // 레이아웃/폰트 준비 후 그리기 (섹션이 보일 때 크기가 잡힘)
    const ro = new ResizeObserver(() => { if (!drawing && strokes === 0) paint(); });
    ro.observe(canvas);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (strokes === 0) paint(); });

    function pos(e) { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    function scratchAt(x, y) {
      ctx2.globalCompositeOperation = 'destination-out';
      ctx2.beginPath(); ctx2.arc(x, y, 22, 0, Math.PI * 2); ctx2.fill();
      ctx2.globalCompositeOperation = 'source-over';
      if (++strokes % 6 === 0) check();
    }
    function check() {
      if (done || !canvas.width) return;
      const img = ctx2.getImageData(0, 0, canvas.width, canvas.height).data;
      let clear = 0, total = 0;
      for (let i = 3; i < img.length; i += 4 * 7) { total++; if (img[i] < 40) clear++; }
      if (clear / total > 0.5) { done = true; ro.disconnect(); onReveal(); }
    }
    canvas.addEventListener('pointerdown', e => { drawing = true; canvas.setPointerCapture(e.pointerId); scratchAt(...pos(e)); });
    canvas.addEventListener('pointermove', e => { if (drawing) scratchAt(...pos(e)); });
    const end = () => { drawing = false; check(); };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
  }

  /* ───────── 답장 남기기 ───────── */
  function initReply() {
    const ta = $('#replyText');
    const send = $('#replySend');
    const sms = $('#replySms');
    const KEY = 'gurui-reply-draft';
    ta.value = storage.get(KEY, '');
    ta.addEventListener('input', () => storage.set(KEY, ta.value));

    const body = () => `💌 구러이의 답장\n\n${ta.value.trim()}`;
    if (REPLY_PHONE) {
      sms.hidden = false;
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const update = () => { sms.href = `sms:${REPLY_PHONE}${ios ? '&' : '?'}body=${encodeURIComponent(body())}`; };
      update(); ta.addEventListener('input', update);
    }

    send.addEventListener('click', async () => {
      if (!ta.value.trim()) { toast('한 줄만 써줘 🥺'); ta.focus(); return; }
      buzz(15);
      if (navigator.share) {
        try { await navigator.share({ text: body() }); toast('보냈어! 고마워 💖', 1800); return; }
        catch (e) { if (e && e.name === 'AbortError') return; }
      }
      try { await navigator.clipboard.writeText(body()); toast('복사했어! 종팔이 채팅방에 붙여넣기 해줘', 2400); }
      catch (_) { ta.select(); toast('길게 눌러서 복사한 다음 채팅방에 붙여줘', 2400); }
    });
  }

  /* ───────── 배경음악: 오르골 '생일 축하합니다' (Web Audio 합성, 파일 없음) ───────── */
  const bgm = (() => {
    const btn = $('#bgmBtn');
    const BPM = 88, beat = 60 / BPM;
    const F = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
                C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, C6: 1046.5 };
    // [음, 박자] — 3/4 박자, 못갖춘마디(G G) 시작
    const MELODY = [
      ['G4', .75], ['G4', .25], ['A4', 1], ['G4', 1], ['C5', 1], ['B4', 2],
      ['G4', .75], ['G4', .25], ['A4', 1], ['G4', 1], ['D5', 1], ['C5', 2],
      ['G4', .75], ['G4', .25], ['G5', 1], ['E5', 1], ['C5', 1], ['B4', 1], ['A4', 1],
      ['F5', .75], ['F5', .25], ['E5', 1], ['C5', 1], ['D5', 1], ['C5', 2],
    ];
    // 마디별 반주 (아르페지오) — 못갖춘마디 1박 뒤부터 마디 시작
    const CHORDS = [
      ['C4', 'E4', 'G4'], ['G4', 'B4', 'D5'], ['G4', 'B4', 'D5'], ['C4', 'E4', 'G4'],
      ['C4', 'E4', 'G4'], ['F4', 'A4', 'C5'], ['C4', 'E4', 'G4'], ['G4', 'B4', 'D5'], ['C4', 'E4', 'G4'],
    ];
    const PICKUP = 1;                              // 못갖춘마디 길이(박)
    const SONG_BEATS = PICKUP + CHORDS.length * 3; // 28박
    const GAP_BEATS = 4;                           // 반복 사이 쉼

    let actx = null, master = null, nextLoopAt = 0, timer = null;
    let muted = storage.get('gurui-bgm-muted', false);
    let started = false;

    function pluck(freq, t, vel, decay) {
      // 오르골 음색: 기음 + 배음 두 개, 빠른 어택, 지수 감쇠
      const g = actx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vel, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      g.connect(master);
      [[1, 1], [2, .35], [3, .12], [4.2, .05]].forEach(([mul, amp]) => {
        const o = actx.createOscillator();
        o.type = 'sine';
        o.frequency.value = freq * mul;
        const og = actx.createGain();
        og.gain.value = amp;
        o.connect(og).connect(g);
        o.start(t);
        o.stop(t + decay + 0.05);
      });
    }

    function scheduleSong(t0) {
      let t = t0;
      for (const [n, b] of MELODY) { pluck(F[n], t, 0.42, 1.6); t += b * beat; }
      CHORDS.forEach((ch, m) => {
        const base = t0 + (PICKUP + m * 3) * beat;
        ch.forEach((n, i) => pluck(F[n] / 2, base + i * beat, 0.16, 1.4));   // 한 옥타브 아래로 잔잔하게
        pluck(F[ch[0]] / 2, base + 2.5 * beat, 0.08, 0.8);
      });
    }

    function tickScheduler() {
      if (!actx) return;
      while (nextLoopAt < actx.currentTime + 1.0) {
        scheduleSong(nextLoopAt);
        nextLoopAt += (SONG_BEATS + GAP_BEATS) * beat;
      }
    }

    function render() {
      if (!btn) return;
      btn.hidden = !started;
      btn.textContent = muted ? '🔇' : '🎵';
      btn.classList.toggle('playing', started && !muted);
      btn.setAttribute('aria-label', muted ? '배경음악 켜기' : '배경음악 끄기');
    }

    function start() {
      if (started) return;
      started = true;
      try {
        actx = new (window.AudioContext || window.webkitAudioContext)();
        master = actx.createGain();
        master.gain.value = 0.55;
        master.connect(actx.destination);
        nextLoopAt = actx.currentTime + 0.6;
        timer = setInterval(tickScheduler, 250);
        tickScheduler();
        if (muted) actx.suspend();
      } catch (_) { started = false; }
      render();
    }

    function toggle() {
      if (!actx) return;
      muted = !muted;
      storage.set('gurui-bgm-muted', muted);
      if (muted) actx.suspend(); else actx.resume();
      buzz(10);
      toast(muted ? '배경음악 껐어' : '배경음악 켰어 🎵');
      render();
    }

    if (btn) btn.addEventListener('click', toggle);
    document.addEventListener('visibilitychange', () => {
      if (!actx) return;
      if (document.hidden) actx.suspend();
      else if (!muted) actx.resume();
    });
    render();
    return { start };
  })();

  window.addEventListener('resize', () => { if (raf) resizeCanvas(); });
})();
