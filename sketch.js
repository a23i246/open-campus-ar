// ゲーム管理

const GAME_W = 600;
const GAME_H = 400;

let player;
let lastShotTime = 0;     // 最後に撃った時間
let shotInterval = 200;   // 発射間隔(ms)
let smokes = [];
let bullets = [];
let enemies = [];
let stars = [];
let gameStarted = false;
let gameOver = false;
let gameClear = false;

// スマホ操作関係
let pointerDown = false;
let pointerX = 0;
let pointerY = 0;
let gameCanvas;

// ボス関係
let boss = null;
let bossLevel = 1;
let bossBullets = [];
let bossScores = [600, 4000]; // ボス出現スコア
let isBossBattle = false;

// HUD関係
let killCount = 0;
let score = 0;
let hitCount = 0;
let shakeAmount = 0; // 揺れ


// 初期化、最初に一回だけ表示される
function setup() {
  gameCanvas = createCanvas(GAME_W, GAME_H); // ゲーム内部の基準サイズ
  gameCanvas.parent("game-container");        // HTML内の枠に入れてスマホで拡大縮小する
  textAlign(CENTER, CENTER);

  for (let i = 0; i < 60; i++) { //背景の星を60個キープ
    stars.push(new Star());
  }

  player = new Player(80, 200); //プレイヤー初期位置
}


// タイトル演出
function drawScanLines() {
  stroke(0, 255, 255, 20);
  for (let y = 0; y < height; y += 4) {
    line(0, y, width, y);
  }
}


// ゲーム開始
function startGame() {
  if (!gameStarted) {
    gameStarted = true;
    const titleUi = document.getElementById("title-ui");
    if (titleUi) titleUi.style.display = "none";
  }
}


// 射撃
function shootPlayerBullet() {
  if (!gameStarted || gameOver || gameClear) return;

  let now = millis();
  if (now - lastShotTime > shotInterval) {
    bullets.push(
      new Bullet(
        player.x + player.size,
        player.y + player.size / 2
      )
    );
    lastShotTime = now;
  }
}


// キー入力
function keyPressed() {
  if (keyCode === ENTER && !gameStarted) { // ゲーム未開始でEnterが押されたら
    startGame();
    return false; // ブラウザ本来のEnter動作を防ぐ
  }

  if (keyCode === ENTER && (gameOver || gameClear)) { // 終了画面中にEnterが押されたら
    resetGame();
    return false;
  }

  if (keyCode === 32) { // スペースキーで弾を撃つ
    shootPlayerBullet();
    return false;
  }
}


// スマホ・マウスの座標をゲーム内部座標に変換
function screenToGamePosition(x, y) {
  const rect = gameCanvas.elt.getBoundingClientRect();
  return {
    x: ((x - rect.left) / rect.width) * width,
    y: ((y - rect.top) / rect.height) * height
  };
}

function updatePointerPosition(x, y) {
  const pos = screenToGamePosition(x, y);
  pointerX = pos.x;
  pointerY = pos.y;

  if (player && gameStarted && !gameOver && !gameClear) {
    // 指の真下だと機体が隠れるので、少し左上にずらして操作しやすくする
    player.x = constrain(pointerX - player.size * 1.4, 0, width - player.size);
    player.y = constrain(pointerY - player.size / 2, 0, height - player.size);
  }
}

function touchStarted() {
  pointerDown = true;

  if (!gameStarted) {
    startGame();
    return false;
  }

  if (gameOver || gameClear) {
    resetGame();
    return false;
  }

  if (touches.length > 0) {
    updatePointerPosition(touches[0].x, touches[0].y);
  } else {
    updatePointerPosition(mouseX, mouseY);
  }
  shootPlayerBullet();
  return false;
}

function touchMoved() {
  if (touches.length > 0) {
    updatePointerPosition(touches[0].x, touches[0].y);
  } else {
    updatePointerPosition(mouseX, mouseY);
  }
  return false;
}

function touchEnded() {
  pointerDown = false;
  return false;
}

function mousePressed() {
  pointerDown = true;
  if (!gameStarted) {
    startGame();
    return false;
  }
  if (gameOver || gameClear) {
    resetGame();
    return false;
  }
  updatePointerPosition(mouseX, mouseY);
  shootPlayerBullet();
  return false;
}

function mouseDragged() {
  updatePointerPosition(mouseX, mouseY);
  return false;
}

function mouseReleased() {
  pointerDown = false;
  return false;
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

  // スマホでは押しっぱなしで自動ショット
  if (pointerDown) {
    shootPlayerBullet();
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

  boss = null; //ボスをいない状態にする
  bossLevel = 1; //最初に戻す
  isBossBattle = false;

  lastShotTime = 0;
  shakeAmount = 0;
  pointerDown = false;

  gameOver = false;
  gameClear = false;
  gameStarted = true;

  const titleUi = document.getElementById("title-ui");
  if (titleUi) titleUi.style.display = "none";
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
          score += bossLevel === 1 ? 2000 : 5000; // ボス撃破ボーナスを加算

          if (bossLevel >= bossScores.length) {
            // 2体目のボスを倒したのでゲームクリア
            boss = null;
            isBossBattle = false;
            bossBullets = [];
            bullets = [];
            enemies = [];
            gameClear = true;
          } else {
            boss = null; // ボスを消す
            isBossBattle = false;
            bossLevel++; // 次のボス段階へ進める
            bossBullets = [];
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
  if ( // 以下の条件をすべて満たしたらボス出現
    !isBossBattle && // まだボス戦中でなく
    bossLevel <= bossScores.length && // まだ出すべきボスが残っていて
    score >= bossScores[bossLevel - 1] // 必要スコアに到達していれば
  ) {
    boss = bossLevel === 1 ? new Boss1() : new Boss2();  // ボス段階に応じたボスを生成
    isBossBattle = true;
    enemies = []; // 通常敵を消してボス戦に切り替える
  }

  // ボス戦中は雑魚敵を追加しない
  if (!isBossBattle && frameCount % 30 === 0) { // 30フレームごとに敵を出す
    let r = random();

    if (r < 0.2) { // 20%の確率で
      enemies.push(new Enemy()); // 追尾型の敵を生成する
    } else {
      enemies.push(new FastEnemy()); //高速直進型の敵を生成する
    }
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    enemies[i].update(player);
    enemies[i].draw();

    if (enemies[i].offscreen && enemies[i].offscreen()) {
      enemies.splice(i, 1);
      continue;
    }

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
        score += enemies[i].scoreValue; // 敵ごとの得点を加算する
        enemies.splice(i, 1); // 当たった敵を削除する
        bullets.splice(j, 1); // 当たった弾を削除する
        break;
      }
    }

    //敵を受けた時の処理
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

    if ( // プレイヤーに当たった時の処理
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
  rect(5, 5, 132, 74, 8); //左上にHUD背景の四角を描く

  fill(0, 255, 255); // 文字色
  textSize(16); // 文字サイズ
  textAlign(LEFT, TOP); // 左上基準で文字を描く
  text("SCORE : " + score, 10, 10); // スコアを表示
  text("KILL : " + killCount, 10, 30); // 撃破数を表示

  for (let i = 0; i < player.hp; i++) {
    text("❤️", 10 + i * 24, 50);
  }
}


// GAME OVER
function drawGameOver() {
  background(10, 0, 20);

  textAlign(CENTER, CENTER);
  fill(255, 80, 80);
  textSize(48);
  text("GAME OVER", width / 2, height / 2 - 50);

  fill(255);
  textSize(24);
  text("SCORE : " + score, width / 2, height / 2 + 5);

  fill(200);
  textSize(18);
  text("TAP / ENTER でリスタート", width / 2, height / 2 + 55);
}


// GAME CLEAR
function drawGameClear() {
  background(5, 15, 35);

  for (let star of stars) {
    star.update();
    star.draw();
  }

  textAlign(CENTER, CENTER);
  fill(0, 255, 255);
  textSize(50);
  text("GAME CLEAR!", width / 2, height / 2 - 70);

  fill(255, 230, 80);
  textSize(26);
  text("2体目のボスを撃破！", width / 2, height / 2 - 18);

  fill(255);
  textSize(30);
  text("SCORE : " + score, width / 2, height / 2 + 35);

  fill(200);
  textSize(18);
  text("TAP / ENTER でリスタート", width / 2, height / 2 + 90);
}
