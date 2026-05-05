/* =====================================================
   PROPOSAL SITE — script.js
   ===================================================== */

/* ----- CONFIG ----- */
const PHOTOS = {
  me:  ['photos/me1.JPG', 'photos/me2.JPG'],
  she: ['photos/she1.jpg', 'photos/she2.jpg'],
  we:  ['photos/we.jpeg', 'photos/we1.jpeg', 'photos/we5.jpg', 'photos/we11.jpg', 'photos/we13.jpg', 'photos/we14.jpg', 'photos/we15.jpeg'],
};

let currentSheAvatar = PHOTOS.she[0];

/* ----- UTILS ----- */
const sleep = ms => new Promise(r => setTimeout(r, ms));

const chatEl   = document.getElementById('chat-messages');
const actionEl = document.getElementById('action-area');
const finaleEl = document.getElementById('finale');
const statusEl = document.getElementById('header-status');

function scrollBottom() {
  chatEl.scrollTo({ top: chatEl.scrollHeight, behavior: 'smooth' });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* ----- PRELOAD ----- */
function preloadImages() {
  [...PHOTOS.me, ...PHOTOS.she, ...PHOTOS.we].forEach(src => {
    const img = new Image();
    img.src = src;
  });
}

/* ----- STARFIELD ----- */
function createStarfield() {
  const container = document.getElementById('starfield');
  for (let i = 0; i < 70; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    const size = Math.random() * 2.2 + 0.4;
    star.style.cssText = [
      `width:${size}px`,
      `height:${size}px`,
      `left:${Math.random() * 100}%`,
      `top:${Math.random() * 100}%`,
      `--duration:${2 + Math.random() * 3.5}s`,
      `--delay:-${Math.random() * 5}s`,
      `--max-opacity:${(0.1 + Math.random() * 0.4).toFixed(2)}`,
    ].join(';');
    container.appendChild(star);
  }
}

/* ----- TYPING INDICATOR ----- */
/* from = 'me' | 'she' */
function showTypingIndicator(from = 'she') {
  const existing = document.getElementById('typing-indicator');
  if (existing) {
    /* Той самий бік вже показує dots — не перестворювати, щоб не було flash */
    if (existing.classList.contains(`from-${from}`)) return existing;
    existing.remove();
  }

  const avatar = from === 'me' ? PHOTOS.me[0] : currentSheAvatar;

  const row = document.createElement('div');
  row.className = `message-row from-${from} typing-row`;
  row.id = 'typing-indicator';
  row.innerHTML = `
    <img class="msg-avatar" src="${avatar}" alt="">
    <div class="typing-bubble">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;

  chatEl.appendChild(row);
  gsap.fromTo(row, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' });
  scrollBottom();

  if (from === 'me') {
    statusEl.textContent = 'друкує...';
    statusEl.classList.add('typing');
  }
  return row;
}

/* Тільки прибирає dots — статус НЕ скидає.
   Статус скидає setStatusOnline() після завершення typewriter. */
function hideTypingIndicator() {
  gsap.killTweensOf('#typing-indicator');
  const el = document.getElementById('typing-indicator');
  if (el) el.remove();
}

function setStatusOnline() {
  statusEl.textContent = 'онлайн';
  statusEl.classList.remove('typing');
}

/* ----- TYPEWRITER ----- */
/* Симулює живий набір тексту символ за символом */
async function typewriterText(el, text) {
  const chars = Array.from(text); // коректно розбиває емоджі
  el.textContent = '';
  for (const ch of chars) {
    el.textContent += ch;
    /* Природні паузи на пробілах і пунктуації */
    const delay = /[\s]/.test(ch) ? 55 + Math.random() * 30
                : /[,.!?…]/.test(ch) ? 80 + Math.random() * 40
                : 22 + Math.random() * 20;
    await sleep(delay);
    scrollBottom();
  }
  scrollBottom();
}

/* ----- ADD MESSAGE ----- */
/*
  Завжди показує typing indicator перед повідомленням.
  Для текстових повідомлень — typewriter ефект після появи бульбашки.
  typingMs: якщо не вказано — розраховується автоматично від довжини тексту.
*/
async function addMsg({ from, text, imgSrc, typingMs, preDelay = 450, typing = true, sticker = false }) {
  await sleep(preDelay);

  if (typing) {
    /* Авто-розрахунок тривалості typing indicator */
    if (!typingMs) {
      if (imgSrc) {
        typingMs = 500;
      } else {
        const len = text ? Array.from(text).length : 10;
        typingMs = Math.min(1800, Math.max(450, len * 22));
      }
    }

    const typingEl = showTypingIndicator(from);
    await sleep(typingMs);
    hideTypingIndicator();
    await sleep(110);
  }

  /* Будуємо рядок повідомлення */
  const row    = document.createElement('div');
  row.className = `message-row from-${from}`;

  const avatar  = from === 'me' ? PHOTOS.me[0] : currentSheAvatar;
  const isPhoto = Boolean(imgSrc);

  const bubble = document.createElement('div');
  bubble.className = `msg-bubble${sticker ? ' sticker-bubble' : isPhoto ? ' photo-bubble' : ''}`;
  if (isPhoto) {
    bubble.innerHTML = `<img src="${imgSrc}" alt="" loading="lazy">`;
  }
  /* Якщо текст — bubble залишається порожнім, заповнить typewriter */

  const avatarEl = document.createElement('img');
  avatarEl.className = 'msg-avatar';
  avatarEl.src = avatar;
  avatarEl.alt = '';

  if (from === 'me') {
    row.appendChild(avatarEl);
    row.appendChild(bubble);
  } else {
    row.appendChild(avatarEl);
    row.appendChild(bubble);
  }

  chatEl.appendChild(row);
  gsap.fromTo(row,
    { opacity: 0, y: 12 },
    { opacity: 1, y: 0, duration: 0.32, ease: 'power2.out' }
  );
  if (sticker) {
    gsap.fromTo(bubble,
      { scale: 0.4, rotation: from === 'me' ? 12 : -12 },
      { scale: 1, rotation: 0, duration: 0.55, ease: 'back.out(2.2)', delay: 0.1 }
    );
  }
  scrollBottom();

  /* Для from='me' без typing bubble — статус оновлюємо вручну */
  const meTextMsg = from === 'me' && !isPhoto && text;
  if (!typing && meTextMsg) {
    statusEl.textContent = 'друкує...';
    statusEl.classList.add('typing');
  }

  /* Typewriter для текстових повідомлень.
     Статус "друкує..." тримається весь час — скидається тільки тут. */
  if (!isPhoto && text) {
    await typewriterText(bubble, text);
  }

  /* Повідомлення повністю з'явилось → "онлайн" (тільки для мене) */
  if (from === 'me' && (typing || meTextMsg)) setStatusOnline();

  return row;
}

function addDivider(text) {
  const el = document.createElement('div');
  el.className = 'date-divider';
  el.textContent = text;
  chatEl.appendChild(el);
}

/* ----- NO BUTTON ESCAPE ----- */
/*
  При першому стрибку кнопка переноситься в document.body
  щоб уникнути stacking context батьківського actionEl.
  Desktop: тікає від курсора коли він < 90px
  Mobile:  touchstart перехоплюється (preventDefault), кнопка стрибає
  Текст і розмір змінюються з кожним стрибком.
  Після 7 стрибків здається і дозволяє клік.
*/
function makeNoButtonEscape(btn) {
  let jumps   = 0;
  let fleeing = false;
  const GIVE_UP = 7;

  const taunts = [
    'ні 😏', 'не тут 😄', 'спробуй! 😅',
    'тікаю 🏃', 'ха-ха 😂', 'ще раз! 🫣', 'ок стоп 😤',
    'ладно 😮‍💨',
  ];

  function flee(curX, curY) {
    if (fleeing) return;
    fleeing = true;
    setTimeout(() => { fleeing = false; }, 200);

    if (jumps >= GIVE_UP) {
      btn.textContent = 'ладно 😮‍💨';
      gsap.to(btn, { scale: 0.72, rotation: 0, duration: 0.35 });
      return;
    }

    jumps++;
    btn.textContent = taunts[Math.min(jumps - 1, taunts.length - 2)];

    /* Першого разу: перемістити в body */
    if (btn.parentNode !== document.body) {
      const r = btn.getBoundingClientRect();
      btn.style.margin   = '0';
      btn.style.position = 'fixed';
      btn.style.zIndex   = '99999';
      btn.classList.add('btn-no--flee');
      document.body.appendChild(btn);
      gsap.set(btn, { left: r.left, top: r.top, scale: 1, rotation: 0 });
    }

    const bw = btn.offsetWidth  || 100;
    const bh = btn.offsetHeight || 50;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const curLeft = Number(gsap.getProperty(btn, 'left'));
    const curTop  = Number(gsap.getProperty(btn, 'top'));
    const cx = curLeft + bw / 2;
    const cy = curTop  + bh / 2;

    let dx = cx - curX;
    let dy = cy - curY;
    if (!dx && !dy) { dx = 1; dy = -1; }
    const dist = Math.hypot(dx, dy);
    const mag  = (jumps <= 2 ? 170 : 100) + Math.random() * 90;

    let nx = cx + (dx / dist) * mag - bw / 2;
    let ny = cy + (dy / dist) * mag - bh / 2;
    nx = Math.max(8, Math.min(vw - bw - 8, nx));
    ny = Math.max(8, Math.min(vh - bh - 8, ny));

    /* Не допускати потрапляння на кнопку Так */
    const yesBtnEl = actionEl.querySelector('.btn-yes');
    if (yesBtnEl) {
      const yr  = yesBtnEl.getBoundingClientRect();
      const pad = 16;
      const hits = (lx, ly) =>
        lx < yr.right + pad && lx + bw > yr.left - pad &&
        ly < yr.bottom + pad && ly + bh > yr.top - pad;
      if (hits(nx, ny)) {
        for (let i = 0; i < 20; i++) {
          const rx = Math.random() * (vw - bw - 16) + 8;
          const ry = Math.random() * (vh - bh - 16) + 8;
          if (!hits(rx, ry)) { nx = rx; ny = ry; break; }
        }
      }
    }

    gsap.to(btn, {
      left: nx, top: ny,
      rotation: (Math.random() - 0.5) * 26,
      scale: Math.max(0.60, 1 - jumps * 0.06),
      duration: 0.24,
      ease: 'back.out(2.5)',
    });

    const yesBtn = actionEl.querySelector('.btn-yes');
    if (yesBtn && jumps >= 2) yesBtn.classList.add('pulsing');
  }

  function onMouseMove(e) {
    if (jumps >= GIVE_UP) return;
    const r  = btn.getBoundingClientRect();
    const cx = r.left + r.width  / 2;
    const cy = r.top  + r.height / 2;
    if (Math.hypot(e.clientX - cx, e.clientY - cy) < 90) flee(e.clientX, e.clientY);
  }

  function onTouchStart(e) {
    if (jumps >= GIVE_UP) return;
    e.preventDefault();
    flee(e.touches[0].clientX, e.touches[0].clientY);
  }

  document.addEventListener('mousemove', onMouseMove);
  btn.addEventListener('touchstart', onTouchStart, { passive: false });

  btn._escCleanup = () => {
    document.removeEventListener('mousemove', onMouseMove);
    if (btn.parentNode === document.body) btn.remove();
  };
}

function resetBtnPosition(btn) {
  if (btn._escCleanup) { btn._escCleanup(); btn._escCleanup = null; }
  gsap.killTweensOf(btn);
  gsap.set(btn, { clearProps: 'all' });
  btn.style.cssText = '';
}

/* ----- HEART EXPLOSION (розрив кнопки на серця по всій сторінці) ----- */
function explodeHearts(rect) {
  const cx   = rect.left + rect.width  / 2;
  const cy   = rect.top  + rect.height / 2;
  const pool = ['❤️','💕','💖','💗','💝','🩷','💘','🫶'];
  const count = 50;
  const maxDist = Math.max(window.innerWidth, window.innerHeight) * 1.1;

  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.textContent = pool[Math.floor(Math.random() * pool.length)];
    const size = 36 + Math.random() * 46;
    el.style.cssText = [
      'position:fixed', 'z-index:999999', 'pointer-events:none',
      `font-size:${size}px`,
      `left:${cx}px`, `top:${cy}px`,
      'filter:drop-shadow(0 0 12px rgba(255,60,130,1)) drop-shadow(0 0 24px rgba(255,60,130,0.6))',
    ].join(';');
    document.body.appendChild(el);

    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const dist  = maxDist * (0.4 + Math.random() * 0.65);
    const dur   = 2.6 + Math.random() * 1.2;
    const delay = i * 0.018;

    gsap.fromTo(el,
      { xPercent: -50, yPercent: -50, scale: 0.3, opacity: 1, rotation: 0 },
      {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        scale: 1.6 + Math.random() * 1.4,
        rotation: (Math.random() - 0.5) * 540,
        duration: dur,
        ease: 'power1.out',
        delay,
        onComplete: () => el.remove(),
      }
    );
    gsap.to(el, {
      opacity: 0,
      duration: dur * 0.35,
      ease: 'power2.in',
      delay: delay + dur * 0.65,
    });
  }
}

/* ----- FLAME SPAWNER (для фінального вибуху) ----- */
function spawnFlames(btn) {
  const r = btn.getBoundingClientRect();
  for (let i = 0; i < 10; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.textContent = '🔥';
      const size = 18 + Math.random() * 18;
      el.style.cssText = [
        'position:fixed', 'z-index:999999', 'pointer-events:none',
        `font-size:${size}px`,
        `left:${r.left + Math.random() * r.width}px`,
        `top:${r.top - 4}px`,
      ].join(';');
      document.body.appendChild(el);
      gsap.to(el, {
        y: -(50 + Math.random() * 60),
        x: (Math.random() - 0.5) * 50,
        opacity: 0,
        scale: 1.6,
        duration: 0.55 + Math.random() * 0.4,
        ease: 'power1.out',
        onComplete: () => el.remove(),
      });
    }, i * 90);
  }
}

/* =====================================================
   waitForYes
   — типінг видно поки кнопки активні
   — відповідь зʼявляється ТІЛЬКИ після Так
   — joke.hideNo = true → після жарту лишається тільки Так
   ===================================================== */
function waitForYes({ yesTxt = 'Так ✅', noTxt = 'Ні', noJokes = [], sheResponse = null, keepTyping = false } = {}) {
  return new Promise(async (resolve) => {
    let noIdx      = 0;
    let typingEl   = null;
    let currentNo  = null; // посилання на поточну кнопку Ні (може бути в body)

    function cleanupNo() {
      if (currentNo) { resetBtnPosition(currentNo); currentNo = null; }
    }

    await sleep(400);
    typingEl = showTypingIndicator('she');
    await sleep(600);

    render(false);

    async function render(hideNo) {
      cleanupNo();
      actionEl.innerHTML = '';

      const yesBtn = document.createElement('button');
      yesBtn.className = 'btn btn-yes';
      yesBtn.innerHTML = yesTxt;
      actionEl.appendChild(yesBtn);

      gsap.fromTo(yesBtn,
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.38, ease: 'power2.out' }
      );

      yesBtn.addEventListener('click', async () => {
        cleanupNo();
        actionEl.innerHTML = '';
        typingEl = null;
        if (sheResponse) {
          /* addMsg сам замінить поточні dots плавно через showTypingIndicator */
          await sleep(250);
          await addMsg({ from: 'she', text: sheResponse, typingMs: 800, preDelay: 80 });
          await sleep(300);
        } else if (!keepTyping) {
          hideTypingIndicator();
          setStatusOnline();
        }
        /* keepTyping=true: dots лишаються, наступний addMsg підхопить їх без flash */
        resolve();
      });

      if (!hideNo) {
        const noLabels = [noTxt, 'Та ні...', 'Ну камон 🙈', 'Останній шанс 😂'];
        const noBtn = document.createElement('button');
        noBtn.className = 'btn btn-no';
        noBtn.textContent = noLabels[Math.min(noIdx, noLabels.length - 1)];
        if (noIdx >= 2) {
          noBtn.style.cssText = 'font-size:13px;opacity:0.65;padding:0 16px';
        }
        actionEl.appendChild(noBtn);
        currentNo = noBtn;

        gsap.fromTo(noBtn,
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: 0.38, delay: 0.1, ease: 'power2.out' }
        );

        makeNoButtonEscape(noBtn);

        noBtn.addEventListener('click', async () => {
          currentNo = null;
          resetBtnPosition(noBtn);
          noIdx++;
          actionEl.innerHTML = '';

          hideTypingIndicator();
          typingEl = null;

          const joke = noJokes[Math.min(noIdx - 1, noJokes.length - 1)];
          if (joke?.me)  await addMsg({ from: 'me',  text: joke.me,  preDelay: 200 });
          if (joke?.she) await addMsg({ from: 'she', text: joke.she, preDelay: 250 });

          await sleep(450);
          typingEl = showTypingIndicator('she');
          await sleep(600);
          render(joke?.hideNo === true);
        });
      }
    }
  });
}

/* ===================================================
   STAGE 1 — INTRO
   =================================================== */
async function runIntro() {
  currentSheAvatar = PHOTOS.she[0];
  chatEl.innerHTML = '';
  actionEl.innerHTML = '';

  addDivider('Сьогодні 💜');

  await addMsg({ from: 'me', text: 'Юстинка, є важлива справа, ти тут? 😏', preDelay: 600 });

  await waitForYes({
    yesTxt: 'Так ✅',
    noTxt:  'Ні',
    sheResponse: 'Котусик!! таак, я тут 🥰 що трапилось?',
    noJokes: [
      {
        me:  'Не правильна відповідь 😄 давай ще раз, нечемна 😂',
        she: 'Ха-ха ладно ладно 😂❤️ слухаю Котусика! 🥰',
      },
      {
        me:  'Окей я можу й сам собі запропонувати 🤷 😄',
        she: 'СТОП 😂😂 Так Так Так!! 🥰',
        hideNo: true,
      },
    ],
  });

  await sleep(250);
  await runStory();
}

/* ===================================================
   STAGE 2 — STORY
   =================================================== */
async function runStory() {
  addDivider('Невелика передісторія... 🐾');

  await addMsg({ from: 'me', text: 'Ми багато чого пройшли разом, і я дещо важливе вирішив для нас 🙂', preDelay: 500 });
  await addMsg({ from: 'me', text: 'Знаєш що? 😏', preDelay: 400 });

  await waitForYes({
    yesTxt: 'Що? 😏',
    noTxt:  'Ой, не зараз...',
    sheResponse: 'Що, котусику?? 🥰🤔',
    noJokes: [
      {
        me:  'Ну окей... посиджу тут з моїм секретом 🙃',
        she: 'СТОП 😂 що там, котусику?? давай розказуй! 😏',
        hideNo: true,
      },
    ],
  });

  await addMsg({ from: 'me', imgSrc: PHOTOS.we[1], preDelay: 450 });

  await addMsg({ from: 'she', text: 'Классс, ми такі щасливі тут 🥰😍✨', preDelay: 320 });

  await addMsg({ from: 'me', text: 'Так, дуже щасливі 😄😜',                  preDelay: 350 });
  await addMsg({ from: 'me', text: 'Ти готова до наступного етапу? 😉',    preDelay: 400 });

  await waitForYes({
    yesTxt: 'Так, готоваа 🥰',
    noTxt:  'Ні',
    keepTyping: true,
    noJokes: [
      {
        me:  'Та камон 😄 я ж тут старався, нечемна... 🤪',
        she: 'ДОБРЕ ДОБРЕ Котусику 😂❤️',
        hideNo: true,
      },
    ],
  });

  await addMsg({ from: 'she', imgSrc: PHOTOS.she[1], preDelay: 300, sticker: true });
  await addMsg({ from: 'she', text: 'Так, звісно, і що там? 😏💕', preDelay: 300 });

  await sleep(250);
  await runProposal();
}

/* ===================================================
   waitForFinalYes — тапай допоки не вибухне 🔥💥
   =================================================== */
function waitForFinalYes({ noTxt, noJokes, sheResponse } = {}) {
  return new Promise(async (resolve) => {
    let noIdx     = 0;
    let typingEl  = null;
    let currentNo = null;
    const TAPS    = 12;

    function cleanupNo() {
      if (currentNo) { resetBtnPosition(currentNo); currentNo = null; }
    }

    await sleep(400);
    typingEl = showTypingIndicator('she');
    await sleep(600);

    render(false);

    async function render(hideNo) {
      cleanupNo();
      actionEl.innerHTML = '';

      let tapCount = 0;

      const yesBtn = document.createElement('button');
      yesBtn.className = 'btn btn-yes';
      yesBtn.textContent = 'Так 💍';
      actionEl.appendChild(yesBtn);

      gsap.fromTo(yesBtn,
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.38, ease: 'power2.out' }
      );

      yesBtn.addEventListener('click', async () => {
        if (yesBtn.dataset.exploding) return;
        tapCount++;
        const progress = tapCount / TAPS;

        /* Перший тап — прибираємо Ні і центруємо кнопку */
        if (tapCount === 1) {
          cleanupNo();
          actionEl.innerHTML = '';
          actionEl.appendChild(yesBtn);
        }

        /* Колір: зелений → помаранчевий → червоний */
        let r, g, b;
        if (progress < 0.5) {
          const t = progress * 2;
          r = Math.round(16  + (249 - 16)  * t);
          g = Math.round(185 + (115 - 185) * t);
          b = Math.round(129 + (22  - 129) * t);
        } else {
          const t = (progress - 0.5) * 2;
          r = Math.round(249 + (239 - 249) * t);
          g = Math.round(115 + (68  - 115) * t);
          b = Math.round(22  + (68  - 22)  * t);
        }

        /* Лейбл */
        if (progress > 0.75)      yesBtn.textContent = '🔥💍💥🔥';
        else if (progress > 0.5)  yesBtn.textContent = 'Майже! 💍💥';
        else if (progress > 0.25) yesBtn.textContent = 'Ще! 💍🔥';

        /* Тряска — сильніша з кожним тапом */
        const shakeAmt = 4 + progress * 14;
        const shakeRep = Math.round(4 + progress * 8);
        gsap.fromTo(yesBtn, { x: -shakeAmt }, {
          x: shakeAmt, duration: 0.04, ease: 'none',
          yoyo: true, repeat: shakeRep,
          onComplete: () => gsap.set(yesBtn, { x: 0 }),
        });

        /* Масштаб і колір — плавно накопичуються */
        const scale = 1 + progress * 0.85;
        const glow  = 8 + progress * 65;
        const glowA = 0.35 + progress * 0.65;
        gsap.to(yesBtn, {
          scale,
          background: `linear-gradient(135deg,rgb(${r},${g},${b}) 0%,rgb(${Math.round(r*.7)},${Math.round(g*.55)},${Math.round(b*.55)}) 100%)`,
          boxShadow: `0 4px ${glow}px rgba(${r},${g},${b},${glowA})`,
          duration: 0.22,
          ease: 'power2.out',
          overwrite: false,
        });

        /* Вогонь з'являється після 40% тапів */
        if (progress > 0.4) spawnFlames(yesBtn);

        /* ВИБУХ після останнього тапу */
        if (tapCount >= TAPS) {
          yesBtn.dataset.exploding = '1';
          yesBtn.style.pointerEvents = 'none';

          gsap.to(yesBtn, {
            scale: 2.2,
            background: 'linear-gradient(135deg,#ef4444 0%,#b91c1c 100%)',
            boxShadow: '0 4px 60px rgba(239,68,68,1)',
            duration: 0.35,
            ease: 'back.out(2)',
            overwrite: true,
            onComplete() {
              spawnFlames(yesBtn);
              gsap.fromTo(yesBtn, { x: -10 }, {
                x: 10, duration: 0.05, ease: 'none',
                yoyo: true, repeat: 17,
                onComplete: () => gsap.set(yesBtn, { x: 0 }),
              });
              gsap.to(yesBtn, {
                scale: 3.2,
                boxShadow: '0 0 80px rgba(251,146,60,1), 0 0 140px rgba(239,68,68,.95)',
                duration: 0.9,
                ease: 'power1.in',
                onComplete() {
                  const bRect = yesBtn.getBoundingClientRect();
                  gsap.to(yesBtn, {
                    filter: 'brightness(9)',
                    duration: 0.18,
                    ease: 'power3.in',
                    onComplete() {
                      explodeHearts(bRect);
                      gsap.to(yesBtn, {
                        scale: 0,
                        opacity: 0,
                        duration: 0.2,
                        ease: 'power4.in',
                        onComplete: async () => {
                          actionEl.innerHTML = '';
                          typingEl = null;
                          await sleep(3400);
                          if (sheResponse) {
                            const msgRow = await addMsg({ from: 'she', text: sheResponse, typingMs: 300, preDelay: 80 });
                            const bubble = msgRow?.querySelector('.msg-bubble');
                            if (bubble) {
                              gsap.fromTo(bubble,
                                { scale: 0.6, y: 20, rotation: -6 },
                                { scale: 1, y: 0, rotation: 0, duration: 0.75, ease: 'elastic.out(1.4, 0.45)' }
                              );
                              setTimeout(() => bubble.classList.add('bubble-celebrate'), 400);
                            }
                            await sleep(3000);
                          } else {
                            hideTypingIndicator();
                            setStatusOnline();
                          }
                          resolve();
                        },
                      });
                    },
                  });
                },
              });
            },
          });
        }
      });

      if (!hideNo) {
        const noLabels = [noTxt, 'Та ні...', 'Ну камон 🙈', 'Останній шанс 😂'];
        const noBtn = document.createElement('button');
        noBtn.className = 'btn btn-no';
        noBtn.textContent = noLabels[Math.min(noIdx, noLabels.length - 1)];
        if (noIdx >= 2) noBtn.style.cssText = 'font-size:13px;opacity:0.65;padding:0 16px';
        actionEl.appendChild(noBtn);
        currentNo = noBtn;

        gsap.fromTo(noBtn,
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: 0.38, delay: 0.1, ease: 'power2.out' }
        );

        makeNoButtonEscape(noBtn);

        noBtn.addEventListener('click', async () => {
          currentNo = null;
          resetBtnPosition(noBtn);
          noIdx++;
          actionEl.innerHTML = '';
          hideTypingIndicator();
          typingEl = null;

          const joke = noJokes[Math.min(noIdx - 1, noJokes.length - 1)];
          if (joke?.me)  await addMsg({ from: 'me',  text: joke.me,  preDelay: 200 });
          if (joke?.she) await addMsg({ from: 'she', text: joke.she, preDelay: 250 });

          await sleep(450);
          typingEl = showTypingIndicator('she');
          await sleep(600);
          render(joke?.hideNo === true);
        });
      }
    }
  });
}

/* ===================================================
   STAGE 3 — PROPOSAL
   =================================================== */
async function runProposal() {
  /* Фото + запит "готова?" — без typing dots від мене */
  await addMsg({ from: 'me', imgSrc: PHOTOS.me[1], preDelay: 500, typing: false, sticker: true });
  await addMsg({ from: 'me', text: 'Ти дійсно впевнена, що готова? 😊', preDelay: 500, typing: false });

  /* Міні-вибір: Так, звісно / Та ні */
  await waitForYes({
    yesTxt: 'Так, звісно 🥰',
    noTxt:  'Та ні...',
    sheResponse: 'Та звісно ж, котусику 🥰 Що там за секретики? 🙈🙈',
    noJokes: [
      {
        me:  'Неправильна відповідь 😄 пробуй ще раз, нечемна 😂',
        she: 'ОК ОК ОК готова!! 😂❤️',
        hideNo: true,
      },
    ],
  });

  /* Пропозиція — без typing dots від мене */
  await sleep(350);
  addDivider('Головне питання 💍');
  await addMsg({ from: 'me', text: 'Юстинка, а тепер офіційно — виходь за мене? 😘💍', preDelay: 500, typing: false });

  await waitForFinalYes({
    noTxt: 'Ні',
    sheResponse: 'КОТУСИК ТАК ТАК ТАК 😭🥰❤️❤️❤️💍',
    noJokes: [
      {
        me:  'Окей. Я зроблю вигляд що цього не було 😄 хоча кільце вже куплене... 😂',
        she: 'СТОП КОТУСИК 😂😂 не те клацнула!! 😘',
        hideNo: true,
      },
    ],
  });

  await sleep(350);
  await runFinale();
}

/* ===================================================
   STAGE 4 — FINALE
   =================================================== */
async function runFinale() {
  finaleEl.classList.remove('hidden');

  gsap.fromTo(finaleEl,
    { opacity: 0 },
    { opacity: 1, duration: 0.9, ease: 'power2.inOut' }
  );

  /* Slideshow */
  const slideshowEl = document.getElementById('slideshow');
  PHOTOS.we.forEach((src, i) => {
    const img = document.createElement('img');
    img.src = src;
    img.className = 'slide-img' + (i === 0 ? ' active' : '');
    img.alt = '';
    slideshowEl.appendChild(img);
  });

  let slideIdx = 0;
  setInterval(() => {
    const slides = slideshowEl.querySelectorAll('.slide-img');
    slides[slideIdx].classList.remove('active');
    slideIdx = (slideIdx + 1) % slides.length;
    slides[slideIdx].classList.add('active');
  }, 3500);

  await sleep(200);

  /* Кільце: влітає зі спіном + elastic bounce */
  gsap.set('#finale-emoji', { transformPerspective: 900 });
  gsap.to('#finale-emoji', {
    scale: 1, opacity: 1, rotationY: 720,
    duration: 1.5, ease: 'elastic.out(1, 0.6)',
  });

  await sleep(900);

  /* Wobble після приземлення */
  gsap.to('#finale-emoji', {
    rotation: 16, duration: 0.09, ease: 'power1.inOut',
    yoyo: true, repeat: 9,
    onComplete() {
      gsap.set('#finale-emoji', { rotation: 0 });
      /* Безкінечне плавання вгору-вниз */
      gsap.to('#finale-emoji', {
        y: -16, duration: 1.9, ease: 'sine.inOut', yoyo: true, repeat: -1,
      });
      /* Повільний 3D-оберт як справжня обручка */
      gsap.to('#finale-emoji', {
        rotationY: 360, duration: 3.6, ease: 'none', repeat: -1,
      });
      /* Glow-пульс через CSS-анімацію */
      document.getElementById('finale-emoji').style.animation = 'ring-glow 2s ease-in-out infinite';
    },
  });

  await sleep(400);

  gsap.to('#finale-title', {
    opacity: 1, y: 0, duration: 0.7, ease: 'power2.out',
    onStart() { gsap.set('#finale-title', { y: 22 }); },
  });

  await sleep(200);

  gsap.to('#slideshow-container', {
    opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.5)',
    onStart() { gsap.set('#slideshow-container', { scale: 0.82 }); },
  });

  await sleep(200);

  gsap.to('#finale-love', {
    opacity: 1, y: 0, duration: 0.7, ease: 'power2.out',
    onStart() { gsap.set('#finale-love', { y: 16 }); },
  });


  await sleep(300);
  burstConfetti();
  setTimeout(fireworks, 700);
  setTimeout(floatingEmojis, 500);
}

/* ----- CONFETTI ----- */
function burstConfetti() {
  if (typeof confetti === 'undefined') return;
  const colors = ['#f472b6', '#818cf8', '#34d399', '#fbbf24', '#e879f9', '#fff', '#ff6b6b'];
  const fire   = (ratio, opts) =>
    confetti({ colors, ...opts, particleCount: Math.floor(280 * ratio) });

  fire(0.25, { spread: 30,  startVelocity: 60, origin: { y: 0.8 } });
  fire(0.20, { spread: 70,  origin: { y: 0.75 } });
  fire(0.35, { spread: 110, decay: 0.91, scalar: 0.85, origin: { y: 0.7 } });
  fire(0.10, { spread: 140, startVelocity: 25, decay: 0.92, scalar: 1.3, origin: { y: 0.8 } });
  fire(0.10, { spread: 140, startVelocity: 50, origin: { y: 0.8 } });
  setTimeout(() => {
    confetti({ particleCount: 60, angle: 60,  spread: 55, origin: { x: 0, y: 0.6 }, colors });
    confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, colors });
  }, 300);
}

function fireworks() {
  if (typeof confetti === 'undefined') return;
  const colors = ['#f472b6', '#818cf8', '#34d399', '#fbbf24', '#e879f9', '#ffffff', '#ff9f43'];
  const end    = Date.now() + 7000;
  (function frame() {
    confetti({ particleCount: 4, angle: 60,  spread: 60, origin: { x: 0, y: Math.random() * 0.6 + 0.2 }, colors });
    confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1, y: Math.random() * 0.6 + 0.2 }, colors });
    if (Math.random() < 0.04) {
      confetti({ particleCount: 50, spread: 360, startVelocity: 35, decay: 0.88,
        origin: { x: Math.random(), y: Math.random() * 0.5 + 0.2 }, colors });
    }
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

function floatingEmojis() {
  const pool = [
    '❤️','💍','🎊','✨','🥰','💕','💖','🌸','🎉','💝',
    '🐻','💜','🫶','🎈','😍','🤩','😘','🥳','🎀','💫',
    '🌟','💞','🥹','😻','🎁','🪄','🌈','💐','🎆','🎇',
  ];
  const end = Date.now() + 15000;
  function spawn() {
    if (Date.now() > end) return;
    const el   = document.createElement('div');
    el.className = 'float-emoji';
    const size = 22 + Math.random() * 36;
    const dur  = (2.5 + Math.random() * 3).toFixed(1);
    el.textContent = pool[Math.floor(Math.random() * pool.length)];
    el.style.cssText = [
      `left:${3 + Math.random() * 94}vw`,
      `bottom:${-size}px`,
      `font-size:${size}px`,
      `--dur:${dur}s`,
      `--delay:0s`,
      `--rot:${(Math.random() * 360 - 180)}deg`,
    ].join(';');
    document.body.appendChild(el);
    setTimeout(() => el.remove(), parseFloat(dur) * 1000 + 300);
    setTimeout(spawn, 100 + Math.random() * 160);
  }
  /* Кілька хвиль одразу на старті */
  for (let i = 0; i < 5; i++) setTimeout(spawn, i * 120);
}

/* ===================================================
   INIT
   =================================================== */
async function init() {
  createStarfield();
  preloadImages();
  await sleep(120);
  await runIntro();
}

/* Якщо data.enc.js завантажено — запуск відбудеться після введення пароля.
   Якщо його немає (локальна розробка) — стартуємо одразу. */
if (typeof ENC === 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
