const CACHE_READY_KEY = 'oc_cache_ready_v4';
const CACHE_TIME_KEY = 'oc_cache_time_v4';

function getPreloadTargets() {
  const commonFiles = [
    'index.html',
    'ar.html',
    'collection.html',
    'game.html',
    'css/common.css',
    'css/ar.css',
    'js/dinosaurs.js',
    'js/collection.js',
    'js/ar-main.js',
    'js/collection-page.js',
    'js/game.js',
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

function updatePreloadUI(done, total, currentName = '') {
  const percent = total === 0 ? 100 : Math.floor((done / total) * 100);
  const bar = document.querySelector('[data-progress-bar]');
  const text = document.querySelector('[data-progress-text]');
  const count = document.querySelector('[data-progress-count]');
  const current = document.querySelector('[data-progress-current]');
  const readyButtons = document.querySelectorAll('[data-requires-cache]');

  if (bar) bar.style.width = `${percent}%`;
  if (text) text.textContent = `${percent}%`;
  if (count) count.textContent = `${done} / ${total} ファイル読み込み完了`;
  if (current) current.textContent = currentName ? `読み込み中: ${currentName}` : '';

  readyButtons.forEach((button) => {
    if (button.tagName === 'A') {
      button.classList.toggle('disabled', done < total);
      button.setAttribute('aria-disabled', String(done < total));
    } else {
      button.disabled = done < total;
    }
  });
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
  // Blob化するとキャッシュへの登録と読み込み完了判定が分かりやすい
  await response.blob();
}

async function preloadAll() {
  const targets = getPreloadTargets();
  let done = 0;
  const failed = [];
  updatePreloadUI(done, targets.length);

  for (const target of targets) {
    try {
      updatePreloadUI(done, targets.length, target);
      await preloadOne(target);
    } catch (error) {
      console.warn('preload failed:', target, error);
      failed.push(target);
    } finally {
      done += 1;
      updatePreloadUI(done, targets.length, target);
    }
  }

  const result = document.querySelector('[data-preload-result]');
  const buttons = document.querySelectorAll('[data-requires-cache]');

  if (failed.length === 0) {
    localStorage.setItem(CACHE_READY_KEY, 'true');
    localStorage.setItem(CACHE_TIME_KEY, new Date().toISOString());
    if (result) {
      result.textContent = '準備完了です。お試しARに進めます。';
      result.className = 'notice success';
    }
    buttons.forEach((button) => { button.disabled = false; });
  } else {
    localStorage.setItem(CACHE_READY_KEY, 'false');
    if (result) {
      result.innerHTML = `読み込みに失敗したファイルがあります。会場Wi-Fiに接続して再読み込みしてください。<br><small>${failed.join('<br>')}</small>`;
      result.className = 'notice danger';
    }
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  document.querySelectorAll('a[data-requires-cache]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (link.getAttribute('aria-disabled') === 'true') {
        event.preventDefault();
      }
    });
  });
  updatePreloadUI(0, getPreloadTargets().length);
  await registerServiceWorker();
  preloadAll();
});
