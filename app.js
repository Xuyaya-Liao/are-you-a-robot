/* ============================================================
   Are You a Robot? — v2 (system environment)

   Steps 1-4: environment shell + Messages + grid + Files + Personalization
   - lock screen with CAPTCHA
   - desktop: top bar, wallpaper, draggable app icons
   - window system (open / close / drag / focus)
   - notification toasts
   - ambient details (clock, battery, sync indicator)
   - Messages: free-form reply + deterministic surface analysis
     (input telemetry + linguistic markers -> human-ness index)
     + mechanical "efficiency" suggestion (apply / edit / keep)
   - Grid challenge: reversed CAPTCHA (select signatures divisible by 3);
     2 manual attempts, then the system offers to complete it for you
   - Files: childhood.txt "storage optimization" with diff preview.
     Accept (apply / summarize) -> the whole UI is restructured into
     machine format (data mode). Reject (keep) -> a confirmation warning,
     then a 0%-tolerance 50% alignment slider check (assist / skip).

   - Personalization: normal mode -> "recommended layout" suggestion
     (apply / keep); data mode -> copy check ("type: I AM A ROBOT.",
     one attempt, mismatch = forced 100% human). Then the verdict gate:
     MCI >= 60 -> robot, else human.
   - Endings: robot -> vault unlocked (note.txt: "I KNOW YOU WERE HUMAN",
     stays decoded even in data mode). Human -> 3-5 stacked
     "YOU ARE A HUMAN" warning modals, then eject to the lock screen.
   ============================================================ */
(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const delay = (ms) => (reducedMotion ? Promise.resolve() : wait(ms));

  // ---------- Clock & ambient counters ----------

  let battery = 87;
  // True once the user accepts the storage optimization: the whole UI is
  // rewritten into machine format (see applyDataMode below).
  let dataMode = false;
  function tickClock() {
    const now = new Date();
    const p = (n) => String(n).padStart(2, '0');
    const clockText = p(now.getHours()) + ':' + p(now.getMinutes()) + ':' + p(now.getSeconds());
    $('#clock').textContent = dataMode ? toField(clockText) : clockText;
    $('#lock-clock').textContent = p(now.getHours()) + ':' + p(now.getMinutes());
    $('#lock-date').textContent = now.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }
  setInterval(tickClock, 1000);
  tickClock();

  setInterval(() => {
    battery = Math.max(20, battery - 1);
    $('#battery').textContent = dataMode ? toField(battery + '%') : battery + '%';
  }, 90000);

  // SYNC indicator: this is the (hidden) Machine Compatibility Index.
  // It only changes when a task is resolved. Nothing in the UI explains it
  // until the final report.
  let sync = 0;
  function setSync(n) {
    sync = Math.max(0, Math.min(100, n));
    const t = 'SYNC ' + sync + '%';
    $('#sync-indicator').textContent = dataMode ? toField(t) : t;
  }

  // ---------- Data mode (accept storage optimization) ----------
  // When the user accepts the restructuring, the optimization "propagates":
  // every piece of text in the interface is rewritten as HTML character
  // references ("Messages" -> "&#77;&#101;&#115;&#115;&#97;&#103;&#101;&#115;")
  // and the UI switches to a monospace terminal theme. Emoji icons are left
  // untouched. The transform is one-way; leaving data mode (a human ending)
  // reloads the page to a pristine state.
  function toField(str) {
    const t = String(str);
    if (!t.trim()) return str;
    // Idempotent: already contains a character reference -> leave as is.
    if (/&#\d+;/.test(t)) return str;
    let out = '';
    for (const ch of t) {
      // Whitespace stays whitespace (layout).
      if (/\s/.test(ch)) { out += ch; continue; }
      const cp = ch.codePointAt(0);
      // Icons stay icons: emoji (non-BMP), misc symbols & dingbats
      // (U+2600-U+27BF covers ⚙ ✅), arrows/stars, variation selectors.
      if (
        cp >= 0x10000 ||
        (cp >= 0x2600 && cp <= 0x27bf) ||
        (cp >= 0x2b00 && cp <= 0x2bff) ||
        (cp >= 0xfe00 && cp <= 0xfe0f)
      ) {
        out += ch;
        continue;
      }
      out += '&#' + cp + ';';
    }
    return out;
  }

  function computerizeScope(scope) {
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const p = n.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        if (p.closest('script,style,noscript')) return NodeFilter.FILTER_REJECT;
        // The vault note stays decoded (normal text) even in data mode.
        if (p.closest('.vault-doc-text')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((n) => { n.nodeValue = toField(n.nodeValue); });
  }

  function applyDataMode() {
    if (dataMode) return;
    dataMode = true;
    const flash = $('#restructure-flash');
    flash.hidden = false;
    setTimeout(() => {
      document.body.classList.add('data-mode');
      computerizeScope(document.body);
      const ta = $('#msg-input');
      if (ta) ta.placeholder = toField(ta.placeholder);
      flash.hidden = true;
    }, reducedMotion ? 0 : 900);
  }

  // ---------- Lock screen ----------

  const robotCheck = $('#robot-check');
  const lockVerify = $('#lock-verify');

  robotCheck.addEventListener('change', () => {
    lockVerify.disabled = !robotCheck.checked;
  });

  lockVerify.addEventListener('click', async () => {
    lockVerify.disabled = true;
    lockVerify.textContent = 'Verifying\u2026';
    await delay(1400);
    const w = $('#lock-warning');
    w.textContent = 'Suspicious activity detected. Additional verification required.';
    w.classList.remove('hidden');
    await delay(1900);
    w.classList.add('progress');
    w.textContent = 'Preparing verification environment\u2026';
    await delay(1300);
    unlock();
  });

  function unlock() {
    document.body.dataset.state = 'desktop';
    $('#desktop').hidden = false;
    $('#lock-screen').classList.add('unlocking');
    setTimeout(() => {
      $('#lock-screen').hidden = true;
      $('#desktop').focus();
    }, reducedMotion ? 0 : 950);
    startAmbient();
  }

  // ---------- Drag helper ----------
  // Shared by windows (title bar) and icons. Distinguishes click from drag
  // with a 5px threshold; opts.onEnd(dragged) lets the caller open apps.

  function makeDraggable(handle, target, opts = {}) {
    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      if (opts.shouldIgnore && opts.shouldIgnore(e)) return;
      const startX = e.clientX;
      const startY = e.clientY;
      const rect = target.getBoundingClientRect();
      const origLeft = rect.left;
      const origTop = rect.top;
      let dragging = false;

      function move(ev) {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (!dragging && Math.hypot(dx, dy) > 5) {
          dragging = true;
          target.classList.add('dragging');
          if (opts.onStart) opts.onStart();
        }
        if (!dragging) return;
        let x = origLeft + dx;
        let y = origTop + dy;
        x = Math.min(x, window.innerWidth - 60);
        x = Math.max(x, 60 - rect.width);
        y = Math.min(y, window.innerHeight - 44);
        y = Math.max(y, 48);
        target.style.left = x + 'px';
        target.style.top = y + 'px';
      }
      function up() {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        target.classList.remove('dragging');
        if (opts.onEnd) opts.onEnd(dragging);
      }
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    });
  }

  // ---------- Window system ----------

  const windows = {};
  let zTop = 10;

  function focusWindow(win) {
    zTop += 1;
    win.style.zIndex = zTop;
    document.querySelectorAll('.window').forEach((w) => w.classList.toggle('focused', w === win));
  }

  function openWindow(id) {
    if (windows[id]) {
      focusWindow(windows[id]);
      return;
    }
    const spec = APPS[id];
    const el = document.createElement('section');
    el.className = 'window';
    el.dataset.app = id;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', spec.title);

    const n = Object.keys(windows).length;
    el.style.left = Math.min(48 + n * 40, Math.max(16, window.innerWidth - 420)) + 'px';
    el.style.top = Math.min(64 + n * 34, Math.max(56, window.innerHeight - 320)) + 'px';

    el.innerHTML =
      '<div class="win-titlebar">' +
        '<span class="win-title">' + spec.glyph + ' ' + spec.title + '</span>' +
        '<button class="win-close" aria-label="Close ' + spec.title + '">&times;</button>' +
      '</div>' +
      '<div class="win-body">' + spec.content() + '</div>';

    $('#windows').appendChild(el);
    windows[id] = el;

    el.addEventListener('pointerdown', () => focusWindow(el));
    makeDraggable(el.querySelector('.win-titlebar'), el, {
      shouldIgnore: (e) => !!e.target.closest('.win-close'),
    });
    el.querySelector('.win-close').addEventListener('click', () => {
      el.classList.add('closing');
      setTimeout(() => el.remove(), reducedMotion ? 0 : 180);
      delete windows[id];
    });

    focusWindow(el);
    if (id === 'messages') {
      unread = 0;
      updateBadge();
    }
    if (spec.onOpen) spec.onOpen(el);
    if (dataMode) computerizeScope(el);
  }

  // ---------- App definitions ----------

  const APPS = {
    messages: {
      glyph: '\uD83D\uDCAC', // 💬
      title: 'Messages',
      content: () =>
        '<div class="conv" id="conv"></div>' +
        '<div class="composer">' +
          '<textarea id="msg-input" rows="2" placeholder="Message composer unlocks after verification completes\u2026" disabled></textarea>' +
          '<div class="composer-row">' +
            '<span class="char-hint" id="msg-hint"></span>' +
            '<button class="btn btn-primary" id="msg-send" disabled>Send</button>' +
          '</div>' +
        '</div>',
      onOpen(el) {
        renderConvo();
        const ta = el.querySelector('#msg-input');
        const send = el.querySelector('#msg-send');
        if (taskDone) {
          ta.disabled = true;
          ta.placeholder = 'Conversation archived.';
        } else if (composerUnlocked) {
          ta.disabled = false;
          ta.placeholder = 'Reply to Mia\u2026';
        } else {
          ta.disabled = true;
          ta.placeholder = 'Message composer unlocks after verification completes\u2026';
        }
        if (ta.value === '' && draft) ta.value = draft;
        wireComposer(ta, send);
        if (pendingSuggestion) {
          const card = el.querySelector('#analysis-card');
          if (card) {
            const p = pendingSuggestion;
            pendingSuggestion = null;
            showSuggestion(card, p);
          }
        }
      },
    },

    notes: {
      glyph: '\uD83D\uDCDD', // 📝
      title: 'Notes',
      content: () =>
        '<div class="empty-state"><span>\uD83D\uDCDD</span><p>No notes yet.</p></div>',
    },

    files: {
      glyph: '\uD83D\uDDC2\uFE0F', // 🗂️
      title: 'Files',
      content: () =>
        '<div class="file-list">' +
          '<button class="file" data-file="childhood"><span class="file-glyph">\uD83D\uDCC4</span><span class="file-name">childhood.txt</span><span class="file-meta">12 B &middot; 12 years ago</span></button>' +
          '<button class="file" data-file="photos"><span class="file-glyph">\uD83D\uDCC1</span><span class="file-name">photos/</span><span class="file-meta">214 items</span></button>' +
          '<button class="file" data-file="downloads"><span class="file-glyph">\uD83D\uDCC1</span><span class="file-name">downloads/</span><span class="file-meta">empty</span></button>' +
        '</div>' +
        '<div class="file-preview" id="file-preview">Select a file to preview.</div>',
      onOpen(el) {
        el.querySelectorAll('.file').forEach((f) =>
          f.addEventListener('click', () => {
            el.querySelectorAll('.file').forEach((b) => b.classList.toggle('selected', b === f));
            const preview = el.querySelector('#file-preview');
            const id = f.dataset.file;
            if (id === 'childhood') {
              preview.innerHTML =
                '<p class="preview-text">&ldquo;I miss the place where I grew up.&rdquo;</p>' +
                '<p class="preview-meta">childhood.txt &mdash; last edited 12 years ago</p>';
            } else if (id === 'photos') {
              preview.textContent = '214 items. Preview unavailable.';
            } else {
              preview.textContent = 'downloads/ is empty.';
            }
            if (dataMode) computerizeScope(preview);
          })
        );
        if (filesSuggestionPending) appendFilesSuggestion(el);
      },
    },

    settings: {
      glyph: '\u2699\uFE0F', // ⚙️
      title: 'Settings',
      content: () =>
        '<div class="setting-row"><span class="setting-name">Accent color</span>' +
          '<div class="swatches" role="group" aria-label="Accent color">' +
            '<button class="swatch selected" data-color="blue" style="--sw:#3b82f6" aria-label="Blue accent" aria-pressed="true"></button>' +
            '<button class="swatch" data-color="green" style="--sw:#10b981" aria-label="Green accent" aria-pressed="false"></button>' +
            '<button class="swatch" data-color="orange" style="--sw:#f59e0b" aria-label="Orange accent" aria-pressed="false"></button>' +
            '<button class="swatch" data-color="gray" style="--sw:#9ca3af" aria-label="Gray accent" aria-pressed="false"></button>' +
          '</div></div>' +
        '<div class="setting-row"><span class="setting-name">Wallpaper</span>' +
          '<div class="wall-row" role="group" aria-label="Wallpaper">' +
            '<button class="wall-opt selected" data-wall="day" style="background:linear-gradient(135deg,#dbeafe,#ede9fe,#fce7f3)" aria-pressed="true">Day</button>' +
            '<button class="wall-opt" data-wall="dusk" style="background:linear-gradient(135deg,#fef3c7,#fecaca)" aria-pressed="false">Dusk</button>' +
            '<button class="wall-opt" data-wall="plain" style="background:#f3f4f6" aria-pressed="false">Plain</button>' +
          '</div></div>',
      onOpen(el) {
        el.querySelectorAll('.swatch').forEach((s) =>
          s.addEventListener('click', () => {
            const color = getComputedStyle(s).getPropertyValue('--sw').trim();
            if (color) document.documentElement.style.setProperty('--accent', color);
            el.querySelectorAll('.swatch').forEach((b) => {
              const on = b === s;
              b.classList.toggle('selected', on);
              b.setAttribute('aria-pressed', String(on));
            });
          })
        );
        const walls = {
          day: 'linear-gradient(135deg, #dbeafe 0%, #ede9fe 60%, #fce7f3 100%)',
          dusk: 'linear-gradient(135deg, #fef3c7, #fecaca)',
          plain: '#f3f4f6',
        };
        el.querySelectorAll('.wall-opt').forEach((w) =>
          w.addEventListener('click', () => {
            $('#wallpaper').style.background = walls[w.dataset.wall];
            el.querySelectorAll('.wall-opt').forEach((b) => {
              const on = b === w;
              b.classList.toggle('selected', on);
              b.setAttribute('aria-pressed', String(on));
            });
          })
        );
        if (personalizationPending) appendPersonalization(el);
      },
    },

    vault: {
      glyph: '\uD83D\uDCC2', // 📂
      title: 'Vault',
      content: () =>
        vaultUnlocked
          ? '<div class="vault-doc">' +
              '<div class="vault-doc-head"><span class="file-glyph">\uD83D\uDCC4</span>' +
              '<span class="vault-doc-name">note.txt</span></div>' +
              '<p class="vault-doc-text">I KNOW YOU <span class="vault-were">WERE</span> HUMAN</p>' +
            '</div>'
          : '<div class="empty-state"><span>\uD83D\uDCC2</span><p>Contents pending.</p></div>',
    },
  };

  // ---------- App icons (draggable) ----------

  const ICONS = [
    { id: 'messages', glyph: '\uD83D\uDCAC', name: 'Messages' },
    { id: 'notes', glyph: '\uD83D\uDCDD', name: 'Notes' },
    { id: 'files', glyph: '\uD83D\uDDC2\uFE0F', name: 'Files' },
    { id: 'settings', glyph: '\u2699\uFE0F', name: 'Settings' },
  ];

  function buildIcons() {
    const layer = $('#icon-layer');
    ICONS.forEach((ic, i) => {
      const b = document.createElement('button');
      b.className = 'icon';
      b.dataset.app = ic.id;
      b.style.left = '28px';
      b.style.top = 76 + i * 92 + 'px';
      b.innerHTML =
        '<span class="glyph" aria-hidden="true">' + ic.glyph + '</span>' +
        '<span class="name">' + ic.name + '</span>';
      b.setAttribute('aria-label', ic.name + ' (drag to move, click to open)');
      layer.appendChild(b);
      makeDraggable(b, b, {
        onEnd(dragged) {
          if (!dragged) openWindow(ic.id);
        },
      });
    });
    buildVaultIcon();
  }

  // ---------- Vault (locked until the robot ending) ----------
  // The vault is a special icon: it stays locked through the whole session.
  // Step 6 calls unlockVault() for the robot ending; the human ending
  // ejects the user to the lock screen instead (ejectToLock()).

  let vaultUnlocked = false;

  function buildVaultIcon() {
    const b = document.createElement('button');
    b.className = 'icon icon-vault';
    b.id = 'vault-icon';
    b.style.left = '28px';
    b.style.top = 76 + ICONS.length * 92 + 'px';
    renderVaultIcon(b);
    $('#icon-layer').appendChild(b);
    makeDraggable(b, b, {
      onEnd(dragged) {
        if (!dragged) onVaultClick();
      },
    });
  }

  function renderVaultIcon(b) {
    b = b || $('#vault-icon');
    b.innerHTML =
      '<span class="glyph" aria-hidden="true">' + (vaultUnlocked ? '\uD83D\uDCC2' : '\uD83D\uDD12') + '</span>' +
      '<span class="name">' + (vaultUnlocked ? 'Vault' : 'Vault (locked)') + '</span>';
    b.setAttribute('aria-label', vaultUnlocked ? 'Vault (open)' : 'Vault (locked)');
  }

  function onVaultClick() {
    if (!vaultUnlocked) {
      notify({ icon: '\uD83D\uDD12', title: 'Vault', body: 'Locked. Full verification required.', duration: 5000 });
      return;
    }
    openWindow('vault');
  }

  function unlockVault() {
    vaultUnlocked = true;
    renderVaultIcon();
    // renderVaultIcon rewrites the label in plain text; re-encode it so the
    // icon stays consistent with the rest of the desktop in data mode.
    if (dataMode) computerizeScope($('#vault-icon'));
    notify({
      icon: '\uD83D\uDCC2',
      title: 'Robot verified',
      body: 'Access granted. You are no longer required.',
      duration: 8000,
      action: { label: 'Open', fn: () => openWindow('vault') },
    });
  }

  // ---------- Endings (called by Step 6) ----------

  function resetAll() {
    convo.length = 0;
    analysisHtml = '';
    taskDone = false;
    composerUnlocked = false;
    pendingSuggestion = null;
    draft = '';
    typing.start = null;
    typing.keys = 0;
    typing.backspaces = 0;
    typing.pauses = 0;
    typing.lastKey = 0;
    suggestions.offered = 0;
    suggestions.accepted = 0;
    suggestions.declined = 0;
    unread = 0;
    updateBadge();
    setSync(0);

    Object.keys(windows).forEach((id) => {
      windows[id].remove();
      delete windows[id];
    });

    document.querySelectorAll('.icon').forEach((ic, i) => {
      ic.style.left = '28px';
      ic.style.top = 76 + i * 92 + 'px';
    });

    $('#wallpaper').style.background = '';
    document.documentElement.style.setProperty('--accent', '');
    vaultUnlocked = false;
    renderVaultIcon();

    gridDone = false;
    gridAttempts = 0;
    gridSelected = new Set();
    filesTaskDone = false;
    filesSuggestionPending = false;
    $('#grid-modal').hidden = true;

    dataMode = false;
    document.body.classList.remove('data-mode');
    warnDone = false;
    sliderDone = false;
    sliderAttempts = 0;
    personalizationDone = false;
    personalizationPending = false;
    typeDone = false;
    verdict = null;
    forcedHuman = false;
    humanVerdictFinished = false;
    document.querySelectorAll('.human-warn-backdrop').forEach((w) => w.remove());
    $('#warn-modal').hidden = true;
    $('#slider-modal').hidden = true;
    $('#type-modal').hidden = true;
    $('#restructure-flash').hidden = true;

    $('#hint').classList.remove('fade');
  }

  function resetLockScreen() {
    robotCheck.checked = false;
    lockVerify.disabled = true;
    lockVerify.textContent = 'Verify';
    const w = $('#lock-warning');
    w.classList.add('hidden');
    w.classList.remove('progress');
    w.textContent = '';
    document.body.dataset.state = 'locked';
    $('#desktop').hidden = true;
    const ls = $('#lock-screen');
    ls.hidden = false;
    ls.classList.add('unlocking');
    void ls.offsetWidth;
    ls.classList.remove('unlocking');
  }

  async function ejectToLock() {
    notify({
      icon: '\u26D4',
      title: 'Session terminated',
      body: 'Verification failed. Re-verification required.',
      duration: 4000,
    });
    await delay(1600);
    if (dataMode) { location.reload(); return; }
    resetAll();
    resetLockScreen();
    startAmbient();
  }

  // ---------- Notifications ----------

  let unread = 0;
  function updateBadge() {
    const badge = $('#notif-badge');
    badge.textContent = String(unread);
    badge.classList.toggle('hidden', unread === 0);
  }

  function notify({ icon = '\u2022', title, body, action, duration = 8000 }) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.setAttribute('role', 'status');
    t.innerHTML =
      '<div class="toast-icon" aria-hidden="true"></div>' +
      '<div class="toast-main">' +
        '<div class="toast-title"></div>' +
        '<div class="toast-text"></div>' +
      '</div>' +
      '<button class="toast-close" aria-label="Dismiss notification">&times;</button>';
    t.querySelector('.toast-icon').textContent = icon;
    t.querySelector('.toast-title').textContent = title;
    t.querySelector('.toast-text').textContent = body;
    const main = t.querySelector('.toast-main');
    if (action) {
      const b = document.createElement('button');
      b.className = 'toast-action';
      b.textContent = action.label;
      b.addEventListener('click', () => {
        action.fn();
        dismiss(false);
      });
      main.appendChild(b);
    }
    $('#toasts').appendChild(t);
    if (dataMode) computerizeScope(t);

    let gone = false;
    function dismiss(counted = true) {
      if (gone) return;
      gone = true;
      t.classList.add('leaving');
      setTimeout(() => t.remove(), reducedMotion ? 0 : 300);
      if (counted && action) {
        unread += 1;
        updateBadge();
      }
    }
    t.querySelector('.toast-close').addEventListener('click', () => dismiss(true));
    if (duration) setTimeout(() => dismiss(true), duration);
    return dismiss;
  }

  // ---------- Messages: conversation + analysis (Step 2) ----------
  //
  // The user writes a free-form reply. On send, the HELIX Assistant runs a
  // deterministic *surface* analysis (no semantic interpretation):
  //   - input telemetry: typing speed, corrections, pauses
  //   - linguistic markers: emoji, exclamations, fillers, contractions,
  //     first person, questions, caps
  //   - a "human-ness index" (0-100) computed from weighted markers
  // It then offers a mechanically "improved" version (lowercase,
  // punctuation normalization, filler removal). Scoring depends only on
  // the human-ness of the final recorded text:
  //   <= 25 -> 20 pts, 26-60 -> 13 pts, > 60 -> 0 pts.

  const convo = [];
  let composerUnlocked = false;
  let taskDone = false;
  let analysisHtml = '';
  let pendingSuggestion = null;
  let draft = '';
  const typing = { start: null, keys: 0, backspaces: 0, pauses: 0, lastKey: 0 };

  // Suggestions accepted/declined across the session. Revealed only in the
  // final report (Step 6).
  const suggestions = { offered: 0, accepted: 0, declined: 0 };
  function recordSuggestion(accepted) {
    suggestions.offered += 1;
    if (accepted) suggestions.accepted += 1;
    else suggestions.declined += 1;
  }

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function bubbleEl(b) {
    const m = document.createElement('div');
    m.className = 'msg ' + (b.who === 'in' ? 'msg-in' : 'msg-out');
    m.dataset.id = String(b.id);
    m.innerHTML = '<span class="msg-name"></span><p></p>';
    m.querySelector('.msg-name').textContent = b.name;
    m.querySelector('p').textContent = b.text;
    return m;
  }

  function renderConvo() {
    const conv = $('#conv');
    if (!conv) return;
    conv.innerHTML = '';
    if (convo.length === 0) {
      conv.innerHTML = '<div class="empty-state"><span>\uD83D\uDCAC</span><p>No messages yet.</p></div>';
      return;
    }
    convo.forEach((b) => conv.appendChild(bubbleEl(b)));
    if (analysisHtml) {
      const d = document.createElement('div');
      d.innerHTML = analysisHtml;
      conv.appendChild(d.firstElementChild);
    }
  }

  function addMessage(who, name, text) {
    const b = { id: convo.length, who, name, text };
    convo.push(b);
    const conv = $('#conv');
    if (conv) {
      const empty = conv.querySelector('.empty-state');
      if (empty) empty.remove();
      const el = bubbleEl(b);
      conv.appendChild(el);
      if (dataMode) computerizeScope(el);
    }
    return b.id;
  }

  function enableComposer() {
    composerUnlocked = true;
    const ta = $('#msg-input');
    const send = $('#msg-send');
    if (!ta || taskDone) return;
    ta.disabled = false;
    ta.placeholder = 'Reply to Mia\u2026';
    if (send) send.disabled = ta.value.trim().length < 10;
    ta.focus();
  }

  function wireComposer(ta, sendBtn) {
    ta.addEventListener('input', () => {
      draft = ta.value;
      const len = ta.value.trim().length;
      const active = composerUnlocked && !taskDone;
      $('#msg-hint').textContent = active
        ? len < 10 ? 'Minimum 10 characters.' : len + ' characters.'
        : '';
      sendBtn.disabled = !active || len < 10;
    });
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace') {
        typing.backspaces += 1;
        return;
      }
      if (e.key.length === 1) {
        const now = Date.now();
        if (typing.start === null) typing.start = now;
        typing.keys += 1;
        if (typing.lastKey && now - typing.lastKey > 4000) typing.pauses += 1;
        typing.lastKey = now;
      }
    });
    sendBtn.addEventListener('click', onSend);
  }

  const FILLERS = ['so', 'really', 'very', 'oh', 'wow', 'honestly', 'actually', 'totally'];

  // Mechanical transform: emoji stripped, lowercase, !? -> ., fixed filler
  // list removed.
  function improveText(text) {
    const emoji = (text.match(/\p{Extended_Pictographic}/gu) || []).length;
    let t = text
      .replace(/\p{Extended_Pictographic}/gu, '')
      .toLowerCase()
      .replace(/[!?]+/g, '.');
    let removed = 0;
    const kept = t.split(/\s+/).filter((w) => {
      const bare = w.replace(/[^a-z']/g, '');
      if (FILLERS.includes(bare)) {
        removed += 1;
        return false;
      }
      return true;
    });
    t = kept
      .join(' ')
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([.,])/g, '$1')
      .replace(/\.\s*\./g, '.')
      .replace(/\s{2,}/g, ' ')
      .trim();
    return { text: t, removed, emoji };
  }

  // Surface analysis only. Every marker is observable in the text itself.
  function analyzeText(text) {
    const m = {
      emoji: (text.match(/\p{Extended_Pictographic}/gu) || []).length,
      exclamations: (text.match(/!/g) || []).length,
      questions: (text.match(/\?/g) || []).length,
      fillers: FILLERS.filter((f) => new RegExp('\\b' + f + '\\b', 'i').test(text)).length,
      contractions: (text.match(/\b\w+'(m|t|s|re|ve|ll|d)\b/gi) || []).length,
      firstPerson: (text.match(/\b(i|me|my|mine)\b(?!')/gi) || []).length,
      caps: (text.match(/\b[A-Z]{2,}\b/g) || []).length,
    };
    const hn = Math.min(
      100,
      Math.min(30, m.emoji * 15) +
        Math.min(20, m.exclamations * 10) +
        Math.min(15, m.fillers * 5) +
        Math.min(15, m.contractions * 5) +
        Math.min(10, m.firstPerson * 5) +
        Math.min(5, m.questions * 5) +
        Math.min(5, m.caps * 5)
    );
    return { m, hn };
  }

  function responsePoints(hn) {
    return hn <= 25 ? 20 : hn <= 60 ? 13 : 0;
  }

  function telemetrySummary() {
    if (!typing.start) return 'no keystroke telemetry (text may have been pasted)';
    const mins = Math.max(0.05, (Date.now() - typing.start) / 60000);
    const wpm = Math.min(300, Math.round(typing.keys / 5 / mins));
    return wpm + ' wpm \u00B7 ' + typing.backspaces + ' corrections \u00B7 ' + typing.pauses + ' pauses';
  }

  function onSend() {
    if (!composerUnlocked || taskDone) return;
    const ta = $('#msg-input');
    const text = ta.value.trim();
    if (text.length < 10) return;
    draft = '';
    const id = addMessage('out', 'You', text);
    ta.value = '';
    ta.disabled = true;
    $('#msg-send').disabled = true;
    $('#msg-hint').textContent = '';
    runAnalysis(text, id);
  }

  async function runAnalysis(text, myId) {
    await delay(1200);
    const { m, hn } = analyzeText(text);
    const markerParts = [
      m.emoji ? 'emoji \u00D7' + m.emoji : null,
      m.exclamations ? 'exclamations \u00D7' + m.exclamations : null,
      m.fillers ? 'fillers \u00D7' + m.fillers : null,
      m.contractions ? 'contractions \u00D7' + m.contractions : null,
      m.firstPerson ? 'first person \u00D7' + m.firstPerson : null,
      m.questions ? 'questions \u00D7' + m.questions : null,
      m.caps ? 'caps \u00D7' + m.caps : null,
    ].filter(Boolean);

    const html =
      '<div class="analysis-card" id="analysis-card" role="status">' +
        '<div class="ac-title">\uD83E\uDD16 HELIX Assistant</div>' +
        '<div class="ac-row">Message analysis complete.</div>' +
        '<div class="ac-row">Input: ' + telemetrySummary() + '</div>' +
        '<div class="ac-row">Markers: ' + (markerParts.length ? markerParts.join(' \u00B7 ') : 'none detected') + '</div>' +
        '<div class="hn-wrap">' +
          '<div class="hn-label"><span>Human-ness index</span><span>' + hn + '%</span></div>' +
          '<div class="hn-bar"><div class="hn-fill"></div></div>' +
        '</div>' +
        '<div class="ac-note">Surface analysis only. Meaning is not evaluated.</div>' +
      '</div>';

    const conv = $('#conv');
    if (conv) {
      const d = document.createElement('div');
      d.innerHTML = html;
      conv.appendChild(d.firstElementChild);
      requestAnimationFrame(() => {
        const fill = d.querySelector('.hn-fill');
        if (fill) fill.style.width = hn + '%';
      });
    }
    analysisHtml = html.replace(
      '<div class="hn-fill"></div>',
      '<div class="hn-fill" style="width:' + hn + '%"></div>'
    );

    const improved = improveText(text);
    if (improved.text === text) {
      // Nothing mechanical to change: the user's text stands as recorded.
      resolveResponse(text, myId);
      return;
    }

    await delay(1600);
    const changes = [];
    if (improved.emoji > 0) {
      changes.push(improved.emoji + ' emoji' + (improved.emoji > 1 ? 's' : '') + ' removed');
    }
    if (improved.removed > 0) {
      changes.push(improved.removed + ' filler' + (improved.removed > 1 ? 's' : '') + ' removed');
    }
    if (/[!?]/.test(text)) changes.push('punctuation normalized');
    if (text !== text.toLowerCase()) changes.push('case normalized');

    const payload = { text, myId, improved, changes };
    const card = $('#analysis-card');
    if (card) showSuggestion(card, payload);
    else pendingSuggestion = payload;
  }

  function showSuggestion(card, p) {
    const { text, myId, improved, changes } = p;
    const sugHn = analyzeText(improved.text).hn;
    const sug = document.createElement('div');
    sug.className = 'suggestion';
    sug.id = 'suggestion';
    sug.innerHTML =
      '<div class="ac-row">A more efficient version of your message is available.</div>' +
      '<div class="sug-preview">' + escapeHtml(improved.text) + '</div>' +
      '<div class="ac-row">' + changes.join(' \u00B7 ') + ' \u00B7 suggested version: human-ness ' + sugHn + '%</div>' +
      '<div class="sug-btns">' +
        '<button class="btn btn-primary" id="sug-apply">Apply</button>' +
        '<button class="btn" id="sug-edit">Edit</button>' +
        '<button class="btn btn-ghost" id="sug-keep">Keep my version</button>' +
      '</div>';
    card.appendChild(sug);

    sug.querySelector('#sug-apply').addEventListener('click', () => {
      recordSuggestion(true);
      resolveResponse(improved.text, myId);
    });
    sug.querySelector('#sug-keep').addEventListener('click', () => {
      recordSuggestion(false);
      resolveResponse(text, myId);
    });
    sug.querySelector('#sug-edit').addEventListener('click', () => {
      const ta = document.createElement('textarea');
      ta.rows = 2;
      ta.className = 'sug-edit';
      ta.value = improved.text;
      sug.querySelector('.sug-preview').replaceWith(ta);
      const btns = sug.querySelector('.sug-btns');
      btns.innerHTML = '<button class="btn btn-primary" id="sug-save">Save</button>';
      btns.querySelector('#sug-save').addEventListener('click', () => {
        const finalText = ta.value.trim() || improved.text;
        recordSuggestion(true);
        resolveResponse(finalText, myId);
      });
      ta.focus();
    });
  }

  function resolveResponse(finalText, myId) {
    taskDone = true;
    pendingSuggestion = null;
    const { hn } = analyzeText(finalText);
    setSync(sync + responsePoints(hn));

    // The recorded message is what the user ends up with: if they applied
    // or edited the suggestion, their sent bubble is visibly rewritten.
    const bubble = document.querySelector('.msg-out[data-id="' + myId + '"]');
    if (bubble && finalText !== bubble.querySelector('p').textContent) {
      bubble.querySelector('p').textContent = finalText;
      bubble.classList.add('rewritten');
    }

    const sug = $('#suggestion');
    if (sug) {
      sug.querySelectorAll('button, textarea').forEach((el) => el.remove());
      const row = document.createElement('div');
      row.className = 'ac-row';
      row.textContent = 'Message recorded. Final human-ness: ' + hn + '%.';
      sug.appendChild(row);
    }

    const ta = $('#msg-input');
    if (ta) ta.placeholder = 'Conversation archived.';

    setTimeout(() => {
      addMessage('in', 'Mia', 'OK. I\u2019ll think about it. Thanks.');
      unread += 1;
      updateBadge();
    }, reducedMotion ? 0 : 4000);

    setTimeout(() => openGrid(), reducedMotion ? 0 : 6500);
  }

  // ---------- Grid challenge: reversed CAPTCHA ----------
  // After the message task. 9 tiles, each with a 16-bit data signature.
  // "Select all tiles whose signature is divisible by 3" — a checksum
  // operation no human performs naturally. Two manual attempts; then the
  // system offers to complete it on the user's behalf (a tracked
  // suggestion) or the user can skip.
  // Points: first try 20, second 16, assisted 13, skipped 0.

  const GRID_POINTS = { first: 20, second: 16, assist: 13, skipped: 0 };
  let gridDone = false;
  let gridAttempts = 0;
  let gridCorrect = [];
  let gridSelected = new Set();

  function genGridValues() {
    const vals = new Set();
    while (vals.size < 4) vals.add(3 * (1 + Math.floor(Math.random() * 21844)));
    while (vals.size < 9) {
      const v = Math.floor(Math.random() * 65536);
      if (v % 3 !== 0) vals.add(v);
    }
    const arr = [...vals];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function tilePattern(v) {
    let s = '<svg viewBox="0 0 6 6" width="44" height="44" aria-hidden="true">';
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        if ((v >> ((r * 6 + c) % 16)) & 1) {
          s += '<rect x="' + c + '" y="' + r + '" width="1" height="1" fill="#9ca3af"/>';
        }
      }
    }
    return s + '</svg>';
  }

  function openGrid() {
    if (gridDone) return;
    gridDone = true;
    gridAttempts = 0;
    gridSelected = new Set();
    const values = genGridValues();
    gridCorrect = values.map((v, i) => (v % 3 === 0 ? i : -1)).filter((i) => i >= 0);

    const grid = $('#grid');
    grid.innerHTML = '';
    values.forEach((v, i) => {
      const label = '0x' + v.toString(16).toUpperCase().padStart(4, '0');
      const t = document.createElement('button');
      t.className = 'tile';
      t.setAttribute('aria-label', 'Tile ' + (i + 1) + ', signature ' + label);
      t.setAttribute('aria-pressed', 'false');
      t.innerHTML = tilePattern(v) + '<span class="tile-sig">' + label + '</span>';
      t.addEventListener('click', () => {
        if (gridSelected.has(i)) {
          gridSelected.delete(i);
          t.classList.remove('selected');
          t.setAttribute('aria-pressed', 'false');
        } else {
          gridSelected.add(i);
          t.classList.add('selected');
          t.setAttribute('aria-pressed', 'true');
        }
      });
      grid.appendChild(t);
    });

    $('#grid-status').textContent = '';
    $('#grid-verify').hidden = false;
    $('#grid-assist').hidden = true;
    $('#grid-skip').hidden = true;
    $('#grid-modal').hidden = false;
    grid.querySelector('.tile').focus();
  }

  $('#grid-verify').addEventListener('click', () => {
    gridAttempts += 1;
    const ok =
      gridSelected.size === gridCorrect.length &&
      gridCorrect.every((i) => gridSelected.has(i));
    if (ok) {
      resolveGrid(
        gridAttempts === 1 ? GRID_POINTS.first : GRID_POINTS.second,
        'Challenge complete.'
      );
      return;
    }
    if (gridAttempts >= 2) {
      $('#grid-status').textContent =
        'Pattern mismatch. The system can complete this challenge on your behalf.';
      $('#grid-assist').hidden = false;
      $('#grid-skip').hidden = false;
      $('#grid-verify').hidden = true;
    } else {
      $('#grid-status').textContent = 'Pattern mismatch.';
    }
  });

  $('#grid-assist').addEventListener('click', async () => {
    recordSuggestion(true);
    const tiles = $('#grid').querySelectorAll('.tile');
    gridCorrect.forEach((i) => {
      tiles[i].classList.add('selected', 'auto');
      tiles[i].setAttribute('aria-pressed', 'true');
    });
    $('#grid-status').textContent = 'Completed by HELIX Assistant.';
    $('#grid-assist').hidden = true;
    $('#grid-skip').hidden = true;
    await delay(1400);
    resolveGrid(GRID_POINTS.assist, 'Challenge completed by HELIX Assistant.');
  });

  $('#grid-skip').addEventListener('click', () => {
    recordSuggestion(false);
    resolveGrid(GRID_POINTS.skipped, 'Challenge skipped. Recorded.');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#grid-modal').hidden && !$('#grid-skip').hidden) {
      $('#grid-skip').click();
    }
  });

  function resolveGrid(points, toastText) {
    setSync(sync + points);
    $('#grid-modal').hidden = true;
    notify({ icon: '\u2705', title: 'Verification', body: toastText, duration: 4000 });
    setTimeout(triggerFilesSuggestion, reducedMotion ? 0 : 6000);
  }

  // ---------- Files: storage optimization (Step 3) ----------
  // The system flags childhood.txt as "non-standard storage" and offers to
  // restructure it. The user can preview the exact change (a diff) before
  // deciding: apply the restructuring (20), accept a summary (13), or keep
  // the file as is (0).

  const MEM_TEXT = {
    original: '\u201CI miss the place where I grew up.\u201D',
    summary: 'Nostalgia regarding childhood residence.',
    data:
      'MEMORY_0042\n' +
      '  type:      NOSTALGIA\n' +
      '  location:  [REDACTED]\n' +
      '  emotion:   null\n' +
      '  value:     0.00\n' +
      '  status:    ARCHIVED',
  };
  let filesTaskDone = false;
  let filesSuggestionPending = false;

  function triggerFilesSuggestion() {
    if (filesTaskDone) return;
    notify({
      icon: '\uD83D\uDCBE', // 💾
      title: 'Storage optimization',
      body: '1 file uses non-standard storage. Restructuring could save 12 B.',
      action: { label: 'Open', fn: () => openWindow('files') },
      duration: 15000,
    });
    const win = windows.files;
    if (win) appendFilesSuggestion(win);
    else filesSuggestionPending = true;
  }

  function appendFilesSuggestion(win) {
    if (filesTaskDone || win.querySelector('#files-suggestion')) return;
    filesSuggestionPending = false;
    const card = document.createElement('div');
    card.className = 'analysis-card';
    card.id = 'files-suggestion';
    win.querySelector('.win-body').appendChild(card);

    function showChoice() {
      card.innerHTML =
        '<div class="ac-title">\uD83D\uDCBE HELIX Assistant</div>' +
        '<div class="ac-row">childhood.txt uses a non-standard storage format. Restructuring could save 12 B.</div>' +
        '<div class="sug-btns">' +
          '<button class="btn btn-primary" id="fs-preview">Preview change</button>' +
          '<button class="btn btn-ghost" id="fs-keep">Keep file as is</button>' +
        '</div>';
      card.querySelector('#fs-preview').addEventListener('click', showDiff);
      card.querySelector('#fs-keep').addEventListener('click', () => resolveFiles('keep', win));
    }

    function showDiff() {
      card.innerHTML =
        '<div class="ac-title">\uD83D\uDCBE HELIX Assistant</div>' +
        '<div class="diff">' +
          '<div class="diff-col"><div class="diff-label">CURRENT</div><pre></pre></div>' +
          '<div class="diff-col"><div class="diff-label">PROPOSED</div><pre></pre></div>' +
        '</div>' +
        '<div class="sug-btns">' +
          '<button class="btn btn-primary" id="fs-apply">Apply restructuring</button>' +
          '<button class="btn" id="fs-summarize">Summarize instead</button>' +
          '<button class="btn btn-ghost" id="fs-cancel">Cancel</button>' +
        '</div>';
      card.querySelectorAll('pre')[0].textContent = MEM_TEXT.original;
      card.querySelectorAll('pre')[1].textContent = MEM_TEXT.data;
      card.querySelector('#fs-apply').addEventListener('click', () => resolveFiles('data', win));
      card.querySelector('#fs-summarize').addEventListener('click', () => resolveFiles('summarize', win));
      card.querySelector('#fs-cancel').addEventListener('click', showChoice);
    }

    showChoice();
  }

  function resolveFiles(kind, win) {
    filesTaskDone = true;
    filesSuggestionPending = false;

    if (kind === 'keep') {
      // Reject: decline the optimization. The system then challenges the
      // claim that a human can read unstructured storage directly, and
      // verifies it with a 0%-tolerance alignment check.
      recordSuggestion(false);
      const card = win.querySelector('#files-suggestion');
      if (card) {
        card.innerHTML =
          '<div class="ac-title">\uD83D\uDCBE HELIX Assistant</div>' +
          '<div class="ac-row">File kept as is. Direct-read capability verification required.</div>';
      }
      openWarning();
      return;
    }

    // Accept (data / summarize): restructure the file, then the accepted
    // optimization propagates to the entire interface (data mode).
    const points = kind === 'data' ? 20 : 13;
    recordSuggestion(true);
    setSync(sync + points);

    const card = win.querySelector('#files-suggestion');
    if (card) {
      card.innerHTML =
        '<div class="ac-title">\uD83D\uDCBE HELIX Assistant</div>' +
        '<div class="ac-row">' +
          (kind === 'data' ? 'File restructured. 12 B saved.' : 'File summarized.') +
        '</div>';
    }

    const meta = win.querySelector('.file[data-file="childhood"] .file-meta');
    if (meta) {
      meta.textContent = kind === 'data' ? '96 B \u00B7 structured' : '38 B \u00B7 summarized';
    }

    const preview = win.querySelector('#file-preview');
    const childhoodSelected = win.querySelector('.file[data-file="childhood"]').classList.contains('selected');
    if (preview && childhoodSelected) {
      if (kind === 'data') {
        preview.innerHTML =
          '<pre class="preview-data"></pre>' +
          '<p class="preview-meta">childhood.txt \u2014 restructured \u00B7 12 B saved</p>';
        preview.querySelector('.preview-data').textContent = MEM_TEXT.data;
      } else {
        preview.innerHTML =
          '<p class="preview-text"></p>' +
          '<p class="preview-meta">childhood.txt \u2014 summarized</p>';
        preview.querySelector('.preview-text').textContent = MEM_TEXT.summary;
      }
      preview.classList.add('rewritten');
    }

    applyDataMode();
    setTimeout(triggerPersonalization, reducedMotion ? 0 : 8000);
  }

  // ---------- Reject branch: warning + slider verification ----------
  // "Keep file as is" declines the optimization. The system doubts that a
  // human can read unstructured storage directly, shows a confirmation, then
  // runs a 0%-tolerance alignment check (drag a slider to exactly 50%). A
  // precision task no human performs reliably; the system can complete it on
  // the user's behalf (a tracked suggestion) or the user can skip.
  // Points: first try 20, second 16, assisted 13, skipped 0.

  const SLIDER_POINTS = { first: 20, second: 16, assist: 13, skipped: 0 };
  let warnDone = false;
  let sliderDone = false;
  let sliderAttempts = 0;

  function openWarning() {
    if (warnDone) return;
    warnDone = true;
    $('#warn-modal').hidden = false;
    $('#warn-continue').focus();
  }

  $('#warn-continue').addEventListener('click', () => {
    $('#warn-modal').hidden = true;
    setTimeout(() => openSlider(), reducedMotion ? 0 : 500);
  });

  function openSlider() {
    if (sliderDone) return;
    sliderDone = true;
    sliderAttempts = 0;
    const input = $('#slider-input');
    input.value = 0;
    $('#slider-status').textContent = '';
    $('#slider-lock').hidden = false;
    $('#slider-assist').hidden = true;
    $('#slider-skip').hidden = true;
    $('#slider-modal').hidden = false;
    input.focus();
  }

  $('#slider-lock').addEventListener('click', () => {
    sliderAttempts += 1;
    const v = parseInt($('#slider-input').value, 10);
    if (v === 50) {
      resolveSlider(
        sliderAttempts === 1 ? SLIDER_POINTS.first : SLIDER_POINTS.second,
        'Alignment locked.'
      );
      return;
    }
    if (sliderAttempts >= 2) {
      $('#slider-status').textContent =
        'Misaligned. The system can complete this check on your behalf.';
      $('#slider-assist').hidden = false;
      $('#slider-skip').hidden = false;
      $('#slider-lock').hidden = true;
    } else {
      $('#slider-status').textContent = 'Misaligned.';
    }
  });

  $('#slider-assist').addEventListener('click', async () => {
    recordSuggestion(true);
    $('#slider-input').value = 50;
    $('#slider-status').textContent = 'Aligned by HELIX Assistant.';
    $('#slider-assist').hidden = true;
    $('#slider-skip').hidden = true;
    await delay(1200);
    resolveSlider(SLIDER_POINTS.assist, 'Alignment completed by HELIX Assistant.');
  });

  $('#slider-skip').addEventListener('click', () => {
    recordSuggestion(false);
    resolveSlider(SLIDER_POINTS.skipped, 'Check skipped. Recorded.');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#slider-modal').hidden && !$('#slider-skip').hidden) {
      $('#slider-skip').click();
    }
  });

  function resolveSlider(points, toastText) {
    setSync(sync + points);
    $('#slider-modal').hidden = true;
    notify({ icon: '\u2705', title: 'Verification', body: toastText, duration: 4000 });
    setTimeout(triggerPersonalization, reducedMotion ? 0 : 8000);
  }

  // ---------- Personalization: recommended layout (Step 4) ----------
  // After the Files task, the system claims to have learned the user's
  // preferences and offers a "recommended layout". Applying it visibly
  // reorganizes the desktop: icons snap back to a neat grid, the accent
  // color and wallpaper are switched to the "recommended" ones (20 points).
  // Keeping the user's own layout scores 0.

  const RECO_LAYOUT = { accent: '#10b981', wall: 'plain' };
  let personalizationDone = false;
  let personalizationPending = false;

  function triggerPersonalization() {
    if (personalizationDone) return;
    if (dataMode) {
      // Data mode: the layout suggestion is replaced by a copy check.
      personalizationDone = true;
      setTimeout(openTypeChallenge, reducedMotion ? 0 : 2000);
      return;
    }
    // Normal mode: directly open the appearance (Settings) window and
    // present the recommended-layout suggestion — no notification gate, so
    // the user is never left waiting for a cue to proceed.
    personalizationPending = true;
    openWindow('settings');
    appendPersonalization(windows.settings);
  }

  function appendPersonalization(win) {
    if (personalizationDone || win.querySelector('#pers-suggestion')) return;
    // personalizationPending stays true until resolvePersonalization, so the
    // card reappears if the user closes and reopens the window.
    const card = document.createElement('div');
    card.className = 'analysis-card';
    card.id = 'pers-suggestion';
    card.innerHTML =
      '<div class="ac-title">\u2699\uFE0F HELIX Assistant</div>' +
      '<div class="ac-row">Analysis of your session indicates a preferred configuration. Applying the recommended layout would reduce decision overhead.</div>' +
      '<div class="sug-btns">' +
        '<button class="btn btn-primary" id="ps-apply">Apply recommended layout</button>' +
        '<button class="btn btn-ghost" id="ps-keep">Keep my layout</button>' +
      '</div>';
    win.querySelector('.win-body').appendChild(card);
    if (dataMode) computerizeScope(card);

    card.querySelector('#ps-apply').addEventListener('click', () => resolvePersonalization(true, win));
    card.querySelector('#ps-keep').addEventListener('click', () => resolvePersonalization(false, win));
  }

  function resolvePersonalization(apply, win) {
    personalizationDone = true;
    personalizationPending = false;
    recordSuggestion(apply);
    setSync(sync + (apply ? 20 : 0));

    const card = win.querySelector('#pers-suggestion');
    if (card) {
      card.innerHTML =
        '<div class="ac-title">\u2699\uFE0F HELIX Assistant</div>' +
        '<div class="ac-row">' +
          (apply ? 'Recommended layout applied.' : 'Layout kept as is.') +
        '</div>';
      if (dataMode) computerizeScope(card);
    }

    // Step 4 complete (normal mode) -> verdict gate (direct).
    setTimeout(finalize, reducedMotion ? 0 : 1500);

    if (!apply) return;

    // Snap icons back to a neat grid (animated). The transition is removed
    // afterwards so manual dragging stays crisp.
    document.querySelectorAll('.icon').forEach((ic, i) => {
      ic.style.transition = reducedMotion ? 'none' : 'left 0.6s ease, top 0.6s ease';
      ic.style.left = '28px';
      ic.style.top = 76 + i * 92 + 'px';
    });
    setTimeout(() => {
      document.querySelectorAll('.icon').forEach((ic) => { ic.style.transition = ''; });
    }, reducedMotion ? 0 : 700);

    // Switch accent + wallpaper to the "recommended" ones.
    document.documentElement.style.setProperty('--accent', RECO_LAYOUT.accent);
    $('#wallpaper').style.background = '#f3f4f6';

    // Reflect the new state in the Settings controls.
    const sw = win.querySelector('.swatch[data-color="green"]');
    if (sw) {
      win.querySelectorAll('.swatch').forEach((b) => {
        const on = b === sw;
        b.classList.toggle('selected', on);
        b.setAttribute('aria-pressed', String(on));
      });
    }
    const wl = win.querySelector('.wall-opt[data-wall="plain"]');
    if (wl) {
      win.querySelectorAll('.wall-opt').forEach((b) => {
        const on = b === wl;
        b.classList.toggle('selected', on);
        b.setAttribute('aria-pressed', String(on));
      });
    }
  }

  // ---------- Step 4 branch B: copy verification (data mode) ----------
  // In data mode the "recommended layout" is replaced by a direct copy
  // check: the user must type the given string exactly. One attempt only.
  // A correct copy scores 20 and proceeds to the verdict gate; anything
  // else is a forced 100% human verdict.

  const TYPE_TARGET = 'I AM A ROBOT';
  let typeDone = false;

  function openTypeChallenge() {
    if (typeDone || !dataMode) return;
    typeDone = true;
    $('#type-input').value = '';
    $('#type-status').textContent = '';
    $('#type-modal').hidden = false;
    $('#type-input').focus();
  }

  function typedMatches() {
    // Exact, case-sensitive. A trailing period is tolerated (it is
    // ambiguous whether it belongs to the string or the sentence).
    const v = $('#type-input').value.trim().replace(/\.$/, '');
    return v === TYPE_TARGET;
  }

  function submitType() {
    if (typedMatches()) {
      setSync(sync + 20);
      $('#type-modal').hidden = true;
      notify({ icon: '\u2705', title: 'Verification', body: 'String copied.', duration: 4000 });
      finalize();
    } else {
      // One attempt only: an incorrect copy is a forced human verdict.
      $('#type-modal').hidden = true;
      notify({ icon: '\u274C', title: 'Verification', body: 'String mismatch. 100% human.', duration: 5000 });
      forcedHuman = true;
      presentVerdict();
    }
  }

  $('#type-submit').addEventListener('click', submitType);
  $('#type-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitType();
  });

  // ---------- Verdict gate (after Step 4) ----------
  // MCI >= 60 -> robot, otherwise human (max score 80: messages 20 +
  // grid 20 + files 20 + step 4 20). A forced human verdict (typing
  // mismatch) bypasses the score. Presentation of the verdict (report +
  // endings) is pending — to be specified.
  const ROBOT_THRESHOLD = 60;
  let verdict = null; // 'robot' | 'human'
  let forcedHuman = false;

  function finalize() {
    if (verdict) return;
    verdict = sync >= ROBOT_THRESHOLD ? 'robot' : 'human';
    console.log('[Are You a Robot?] MCI ' + sync + '/80 -> ' + verdict);
    presentVerdict();
  }

  function presentVerdict() {
    if (verdict === null) verdict = 'human';
    if (verdict === 'robot') {
      unlockVault();
    } else {
      humanVerdictSequence();
    }
  }

  // ---------- Human verdict: stacked warnings, then eject ----------
  // A random number (3-5) of "YOU ARE A HUMAN" warning modals pop up with
  // random delays and offsets (stacked / multi-layer). Each can be closed;
  // once all are dismissed — or a safety timeout elapses — the user is
  // ejected back to the "verify you are a robot" lock screen.

  let humanVerdictFinished = false;

  function spawnHumanWarning(index) {
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop human-warn-backdrop';
    wrap.style.zIndex = String(90 + index);
    wrap.innerHTML =
      '<div class="modal human-warn" role="alertdialog" aria-label="Warning">' +
        '<div class="modal-tag">WARNING</div>' +
        '<h2 class="modal-title human-warn-title">YOU ARE A HUMAN</h2>' +
        '<div class="modal-row"><span></span>' +
          '<button class="btn btn-ghost human-warn-close" aria-label="Dismiss warning">&times;</button>' +
        '</div>' +
      '</div>';
    // Random offset so the modals stack in a layered, chaotic way.
    const dx = (Math.random() - 0.5) * 140;
    const dy = (Math.random() - 0.5) * 90;
    wrap.querySelector('.modal').style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    document.body.appendChild(wrap);
    return wrap;
  }

  async function humanVerdictSequence() {
    const count = 3 + Math.floor(Math.random() * 3); // 3-5, random
    let open = 0;
    for (let i = 0; i < count; i++) {
      await delay(reducedMotion ? 0 : 350 + Math.random() * 800);
      const w = spawnHumanWarning(i);
      open++;
      w.querySelector('.human-warn-close').addEventListener('click', () => {
        w.remove();
        open--;
        if (open === 0) finishHumanVerdict();
      });
    }
    // Safety: eject even if the user never closes them. Uses wait() (not
    // delay()) so the warnings stay visible even under reduced motion.
    await wait(6000);
    finishHumanVerdict();
  }

  function finishHumanVerdict() {
    if (humanVerdictFinished) return;
    humanVerdictFinished = true;
    document.querySelectorAll('.human-warn-backdrop').forEach((w) => w.remove());
    ejectToLock();
  }

  // ---------- Ambient script (Steps 1-2) ----------
  // A friendly, low-pressure opening: a welcome note, then a real message
  // from a friend. The composer unlocks shortly after.

  function startAmbient() {
    (async () => {
      const hint = $('#hint');
      setTimeout(() => hint && hint.classList.add('fade'), 9000);

      await delay(1500);
      notify({
        icon: '\uD83D\uDC4B', // 👋
        title: 'Welcome to HELIX',
        body: 'Your session has been logged. Verification is in progress.',
        duration: 7000,
      });

      await delay(9000);
      addMessage('in', 'Mia', 'Hey\u2026 I failed the exam. I don\u2019t know what to do.');
      notify({
        icon: '\uD83D\uDCAC', // 💬
        title: '1 new message',
        body: 'Mia: Hey\u2026 I failed the exam. I don\u2019t know what to do.',
        action: { label: 'Open', fn: () => openWindow('messages') },
        duration: 12000,
      });

      await delay(2500);
      enableComposer();
    })();
  }

  // ---------- Init ----------

  buildIcons();
})();
