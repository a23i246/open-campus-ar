
const CACHE_READY_KEY = 'oc_cache_ready_v6';
const CACHE_TIME_KEY = 'oc_cache_time_v6';
const CACHE_PROGRESS_KEY = 'oc_cache_progress_v6';

function getPreloadTargets() {
  const commonFiles = [
    'index.html',
    'ar.html',
    'collection.html',
    'game.html',
    'css/common.css',
    'css/ar.css',
    'css/game.css',
    'js/dinosaurs.js',
    'js/collection.js',
    'js/preload.js',
    'js/ar-main.js',
    'js/collection-page.js',
    'js/game-assets/p5.js',
    'js/game-assets/class.js',
    'js/game-assets/sketch.js',
    'sw.js'
  ];

  const dinoFiles = (window.DINOSAURS || []).flatMap((dino) => [
    dino.model,
    dino.marker,
    dino.markerImage
  ]);

  const trialFiles = window.TRIAL_MARKER ? [
    window.TRIAL_MARKER.marker,
    window.TRIAL_MARKER.markerImage
  ] : [];

  return [...new Set([...commonFiles, ...dinoFiles, ...trialFiles])];
}

function saveProgress(done, total, complete = false) {
  localStorage.setItem(CACHE_PROGRESS_KEY, JSON.stringify({ done, total, complete, time: Date.now() }));
}

function updatePreloadUI(done, total, currentName = '', completeOverride = false) {
  const percent = total === 0 ? 100 : Math.floor((done / total) * 100);
  const complete = completeOverride || (total > 0 && done >= total && localStorage.getItem(CACHE_READY_KEY) === 'true');
  const bars = document.querySelectorAll('[data-progress-bar]');
  const text = document.querySelector('[data-progress-text]');
  const count = document.querySelector('[data-progress-count]');
  const current = document.querySelector('[data-progress-current]');
  const statusItems = document.querySelectorAll('[data-download-status]');
  const readyButtons = document.querySelectorAll('[data-requires-cache]');

  bars.forEach((bar) => { bar.style.width = `${percent}%`; });
  if (text) text.textContent = `${percent}%`;
  if (count) count.textContent = complete ? 'ダウンロード完了' : 'ダウンロード進行中';
  if (current) current.textContent = currentName && !complete ? `読み込み中: ${currentName}` : '';
  statusItems.forEach((item) => { item.textContent = complete ? '完了' : 'ダウンロード進行中'; });

  readyButtons.forEach((button) => {
    const disabled = !complete;
    if (button.tagName === 'A') {
      button.classList.toggle('disabled', disabled);
      button.setAttribute('aria-disabled', String(disabled));
    } else {
      button.disabled = disabled;
    }
  });
}

function applySavedProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(CACHE_PROGRESS_KEY) || 'null');
    if (saved && saved.total) updatePreloadUI(saved.done, saved.total, '', saved.complete);
  } catch (_) {}
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return false;
  try {
    await navigator.serviceWorker.register('sw.js');
    return true;
  } catch (error) {
    console.warn('Service Worker registration failed:', error);
    return false;
  }
}

async function preloadOne(url) {
  const response = await fetch(url, { cache: 'force-cache' });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  await response.blob();
}

async function preloadAll() {
  const targets = getPreloadTargets();
  let done = 0;
  const failed = [];

  updatePreloadUI(done, targets.length);
  saveProgress(done, targets.length, false);

  for (const target of targets) {
    try {
      updatePreloadUI(done, targets.length, target);
      await preloadOne(target);
    } catch (error) {
      console.warn('preload failed:', target, error);
      failed.push(target);
    } finally {
      done += 1;
      const completeNow = failed.length === 0 && done >= targets.length;
      updatePreloadUI(done, targets.length, target, completeNow);
      saveProgress(done, targets.length, completeNow);
    }
  }

  const result = document.querySelector('[data-preload-result]');

  if (failed.length === 0) {
    localStorage.setItem(CACHE_READY_KEY, 'true');
    localStorage.setItem(CACHE_TIME_KEY, new Date().toISOString());
    updatePreloadUI(targets.length, targets.length, '', true);
    saveProgress(targets.length, targets.length, true);
    if (result) {
      result.textContent = 'ダウンロード完了です。ARカメラを起動できます。';
      result.className = 'notice success';
    }
  } else {
    localStorage.setItem(CACHE_READY_KEY, 'false');
    saveProgress(done, targets.length, false);
    if (result) {
      result.innerHTML = `読み込みに失敗したファイルがあります。会場Wi-Fiに接続して再読み込みしてください。<br><small>${failed.join('<br>')}</small>`;
      result.className = 'notice danger';
    }
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  document.querySelectorAll('a[data-requires-cache]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (link.getAttribute('aria-disabled') === 'true') event.preventDefault();
    });
  });

  applySavedProgress();
  await registerServiceWorker();
  preloadAll();
});
