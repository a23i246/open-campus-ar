(function () {
  'use strict';

  let currentDinoId = null;
  const visibleDinoIds = new Set();
  let layoutRunning = false;

  function getDinosaurList() {
    return Array.isArray(window.DINOSAURS) ? window.DINOSAURS : [];
  }

  function findDino(id) {
    if (typeof window.findDinosaur === 'function') {
      const found = window.findDinosaur(id);
      if (found) return found;
    }
    return getDinosaurList().find((dino) => dino.id === id) || null;
  }

  function getCollectionSafe() {
    if (typeof window.getCollection === 'function') return window.getCollection();
    try {
      const raw = localStorage.getItem('oc_dinosaur_collection_v1');
      const values = raw ? JSON.parse(raw) : [];
      return Array.isArray(values) ? values : [];
    } catch (error) {
      return [];
    }
  }

  function addToCollectionSafe(id) {
    if (typeof window.addToCollection === 'function') {
      window.addToCollection(id);
      return;
    }
    const current = getCollectionSafe();
    if (!current.includes(id)) current.push(id);
    localStorage.setItem('oc_dinosaur_collection_v1', JSON.stringify([...new Set(current)]));
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
    const total = getDinosaurList().length || document.querySelectorAll('a-marker[data-dino-id]').length;
    countEl.textContent = `${getCollectionSafe().length} / ${total}`;
  }

  function updateButton() {
    const button = document.getElementById('add-collection');
    if (!button) return;

    button.disabled = !currentDinoId;
    if (!currentDinoId) {
      button.textContent = 'コレクションに追加';
      return;
    }

    const dino = findDino(currentDinoId);
    const name = dino ? dino.name : 'モデル';
    const already = getCollectionSafe().includes(currentDinoId);
    button.textContent = already ? `${name} は追加済み` : `${name} を追加`;
  }

  function chooseCurrentDino() {
    currentDinoId = [...visibleDinoIds][0] || null;

    if (!currentDinoId) {
      setCurrentName('待機中');
      setStatus('マーカーを探しています。マーカー全体が画面に入るようにしてください。');
    } else {
      const dino = findDino(currentDinoId);
      const name = dino ? dino.name : '3Dモデル';
      setCurrentName(name);
      setStatus(`${name} を認識中です。モデルを読み込んでいます。`);
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

      [document.documentElement, document.body].forEach((el) => {
        el.style.setProperty('margin', '0', 'important');
        el.style.setProperty('padding', '0', 'important');
        el.style.setProperty('width', pixelWidth, 'important');
        el.style.setProperty('height', pixelHeight, 'important');
        el.style.setProperty('min-width', pixelWidth, 'important');
        el.style.setProperty('min-height', pixelHeight, 'important');
        el.style.setProperty('overflow', 'hidden', 'important');
        el.style.setProperty('background', '#000', 'important');
      });

      document.body.style.setProperty('position', 'fixed', 'important');
      document.body.style.setProperty('inset', '0', 'important');

      document.querySelectorAll('#ar-root, a-scene, .a-canvas, canvas, video, #arjs-video').forEach((el) => {
        el.style.setProperty('position', 'fixed', 'important');
        el.style.setProperty('top', '0', 'important');
        el.style.setProperty('left', '0', 'important');
        el.style.setProperty('width', pixelWidth, 'important');
        el.style.setProperty('height', pixelHeight, 'important');
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

      document.querySelectorAll('a-scene').forEach((el) => {
        el.style.setProperty('z-index', '1', 'important');
        el.style.setProperty('background', 'transparent', 'important');
      });

      document.querySelectorAll('canvas, .a-canvas').forEach((el) => {
        el.style.setProperty('z-index', '2', 'important');
        el.style.setProperty('pointer-events', 'none', 'important');
        el.style.setProperty('background', 'transparent', 'important');
      });

      const scene = document.querySelector('a-scene');
      if (scene && scene.renderer && window.THREE) {
        try {
          scene.renderer.setClearColor(new THREE.Color(0x000000), 0);
          scene.renderer.setClearAlpha(0);
          scene.renderer.setSize(width, height, false);
          if (scene.object3D) scene.object3D.background = null;
        } catch (error) {}
      }

      if (scene && typeof scene.resize === 'function') {
        try { scene.resize(); } catch (error) {}
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
          const dino = dinoId ? findDino(dinoId) : null;
          const mesh = this.el.getObject3D('mesh');

          if (!mesh || !window.THREE) return;

          this.el.object3D.scale.set(1, 1, 1);
          this.el.object3D.position.set(0, 0, 0);
          this.el.object3D.updateMatrixWorld(true);

          const box = new THREE.Box3().setFromObject(mesh);
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

          if (dino) {
            setStatus(`${dino.name} の3Dモデルを表示しました。見切れる場合はスマホを少し引いてください。`);
          }
          forceArLayout();
        });
      }
    });
  }

  function createDebugBox(holder) {
    if (holder.querySelector('.debug-box')) return;
    const box = document.createElement('a-box');
    box.classList.add('debug-box');
    box.setAttribute('position', '0 0.15 0');
    box.setAttribute('depth', '0.35');
    box.setAttribute('height', '0.3');
    box.setAttribute('width', '0.35');
    box.setAttribute('color', '#22c55e');
    box.setAttribute('opacity', '0.75');
    holder.appendChild(box);
  }

  function removeDebugBox(holder) {
    const box = holder.querySelector('.debug-box');
    if (box) box.remove();
  }

  function ensureModel(marker) {
    const id = marker.dataset.dinoId;
    const dino = findDino(id);
    const holder = marker.querySelector('.model-holder');
    if (!holder || !dino || !dino.model) return;

    if (holder.querySelector('.dino-model')) return;

    createDebugBox(holder);

    const model = document.createElement('a-entity');
    model.classList.add('dino-model');
    model.setAttribute('gltf-model', `url(${dino.model})`);
    model.setAttribute('fit-on-marker', `target: ${marker.dataset.target || '1.3'}; yOffset: 0.05`);
    model.setAttribute('animation', 'property: rotation; to: 0 360 0; loop: true; dur: 12000');

    model.addEventListener('model-loaded', () => {
      removeDebugBox(holder);
      const name = dino.name || '3Dモデル';
      setStatus(`${name} の3Dモデルを表示しました。見切れる場合はスマホを少し引いてください。`);
    });

    model.addEventListener('model-error', (event) => {
      console.error('モデル読み込み失敗:', id, event.detail);
      const name = dino.name || '3Dモデル';
      setStatus(`${name} の読み込みに失敗しました。assets/models のファイル名を確認してください。`);
    });

    holder.appendChild(model);
  }

  function initMarkerEvents() {
    document.querySelectorAll('a-marker[data-dino-id]').forEach((marker) => {
      if (marker.dataset.eventsReady === 'true') return;
      marker.dataset.eventsReady = 'true';
      const id = marker.dataset.dinoId;

      marker.addEventListener('markerFound', () => {
        visibleDinoIds.add(id);
        chooseCurrentDino();
        ensureModel(marker);
        forceArLayout();
      });

      marker.addEventListener('markerLost', () => {
        visibleDinoIds.delete(id);
        chooseCurrentDino();
        forceArLayout();
      });
    });
  }

  function initControls() {
    const addButton = document.getElementById('add-collection');
    if (addButton && addButton.dataset.ready !== 'true') {
      addButton.dataset.ready = 'true';
      addButton.addEventListener('click', () => {
        if (!currentDinoId) return;
        const dino = findDino(currentDinoId);
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

  registerFitComponent();

  window.addEventListener('DOMContentLoaded', () => {
    registerFitComponent();
    initMarkerEvents();
    initControls();
    updateCount();
    updateButton();
    chooseCurrentDino();
    startLayoutLoop();
  });
})();
