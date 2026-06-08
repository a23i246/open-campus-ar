(function () {

  // GLBモデルの中心がマーカーからズレている場合でも、
  // マーカー上に収まるように自動で中心合わせ・サイズ調整するコンポーネント。
  // target: マーカー1辺に対して、モデルをどれくらいの大きさで置くか。
  if (window.AFRAME && !AFRAME.components['fit-on-marker']) {
    AFRAME.registerComponent('fit-on-marker', {
      schema: {
        target: { default: 1.0 },
        yOffset: { default: 0.02 }
      },
      init: function () {
        this.el.addEventListener('model-loaded', () => {
          const object3D = this.el.getObject3D('mesh');
          if (!object3D || !window.THREE) return;

          // 元モデルのサイズを取得
          object3D.updateMatrixWorld(true);
          let box = new THREE.Box3().setFromObject(object3D);
          const size = new THREE.Vector3();
          box.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);
          if (!maxDim || !Number.isFinite(maxDim)) return;

          // 大きすぎ・小さすぎを自動補正
          const scale = this.data.target / maxDim;
          this.el.setAttribute('scale', `${scale} ${scale} ${scale}`);

          // scale反映後に、中心をマーカー中央、足元をマーカー面付近へ移動
          requestAnimationFrame(() => {
            object3D.updateMatrixWorld(true);
            box = new THREE.Box3().setFromObject(object3D);
            const center = new THREE.Vector3();
            box.getCenter(center);
            const current = this.el.getAttribute('position') || { x: 0, y: 0, z: 0 };
            this.el.setAttribute('position', {
              x: current.x - center.x,
              y: current.y - box.min.y + this.data.yOffset,
              z: current.z - center.z
            });
          });
        });
      }
    });
  }

  let currentDinoId = null;
  let visibleDinoIds = new Set();
  let initialized = false;

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

  function forceArLayout() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    document.documentElement.style.width = `${width}px`;
    document.documentElement.style.height = `${height}px`;
    document.body.style.width = `${width}px`;
    document.body.style.height = `${height}px`;

    const targets = document.querySelectorAll('a-scene, .a-canvas, canvas, video');
    targets.forEach((el) => {
      el.style.position = 'fixed';
      el.style.left = '0';
      el.style.top = '0';
      el.style.width = `${width}px`;
      el.style.height = `${height}px`;
      el.style.maxWidth = 'none';
      el.style.maxHeight = 'none';
      el.style.margin = '0';
      el.style.transform = 'none';
      if (el.tagName.toLowerCase() === 'video') {
        el.style.objectFit = 'cover';
      }
    });

    const scene = document.querySelector('a-scene');
    if (scene && scene.resize) {
      try { scene.resize(); } catch (e) {}
    }
    window.dispatchEvent(new Event('resize'));
  }

  function initMarkerEvents() {
    if (initialized) return;
    initialized = true;

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

    setStatus('マーカーを探しています。マーカー全体が画面に入るようにしてください。');
  }

  function startAR() {
    const root = document.getElementById('ar-root');
    const template = document.getElementById('ar-scene-template');
    const startScreen = document.getElementById('start-screen');
    const topHelp = document.getElementById('top-help');
    const arUi = document.getElementById('ar-ui');

    if (!root || !template) return;

    if (!document.getElementById('ar-scene')) {
      root.appendChild(template.content.cloneNode(true));
    }

    root.setAttribute('aria-hidden', 'false');
    if (topHelp) topHelp.hidden = false;
    if (arUi) arUi.hidden = false;
    if (startScreen) startScreen.style.display = 'none';

    setTimeout(initMarkerEvents, 100);

    // AR.js が video/canvas を後から追加するため、数回補正する
    [100, 300, 700, 1200, 2000, 3500].forEach((ms) => {
      setTimeout(forceArLayout, ms);
    });
  }

  window.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('start-ar-button');
    if (startButton) {
      startButton.addEventListener('click', startAR, { once: true });
    }
  });

  window.addEventListener('resize', () => setTimeout(forceArLayout, 100));
  window.addEventListener('orientationchange', () => {
    setTimeout(forceArLayout, 300);
    setTimeout(forceArLayout, 900);
  });
})();
