// Falling snow behind every page. Three depth layers (far, mid, near) with
// soft pre-rendered flakes, a slowly shifting wind, and flakes that drift
// away from the cursor. Skipped entirely for prefers-reduced-motion.
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.getElementById('snow') || document.body.insertBefore(
    Object.assign(document.createElement('canvas'), { id: 'snow' }),
    document.body.firstChild
  );
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');

  // [count per 100k px², radius min, radius max, fall speed, alpha, sway]
  const LAYERS = [
    { density: 12, r: [0.6, 1.2], v: [0.25, 0.45], a: 0.45, sway: 8 },
    { density: 6, r: [1.2, 2.1], v: [0.5, 0.85], a: 0.7, sway: 14 },
    { density: 2, r: [2.3, 3.8], v: [0.9, 1.4], a: 0.9, sway: 22 },
  ];
  const MAX = 600;

  // Pre-render one soft, glowing flake; drawImage is far cheaper than arcs + blur.
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 64;
  const s = sprite.getContext('2d');
  const g = s.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255, 252, 247, 1)');
  g.addColorStop(0.35, 'rgba(250, 245, 238, .75)');
  g.addColorStop(1, 'rgba(243, 237, 228, 0)');
  s.fillStyle = g;
  s.fillRect(0, 0, 64, 64);

  let w, h, flakes = [], last = 0, wind = 0, gust = 0, raf = 0;
  const mouse = { x: -1e4, y: -1e4 };
  const rand = (a, b) => a + Math.random() * (b - a);

  const make = (layer, anywhere) => ({
    layer,
    x: Math.random() * w,
    y: anywhere ? Math.random() * h : rand(-40, -6),
    r: rand(...LAYERS[layer].r),
    v: rand(...LAYERS[layer].v),
    p: Math.random() * 6.283,
    ps: rand(0.006, 0.018),
    tw: Math.random() * 6.283,
    push: 0,
  });

  const size = () => {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth;
    h = innerHeight;
    canvas.width = w * ratio;
    canvas.height = h * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    const area = (w * h) / 1e5;
    const total = LAYERS.reduce((n, l) => n + l.density, 0) * area;
    const scale = total > MAX ? MAX / total : 1;
    const next = [];
    LAYERS.forEach((l, i) => {
      const want = Math.round(l.density * area * scale);
      const have = flakes.filter(f => f.layer === i);
      for (let k = 0; k < want; k++) next.push(have[k] || make(i, true));
    });
    flakes = next;
  };

  const draw = t => {
    // speed in px per 60Hz frame, so 120Hz screens don't snow twice as fast
    const dt = last ? Math.min((t - last) / 16.7, 3) : 1;
    last = t;

    // Wind eases toward a new target every few seconds, giving soft gusts.
    if (t > gust) {
      gust = t + rand(4000, 9000);
      draw.target = rand(-0.35, 0.6);
    }
    wind += ((draw.target || 0) - wind) * 0.004 * dt;

    ctx.clearRect(0, 0, w, h);
    for (const f of flakes) {
      const L = LAYERS[f.layer];
      const depth = (f.layer + 1) / LAYERS.length;

      f.p += f.ps * dt;
      f.tw += 0.03 * dt;
      f.y += f.v * dt;
      f.x += wind * depth * 1.6 * dt;

      // Nearby flakes get nudged away from the cursor, then settle back.
      const dx = f.x - mouse.x, dy = f.y - mouse.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 12000) f.push += (dx > 0 ? 1 : -1) * (1 - d2 / 12000) * 0.6 * depth;
      f.push *= 0.94;
      f.x += f.push * dt;

      if (f.y > h + 10) Object.assign(f, make(f.layer, false));
      if (f.x > w + 30) f.x -= w + 60;
      else if (f.x < -30) f.x += w + 60;

      const x = f.x + Math.sin(f.p) * L.sway;
      const d = f.r * 4;
      ctx.globalAlpha = L.a * (0.8 + Math.sin(f.tw) * 0.2);
      ctx.drawImage(sprite, x - d / 2, f.y - d / 2, d, d);
    }
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(draw);
  };

  size();
  addEventListener('resize', size);
  addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  document.addEventListener('pointerleave', () => { mouse.x = mouse.y = -1e4; });
  // Stop drawing while the tab is hidden; resume without a time jump.
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(raf);
    if (!document.hidden) { last = 0; raf = requestAnimationFrame(draw); }
  });
  raf = requestAnimationFrame(draw);
})();
