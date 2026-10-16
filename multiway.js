'use strict';
const historyUI={entries:[],hero:'BB',actor:null,request:0,manifest:null,manifestPromise:null,manifests:{},manifestPromises:{}};
const historyEl=id=>document.getElementById(id);
function historyButton(text,fn){const b=document.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',fn);return b;}
function historyAnte(){return [20,40].includes(state.stack)?1:0;}
function historyDataBase(stack){return stack===40?'data/40bb':'data';}
function historyState(){return PocketHistory.replay(state.stack,historyUI.entries,historyAnte());}
function resetHistoryForStack(){historyUI.entries=[];historyUI.actor=null;historyUI.manifest=historyUI.manifests[state.stack]||null;historyEl('historyError').textContent='';if(state.scenario==='multiway')updateMultiwayControls();}
window.resetHistoryForStack=resetHistoryForStack;
function actorState(player){return PocketHistory.advance(historyState(),player);}
function currentNode(s,actor){const m=historyUI.manifest;if(!m||m.solve.stack_bb!==state.stack)return null;const player=m.positions.position_to_player[actor],history=s.history.map(h=>h.token).join('.');return m.nodes.find(n=>n.player===player&&n.history===history)||null;}
function updateMultiwayControls(){
 renderPositionButtons(els.multiwayHeroOptions,POSITIONS,historyUI.hero);
 const s=historyState();let projected=null;try{projected=PocketHistory.decision(state.stack,historyUI.entries,historyUI.hero,historyAnte());}catch{}
 const sequence=historyEl('multiwaySequence');sequence.replaceChildren();
 s.history.filter(h=>!h.implicit).forEach(h=>sequence.append(historyButton(`${positionLabel(h.player)} ${h.text}`,()=>{const entry=historyUI.entries[h.entryIndex];historyUI.entries=historyUI.entries.slice(0,h.entryIndex);historyUI.actor=entry.player;updateMultiwayControls();renderMultiwayUnavailable();})));
 const decision=document.createElement('span');decision.className='decision-chip';decision.textContent=`→ ${positionLabel(historyUI.hero)} 결정`;sequence.append(decision);
 historyEl('fullHistory').replaceChildren();(projected||s).history.forEach(h=>{const row=document.createElement('div');row.textContent=`${positionLabel(h.player)} ${h.text}${h.implicit?' · 생략된 차례':''}`;historyEl('fullHistory').append(row);});
 historyEl('undoAction').disabled=!historyUI.entries.length;historyEl('resetActions').disabled=!historyUI.entries.length;
 const viable=POSITIONS.filter(player=>{try{return actorState(player).pending[0]===POSITIONS.indexOf(player);}catch{return false;}});
 const grid=historyEl('historyPlayers');grid.replaceChildren();for(const player of POSITIONS.filter(p=>p!==historyUI.hero)){
  const b=historyButton(positionLabel(player),()=>{historyUI.actor=player;updateMultiwayControls();historyEl('actionEditor').scrollIntoView({block:'nearest',behavior:'smooth'});});b.dataset.actor=player;b.disabled=!viable.includes(player);b.className='position-button'+(historyUI.actor===player?' active':'');b.setAttribute('aria-pressed',String(historyUI.actor===player));const last=[...s.history].reverse().find(h=>h.player===player);if(last){const status=document.createElement('small');status.textContent=last.text;b.append(status);}grid.append(b);
 }
 const own=historyEl('ownAction');own.disabled=!viable.includes(historyUI.hero);
 if(!viable.includes(historyUI.actor))historyUI.actor=null;
 historyEl('actionEditor').classList.toggle('hidden',!historyUI.actor);renderActionChoices();
 if([20,40].includes(state.stack)&&!historyUI.manifest)historyManifest().then(m=>{if(state.scenario==='multiway'&&m.solve.stack_bb===state.stack)renderActionChoices();}).catch(()=>{});
}
function renderActionChoices(){
 const box=historyEl('historyActions');box.replaceChildren();if(!historyUI.actor)return;const s=actorState(historyUI.actor),p=s.pending[0],cap=s.caps[p],canRaise=PocketHistory.canRaise(s,p);
 historyEl('actingPosition').textContent=positionLabel(historyUI.actor)+'의 행동';
 const node=currentNode(s,historyUI.actor),size=historyEl('historySize'),sizes=node?node.actions.filter(a=>a.startsWith('raise_')).map(a=>Number(a.match(/\d+/)[0])/100):[];
 historyEl('historySizeField').classList.toggle('hidden',!canRaise);size.min=Math.min(cap,s.bet+s.minRaise);size.max=cap;size.value=sizes[0]||Math.min(cap,Math.max(s.bet+s.minRaise,s.raises?s.bet*3:2.5));
 box.append(historyButton('폴드',()=>appendHistory('fold')));box.append(historyButton(s.bet>s.paid[p]?(s.bet>=cap?'콜 (올인)':'콜'):'체크',()=>appendHistory('call')));
 if(canRaise){box.append(historyButton(s.raises?`${s.raises+2}벳`:'오픈',()=>appendHistory('raise')));box.append(historyButton('올인',()=>appendHistory('allin')));}
}
function appendHistory(kind){
 try{const entry={player:historyUI.actor,kind,target:Number(historyEl('historySize').value)};PocketHistory.replay(state.stack,[...historyUI.entries,entry],historyAnte());historyUI.entries.push(entry);historyUI.actor=null;historyEl('historyError').textContent='';updateMultiwayControls();renderMultiwayUnavailable();}catch(e){historyEl('historyError').textContent=e.message;}
}
function clearHistoryChart(badge,message){
 els.rangeGrid.replaceChildren();els.rangeGrid.classList.add('hidden');els.actionTotals.replaceChildren();els.actionTotals.classList.add('hidden');els.handDetail.replaceChildren();els.handDetail.classList.add('hidden');els.availabilityBadge.textContent=badge;els.chartMessage.classList.remove('hidden');els.chartMessage.textContent=message;
}
async function historyManifest(stack=state.stack){
 if(historyUI.manifests[stack])return historyUI.manifests[stack];
 if(!historyUI.manifestPromises[stack])historyUI.manifestPromises[stack]=(async()=>{const response=await fetch(`./${historyDataBase(stack)}/manifest.json`);if(!response.ok)throw Error('로컬 데이터 목록을 읽지 못했습니다.');const m=await response.json();if(m.schema!=='gto_pocket_preflop_v1'||m.solve.stack_bb!==stack)throw Error('데이터의 스택·형식을 확인하세요.');historyUI.manifests[stack]=m;if(state.stack===stack)historyUI.manifest=m;return m;})().catch(e=>{delete historyUI.manifestPromises[stack];throw e;});
 return historyUI.manifestPromises[stack];
}
async function renderMultiwayUnavailable(){
 const request=++historyUI.request;document.querySelector('.legend-note').classList.add('hidden');els.chartTitle.textContent=`${positionLabel(historyUI.hero)} · 앞선 액션 대응`;els.chartSubtitle.textContent=`${state.stack}BB · 8인 MTT · 전체 액션 이력 기준`;
 clearHistoryChart('상황 설정','앞선 플레이어의 액션을 추가하세요.');
 if(!historyUI.entries.length)return;
 let decision;try{decision=PocketHistory.decision(state.stack,historyUI.entries,historyUI.hero,historyAnte());}catch{clearHistoryChart('상황 확인','선택한 내 포지션의 결정 차례가 아닙니다. 상대 액션을 더 추가하거나 내 포지션을 변경하세요.');return;}
 if(![20,40].includes(state.stack)){clearHistoryChart('데이터 없음','이 스택의 전체 액션 이력에 대응하는 데이터가 없습니다. 기존 오픈·3벳 대응 차트는 해당 상황 메뉴에서 조회할 수 있습니다.');return;}
 clearHistoryChart('확인 중',`${state.stack}BB 액션 이력 데이터를 확인하는 중입니다.`);
 try{
  const m=await historyManifest();if(request!==historyUI.request||state.scenario!=='multiway')return;
  if(m.mapping.status!=='structurally_validated_inference'||m.mapping.combos_checked!==1326||m.positions.status!=='all_exported_histories_validated'||m.positions.evidence.actor_pot_to_call_matches!==m.nodes.length)throw Error('매핑 검증 보고서를 확인해야 합니다.');
  if(m.solve.stack_bb!==state.stack||m.solve.players!==8||m.solve.bb_ante_bb!==1||m.solve.uniform_stack_convention!=='bb_ante_deducted_from_stack')throw Error('데이터의 스택·앤티 조건을 확인해야 합니다.');
  const history=decision.history.map(h=>h.token).join('.'),player=m.positions.position_to_player[historyUI.hero];const matches=m.nodes.filter(n=>n.history===history&&n.player===player);
  if(matches.length!==1){clearHistoryChart('데이터 없음',matches.length?'같은 이력에 여러 노드가 있어 상황을 확정할 수 없습니다.':'이 액션 이력·사이즈에 정확히 일치하는 데이터가 없습니다.');return;}
  const summary=matches[0],response=await fetch(`./${historyDataBase(m.solve.stack_bb)}/${summary.node_id}.json`);if(!response.ok)throw Error('선택한 노드 자료를 읽지 못했습니다.');const bytes=await response.arrayBuffer(),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');if(hash!==summary.sha256)throw Error('데이터 해시가 일치하지 않습니다.');const node=JSON.parse(new TextDecoder().decode(bytes));if(request!==historyUI.request||state.scenario!=='multiway')return;
  const pot=decision.paid.reduce((a,b)=>a+b,0)+(m.solve.bb_ante_bb||0);if(Math.abs(node.pot_bb-pot)>1e-6||Math.abs(node.to_call_bb-(decision.bet-decision.paid[POSITIONS.indexOf(historyUI.hero)]))>1e-6)throw Error('노드의 팟·콜 금액이 입력 이력과 다릅니다.');
  renderHistoryGrid(node,m);
 }catch(e){if(request===historyUI.request&&state.scenario==='multiway')clearHistoryChart('데이터 없음',e.message);}
}
function renderHistoryGrid(node,manifest){
 const hands=new Map();for(const h of node.hands){if(hands.has(h.hand)||manifest.mapping.bucket_to_hand[String(h.bucket)]!==h.hand||h.strategy.length!==node.actions.length||h.strategy.some(p=>!Number.isFinite(p)||p<0||p>1)||Math.abs(h.strategy.reduce((a,b)=>a+b,0)-1)>1e-6)throw Error('전략 데이터 검증에 실패했습니다.');hands.set(h.hand,h);}
 const detail=hand=>{const h=hands.get(hand);els.handDetail.replaceChildren();const title=document.createElement('strong');title.textContent=hand;els.handDetail.append(title);if(!h){els.handDetail.append(' · 저장 자료 없음');return;}node.actions.forEach((a,i)=>{const row=document.createElement('div');row.textContent=`${a==='fold'?'폴드':a==='call'?'콜':a==='check'?'체크':a==='allin'?'올인':'레이즈 '+Number(a.match(/\d+/)[0])/100+'BB'}: ${(h.strategy[i]*100).toFixed(2)}%${h.action_ev_bb?' · EV '+h.action_ev_bb[i].toFixed(3)+'BB':''}`;els.handDetail.append(row);});};
 els.handDetail.classList.remove('hidden');els.rangeGrid.replaceChildren();els.rangeGrid.classList.remove('hidden');els.chartMessage.classList.add('hidden');els.availabilityBadge.textContent=`${manifest.solve.stack_bb}BB · 추론 매핑`;els.chartSubtitle.textContent=`${manifest.solve.stack_bb}BB · BB 앤티 1BB${manifest.solve.preflop_call_policy==='bb_only'?' · 추가 콜러 BB only':''} · ${node.hands.length}/169핸드 · 실험 데이터`;els.chartMessage.classList.remove('hidden');els.chartMessage.textContent='핸드 매핑은 캐시 구조로 추론했습니다. 솔버 소스 대조·수렴 검증 전 데이터입니다.';
 for(const hand of allHands()){const h=hands.get(hand.label),b=historyButton(hand.label,()=>detail(hand.label));b.className='hand-cell';b.setAttribute('aria-label',hand.label+(h?' 액션 빈도':' 저장 자료 없음'));if(h){const w={allin:0,raise:0,call:0,fold:0};node.actions.forEach((a,i)=>w[a==='allin'?'allin':a==='fold'?'fold':a==='call'||a==='check'?'call':'raise']+=h.strategy[i]);b.style.background=cellGradient(w);}else b.style.background='var(--gray)';els.rangeGrid.append(b);}detail(state.selectedHand);
}

els.multiwayHeroOptions.addEventListener('click',e=>{const b=e.target.closest('[data-position]');if(!b)return;historyUI.hero=b.dataset.position;historyUI.actor=null;updateMultiwayControls();renderMultiwayUnavailable();});
historyEl('ownAction').onclick=()=>{historyUI.actor=historyUI.hero;updateMultiwayControls();};
historyEl('undoAction').onclick=()=>{historyUI.entries.pop();historyUI.actor=null;historyEl('historyError').textContent='';updateMultiwayControls();renderMultiwayUnavailable();};
historyEl('resetActions').onclick=()=>{historyUI.entries=[];historyUI.actor=null;historyEl('historyError').textContent='';updateMultiwayControls();renderMultiwayUnavailable();};

// Independent of the public range source: persist the complete local export.
for(const stack of [20,40])historyEl(`saveLocal${stack}`).onclick=async()=>{
 const button=historyEl(`saveLocal${stack}`),status=historyEl(`saveLocal${stack}Status`);button.disabled=true;
 try{
  if(!navigator.serviceWorker.controller)throw Error('앱 준비 후 다시 눌러주세요.');
  const m=await historyManifest(stack),cache=await caches.open('gto-pocket-local-strategies-v1');let next=0,done=0,failed=false;
  async function worker(){while(next<m.nodes.length&&!failed){const n=m.nodes[next++],url=new URL(`${historyDataBase(stack)}/${n.node_id}.json`,location.href).href;try{let response=await cache.match(url);if(!response){response=await fetch(url);if(!response.ok)throw Error('데이터 다운로드 실패');}const buffer=await response.clone().arrayBuffer(),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))].map(v=>v.toString(16).padStart(2,'0')).join('');if(hash!==n.sha256)throw Error('데이터 검증 실패');await cache.put(url,response);done++;status.textContent=`${stack}BB 저장 ${done.toLocaleString()}/${m.nodes.length.toLocaleString()}`;}catch(e){failed=true;throw e;}}}
  const results=await Promise.allSettled(Array.from({length:4},worker));const failure=results.find(r=>r.status==='rejected');if(failure)throw failure.reason;
  await cache.put(new URL(`${historyDataBase(stack)}/manifest.json`,location.href).href,new Response(JSON.stringify(m),{headers:{'Content-Type':'application/json'}}));status.textContent=`${stack}BB 멀티액션 전체 저장 완료 · 오프라인 조회 가능`;
 }catch(e){status.textContent=`저장 미완료: ${e.message}. 연결과 저장 공간을 확인한 뒤 다시 눌러주세요.`;}finally{button.disabled=false;}
};
