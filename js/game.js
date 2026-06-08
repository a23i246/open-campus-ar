window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('mini-game-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const scoreEl = document.querySelector('[data-game-score]');

  let width = 0;
  let height = 0;
  let score = 0;
  let playerX = 0;
  let items = [];
  let lastSpawn = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(320, Math.floor(rect.width));
    height = Math.max(220, Math.floor(rect.height));
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    playerX = width / 2;
  }

  function setPlayerByClientX(clientX) {
    const rect = canvas.getBoundingClientRect();
    playerX = Math.min(width - 28, Math.max(28, clientX - rect.left));
  }

  canvas.addEventListener('pointermove', (event) => setPlayerByClientX(event.clientX));
  canvas.addEventListener('pointerdown', (event) => setPlayerByClientX(event.clientX));
  window.addEventListener('resize', resize);

  function spawn(now) {
    if (now - lastSpawn < 850) return;
    lastSpawn = now;
    items.push({
      x: 24 + Math.random() * (width - 48),
      y: -20,
      r: 10 + Math.random() * 8,
      speed: 1.4 + Math.random() * 1.8
    });
  }

  function loop(now = 0) {
    spawn(now);
    ctx.clearRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#e8f7ff');
    gradient.addColorStop(1, '#fff7df');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#2f7d4a';
    ctx.fillRect(0, height - 24, width, 24);

    ctx.fillStyle = '#ff9f1c';
    ctx.beginPath();
    ctx.moveTo(playerX, height - 70);
    ctx.lineTo(playerX - 30, height - 25);
    ctx.lineTo(playerX + 30, height - 25);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#7d5fff';
    items.forEach((item) => {
      item.y += item.speed;
      ctx.beginPath();
      ctx.arc(item.x, item.y, item.r, 0, Math.PI * 2);
      ctx.fill();

      const dx = item.x - playerX;
      const dy = item.y - (height - 42);
      if (Math.sqrt(dx * dx + dy * dy) < item.r + 28) {
        item.caught = true;
        score += 1;
        if (scoreEl) scoreEl.textContent = String(score);
      }
    });

    items = items.filter((item) => !item.caught && item.y < height + 40);

    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.font = '14px sans-serif';
    ctx.fillText('左右に動かして化石を集めよう', 12, 24);

    requestAnimationFrame(loop);
  }

  resize();
  requestAnimationFrame(loop);
});
