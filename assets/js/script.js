'use strict';

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(pointer: fine)').matches;


/* ---------- theme toggle with circular reveal ---------- */
const themeBtn = $('[data-theme-toggle]');
const currentTheme = () =>
  document.documentElement.dataset.theme ||
  (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

themeBtn.addEventListener('click', (e) => {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  const apply = () => {
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (err) { /* storage blocked */ }
  };

  if (!document.startViewTransition || reduceMotion) return apply();

  const r = themeBtn.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

  const root = document.documentElement;
  root.classList.add('theming');
  const vt = document.startViewTransition(apply);
  vt.ready.then(() => {
    root.animate(
      { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 500, easing: 'cubic-bezier(.22,1,.36,1)', pseudoElement: '::view-transition-new(root)' }
    );
  });
  vt.finished.finally(() => root.classList.remove('theming'));
});


/* ---------- hero: split name into animated glyphs ---------- */
$$('[data-split]').forEach((el) => {
  let i = 0;
  el.innerHTML = el.textContent.trim().split(' ').map((word) =>
    `<span class="word" aria-hidden="true">${[...word].map((c) => `<span class="ch" style="--i:${i++}">${c}</span>`).join('')}</span>`
  ).join(' ');
});


/* ---------- hero: rotating typed role ---------- */
const typedEl = $('[data-typed]');
if (typedEl) {
  const words = JSON.parse(typedEl.dataset.typed);
  if (reduceMotion) {
    typedEl.textContent = words[0];
  } else {
    let w = 0, c = 0, deleting = false;
    const tick = () => {
      const word = words[w];
      c += deleting ? -1 : 1;
      typedEl.textContent = word.slice(0, c);
      let delay = deleting ? 35 : 70;
      if (!deleting && c === word.length) { deleting = true; delay = 1800; }
      else if (deleting && c === 0) { deleting = false; w = (w + 1) % words.length; delay = 300; }
      setTimeout(tick, delay);
    };
    setTimeout(tick, 1400);
  }
}


/* ---------- hero: self-typing code card ---------- */
const codeEl = $('[data-code]');
if (codeEl) {
  // [class, text] tokens — k keyword, v identifier, p punctuation, s string, n number/bool
  const tokens = [
    ['k', 'const '], ['v', 'ayush'], ['p', ' = {\n'],
    ['v', '  role'], ['p', ': '], ['s', '"SDE 1 @ CarTrade Tech"'], ['p', ',\n'],
    ['v', '  ships'], ['p', ': ['], ['s', '"CarWale"'], ['p', ', '], ['s', '"BikeWale"'], ['p', '],\n'],
    ['v', '  stack'], ['p', ': ['], ['s', '"React"'], ['p', ', '], ['s', '"TypeScript"'], ['p', ', '], ['s', '"Next.js"'], ['p', ', '], ['s', '"MUI"'], ['p', '],\n'],
    ['v', '  focus'], ['p', ': '], ['s', '"design systems & LLM UI"'], ['p', ',\n'],
    ['v', '  leetcode'], ['p', ': '], ['n', '1782'], ['p', ',\n'],
    ['v', '  available'], ['p', ': '], ['n', 'true'], ['p', ',\n'],
    ['p', '};'],
  ];
  const cursor = document.createElement('span');
  cursor.className = 'cursor';

  if (reduceMotion) {
    codeEl.innerHTML = tokens.map(([k, t]) => `<span class="${k}">${t.replace(/&/g, '&amp;')}</span>`).join('');
  } else {
    let t = 0, c = 0, span;
    codeEl.append(cursor);
    const type = () => {
      if (t >= tokens.length) return;
      const [cls, text] = tokens[t];
      if (c === 0) { span = document.createElement('span'); span.className = cls; cursor.before(span); }
      span.textContent += text[c++];
      if (c === text.length) { t++; c = 0; }
      setTimeout(type, text[c - 1] === '\n' ? 140 : 22 + Math.random() * 30);
    };
    setTimeout(type, 1200);
  }
}


/* ---------- reveal on scroll (+ stagger siblings) ---------- */
const revealIO = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    revealIO.unobserve(e.target);
  });
}, { threshold: .15, rootMargin: '0px 0px -40px 0px' });

// wrap heading text so the wipe clip lives on a child, not on the observed element
$$('.section-title').forEach((h) => { h.innerHTML = `<span class="wipe">${h.innerHTML}</span>`; });

$$('[data-reveal]').forEach((el) => {
  const siblings = $$(':scope > [data-reveal]', el.parentElement);
  if (siblings.length > 2) el.style.setProperty('--d', `${(siblings.indexOf(el) % 3) * 90}ms`);
  revealIO.observe(el);
});


/* ---------- count-up stats ---------- */
const countIO = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    countIO.unobserve(e.target);
    const el = e.target, end = +el.dataset.count, dec = +(el.dataset.decimals || 0), suffix = el.dataset.suffix || '';
    if (reduceMotion) { el.textContent = end.toFixed(dec) + suffix; return; }
    const start = performance.now(), dur = 1600;
    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      el.textContent = (end * (1 - Math.pow(1 - p, 4))).toFixed(dec) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}, { threshold: .6 });
$$('[data-count]').forEach((el) => countIO.observe(el));


/* ---------- nav: active section + sliding indicator ---------- */
const navList = $('[data-nav]');
const navIndicator = $('.nav-indicator');
const navLinks = $$('.nav-link');

const moveIndicator = (link) => {
  if (!link) { navIndicator.style.opacity = 0; return; }
  navIndicator.style.opacity = 1;
  navIndicator.style.width = `${link.offsetWidth}px`;
  navIndicator.style.transform = `translateX(${link.offsetLeft}px)`;
};

const sectionIO = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    const link = navLinks.find((l) => l.hash === `#${e.target.id}`);
    navLinks.forEach((l) => l.classList.toggle('active', l === link));
    moveIndicator(link);
  });
}, { rootMargin: '-45% 0px -50% 0px' });
$$('main > section').forEach((s) => sectionIO.observe(s));


/* ---------- pointer effects: cursor glow, tilt ---------- */
if (finePointer && !reduceMotion) {
  const glow = $('.cursor-glow');
  let raf = 0, px = 0, py = 0;

  addEventListener('pointermove', (e) => {
    px = e.clientX; py = e.clientY;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      glow.style.setProperty('--cx', `${px}px`);
      glow.style.setProperty('--cy', `${py}px`);
    });

  }, { passive: true });

  $$('[data-tilt]').forEach((el) => {
    const max = +el.dataset.tilt;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5;
      const y = (e.clientY - r.top) / r.height - .5;
      el.style.transition = 'transform .1s linear, border-color .3s';
      el.style.transform = `perspective(1000px) rotateX(${-y * max}deg) rotateY(${x * max}deg) translateZ(0)`;
    });
    el.addEventListener('pointerleave', () => {
      el.style.transition = '';
      el.style.transform = '';
    });
  });

}


/* ---------- skill bubbles: scattered without overlaps, drift away from the cursor ---------- */
const field = $('[data-bubbles]');
if (field) {
  const bubbles = $$('.bubble', field);
  let placed = [];

  // seeded random so the scatter is the same on every visit
  const rand = (seed) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);

  const layout = () => {
    const W = field.clientWidth;
    const k = Math.min(1, Math.max(.55, W / 1100));       // shrink bubbles on narrow screens
    const H = Math.round(W < 640 ? 640 : 520 * Math.max(k, .85));
    field.style.setProperty('--field-h', `${H}px`);
    const rnd = rand(7);
    // even spread: a jittered grid, with the biggest bubbles (listed first) taking the cells nearest the centre
    const cols = Math.ceil(Math.sqrt(bubbles.length * W / H)), rows = Math.ceil(bubbles.length / cols);
    const cw = W / cols, ch = H / rows;
    const cells = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = (c + .5 + (rnd() - .5) * .6) * cw, y = (r + .5 + (rnd() - .5) * .6) * ch;
      cells.push({ x, y, d: Math.hypot((x - W / 2) / W, (y - H / 2) / H) + rnd() * .12 });
    }
    cells.sort((a, b) => a.d - b.d);
    placed = bubbles.map((el, i) => {
      el.style.setProperty('--k', k);
      const r = (+el.style.getPropertyValue('--size') * k) / 2;
      return { el, r, x: cells[i].x, y: cells[i].y };
    });
    // relax: push overlapping pairs apart, keep everything inside the field
    for (let step = 0; step < 300; step++) {
      for (let i = 0; i < placed.length; i++) {
        for (let j = i + 1; j < placed.length; j++) {
          const a = placed[i], b = placed[j];
          const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy) || .01;
          const min = a.r + b.r + 22;
          if (dist < min) {
            const push = (min - dist) / 2, ux = dx / dist, uy = dy / dist;
            a.x -= ux * push; a.y -= uy * push; b.x += ux * push; b.y += uy * push;
          }
        }
      }
      placed.forEach((p) => {
        p.x = Math.min(Math.max(p.x, p.r), W - p.r);
        p.y = Math.min(Math.max(p.y, p.r), H - p.r - 30); // room for the name tag
      });
    }
    placed.forEach((p) => { p.el.style.left = `${p.x}px`; p.el.style.top = `${p.y}px`; });
  };

  field.classList.add('scatter');
  new ResizeObserver(layout).observe(field);

  // nearby bubbles lean away from the pointer
  if (finePointer && !reduceMotion) {
    field.addEventListener('pointermove', (e) => {
      const box = field.getBoundingClientRect();
      const mx = e.clientX - box.left, my = e.clientY - box.top;
      placed.forEach((p) => {
        const dx = p.x - mx, dy = p.y - my, dist = Math.hypot(dx, dy);
        const reach = p.r + 110;
        if (dist > reach || dist < p.r) { p.el.style.transform = ''; return; } // leave the hovered one still
        const f = (1 - dist / reach) * 28;
        p.el.style.transform = `translate(${(dx / dist) * f}px, ${(dy / dist) * f}px)`;
      });
    });
    field.addEventListener('pointerleave', () => placed.forEach((p) => { p.el.style.transform = ''; }));
  }
}


/* ---------- project filter with view transitions ---------- */
const filterBtns = $$('[data-filter]');
const filterIndicator = $('.filter-indicator');
const projects = $$('[data-projects] .project');

const placeFilterIndicator = (btn) => {
  filterIndicator.style.width = `${btn.offsetWidth}px`;
  filterIndicator.style.transform = `translateX(${btn.offsetLeft}px)`;
};

filterBtns.forEach((btn) => btn.addEventListener('click', () => {
  const cat = btn.dataset.filter;
  filterBtns.forEach((b) => {
    b.classList.toggle('active', b === btn);
    b.setAttribute('aria-pressed', b === btn);
  });
  placeFilterIndicator(btn);

  const apply = () => projects.forEach((p) => {
    p.hidden = cat !== 'all' && p.dataset.category !== cat;
    p.classList.add('in');
  });
  if (!document.startViewTransition || reduceMotion) return apply();
  // names only during the filter transition, so the theme reveal stays a single layer
  projects.forEach((p, i) => { p.style.viewTransitionName = `project-${i}`; });
  document.startViewTransition(apply).finished.finally(() => projects.forEach((p) => { p.style.viewTransitionName = ''; }));
}));

// re-measure pills whenever layout changes (font load, resize)
new ResizeObserver(() => {
  placeFilterIndicator($('.filter.active'));
  moveIndicator($('.nav-link.active'));
}).observe($('.filter.active').parentElement);


/* ---------- resume download ---------- */
// served from Google Drive: replace the PDF there via "Manage versions" and this link stays the same
const RESUME_URL = 'https://drive.google.com/uc?export=download&id=1uDGgRmWmriMv93JCAr1dMGP1mp0PPkB9';
const dlBtn = $('[data-download]');
const dlLabel = $('.dl-label', dlBtn);
const dlText = dlLabel.textContent;
dlBtn.addEventListener('click', () => {
  if (dlBtn.classList.contains('loading')) return;
  dlBtn.classList.add('loading');

  // Drive answers with a file attachment, so the browser downloads without leaving the page
  location.href = RESUME_URL;

  setTimeout(() => { dlBtn.classList.add('done'); dlLabel.textContent = 'Downloaded'; }, 900);
  setTimeout(() => { dlBtn.classList.remove('loading', 'done'); dlLabel.textContent = dlText; }, 4000);
});


/* ---------- contact form: enable send only when valid ---------- */
const form = $('[data-form]');
const formBtn = $('[data-form-btn]');
form.addEventListener('input', () => { formBtn.disabled = !form.checkValidity(); });


/* ---------- floating quick contact ---------- */
const fab = $('[data-fab]');
const fabBtn = $('[data-fab-btn]');
const setFab = (open) => {
  fab.classList.toggle('open', open);
  fabBtn.setAttribute('aria-expanded', open);
};
fabBtn.addEventListener('click', () => setFab(!fab.classList.contains('open')));
document.addEventListener('click', (e) => { if (!fab.contains(e.target)) setFab(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setFab(false); });


/* ---------- nav firms up after the first scroll ---------- */
const nav = $('.nav');
const onScroll = () => nav.classList.toggle('stuck', scrollY > 16);
onScroll();
addEventListener('scroll', onScroll, { passive: true });


/* ---------- hero card: pointer + scroll drive one smoothed 3D transform ---------- */
const heroCard = $('[data-hero-card]');
if (heroCard && !reduceMotion) {
  let tx = -10, ty = 4, cx = tx, cy = ty, lastTransform = '';
  if (finePointer) {
    addEventListener('pointermove', (e) => {
      tx = -10 + (e.clientX / innerWidth - .5) * 22;
      ty = 4 - (e.clientY / innerHeight - .5) * 14;
    }, { passive: true });
  }
  (function frame() {
    // ease toward the target so the card lags the pointer slightly
    cx += (tx - cx) * .07;
    cy += (ty - cy) * .07;
    const s = Math.min(scrollY / 700, 1);
    const next = `rotateX(${(cy - s * 6).toFixed(2)}deg) rotateY(${(cx + s * 12).toFixed(2)}deg) translateZ(${(-s * 60).toFixed(1)}px)`;
    if (scrollY < innerHeight * 1.5 && next !== lastTransform) {
      heroCard.style.transform = lastTransform = next;
    }
    requestAnimationFrame(frame);
  })();
}


/* ---------- certificates: expand / collapse ---------- */
const certs = $('[data-certs]');
const certsBtn = $('[data-certs-btn]');
if (certs && certsBtn) {
  const label = $('span', certsBtn);
  const items = $$('.certs > li', certs);
  // collapsed = top half of the first row (+ the wrapper's top padding)
  const collapsedH = () => Math.round(items[0].offsetHeight * .5) + 8;
  // hidden cards leave the tab order while collapsed
  const setInert = (open) => items.forEach((li) => { li.inert = !open && li.offsetTop >= collapsedH(); });

  const collapse = () => { certs.style.maxHeight = `${collapsedH()}px`; setInert(false); };
  const recollapse = () => { if (!certs.classList.contains('open')) collapse(); };
  collapse();
  document.fonts.ready.then(recollapse);
  addEventListener('resize', recollapse);

  certsBtn.addEventListener('click', () => {
    const open = !certs.classList.contains('open');
    certsBtn.setAttribute('aria-expanded', open);
    label.textContent = open ? 'Show less' : 'Show all certificates';

    if (open) {
      certs.style.maxHeight = `${certs.scrollHeight}px`;
      certs.classList.add('open');
      setInert(true);
      // release the cap once expanded so resizes don't clip
      certs.addEventListener('transitionend', function done(e) {
        if (e.propertyName !== 'max-height') return;
        certs.removeEventListener('transitionend', done);
        if (certs.classList.contains('open')) certs.style.maxHeight = 'none';
      });
    } else {
      certs.style.maxHeight = `${certs.scrollHeight}px`;
      certs.offsetHeight; // commit the start height before animating down
      certs.classList.remove('open');
      collapse();
      const top = $('#certificates').getBoundingClientRect().top;
      if (top < 0) $('#certificates').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  });
}


/* ---------- career journey: winding path that draws itself on scroll ---------- */
const journey = $('[data-journey]');
if (journey) {
  const track = $('.journey-track', journey);
  const line = $('.journey-line', journey);
  const stops = $$('[data-stop]', journey);
  let length = 0, dots = [];

  // a spine through the dots that bows gently left, then right, between each stop
  const build = () => {
    const box = journey.getBoundingClientRect();
    dots = stops.map((li) => {
      const r = $('.stop-dot', li).getBoundingClientRect();
      return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top };
    });
    const amp = matchMedia('(max-width: 640px)').matches ? 0 : 38;
    const pts = [{ x: dots[0].x, y: 0 }, ...dots, { x: dots[dots.length - 1].x, y: box.height }];
    let d = `M ${pts[0].x} 0`;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], k = (b.y - a.y) * .5;
      // short segments (the lead-in and tail) bow less, so they don't kink
      const bow = amp * Math.min(1, (b.y - a.y) / 320) * (i % 2 ? 1 : -1);
      d += ` C ${a.x + bow} ${a.y + k}, ${b.x + bow} ${b.y - k}, ${b.x} ${b.y}`;
    }
    // gradient in user space: a perfectly vertical path has a zero-width box, which would hide an objectBoundingBox gradient
    $('#journey-grad').setAttribute('y2', box.height);
    track.setAttribute('d', d);
    line.setAttribute('d', d);
    length = line.getTotalLength();
    line.style.strokeDasharray = length;
    update();
  };

  // the line's tip follows a point 60% down the viewport
  const update = () => {
    const box = journey.getBoundingClientRect();
    const tip = reduceMotion ? box.height : Math.min(Math.max(innerHeight * .6 - box.top, 0), box.height);
    line.style.strokeDashoffset = length * (1 - tip / box.height);
    stops.forEach((li, i) => li.classList.toggle('reached', dots[i].y <= tip + 1));
  };

  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; update(); });
  }, { passive: true });

  journey.classList.add('live');
  new ResizeObserver(build).observe(journey);
}
