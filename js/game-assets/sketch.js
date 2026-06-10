
// ゲーム管理

let player;
let lastShotTime = 0;     // 最後に撃った時間
let shotInterval = 200;  // 発射間隔(ms)
let smokes = [];
let bullets = [];
let enemies = [];
let bgX = 0;
let stars = [];
let gameStarted = false;
let gameOver = false;
let gameClear = false;
let isPointerDown = false;
let autoShotOnTouch = false;
let redEnemyKillCount = 0;

// ボス関係
let boss = null;
let bossLevel = 1;
let bossBullets = [];
let bossRedKillTargets = [10, 15]; // 1体目は赤い追尾敵10体、2体目は15体撃破で出現
let isBossBattle = false;

// HUD関係
let killCount = 0;
let score = 0;
let hitCount = 0;
let shakeAmount = 0; // 揺れ


// 初期化、最初に一回だけ表示される

function setup() {
  const size = getGameCanvasSize();
  const canvas = createCanvas(size.w, size.h); // スマホ画面に合わせてゲーム画面のサイズを決める
  const container = document.getElementById('game-container');
  if (container) canvas.parent(container);
  canvas.elt.addEventListener('contextmenu', (event) => event.preventDefault());
  textAlign(CENTER, CENTER);

  for (let i = 0; i < 60; i++) { //背景の星を60個キープ
    stars.push(new Star());
  }

  player = new Player(80, 200); //プレイヤー初期位置
}



function getGameCanvasSize() {
  const container = document.getElementById('game-container');
  const w = container ? container.clientWidth : windowWidth;
  const h = container ? container.clientHeight : windowHeight;
  const aspect = 600 / 400;
  let cw = Math.max(320, w);
  let ch = cw / aspect;
  if (ch > h) {
    ch = Math.max(260, h);
    cw = ch * aspect;
  }
  return { w: Math.floor(cw), h: Math.floor(ch) };
}

function windowResized() {
  const size = getGameCanvasSize();
  resizeCanvas(size.w, size.h);
  player.x = constrain(player.x, 0, width - player.size);
  player.y = constrain(player.y, 0, height - player.size);
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
    bullets.push(new Bullet(player.x + player.size, player.y + player.size / 2));
    lastShotTime = now;
  }
}

function isPointerInsideCanvas() {
  return mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height;
}

function setPlayerByPointer() {
  if (!gameStarted || gameOver || gameClear) return;
  player.x = constrain(mouseX - player.size / 2, 0, width - player.size);
  player.y = constrain(mouseY - player.size / 2, 0, height - player.size);
}

function startPointerControl() {
  if (!isPointerInsideCanvas()) return true; // 下部の戻るボタンなどは邪魔しない
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

// タイトル演出

function drawScanLines() {
  stroke(0, 255, 255, 20);
  for (let y = 0; y < height; y += 4) {
    line(0, y, width, y);
  }
}


// キー入力

function keyPressed() {
  if (keyCode === ENTER && !gameStarted) { // ゲーム未開始でEnterが押されたら
    startGame();
    return false; // ブラウザ本来のEnter動作を防ぐ
  }

  if (keyCode === ENTER && (gameOver || gameClear)) { // ゲームオーバー・クリア中にEnterが押されたら
    resetGame();
    return false;
  }

  if (keyCode === 32 && gameStarted && !gameOver && !gameClear) { // スペースキーで弾を撃つ
    shootPlayerBullet();
    return false;
  }
}


// メインループ

function draw() {
  background(20, 20, 30);

  for (let star of stars) {
    star.update();
    star.draw();
  } //背景の処理

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
    shakeAmount *= 0.9;
  }

  for (let i = smokes.length - 1; i >= 0; i--) {
    smokes[i].update();
    smokes[i].draw();
    if (smokes[i].isDead()) smokes.splice(i, 1);
  }

  player.update();
  if (autoShotOnTouch) shootPlayerBullet();
  player.draw();

 
  // ボス処理
 
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

// リスタート

function resetGame() { // ゲームを最初の状態に戻す
  player = new Player(80, 200); // プレイヤーを初期位置に再生成する
  bullets = [];
  enemies = [];
  smokes = [];
  bossBullets = []; //弾や敵を0に戻す

  killCount = 0;
  hitCount = 0;
  score = 0;
  redEnemyKillCount = 0;

  boss = null; //ボスをいない状態にする
  bossLevel = 1; //を最初に戻す
  isBossBattle = false;

  lastShotTime = 0;
  shakeAmount = 0;

  gameOver = false;
  gameClear = false;
  gameStarted = true;
  const title = document.getElementById('title-ui');
  if (title) title.style.display = 'none';
}

// 弾処理

function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) { // 弾を後ろから順に処理する
    bullets[i].update();
    bullets[i].draw();
    if (bullets[i].offscreen()) bullets.splice(i, 1); // 画面外の弾を削除する
  }

  // ボスに弾が当たったかどうか
  if (isBossBattle && boss) {
    for (let i = bullets.length - 1; i >= 0; i--) {
      if (boss.hit(bullets[i])) { // 弾がボスに当たっていたら
        boss.hp--; // ボスのHPを1減らす
        shakeAmount = 15; // 画面揺れ
        bullets.splice(i, 1); // 当たった弾を削除

        if (boss.hp <= 0) { // ボスのHPが0以下なら
          score += bossLevel === 1 ? 2000 : 4000; // ボス撃破ボーナスを加算
          boss = null; // ボスを消す
          isBossBattle = false;
          bossBullets = [];
          if (bossLevel >= 2) {
            gameClear = true; // 2体目のボス撃破でゲームクリア
          } else {
            bossLevel++; // 次のボス段階へ進める
          }
        }
        break;
      }
    }
  }
}


// 敵処理

function updateEnemies() {
  // ボス出現判定
  if (
    !isBossBattle &&
    bossLevel <= bossRedKillTargets.length &&
    redEnemyKillCount >= bossRedKillTargets[bossLevel - 1]
  ) {
    // 1体目と2体目の順番を入れ替えています。
    boss = bossLevel === 1 ? new Boss2() : new Boss1();
    isBossBattle = true;
    enemies = []; // 通常敵を消してボス戦に切り替える
  }

  // ボス戦中は通常敵を追加しない
  if (!isBossBattle && frameCount % 30 === 0) {
    let r = random();

    if (r < 0.5) { // 赤い追尾敵の出現頻度を20%から50%にアップ
      enemies.push(new Enemy());
    } else {
      enemies.push(new FastEnemy());
    }
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    enemies[i].update(player);
    enemies[i].draw();

    for (let j = bullets.length - 1; j >= 0; j--) {
      if ( // 弾と敵が接触しているか判定
        dist(  // 中心同士の距離を測る
          bullets[j].x, bullets[j].y,
          enemies[i].x + enemies[i].size / 2,
          enemies[i].y + enemies[i].size / 2
        ) < enemies[i].size / 2 // 敵半径より近ければヒット
      ) { // 当たっていたら
        shakeAmount = 10; // 小さな画面揺れを起こす
        killCount++; // 撃破数を1増やす
        if (enemies[i] instanceof Enemy) redEnemyKillCount++; // 赤い追尾敵だけをボス出現条件に数える
        score += enemies[i].scoreValue; // 敵ごとの得点を加算する
        enemies.splice(i, 1); // 当たった敵を削除する
        bullets.splice(j, 1); // 当たった弾を削除する
        break;
      }
    }
//敵の弾を受けた時の処理
    if (enemies[i] && player.hit(enemies[i])) {
      shakeAmount = 20;
      player.hp--;
      enemies.splice(i, 1);
      if (player.hp <= 0) gameOver = true;
    }
  }
}


// ボス弾

function updateBossBullets() {
  for (let i = bossBullets.length - 1; i >= 0; i--) {
    bossBullets[i].update();
    bossBullets[i].draw();

    if (　// プレイヤーに当たった時の処理、↑と同じ
      dist(
        bossBullets[i].x,
        bossBullets[i].y,
        player.x + player.size / 2,
        player.y + player.size / 2
      ) < player.size / 2
    ) {
      player.hp--;
      shakeAmount = 20;
      bossBullets.splice(i, 1);
      if (player.hp <= 0) gameOver = true;
      continue;
    }

    if (bossBullets[i].offscreen()) bossBullets.splice(i, 1);
  }
}


// HUD

function drawHUD() {
  fill(10, 20, 60, 180);
  rect(5, 5, 150, 90, 8); //左上にHUD背景の四角を描く

  fill(0, 255, 255); // 文字色
  textSize(16); // 文字サイズ
  textAlign(LEFT, TOP); // 左上基準で文字を描く
  text("SCORE : " + score, 10, 10); // スコアを表示
  text("KILL : " + killCount, 10, 30); // 撃破数を表示
  text("RED : " + redEnemyKillCount, 10, 50); // 赤い追尾敵の撃破数

  for (let i = 0; i < player.hp; i++) {
    text("❤️", 10 + i * 24, 70);
  }
}


// GAME OVER

function drawGameOver() {
  background(10, 0, 20);

  // GAME OVER
  textAlign(CENTER, CENTER);
  fill(255, 80, 80);
  textSize(48);
  text("GAME OVER", width / 2, height / 2 - 40);

  // スコア表示
  fill(255);
  textSize(24);
  text("SCORE : " + score, width / 2, height / 2 + 10);

  // continue表示
  textAlign(RIGHT, BOTTOM);
  fill(200);
  textSize(20);
  text("TAP / ENTER", width - 10, height - 10);
}

// GAME CLEAR
function drawGameClear() {
  background(5, 20, 35);

  textAlign(CENTER, CENTER);
  fill(80, 255, 180);
  textSize(44);
  text("GAME CLEAR!", width / 2, height / 2 - 54);

  fill(255);
  textSize(24);
  text("2体目のボスを撃破！", width / 2, height / 2 - 10);
  text("SCORE : " + score, width / 2, height / 2 + 30);

  textAlign(RIGHT, BOTTOM);
  fill(220);
  textSize(18);
  text("TAP / ENTER", width - 10, height - 10);
}
