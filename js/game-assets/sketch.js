// 待ち時間用 縦型シューティングゲーム

let player;
let lastShotTime = 0;
let shotInterval = 105;
let smokes = [];
let bullets = [];
let enemies = [];
let stars = [];
let gameStarted = false;
let gameOver = false;
let gameClear = false;
let isPointerDown = false;
let autoShotOnTouch = false;

// 赤い追尾敵の撃破数は「今のボス段階用」と「累計」を分ける。
let redPhaseKillCount = 0;
let redTotalKillCount = 0;
let nextBossNeed = 10;

let boss = null;
let bossLevel = 1;
let bossBullets = [];
let bossRedKillTargets = [10, 15];
let isBossBattle = false;

let killCount = 0;
let score = 0;
let shakeAmount = 0;
let enemySpawnLevel = 1;

function setup() {
  const size = getGameCanvasSize();
  const canvas = createCanvas(size.w, size.h);
  const container = document.getElementById('game-container');
  if (container) canvas.parent(container);
  canvas.elt.addEventListener('contextmenu', (event) => event.preventDefault());
  textAlign(CENTER, CENTER);

  resetStars();
  player = new Player(width / 2, height - 76);
}

function getGameCanvasSize() {
  const container = document.getElementById('game-container');
  const w = container ? container.clientWidth : windowWidth;
  const h = container ? container.clientHeight : windowHeight;
  return {
    w: Math.max(320, Math.floor(w)),
    h: Math.max(430, Math.floor(h))
  };
}

function resetStars() {
  stars = [];
  for (let i = 0; i < 95; i++) stars.push(new Star());
}

function windowResized() {
  const size = getGameCanvasSize();
  resizeCanvas(size.w, size.h);
  resetStars();
  if (player) {
    player.x = constrain(player.x, 22, width - 22);
    player.y = constrain(player.y, height * 0.45, height - 44);
  }
}

function startGame() {
  if (!gameStarted) {
    gameStarted = true;
    const title = document.getElementById('title-ui');
    if (title) title.style.display = 'none';
  }
}

function shootPlayerBullet() {
  if (!gameStarted || gameOver || gameClear) return;
  const now = millis();
  if (now - lastShotTime > shotInterval) {
    bullets.push(new Bullet(player.getHitX(), player.y - player.size / 2));
    lastShotTime = now;
  }
}

function isPointerInsideCanvas() {
  return mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height;
}

function setPlayerByPointer() {
  if (!gameStarted || gameOver || gameClear) return;
  player.x = constrain(mouseX, 22, width - 22);
  player.y = constrain(mouseY, height * 0.45, height - 44);
}

function startPointerControl() {
  if (!isPointerInsideCanvas()) return true;
  if (!gameStarted) {
    startGame();
    return false;
  }
  if (gameOver || gameClear) {
    resetGame();
    return false;
  }
  isPointerDown = true;
  autoShotOnTouch = true;
  setPlayerByPointer();
  shootPlayerBullet();
  return false;
}

function movePointerControl() {
  if (!isPointerDown) return true;
  setPlayerByPointer();
  return false;
}

function endPointerControl() {
  isPointerDown = false;
  autoShotOnTouch = false;
  return false;
}

function touchStarted() { return startPointerControl(); }
function touchMoved() { return movePointerControl(); }
function touchEnded() { return endPointerControl(); }
function mousePressed() { return startPointerControl(); }
function mouseDragged() { return movePointerControl(); }
function mouseReleased() { return endPointerControl(); }

function keyPressed() {
  if (keyCode === ENTER && !gameStarted) {
    startGame();
    return false;
  }
  if (keyCode === ENTER && (gameOver || gameClear)) {
    resetGame();
    return false;
  }
  if (keyCode === 32 && gameStarted && !gameOver && !gameClear) {
    shootPlayerBullet();
    return false;
  }
}

function drawScanLines() {
  stroke(0, 255, 255, 20);
  for (let y = 0; y < height; y += 4) line(0, y, width, y);
}

function draw() {
  background(11, 12, 28);

  for (let star of stars) {
    star.update();
    star.draw();
  }

  if (!gameStarted) {
    drawScanLines();
    return;
  }

  if (gameOver) {
    drawGameOver();
    return;
  }

  if (gameClear) {
    drawGameClear();
    return;
  }

  push();
  if (shakeAmount > 0) {
    translate(random(-shakeAmount, shakeAmount), random(-shakeAmount, shakeAmount));
    shakeAmount *= 0.88;
  }

  for (let i = smokes.length - 1; i >= 0; i--) {
    smokes[i].update();
    smokes[i].draw();
    if (smokes[i].isDead()) smokes.splice(i, 1);
  }

  player.update();
  if (autoShotOnTouch || keyIsDown(32)) shootPlayerBullet();
  player.draw();

  if (isBossBattle && boss) {
    boss.update();
    boss.draw();
    updateBossBullets();
  }

  updateBullets();
  updateEnemies();

  pop();
  drawHUD();
}

function resetGame() {
  player = new Player(width / 2, height - 76);
  bullets = [];
  enemies = [];
  smokes = [];
  bossBullets = [];

  killCount = 0;
  score = 0;
  redPhaseKillCount = 0;
  redTotalKillCount = 0;
  boss = null;
  bossLevel = 1;
  nextBossNeed = bossRedKillTargets[0];
  isBossBattle = false;
  enemySpawnLevel = 1;

  lastShotTime = 0;
  shakeAmount = 0;
  gameOver = false;
  gameClear = false;
  gameStarted = true;

  const title = document.getElementById('title-ui');
  if (title) title.style.display = 'none';
}

function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].update();
    bullets[i].draw();
    if (bullets[i].offscreen()) bullets.splice(i, 1);
  }

  if (isBossBattle && boss) {
    for (let i = bullets.length - 1; i >= 0; i--) {
      if (boss.hit(bullets[i])) {
        boss.hp--;
        shakeAmount = 7;
        bullets.splice(i, 1);

        if (boss.hp <= 0) {
          score += bossLevel === 1 ? 2500 : 6000;
          boss = null;
          isBossBattle = false;
          bossBullets = [];
          enemies = [];

          if (bossLevel >= 2) {
            gameClear = true;
          } else {
            // 1体目を倒した後、赤い敵カウントを0に戻して、改めて15体で2体目。
            bossLevel = 2;
            redPhaseKillCount = 0;
            nextBossNeed = bossRedKillTargets[1];
            enemySpawnLevel = 2;
          }
        }
        break;
      }
    }
  }
}

function maybeSpawnEnemies() {
  if (isBossBattle) return;

  const spawnEvery = bossLevel === 1 ? 14 : 9; // 2段階目はさらに密度を上げる
  if (frameCount % spawnEvery !== 0) return;

  const r = random();
  if (r < 0.62) enemies.push(new Enemy());          // 赤い追尾敵をかなり多め
  else if (r < 0.86) enemies.push(new FastEnemy());
  else enemies.push(new BouncerEnemy());

  // 2段階目はたまに追加湧きして、密度を上げる
  if (bossLevel === 2 && random() < 0.38) {
    enemies.push(random() < 0.6 ? new Enemy() : new FastEnemy());
  }
}

function updateEnemies() {
  if (!isBossBattle && bossLevel <= bossRedKillTargets.length && redPhaseKillCount >= nextBossNeed) {
    boss = bossLevel === 1 ? new Boss2() : new Boss1();
    isBossBattle = true;
    enemies = [];
    return;
  }

  maybeSpawnEnemies();

  for (let i = enemies.length - 1; i >= 0; i--) {
    enemies[i].update(player);
    enemies[i].draw();

    for (let j = bullets.length - 1; j >= 0; j--) {
      if (dist(bullets[j].x, bullets[j].y, enemies[i].x, enemies[i].y) < enemies[i].size / 2 + bullets[j].size / 2) {
        shakeAmount = 5;
        killCount++;
        if (enemies[i].isRedEnemy) {
          redPhaseKillCount++;
          redTotalKillCount++;
        }
        score += enemies[i].scoreValue;
        enemies.splice(i, 1);
        bullets.splice(j, 1);
        break;
      }
    }

    if (enemies[i] && player.hit(enemies[i])) {
      shakeAmount = 14;
      player.hp--;
      enemies.splice(i, 1);
      if (player.hp <= 0) gameOver = true;
      continue;
    }

    if (enemies[i] && enemies[i].offscreen()) enemies.splice(i, 1);
  }
}

function updateBossBullets() {
  for (let i = bossBullets.length - 1; i >= 0; i--) {
    bossBullets[i].update();
    bossBullets[i].draw();

    if (player.hitCircle(bossBullets[i].x, bossBullets[i].y, bossBullets[i].size / 2)) {
      player.hp--;
      shakeAmount = 16;
      bossBullets.splice(i, 1);
      if (player.hp <= 0) gameOver = true;
      continue;
    }

    if (bossBullets[i] && bossBullets[i].offscreen()) bossBullets.splice(i, 1);
  }

  // 反射弾が永遠に増えすぎないように制限
  if (bossBullets.length > 72) bossBullets.splice(0, bossBullets.length - 72);
}

function drawHUD() {
  noStroke();
  fill(8, 18, 55, 185);
  rect(8, 8, min(190, width - 16), 100, 10);

  fill(0, 255, 255);
  textSize(15);
  textAlign(LEFT, TOP);
  text('SCORE : ' + score, 16, 16);
  text('KILL : ' + killCount, 16, 36);
  text('RED : ' + redPhaseKillCount + ' / ' + nextBossNeed, 16, 56);

  for (let i = 0; i < player.hp; i++) {
    text('❤️', 16 + i * 24, 76);
  }

  if (isBossBattle && boss) {
    textAlign(RIGHT, TOP);
    fill(255, 220, 100);
    textSize(14);
    text('BOSS ' + bossLevel, width - 14, 16);
  }
}

function drawGameOver() {
  background(10, 0, 20);
  textAlign(CENTER, CENTER);
  fill(255, 80, 80);
  textSize(min(44, width * 0.12));
  text('GAME OVER', width / 2, height / 2 - 50);

  fill(255);
  textSize(22);
  text('SCORE : ' + score, width / 2, height / 2);
  textSize(15);
  text('TAP / ENTER でもう一度', width / 2, height / 2 + 40);
}

function drawGameClear() {
  background(5, 20, 35);
  textAlign(CENTER, CENTER);
  fill(80, 255, 180);
  textSize(min(42, width * 0.11));
  text('GAME CLEAR!', width / 2, height / 2 - 60);

  fill(255);
  textSize(20);
  text('2体目のボスを撃破！', width / 2, height / 2 - 15);
  textSize(26);
  text('SCORE : ' + score, width / 2, height / 2 + 28);
  textSize(15);
  fill(220);
  text('TAP / ENTER でもう一度', width / 2, height / 2 + 72);
}
