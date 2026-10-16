'use strict';

const DATA_BASE = 'https://raw.githubusercontent.com/jensbaagaard/poker-practice/main/data/openSourcePokerData/';
const STACKS = [100, 40, 20, 10, 5];
const POSITIONS = ['UTG', 'UTG1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
const SOURCE_POS = { UTG: 'EP2', UTG1: 'EP3', LJ: 'LJ', HJ: 'HJ', CO: 'CO', BTN: 'BTN', SB: 'SB', BB: 'BB' };
const POSITION_LABEL = { UTG: 'UTG', UTG1: 'UTG+1', LJ: 'LJ', HJ: 'HJ', CO: 'CO', BTN: 'BTN', SB: 'SB', BB: 'BB' };
const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const COMBO_COUNT = 1326;
const DB_NAME = 'gto-pocket-offline-v1';
const DB_STORE = 'rangeSets';
const SCENARIOS = {
  open: {
    label: '오픈', heroIsOpener: true, needsVillain: false,
    raiseKey: (h) => `Open${h}`, callKey: (h) => `Limp${h}`, previousKey: null,
    description: '내 앞에 레이즈가 없을 때, 해당 포지션의 오픈 / 림프 / 폴드 빈도입니다.'
  },
  'vs-raise': {
    label: '오픈 대응', heroIsOpener: false, needsVillain: true,
    raiseKey: (h, v) => `3Bet${h}vs${v}`, callKey: (h, v) => `Call${h}vs${v}`, previousKey: null,
    description: '상대의 오픈 레이즈를 마주했을 때, 3벳 / 콜 / 폴드 빈도입니다.'
  },
  'vs-3bet': {
    label: '3벳 대응', heroIsOpener: true, needsVillain: true,
    raiseKey: (h, v) => `4Bet${h}vs${v}`, callKey: (h, v) => `Call 3Bet${h}vs${v}`, previousKey: (h, v) => `Open${h}`,
    description: '내가 오픈했고 상대가 3벳했을 때의 4벳 / 콜 / 폴드 빈도입니다.'
  },
  'vs-4bet': {
    label: '4벳 대응', heroIsOpener: false, needsVillain: true,
    raiseKey: (h, v) => `5Bet${h}vs${v}`, callKey: (h, v) => `Call 4Bet${h}vs${v}`, previousKey: (h, v) => `3Bet${h}vs${v}`,
    description: '내가 3벳했고 상대가 4벳했을 때의 5벳 / 콜 / 폴드 빈도입니다.'
  },
  'vs-5bet': {
    label: '5벳 대응', heroIsOpener: true, needsVillain: true,
    raiseKey: null, callKey: (h, v) => `Call 5Bet${h}vs${v}`, previousKey: (h, v) => `4Bet${h}vs${v}`,
    description: '내가 4벳했고 상대가 5벳 올인했을 때의 콜 / 폴드 빈도입니다.'
  },
  multiway: {
    label: '앞선 콜 있음',
    description: '오픈 이후 한 명 이상의 플레이어가 콜한 상황을 구성합니다. 현재 원본 데이터에 이 상황의 멀티웨이 GTO 차트가 없어 빈도를 표시하지 않습니다.'
  }
};

const state = { stack: 100, scenario: 'open', hero: 'BTN', villain: 'BB', data: null, selectedHand: 'AKs', loading: false, multiwayOpener: 'UTG', multiwayHero: 'BTN', multiwayCallers: new Set() };
const els = {
  connectionBadge: document.getElementById('connectionBadge'), dataStatus: document.getElementById('dataStatus'),
  syncButton: document.getElementById('syncButton'), syncProgress: document.getElementById('syncProgress'),
  stackOptions: document.getElementById('stackOptions'), stackHint: document.getElementById('stackHint'),
  scenarioOptions: document.getElementById('scenarioOptions'), heroPositionOptions: document.getElementById('heroPositionOptions'),
  villainField: document.getElementById('villainField'), villainLabel: document.getElementById('villainLabel'), villainSelect: document.getElementById('villainSelect'),
  spotDescription: document.getElementById('spotDescription'), standardControls: document.getElementById('standardControls'), multiwayControls: document.getElementById('multiwayControls'),
  multiwayOpener: document.getElementById('multiwayOpener'), multiwayHeroOptions: document.getElementById('multiwayHeroOptions'), callerOptions: document.getElementById('callerOptions'), multiwaySequence: document.getElementById('multiwaySequence'),
  chartTitle: document.getElementById('chartTitle'), chartSubtitle: document.getElementById('chartSubtitle'),
  availabilityBadge: document.getElementById('availabilityBadge'), chartMessage: document.getElementById('chartMessage'), rangeGrid: document.getElementById('rangeGrid'),
  actionTotals: document.getElementById('actionTotals'), handDetail: document.getElementById('handDetail')
};

function openDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('이 브라우저는 로컬 데이터 저장을 지원하지 않습니다.'));
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('로컬 저장소를 열 수 없습니다.'));
  });
}
async function dbGet(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get(id);
    req.onsuccess = () => { db.close(); resolve(req.result || null); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}
async function dbPut(record) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(DB_STORE, 'readwrite').objectStore(DB_STORE).put(record);
    req.onsuccess = () => { db.close(); resolve(); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}
async function dbList() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).getAllKeys();
    req.onsuccess = () => { db.close(); resolve(req.result || []); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

function dataFile(stack) { return `MTT_${stack}_GTO.json`; }
function dataId(stack) { return `mtt-${stack}-gto`; }
async function fetchSet(stack) {
  const res = await fetch(DATA_BASE + dataFile(stack), { cache: 'no-store' });
  if (!res.ok) throw new Error(`${stack}BB 데이터 다운로드 실패 (${res.status})`);
  const text = await res.text();
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(`${stack}BB 데이터 형식이 올바르지 않습니다.`);
  await dbPut({ id: dataId(stack), stack, text, savedAt: new Date().toISOString(), source: DATA_BASE + dataFile(stack) });
  return parsed;
}
async function loadSet(stack) {
  const saved = await dbGet(dataId(stack));
  if (saved && saved.text) return JSON.parse(saved.text);
  if (!navigator.onLine) throw new Error(`${stack}BB 자료가 기기에 저장되어 있지 않습니다. 인터넷 연결 후 '모든 스택 데이터 저장'을 눌러주세요.`);
  return fetchSet(stack);
}

function sourcePos(position) { return SOURCE_POS[position]; }
function positionLabel(position) { return POSITION_LABEL[position] || position; }
function validHeroes(scenario) {
  const shape = SCENARIOS[scenario];
  return shape.heroIsOpener ? POSITIONS.filter((p) => p !== 'BB') : POSITIONS.slice(1);
}
function validVillains(scenario, hero) {
  const shape = SCENARIOS[scenario];
  if (!shape.needsVillain) return [];
  const idx = POSITIONS.indexOf(hero);
  return shape.heroIsOpener ? POSITIONS.slice(idx + 1) : POSITIONS.slice(0, idx);
}
function updatePositionControls() {
  const isMultiway = state.scenario === 'multiway';
  els.standardControls.classList.toggle('hidden', isMultiway);
  els.multiwayControls.classList.toggle('hidden', !isMultiway);
  if (isMultiway) {
    updateMultiwayControls();
    els.spotDescription.textContent = SCENARIOS.multiway.description;
    document.querySelectorAll('[data-scenario]').forEach((btn) => btn.classList.toggle('active', btn.dataset.scenario === state.scenario));
    return;
  }
  const heroes = validHeroes(state.scenario);
  if (!heroes.includes(state.hero)) state.hero = heroes[0] || 'BTN';
  const shape = SCENARIOS[state.scenario];
  renderPositionButtons(els.heroPositionOptions, heroes, state.hero);
  els.villainField.classList.toggle('hidden', !shape.needsVillain);
  if (shape.needsVillain) {
    const villains = validVillains(state.scenario, state.hero);
    if (!villains.includes(state.villain)) state.villain = shape.heroIsOpener ? (villains[0] || 'BB') : (villains[villains.length - 1] || 'UTG');
    els.villainSelect.innerHTML = villains.map((p) => `<option value="${p}">${positionLabel(p)}</option>`).join('');
    els.villainSelect.value = state.villain;
    els.villainLabel.textContent = shape.heroIsOpener ? '내 오픈에 대응한 상대' : '먼저 레이즈한 상대';
  }
  els.spotDescription.textContent = shape.description;
  document.querySelectorAll('[data-scenario]').forEach((btn) => btn.classList.toggle('active', btn.dataset.scenario === state.scenario));
}
function setStackHint() {
  const text = {
    100: '100BB: 원본 100BB 솔버 레인지.',
    40: '40BB: 원본 40BB 솔버 레인지.',
    20: '20BB: 원본 20BB 솔버 레인지.',
    10: '10BB: 원본 10BB 솔버 레인지. 짧은 스택에서는 올인/폴드와 올인 대응 노드가 많습니다.',
    5: '5BB: 원본 5BB 솔버 레인지. 대부분 푸시/폴드 중심의 매우 짧은 스택 전략입니다.'
  };
  els.stackHint.textContent = text[state.stack];
  document.querySelectorAll('[data-stack]').forEach((btn) => btn.classList.toggle('active', Number(btn.dataset.stack) === state.stack));
}
function renderPositionButtons(container, options, selected) {
  container.innerHTML = options.map((position) =>
    `<button type="button" class="position-button${position === selected ? ' active' : ''}" data-position="${position}" aria-pressed="${position === selected ? 'true' : 'false'}">${positionLabel(position)}</button>`
  ).join('');
}

function updateMultiwayControls() {
  const openerOptions = POSITIONS.filter((p) => p !== 'BB');
  els.multiwayOpener.innerHTML = openerOptions.map((p) => `<option value="${p}">${positionLabel(p)}</option>`).join('');
  els.multiwayOpener.value = state.multiwayOpener;

  const openerIndex = POSITIONS.indexOf(state.multiwayOpener);
  const possibleHeroes = POSITIONS.slice(openerIndex + 1);
  if (!possibleHeroes.includes(state.multiwayHero)) state.multiwayHero = possibleHeroes[possibleHeroes.length - 1] || 'BB';
  renderPositionButtons(els.multiwayHeroOptions, possibleHeroes, state.multiwayHero);

  const heroIndex = POSITIONS.indexOf(state.multiwayHero);
  const possibleCallers = POSITIONS.slice(openerIndex + 1, heroIndex);
  for (const caller of [...state.multiwayCallers]) {
    if (!possibleCallers.includes(caller)) state.multiwayCallers.delete(caller);
  }
  els.callerOptions.innerHTML = possibleCallers.length
    ? possibleCallers.map((p) => `<label class="caller-option"><input type="checkbox" value="${p}" ${state.multiwayCallers.has(p) ? 'checked' : ''}><span>${positionLabel(p)} 콜</span></label>`).join('')
    : '<div class="no-callers">선택한 레이즈 포지션과 내 포지션 사이에 콜할 플레이어가 없습니다.</div>';

  const calls = possibleCallers.filter((p) => state.multiwayCallers.has(p));
  const path = [`<b>${positionLabel(state.multiwayOpener)} 레이즈</b>`, ...calls.map((p) => `<b>${positionLabel(p)} 콜</b>`), `<b>${positionLabel(state.multiwayHero)} 의사결정</b>`];
  els.multiwaySequence.innerHTML = `<span class="sequence-label">설정한 프리플랍 액션</span><div>${path.join(' <span class="sequence-arrow">→</span> ')}</div>`;
}

function renderMultiwayUnavailable() {
  const opener = state.multiwayOpener;
  const hero = state.multiwayHero;
  const openerIndex = POSITIONS.indexOf(opener);
  const heroIndex = POSITIONS.indexOf(hero);
  const callers = POSITIONS.slice(openerIndex + 1, heroIndex).filter((p) => state.multiwayCallers.has(p));
  updateChartHeader();
  els.rangeGrid.innerHTML = '';
  els.rangeGrid.classList.add('hidden');
  els.actionTotals.innerHTML = '';
  els.actionTotals.classList.add('hidden');
  els.chartMessage.classList.remove('hidden');
  els.availabilityBadge.textContent = 'GTO 데이터 없음';
  if (heroIndex <= openerIndex) {
    els.chartMessage.textContent = '내 포지션은 레이즈한 플레이어보다 뒤에 있어야 합니다. 포지션을 다시 선택해 주세요.';
  } else if (callers.length === 0) {
    els.chartMessage.textContent = '내 차례 전에 콜한 플레이어를 한 명 이상 선택해 주세요. 콜이 없다면 일반적인 오픈 대응 메뉴를 사용하세요.';
  } else {
    els.chartMessage.textContent = `${positionLabel(opener)} 레이즈 → ${callers.map(positionLabel).join(' 콜 → ')} 콜 → ${positionLabel(hero)} 차례로 설정되었습니다. 현재 공개 데이터에는 앞선 콜까지 조건으로 포함한 이 멀티웨이 액션 경로의 GTO 빈도가 없어 차트는 표시하지 않습니다. 이 설정은 복기 시 액션 순서를 정리하기 위한 것입니다.`;
  }
  els.handDetail.innerHTML = '<div class="detail-placeholder">멀티웨이 GTO 데이터가 연결되면 여기에서 핸드별 레이즈·콜·폴드 빈도를 확인할 수 있습니다.</div>';
}

function keysForCurrentSpot() {
  const shape = SCENARIOS[state.scenario];
  const h = sourcePos(state.hero);
  const v = sourcePos(state.villain);
  return {
    raise: shape.raiseKey ? shape.raiseKey(h, v) : null,
    call: shape.callKey ? shape.callKey(h, v) : null,
    previous: shape.previousKey ? shape.previousKey(h, v) : null
  };
}
function hasObjectKey(obj, key) { return Boolean(key && Object.prototype.hasOwnProperty.call(obj, key)); }
function conditional(freqs, previous) {
  if (!freqs) return {};
  if (!previous) return freqs;
  const out = {};
  for (const [hand, value] of Object.entries(freqs)) {
    const prev = previous[hand] ?? 0;
    out[hand] = prev > 0 ? Math.min(1, value / prev) : 0;
  }
  return out;
}
function getActionWeights() {
  if (!state.data) return null;
  const keys = keysForCurrentSpot();
  const exists = hasObjectKey(state.data, keys.raise) || hasObjectKey(state.data, keys.call);
  if (!exists) return { unavailable: true, keys };
  const prev = keys.previous ? (state.data[keys.previous] || null) : null;
  const raise = conditional(keys.raise ? state.data[keys.raise] : null, prev);
  const call = conditional(keys.call ? state.data[keys.call] : null, prev);
  const weights = new Map();
  for (const hand of allHands()) {
    const r = clamp(Number(raise[hand.label] || 0));
    const c = Math.min(clamp(Number(call[hand.label] || 0)), 1 - r);
    // Poker Practice MTT JSON stores a single raise frequency, not separate sizes.
    // At 5BB, show the raise category as an all-in/push category; higher stacks stay as raise.
    const allin = state.stack === 5 ? r : 0;
    const regularRaise = state.stack === 5 ? 0 : r;
    weights.set(hand.label, { allin, raise: regularRaise, call: c, fold: Math.max(0, 1 - r - c), combos: hand.combos });
  }
  return { weights, keys };
}
function clamp(value) { return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)); }
function allHands() {
  const hands = [];
  for (let i = 0; i < RANKS.length; i++) {
    for (let j = 0; j < RANKS.length; j++) {
      let label, kind, combos;
      if (i === j) { label = RANKS[i] + RANKS[j]; kind = 'pair'; combos = 6; }
      else if (i < j) { label = RANKS[i] + RANKS[j] + 's'; kind = 'suited'; combos = 4; }
      else { label = RANKS[j] + RANKS[i] + 'o'; kind = 'offsuit'; combos = 12; }
      hands.push({ label, kind, combos });
    }
  }
  return hands;
}
function fmtPct(v) { return `${Math.round(v * 100)}%`; }
function comboShare(weights, action) {
  let total = 0;
  for (const [hand, w] of weights.entries()) total += w[action] * w.combos;
  return total / COMBO_COUNT;
}
function cellGradient(w) {
  const allin = (w.allin * 100).toFixed(2);
  const raiseEnd = ((w.allin + w.raise) * 100).toFixed(2);
  const callEnd = ((w.allin + w.raise + w.call) * 100).toFixed(2);
  return `linear-gradient(90deg, #701820 0 ${allin}%, #e53e43 ${allin}% ${raiseEnd}%, #32a852 ${raiseEnd}% ${callEnd}%, #85ccf5 ${callEnd}% 100%)`;
}
function renderGrid(result) {
  els.rangeGrid.innerHTML = '';
  els.actionTotals.innerHTML = '';
  if (!result || result.unavailable) {
    els.rangeGrid.classList.add('hidden');
    els.actionTotals.classList.add('hidden');
    els.chartMessage.classList.remove('hidden');
    els.chartMessage.textContent = '이 스택/포지션 조합에는 원본 데이터의 해당 차트가 없습니다. 더 깊은 스택에서 해당 노드가 생략된 경우가 있습니다. 다른 포지션이나 스택을 선택해 주세요.';
    els.availabilityBadge.textContent = '차트 없음';
    els.handDetail.innerHTML = '<div class="detail-placeholder">현재 선택한 상황에는 표시할 수 있는 GTO 노드가 없습니다.</div>';
    return;
  }
  els.rangeGrid.classList.remove('hidden');
  els.actionTotals.classList.remove('hidden');
  els.chartMessage.classList.add('hidden');
  els.availabilityBadge.textContent = 'GTO 데이터';
  for (const hand of allHands()) {
    const w = result.weights.get(hand.label) || { allin: 0, raise: 0, call: 0, fold: 1, combos: hand.combos };
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `hand-cell${hand.kind === 'pair' ? ' pair' : ''}${state.selectedHand === hand.label ? ' selected' : ''}`;
    button.textContent = hand.label;
    button.style.background = cellGradient(w);
    button.title = `${hand.label} · 올인 ${fmtPct(w.allin)} / 베팅·레이즈 ${fmtPct(w.raise)} / 콜 ${fmtPct(w.call)} / 폴드 ${fmtPct(w.fold)}`;
    button.setAttribute('aria-label', button.title);
    button.addEventListener('click', () => { state.selectedHand = hand.label; renderGrid(result); renderHandDetail(result.weights); });
    els.rangeGrid.appendChild(button);
  }
  const totals = [
    { key: 'allin', label: '올인' },
    { key: 'raise', label: state.scenario === 'open' ? '오픈 / 레이즈' : '레이즈 계열' },
    { key: 'call', label: state.scenario === 'open' ? '림프 / 콜' : '콜' },
    { key: 'fold', label: '폴드' }
  ];
  for (const item of totals) {
    const card = document.createElement('div');
    card.className = `total-card ${item.key}`;
    const value = comboShare(result.weights, item.key);
    card.innerHTML = `<span>${item.label} · 전체 콤보 기준</span><strong>${fmtPct(value)}</strong>`;
    els.actionTotals.appendChild(card);
  }
  renderHandDetail(result.weights);
}
function renderHandDetail(weights) {
  const w = weights?.get(state.selectedHand);
  if (!w) { els.handDetail.innerHTML = '<div class="detail-placeholder">핸드를 선택하세요.</div>'; return; }
  els.handDetail.innerHTML = `
    <div class="detail-title-row"><div class="detail-hand">${state.selectedHand}</div><div class="detail-combos">${w.combos}개 조합 · 전체 1,326 콤보</div></div>
    <div class="detail-actions">
      <div class="detail-action allin">올인<b>${fmtPct(w.allin)}</b></div>
      <div class="detail-action raise">베팅 / 레이즈<b>${fmtPct(w.raise)}</b></div>
      <div class="detail-action call">콜<b>${fmtPct(w.call)}</b></div>
      <div class="detail-action fold">폴드<b>${fmtPct(w.fold)}</b></div>
    </div>`;
}
function updateChartHeader() {
  const scenario = SCENARIOS[state.scenario];
  if (state.scenario === 'multiway') {
    els.chartTitle.textContent = `${positionLabel(state.multiwayHero)} 멀티웨이 대응`;
    els.chartSubtitle.textContent = `${state.stack}BB · 8인 MTT · 앞선 콜 포함 상황`;
    return;
  }
  els.chartTitle.textContent = state.scenario === 'open'
    ? `${positionLabel(state.hero)} 오픈 레인지`
    : `${positionLabel(state.hero)} · ${positionLabel(state.villain)} ${scenario.label}`;
  els.chartSubtitle.textContent = `${state.stack}BB · 8인 MTT · GTO 혼합 빈도${state.stack === 5 ? ' · 레이즈는 올인으로 표시' : ''}`;
}
async function loadCurrent() {
  if (state.scenario === 'multiway') {
    renderMultiwayUnavailable();
    await refreshDataStatus();
    return;
  }
  state.loading = true;
  updateChartHeader();
  els.availabilityBadge.textContent = '불러오는 중';
  els.rangeGrid.classList.remove('hidden');
  els.chartMessage.classList.add('hidden');
  try {
    state.data = await loadSet(state.stack);
    const result = getActionWeights();
    renderGrid(result);
    await refreshDataStatus();
  } catch (err) {
    state.data = null;
    els.rangeGrid.classList.add('hidden');
    els.actionTotals.classList.add('hidden');
    els.chartMessage.classList.remove('hidden');
    els.chartMessage.textContent = err.message || '데이터를 불러오지 못했습니다.';
    els.availabilityBadge.textContent = '데이터 없음';
    els.handDetail.innerHTML = '<div class="detail-placeholder">데이터를 저장한 다음 다시 시도해 주세요.</div>';
  } finally { state.loading = false; }
}
async function refreshDataStatus() {
  try {
    const keys = await dbList();
    const saved = STACKS.filter((stack) => keys.includes(dataId(stack))).length;
    els.dataStatus.textContent = saved === STACKS.length ? `스택 데이터 ${saved}/${STACKS.length}개 저장됨 · 오프라인 조회 준비 완료` : `스택 데이터 ${saved}/${STACKS.length}개 저장됨 · 모든 스택을 저장하면 오프라인 조회가 가능합니다.`;
    els.sourceStatus = saved;
  } catch {
    els.dataStatus.textContent = '기기 저장 상태를 확인할 수 없습니다.';
  }
}
async function syncAllData() {
  if (state.loading || els.syncButton.disabled) return;
  if (!navigator.onLine) {
    els.syncProgress.textContent = '현재 오프라인입니다. 처음 데이터 저장은 인터넷 연결이 필요합니다.';
    return;
  }
  els.syncButton.disabled = true;
  els.syncButton.textContent = '데이터 저장 중…';
  els.syncProgress.textContent = '원본 GTO 데이터 5개 스택을 가져오는 중입니다.';
  let done = 0;
  try {
    for (const stack of STACKS) {
      await fetchSet(stack);
      done++;
      els.syncProgress.textContent = `${done}/${STACKS.length}개 스택 저장 완료 · ${stack}BB`;
    }
    els.syncProgress.textContent = '완료! 이제 비행기 모드에서 앱을 열어 조회할 수 있습니다.';
    await refreshDataStatus();
    await loadCurrent();
  } catch (err) {
    els.syncProgress.textContent = `저장 실패: ${err.message}. 인터넷 연결 후 다시 시도해 주세요.`;
  } finally {
    els.syncButton.disabled = false;
    els.syncButton.textContent = '모든 스택 데이터 저장';
  }
}
function updateConnectionStatus() {
  const online = navigator.onLine;
  els.connectionBadge.textContent = online ? '온라인' : '오프라인';
  els.connectionBadge.style.color = online ? '#8be4bb' : '#f1cb7a';
  els.connectionBadge.style.borderColor = online ? '#326d58' : '#68552f';
}

els.stackOptions.addEventListener('click', (event) => {
  const button = event.target.closest('[data-stack]');
  if (!button) return;
  state.stack = Number(button.dataset.stack);
  setStackHint();
  loadCurrent();
});
els.scenarioOptions.addEventListener('click', (event) => {
  const button = event.target.closest('[data-scenario]');
  if (!button) return;
  state.scenario = button.dataset.scenario;
  updatePositionControls();
  updateChartHeader();
  if (state.scenario === 'multiway') renderMultiwayUnavailable();
  else if (state.data) renderGrid(getActionWeights()); else loadCurrent();
});
els.heroPositionOptions.addEventListener('click', (event) => {
  const button = event.target.closest('[data-position]');
  if (!button) return;
  state.hero = button.dataset.position;
  updatePositionControls();
  updateChartHeader();
  if (state.data) renderGrid(getActionWeights()); else loadCurrent();
});
els.villainSelect.addEventListener('change', () => {
  state.villain = els.villainSelect.value;
  updateChartHeader();
  if (state.data) renderGrid(getActionWeights()); else loadCurrent();
});
els.multiwayOpener.addEventListener('change', () => {
  state.multiwayOpener = els.multiwayOpener.value;
  updateMultiwayControls();
  renderMultiwayUnavailable();
});
els.multiwayHeroOptions.addEventListener('click', (event) => {
  const button = event.target.closest('[data-position]');
  if (!button) return;
  state.multiwayHero = button.dataset.position;
  updateMultiwayControls();
  renderMultiwayUnavailable();
});
els.callerOptions.addEventListener('change', (event) => {
  const input = event.target.closest('input[type="checkbox"]');
  if (!input) return;
  if (input.checked) state.multiwayCallers.add(input.value);
  else state.multiwayCallers.delete(input.value);
  updateMultiwayControls();
  renderMultiwayUnavailable();
});
els.syncButton.addEventListener('click', syncAllData);
window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);

async function init() {
  updateConnectionStatus();
  updatePositionControls();
  setStackHint();
  await refreshDataStatus();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
  await loadCurrent();
}
init();
