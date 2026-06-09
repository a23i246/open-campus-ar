// collection.html 専用の処理です。
// 役割：コレクション一覧を表示する、カード詳細を開く、3Dモデルを横回転させる、リセットする。

// =========================================================
// 3Dモデルの横回転用の状態管理
// =========================================================
// 「現在のY方向の回転角度」を保存しておく変数です。
// A-Frameの rotation は「X Y Z」の順番で、Yだけ変えると横回転になります。
let modalModelRotationY = 0;

function renderCollection() {
  // 恐竜カードを入れる場所です。collection.html の id="collection-root" と対応しています。
  const root = document.getElementById('collection-root');

  // 今まで集めた恐竜IDを localStorage から読み込みます。
  // 例：['protoceratops', 'ravjaa'] のような配列になります。
  const collected = getCollection();

  // 恐竜一覧データです。中身は js/dinosaurs.js にあります。
  const dinos = window.DINOSAURS || [];

  // 「現在 2 / 6 体」の数字部分を書き換えます。
  const totalEl = document.getElementById('collection-total');
  if (totalEl) totalEl.textContent = `${collected.length} / ${dinos.length}`;

  // 表示先が見つからない場合はここで終了します。
  if (!root) return;

  // 一度カード一覧を空にしてから、最新状態で作り直します。
  root.innerHTML = '';

  dinos.forEach((dino, index) => {
    // この恐竜が収集済みかどうかを判定します。
    const isCollected = collected.includes(dino.id);

    // articleタグで1枚分のカードを作ります。
    const card = document.createElement('article');

    // 未収集なら locked クラスを付けて、灰色表示にします。
    card.className = `collection-item ${isCollected ? '' : 'locked'}`;

    // カードのHTMLです。
    // 表示内容を変えたい場合は、ここか js/dinosaurs.js のデータを変更します。
    card.innerHTML = `
      <div class="collection-thumb-wrap">
        <img src="${dino.markerImage}" alt="${dino.name}のマーカー画像" loading="lazy">
        <span class="stamp-number">${String(index + 1).padStart(2, '0')}</span>
      </div>
      <h3>${isCollected ? dino.name : '？？？'}</h3>
      <p>${isCollected ? dino.description : 'まだ見つけていない恐竜です。会場のマーカーを探してみましょう。'}</p>
      <button class="button light" data-detail="${dino.id}" ${isCollected ? '' : 'disabled'}>${isCollected ? '詳しく見る' : '未収集'}</button>
    `;

    // 完成したカードを画面に追加します。
    root.appendChild(card);
  });
}

function openDetail(id) {
  // 押されたカードの恐竜IDから、恐竜データを1件探します。
  const dino = findDinosaur(id);
  if (!dino) return;

  // モーダル内の各パーツを取得します。
  const modal = document.getElementById('detail-modal');
  const title = document.getElementById('modal-title');
  const description = document.getElementById('modal-description');
  const link = document.getElementById('modal-link');
  const model = document.getElementById('modal-model');
  const scene = document.querySelector('#modal-model-wrap a-scene');

  // タイトルと説明文を、選択した恐竜の内容に変更します。
  if (title) title.textContent = dino.name;
  if (description) description.textContent = dino.description;

  // 詳細リンクがある恐竜だけ「詳細を見る」ボタンを表示します。
  if (link) {
    if (dino.url) {
      link.href = dino.url;
      link.hidden = false;
    } else {
      link.hidden = true;
    }
  }

  // 先にモーダルを表示します。
  // 重要：A-Frameは非表示状態のまま読み込むと、3D表示用canvasが0pxになって何も出ないことがあります。
  if (modal) {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }

  if (model) {
    // 前回開いたモデルをいったん外します。
    model.removeAttribute('gltf-model');
    model.removeAttribute('animation');

    // コレクション画面用の大きさ・位置を設定します。
    model.setAttribute('scale', dino.collectionScale || '0.7 0.7 0.7');
    model.setAttribute('position', dino.collectionPosition || '0 -0.6 -3');

    // 最初に表示する向きです。正面がずれる場合は js/dinosaurs.js の collectionRotation を調整します。
    const startRotation = dino.collectionRotation || '0 0 0';
    const parts = startRotation.split(' ').map(Number);
    modalModelRotationY = Number.isFinite(parts[1]) ? parts[1] : 0;
    model.setAttribute('rotation', startRotation);

    // モーダルが開いてから、次の描画タイミングでA-Frameにサイズ再計算させます。
    // これがないと、白い枠だけ出てモデルが出ない端末があります。
    requestAnimationFrame(() => {
      if (scene?.resize) scene.resize();
      model.setAttribute('gltf-model', `url(${dino.model})`);

      // 念のため少し遅らせてもう一度リサイズします。スマホ対策です。
      setTimeout(() => scene?.resize?.(), 150);
    });
  }
}

function closeDetail() {
  const modal = document.getElementById('detail-modal');
  const model = document.getElementById('modal-model');
  // 閉じるときに3Dモデルを外します。スマホの負荷を少し減らすためです。
  if (model) model.removeAttribute('gltf-model');

  // モーダルを非表示にします。
  if (modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }
}

function setupModelSwipeRotation() {
  // 3Dモデルを表示している枠です。
  // この枠の上で左右にドラッグ/フリックしたときだけ、モデルを横回転させます。
  const wrap = document.getElementById('modal-model-wrap');
  const model = document.getElementById('modal-model');
  if (!wrap || !model) return;

  let isDragging = false;
  let lastX = 0;

  wrap.addEventListener('pointerdown', (event) => {
    isDragging = true;
    lastX = event.clientX;

    // 指が枠から少し外れても、動きを取り続けるための設定です。
    wrap.setPointerCapture?.(event.pointerId);
  });

  wrap.addEventListener('pointermove', (event) => {
    if (!isDragging) return;

    // 左右にどれだけ動いたかを計算します。
    const diffX = event.clientX - lastX;
    lastX = event.clientX;

    // 横移動量をY回転角度に変換します。
    // 数字を大きくするとよく回り、小さくするとゆっくり回ります。
    modalModelRotationY += diffX * 0.55;

    // XとZは0のままにして、Yだけ変えます。
    // これで上下には倒れず、横方向だけ回転します。
    model.setAttribute('rotation', `0 ${modalModelRotationY} 0`);

    // モデル操作中にページが横に引っ張られるのを防ぎます。
    event.preventDefault();
  });

  function stopDrag(event) {
    isDragging = false;
    if (event?.pointerId !== undefined) {
      wrap.releasePointerCapture?.(event.pointerId);
    }
  }

  wrap.addEventListener('pointerup', stopDrag);
  wrap.addEventListener('pointercancel', stopDrag);
  wrap.addEventListener('pointerleave', stopDrag);
}

// HTMLの読み込みが終わってから実行します。
window.addEventListener('DOMContentLoaded', () => {
  // 最初にカード一覧を表示します。
  renderCollection();

  // 3Dモデルを指で横回転できるようにします。
  setupModelSwipeRotation();

  // クリック処理をまとめて管理します。
  document.addEventListener('click', (event) => {
    // 「詳しく見る」ボタンが押された場合、詳細モーダルを開きます。
    const detailButton = event.target.closest('[data-detail]');
    if (detailButton && !detailButton.disabled) openDetail(detailButton.dataset.detail);

    // 閉じるボタンや黒背景が押された場合、モーダルを閉じます。
    const closeButton = event.target.closest('[data-close-modal]');
    if (closeButton) closeDetail();

    // リセットボタンが押された場合、確認してからコレクションを削除します。
    const clearButton = event.target.closest('[data-clear-collection]');
    if (clearButton && confirm('コレクションをすべて削除しますか？')) {
      clearCollection();
      renderCollection();
      closeDetail();
    }
  });

  // Escキーでもモーダルを閉じられるようにします。
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeDetail();
  });
});
