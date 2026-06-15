/**
 * NatureGuard — Confetti Utility
 * Lightweight confetti burst on the existing #confetti-canvas element.
 * No external library needed — pure canvas rendering.
 */

const COLORS = [
  '#A3E635', // lime
  '#2DD4BF', // teal
  '#F59E0B', // amber
  '#A78BFA', // purple
  '#F87171', // red
  '#86EFAC', // green
];

/**
 * Fire a confetti burst from a given origin point.
 * @param {{ x?: number, y?: number, count?: number, duration?: number }} opts
 */
export function confettiBurst({
  x = window.innerWidth / 2,
  y = window.innerHeight * 0.4,
  count = 80,
  duration = 3000,
} = {}) {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = Array.from({ length: count }, () => createParticle(x, y));

  const startTime = performance.now();

  function draw(now) {
    const elapsed = now - startTime;
    if (elapsed > duration) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
      p.x   += p.vx;
      p.y   += p.vy;
      p.vy  += 0.25;           // gravity
      p.vx  *= 0.99;           // air resistance
      p.rot += p.rotSpeed;
      p.alpha = Math.max(0, 1 - elapsed / duration);

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;

      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else {
        // circle
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);
}

function createParticle(cx, cy) {
  const angle  = (Math.random() * Math.PI * 2);
  const speed  = 4 + Math.random() * 10;
  return {
    x:        cx,
    y:        cy,
    vx:       Math.cos(angle) * speed,
    vy:       Math.sin(angle) * speed - 8, // initial upward kick
    color:    COLORS[Math.floor(Math.random() * COLORS.length)],
    size:     6 + Math.random() * 8,
    rot:      Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.3,
    shape:    Math.random() > 0.5 ? 'rect' : 'circle',
    alpha:    1,
  };
}
