function renderCollection() {
  const root = document.getElementById('collection-root');
  const collected = getCollection();
  const dinos = window.DINOSAURS || [];
  const totalEl = document.getElementById('collection-total');
  if (totalEl) totalEl.textContent = `${collected.length} / ${dinos.length}`;
  if (!root) return;

  root.innerHTML = '';
  dinos.forEach((dino, index) => {
    const isCollected = collected.includes(dino.id);
    const card = document.createElement('article');
    card.className = `collection-item ${isCollected ? '' : 'locked'}`;
    card.innerHTML = `
      <div class="collection-thumb-wrap">
        <img src="${dino.markerImage}" alt="${dino.name}のマーカー画像" loading="lazy">
        <span class="stamp-number">${String(index + 1).padStart(2, '0')}</span>
      </div>
      <h3>${isCollected ? dino.name : '？？？'}</h3>
      <p>${isCollected ? dino.description : 'まだ見つけていない恐竜です。会場のマーカーを探してみましょう。'}</p>
      <button class="button light" data-detail="${dino.id}" ${isCollected ? '' : 'disabled'}>${isCollected ? '詳しく見る' : '未収集'}</button>
    `;
    root.appendChild(card);
  });
}

function openDetail(id) {
  const dino = findDinosaur(id);
  if (!dino) return;

  const modal = document.getElementById('detail-modal');
  const title = document.getElementById('modal-title');
  const description = document.getElementById('modal-description');
  const link = document.getElementById('modal-link');
  const asset = document.getElementById('modal-model-asset');
  const model = document.getElementById('modal-model');

  if (title) title.textContent = dino.name;
  if (description) description.textContent = dino.description;
  if (link) {
    if (dino.url) {
      link.href = dino.url;
      link.hidden = false;
    } else {
      link.hidden = true;
    }
  }

  if (asset && model) {
    // 直接URL指定にして、スマホブラウザでも再読み込みが安定しやすい形にする
    model.removeAttribute('gltf-model');
    asset.setAttribute('src', dino.model);
    model.setAttribute('scale', dino.collectionScale || '0.7 0.7 0.7');
    model.setAttribute('position', dino.collectionPosition || '0 -0.6 -3');
    requestAnimationFrame(() => model.setAttribute('gltf-model', `url(${dino.model})`));
  }

  if (modal) {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }
}

function closeDetail() {
  const modal = document.getElementById('detail-modal');
  const model = document.getElementById('modal-model');
  const asset = document.getElementById('modal-model-asset');
  if (model) model.removeAttribute('gltf-model');
  if (asset) asset.removeAttribute('src');
  if (modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  renderCollection();

  document.addEventListener('click', (event) => {
    const detailButton = event.target.closest('[data-detail]');
    if (detailButton && !detailButton.disabled) openDetail(detailButton.dataset.detail);

    const closeButton = event.target.closest('[data-close-modal]');
    if (closeButton) closeDetail();

    const clearButton = event.target.closest('[data-clear-collection]');
    if (clearButton && confirm('コレクションをすべて削除しますか？')) {
      clearCollection();
      renderCollection();
      closeDetail();
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeDetail();
  });
});
