(function () {
  'use strict';

  const DEFAULT_MODELS = [
    {
      id: 'stanp1',
      name: 'プロトケラトプス',
      markerName: 'pattern-stanp1',
      markerUrl: 'assets/markers/pattern-stanp1.patt',
      modelUrl: 'assets/models/protoceratops.glb',
      target: 1.45,
      yOffset: 0.05,
      rotation: '0 180 0',
      spin: true
    }
  ];

  const models = Array.isArray(window.AR_MODELS) && window.AR_MODELS.length
    ? window.AR_MODELS
    : DEFAULT_MODELS;

  let currentDinoId = null;
  const visibleDinoIds = new Set();
  let initialized = false;
  let layoutRunning = false;

  function findConfig(id) {
    return models.find((item) => item.id === id) || null;
  }

  function safeFindDinosaur(id) {
    if (typeof window.findDinosaur === 'function') {
      const found = window.findDinosaur(id);
      if (found) return found;
    }
    return findConfig(id);
  }

  function getCollectionSafe() {
    if (typeof window.getCollection === 'function') return window.getCollection();
    try {
      return JSON.parse(localStorage.getItem('dinoCollection') || '[]');
    } catch (e) {
      return [];
    }
  }

  function addToCollectionSafe(id) {
    if (typeof window.addToCollection === 'function') {
      window.addToCollection(id);
      return;
    }
    const collection = getCollectionSafe();
    if (!collection.includes(id)) {
      collection.push(id);
      localStorage.setItem('dinoCollection', JSON.stringify(collection));
    }
  }

  function setStatus(text) {
    const status = document.getElementById('ar-status') || document.getElementById('status');
    if (status) status.textContent = text;
  }

  function setCurrentName(text) {
    const nameEl = document.getElementById('current-model-name');
    if (nameEl) nameEl.textContent = text;
  }

  function updateCount() {
    const countEl = document.getElementById('collected-count');
    if (!countEl) return;
    countEl.textContent = `${getCollectionSafe().length} / ${models.length}`;
  }

  function updateButton() {
    const button = document.getElementById('add-collection');
    if (!button) return;

    button.disabled = !currentDinoId;
    if (!currentDinoId) {
      button.textContent = 'コレクションに追加';
      return;
    }

    const dino = safeFindDinosaur(currentDinoId);
    const already = getCollectionSafe().includes(currentDinoId);
    const name = dino ? dino.name : 'モデル';
    button.textContent = already ? `${name} は追加済み` : `${name} を追加`;
  }

  function chooseCurrentDino() {
    currentDinoId = [...visibleDinoIds][0] || null;

    if (!currentDinoId) {
      setCurrentName('待機中');
      setStatus('マーカーを探しています。マーカー全体が画面に入るようにしてください。');
    } else {
      const dino = safeFindDinosaur(currentDinoId);
      const name = dino ? dino.name : '3Dモデル';
      setCurrentName(name);
      setStatus(`${name} を認識中です。見切れる場合はスマホを少し引いてください。`);
    }

    updateButton();
  }

  function getViewportSize() {
    const vv = window.visualViewport;
    return {
      width: Math.max(1, Math.round(vv ? vv.width : window.innerWidth)),
      height: Math.max(1, Math.round(vv ? vv.height : window.innerHeight))
    };
  }

  function forceArLayout() {
    if (layoutRunning) return;
    layoutRunning = true;

    requestAnimationFrame(() => {
      const { width, height } = getViewportSize();
      const pixelWidth = `${width}px`;
      const pixelHeight = `${height}px`;

      const html = document.documentElement;
      const body = document.body;

      [html, body].forEach((el) => {
        el.style.setProperty('margin', '0', 'important');
        el.style.setProperty('padding', '0', 'important');
        el.style.setProperty('width', pixelWidth, 'important');
        el.style.setProperty('height', pixelHeight, 'important');
        el.style.setProperty('min-width', pixelWidth, 'important');
        el.style.setProperty('min-height', pixelHeight, 'important');
        el.style.setProperty('max-width', pixelWidth, 'important');
        el.style.setProperty('max-height', pixelHeight, 'important');
        el.style.setProperty('overflow', 'hidden', 'important');
        el.style.setProperty('background', '#000', 'important');
      });

      body.style.setProperty('position', 'fixed', 'important');
      body.style.setProperty('inset', '0', 'important');

      document.querySelectorAll('#ar-root, a-scene, .a-canvas, canvas, video, #arjs-video').forEach((el) => {
        el.style.setProperty('position', 'fixed', 'important');
        el.style.setProperty('top', '0', 'important');
        el.style.setProperty('left', '0', 'important');
        el.style.setProperty('right', 'auto', 'important');
        el.style.setProperty('bottom', 'auto', 'important');
        el.style.setProperty('width', pixelWidth, 'important');
        el.style.setProperty('height', pixelHeight, 'important');
        el.style.setProperty('min-width', pixelWidth, 'important');
        el.style.setProperty('min-height', pixelHeight, 'important');
        el.style.setProperty('max-width', 'none', 'important');
        el.style.setProperty('max-height', 'none', 'important');
        el.style.setProperty('margin', '0', 'important');
        el.style.setProperty('padding', '0', 'important');
        el.style.setProperty('transform', 'none', 'important');
      });

      document.querySelectorAll('video, #arjs-video').forEach((el) => {
        el.style.setProperty('display', 'block', 'important');
        el.style.setProperty('visibility', 'visible', 'important');
        el.style.setProperty('opacity', '1', 'important');
        el.style.setProperty('object-fit', 'cover', 'important');
        el.style.setProperty('z-index', '0', 'important');
        el.style.setProperty('pointer-events', 'none', 'important');
        el.style.setProperty('background', '#000', 'important');
      });

      document.querySelectorAll('a-scene, canvas, .a-canvas').forEach((el) => {
        el.style.setProperty('background', 'transparent', 'important');
      });

      document.querySelectorAll('a-scene').forEach((el) => {
        el.style.setProperty('z-index', '1', 'important');
      });

      document.querySelectorAll('canvas, .a-canvas').forEach((el) => {
        el.style.setProperty('z-index', '2', 'important');
        el.style.setProperty('pointer-events', 'none', 'important');
      });

      const scene = document.querySelector('a-scene');
      if (scene && scene.renderer && window.THREE) {
        try {
          scene.renderer.setClearColor(new THREE.Color(0x000000), 0);
          scene.renderer.setClearAlpha(0);
          scene.renderer.setSize(width, height, false);
          if (scene.object3D) scene.object3D.background = null;
        } catch (e) {}
      }

      if (scene && typeof scene.resize === 'function') {
        try { scene.resize(); } catch (e) {}
      }

      layoutRunning = false;
    });
  }

  function registerFitComponent() {
    if (!window.AFRAME || AFRAME.components['fit-on-marker']) return;

    AFRAME.registerComponent('fit-on-marker', {
      schema: {
        target: { type: 'number', default: 1.0 },
        yOffset: { type: 'number', default: 0.02 }
      },
      init: function () {
        this.el.addEventListener('model-loaded', () => {
          const marker = this.el.closest('a-marker');
          const dinoId = marker ? marker.dataset.dinoId : '';
          const dino = dinoId ? safeFindDinosaur(dinoId) : null;
          const object3D = this.el.getObject3D('mesh');

          if (dino) {
            setStatus(`${dino.name} の3Dモデルを読み込みました。マーカーにかざしてください。`);
          }

          if (!object3D || !window.THREE) return;

          this.el.object3D.scale.set(1, 1, 1);
          this.el.object3D.position.set(0, 0, 0);
          this.el.object3D.updateMatrixWorld(true);

          const box = new THREE.Box3().setFromObject(object3D);
          const size = new THREE.Vector3();
          const center = new THREE.Vector3();
          box.getSize(size);
          box.getCenter(center);

          const maxDim = Math.max(size.x, size.y, size.z);
          if (!maxDim || !Number.isFinite(maxDim)) return;

          const scale = this.data.target / maxDim;
          this.el.object3D.scale.set(scale, scale, scale);
          this.el.object3D.position.set(
            -center.x * scale,
            -box.min.y * scale + this.data.yOffset,
            -center.z * scale
          );
          this.el.object3D.updateMatrixWorld(true);
          forceArLayout();
        });
      }
    });
  }

  async function fileExists(url) {
    try {
      const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
      return res.ok;
    } catch (e) {
      return true;
    }
  }

  function createMarker(config) {
    const marker = document.createElement('a-marker');
    marker.setAttribute('id', `marker-${config.id}`);
    marker.setAttribute('type', 'pattern');
    marker.setAttribute('url', config.markerUrl);
    marker.setAttribute('emitevents', 'true');
    marker.dataset.dinoId = config.id;

    const ambient = document.createElement('a-entity');
    ambient.setAttribute('light', 'type: ambient; intensity: 1.8');
    marker.appendChild(ambient);

    const directional = document.createElement('a-entity');
    directional.setAttribute('light', 'type: directional; intensity: 1.2');
    directional.setAttribute('position', '0 2 2');
    marker.appendChild(directional);

    const holder = document.createElement('a-entity');
    holder.setAttribute('id', `holder-${config.id}`);
    holder.setAttribute('position', config.position || '0 0.02 0');
    holder.setAttribute('rotation', config.rotation || '0 180 0');

    const model = document.createElement('a-entity');
    model.classList.add('dino-model');
    model.setAttribute('id', `model-${config.id}`);
    model.setAttribute('gltf-model', `url(${config.modelUrl})`);
    model.setAttribute('fit-on-marker', `target: ${config.target || 1.2}; yOffset: ${config.yOffset ?? 0.02}`);

    if (config.spin !== false) {
      model.setAttribute('animation', 'property: rotation; to: 0 360 0; loop: true; dur: 12000');
    }

    holder.appendChild(model);
    marker.appendChild(holder);

    marker.addEventListener('markerFound', () => {
      visibleDinoIds.add(config.id);
      chooseCurrentDino();
      forceArLayout();
    });

    marker.addEventListener('markerLost', () => {
      visibleDinoIds.delete(config.id);
      chooseCurrentDino();
      forceArLayout();
    });

    model.addEventListener('model-error', (event) => {
      console.error('モデル読み込み失敗:', config.id, event.detail);
      setStatus(`${config.name} の読み込みに失敗しました。modelUrl のファイル名を確認してください。`);
    });

    return marker;
  }

  async function buildMarkers() {
    const root = document.getElementById('markers-root');
    if (!root || root.dataset.built === 'true') return;
    root.dataset.built = 'true';

    let createdCount = 0;

    for (const config of models) {
      const markerOk = await fileExists(config.markerUrl);
      const modelOk = await fileExists(config.modelUrl);

      if (!markerOk || !modelOk) {
        console.warn('ARモデル設定をスキップ:', config.name, { markerOk, modelOk, config });
        continue;
      }

      root.appendChild(createMarker(config));
      createdCount += 1;
    }

    if (createdCount === 0) {
      setStatus('読み込めるマーカー・モデルが見つかりません。assets/markers と assets/models のファイル名を確認してください。');
    } else if (createdCount === 1) {
      setStatus(`${models[0].markerName || 'マーカー'} をかざしてください。${models[0].name}を表示します。`);
    } else {
      setStatus(`${createdCount}種類のマーカーに対応しました。マーカーをかざしてください。`);
    }

    updateCount();
    updateButton();
    forceArLayout();
  }

  function initControls() {
    if (initialized) return;
    initialized = true;

    const addButton = document.getElementById('add-collection');
    if (addButton) {
      addButton.addEventListener('click', () => {
        if (!currentDinoId) return;
        const dino = safeFindDinosaur(currentDinoId);
        const name = dino ? dino.name : 'モデル';
        addToCollectionSafe(currentDinoId);
        updateCount();
        updateButton();
        setStatus(`${name} をコレクションに追加しました。次のマーカーを探してください。`);
      });
    }
  }

  function startLayoutLoop() {
    [50, 100, 250, 500, 900, 1400, 2200, 3500, 6000].forEach((ms) => {
      setTimeout(forceArLayout, ms);
    });

    const observer = new MutationObserver(() => forceArLayout());
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    window.addEventListener('resize', () => setTimeout(forceArLayout, 100));
    window.addEventListener('orientationchange', () => {
      setTimeout(forceArLayout, 300);
      setTimeout(forceArLayout, 900);
      setTimeout(forceArLayout, 1600);
    });

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', forceArLayout);
      window.visualViewport.addEventListener('scroll', forceArLayout);
    }

    const scene = document.querySelector('a-scene');
    if (scene) {
      scene.addEventListener('renderstart', () => {
        forceArLayout();
        setTimeout(forceArLayout, 500);
      });
    }
  }

  window.addEventListener('DOMContentLoaded', async () => {
    registerFitComponent();
    initControls();
    startLayoutLoop();
    await buildMarkers();
  });
})();