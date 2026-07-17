// 端末内ランキング（localStorage）
// Supabaseなどへ移行する場合は、このファイルの保存・取得処理を置き換える。
(function () {
  'use strict';

  const STORAGE_KEY = 'dinosaurShootingRankingV1';
  const MAX_RANKING = 10;
  let pendingScore = 0;
  let pendingResult = 'gameover';
  let submittedThisResult = false;

  function loadRanking() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch (error) {
      console.error('ランキングの読み込みに失敗しました', error);
      return [];
    }
  }

  function saveRanking(ranking) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ranking));
  }

  function escapeName(name) {
    return String(name || '').trim().replace(/\s+/g, ' ').slice(0, 10);
  }

  function addScore(playerName, score, resultType) {
    const ranking = loadRanking();
    ranking.push({
      name: escapeName(playerName),
      score: Math.max(0, Math.floor(Number(score) || 0)),
      result: resultType === 'clear' ? 'clear' : 'gameover',
      createdAt: new Date().toISOString()
    });

    ranking.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    const top = ranking.slice(0, MAX_RANKING);
    saveRanking(top);
    return top;
  }

  function renderRanking(ranking) {
    const list = document.getElementById('ranking-list');
    if (!list) return;
    list.textContent = '';

    if (!ranking.length) {
      const empty = document.createElement('li');
      empty.textContent = 'まだ記録がありません';
      list.appendChild(empty);
      return;
    }

    ranking.forEach(function (record, index) {
      const item = document.createElement('li');
      const resultLabel = record.result === 'clear' ? 'CLEAR' : 'OVER';
      item.textContent = (index + 1) + '位  ' + record.name + '  ' + record.score + '点  [' + resultLabel + ']';
      list.appendChild(item);
    });
  }

  window.showRankingScreen = function (finalScore, resultType) {
    pendingScore = Math.max(0, Math.floor(Number(finalScore) || 0));
    pendingResult = resultType === 'clear' ? 'clear' : 'gameover';
    submittedThisResult = false;

    const modal = document.getElementById('ranking-modal');
    const title = document.getElementById('ranking-result-title');
    const score = document.getElementById('ranking-final-score');
    const input = document.getElementById('ranking-player-name');
    const submit = document.getElementById('ranking-submit-button');

    if (title) title.textContent = pendingResult === 'clear' ? 'GAME CLEAR！' : 'GAME OVER';
    if (score) score.textContent = pendingScore;
    if (input) {
      input.value = localStorage.getItem('dinosaurShootingPlayerName') || '';
      input.disabled = false;
    }
    if (submit) {
      submit.disabled = false;
      submit.textContent = 'ランキングに登録';
    }

    renderRanking(loadRanking());
    if (modal) modal.hidden = false;
  };

  window.hideRankingScreen = function () {
    const modal = document.getElementById('ranking-modal');
    if (modal) modal.hidden = true;
  };

  document.addEventListener('DOMContentLoaded', function () {
    const modal = document.getElementById('ranking-modal');
    const input = document.getElementById('ranking-player-name');
    const submit = document.getElementById('ranking-submit-button');
    const retry = document.getElementById('ranking-retry-button');

    if (modal) {
      ['touchstart', 'touchmove', 'touchend', 'pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click'].forEach(function (type) {
        modal.addEventListener(type, function (event) {
          event.stopPropagation();
        }, { passive: false });
      });
    }

    if (submit) {
      submit.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (submittedThisResult) return;

        const name = escapeName(input ? input.value : '');
        if (!name) {
          alert('名前を入力してください');
          if (input) input.focus();
          return;
        }

        submittedThisResult = true;
        localStorage.setItem('dinosaurShootingPlayerName', name);
        const ranking = addScore(name, pendingScore, pendingResult);
        renderRanking(ranking);

        if (input) input.disabled = true;
        submit.disabled = true;
        submit.textContent = '登録しました';
      });
    }

    if (retry) {
      retry.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        window.hideRankingScreen();
        if (typeof resetGame === 'function') resetGame();
      });
    }
  });
})();
