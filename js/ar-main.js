(function () {
  let currentDinoId = null;
  let visibleDinoIds = new Set();

  function updateCount() {
    const countEl = document.getElementById('collected-count');
    if (!countEl || !window.DINOSAURS) return;
    countEl.textContent = `${getCollection().length} / ${window.DINOSAURS.length}`;
  }

  function setStatus(text) {
    const status = document.getElementById('ar-status');
    if (status) status.textContent = text;
  }

  function updateButton() {
    const button = document.getElementById('add-collection');
    if (!button) return;
    button.disabled = !currentDinoId;
    if (!currentDinoId) {
      button.textContent = 'コレクションに追加';
      return;
    }
    const dino = findDinosaur(currentDinoId);
    const already = getCollection().includes(currentDinoId);
    button.textContent = already ? `${dino.name} は追加済み` : `${dino.name} を追加`;
  }

  function chooseCurrentDino() {
    const first = [...visibleDinoIds][0];
    currentDinoId = first || null;
    if (!currentDinoId) {
      setStatus('マーカーを探しています。マーカー全体が画面に入るようにしてください。');
    } else {
      const dino = findDinosaur(currentDinoId);
      setStatus(`${dino.name} を認識中です。問題なければコレクションに追加してください。`);
    }
    updateButton();
  }

  window.addEventListener('DOMContentLoaded', () => {
    updateCount();
    updateButton();

    document.querySelectorAll('a-marker[data-dino-id]').forEach((marker) => {
      const id = marker.dataset.dinoId;
      marker.addEventListener('markerFound', () => {
        visibleDinoIds.add(id);
        chooseCurrentDino();
      });
      marker.addEventListener('markerLost', () => {
        visibleDinoIds.delete(id);
        chooseCurrentDino();
      });
    });

    const trial = document.getElementById('trial-marker');
    if (trial) {
      trial.addEventListener('markerFound', () => {
        if (!currentDinoId) setStatus('お試しマーカーを認識しました。カメラは正常に動いています。');
      });
      trial.addEventListener('markerLost', () => {
        if (!currentDinoId) setStatus('マーカーを探しています。マーカー全体が画面に入るようにしてください。');
      });
    }

    const addButton = document.getElementById('add-collection');
    if (addButton) {
      addButton.addEventListener('click', () => {
        if (!currentDinoId) return;
        const dino = findDinosaur(currentDinoId);
        addToCollection(currentDinoId);
        updateCount();
        updateButton();
        setStatus(`${dino.name} をコレクションに追加しました。次のマーカーを探してください。`);
      });
    }

    window.addEventListener('orientationchange', () => {
      setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
    });
  });
})();
