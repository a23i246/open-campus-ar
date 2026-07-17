// Supabase共有ランキング
(function () {
  'use strict';

  const SUPABASE_URL = 'https://qqwdgsanojynhimodgyz.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_CelLctJ06zPQOJp3nzIzgA_lS5n8ZSy';
  const MAX_RANKING = 10;

  let supabaseClient = null;
  let pendingScore = 0;
  let pendingResult = 'gameover';
  let submittedThisResult = false;

  function getClient() {
    if (supabaseClient) return supabaseClient;
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      throw new Error('Supabaseライブラリを読み込めませんでした');
    }
    supabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY
    );
    return supabaseClient;
  }

  function normalizeName(name) {
    return String(name || '').trim().replace(/\s+/g, ' ').slice(0, 10);
  }

  function normalizeScore(score) {
    return Math.max(0, Math.floor(Number(score) || 0));
  }

  function setStatus(message, isError) {
    const status = document.getElementById('ranking-status');
    if (!status) return;
    status.textContent = message || '';
    status.classList.toggle('is-error', Boolean(isError));
  }

  async function loadRanking() {
    const client = getClient();
    const response = await client
      .from('shooting_scores')
      .select('player_name, score, created_at')
      .order('score', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(MAX_RANKING);

    if (response.error) throw response.error;
    return response.data || [];
  }

  async function addScore(playerName, score) {
    const client = getClient();
    const response = await client
      .from('shooting_scores')
      .insert({
        player_name: normalizeName(playerName),
        score: normalizeScore(score)
      });

    if (response.error) throw response.error;
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
      item.textContent =
        (index + 1) + '位  ' +
        normalizeName(record.player_name) + '  ' +
        normalizeScore(record.score) + '点';
      list.appendChild(item);
    });
  }

  async function refreshRanking() {
    const list = document.getElementById('ranking-list');
    if (list) {
      list.textContent = '';
      const loading = document.createElement('li');
      loading.textContent = 'ランキングを読み込み中...';
      list.appendChild(loading);
    }

    try {
      const ranking = await loadRanking();
      renderRanking(ranking);
      setStatus('');
    } catch (error) {
      console.error('ランキングの取得に失敗しました', error);
      renderRanking([]);
      setStatus('ランキングの読み込みに失敗しました。通信状態とSupabaseの設定を確認してください。', true);
    }
  }

  window.showRankingScreen = function (finalScore, resultType) {
    pendingScore = normalizeScore(finalScore);
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

    setStatus('');
    if (modal) modal.hidden = false;
    refreshRanking();
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
      submit.addEventListener('click', async function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (submittedThisResult) return;

        const name = normalizeName(input ? input.value : '');
        if (!name) {
          alert('名前を入力してください');
          if (input) input.focus();
          return;
        }

        submit.disabled = true;
        submit.textContent = '登録中...';
        setStatus('スコアを登録しています...');

        try {
          await addScore(name, pendingScore);
          submittedThisResult = true;
          localStorage.setItem('dinosaurShootingPlayerName', name);

          if (input) input.disabled = true;
          submit.textContent = '登録しました';
          setStatus('共有ランキングに登録しました。');
          await refreshRanking();
        } catch (error) {
          console.error('ランキング登録に失敗しました', error);
          submit.disabled = false;
          submit.textContent = 'ランキングに登録';
          setStatus('登録に失敗しました。INSERTポリシーと通信状態を確認してください。', true);
        }
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
