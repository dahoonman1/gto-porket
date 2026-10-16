'use strict';
const historyUI={entries:[],stack:state.stack,hero:'BB',open:false,request:0,manifest:null};
const historyEl=id=>document.getElementById(id);
function historyButton(text,fn){const b=document.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',fn);return b;}
function historyState(){return PocketHistory.replay(state.stack,historyUI.entries);}
function resetHistoryForStack(){historyUI.entries=[];historyUI.stack=state.stack;historyUI.open=false;historyEl('historyError').textContent='';if(state.scenario==='multiway')updateMultiwayControls();}
window.resetHistoryForStack=resetHistoryForStack;
function updateMultiwayControls(){
 renderPositionButtons(els.multiwayHeroOptions,POSITIONS,historyUI.hero);
 const s=historyState();let projected=null;try{projected=PocketHistory.decision(state.stack,historyUI.entries,historyUI.hero);}catch{}
 const sequence=historyEl('multiwaySequence');sequence.replaceChildren();
 s.history.filter(h=>!h.implicit).forEach(h=>sequence.append(historyButton(`${positionLabel(h.player)} ${h.text}`,()=>{const entry=historyUI.entries[h.entryIndex];historyUI.entries=historyUI.entries.slice(0,h.entryIndex);historyUI.open=true;updateMultiwayControls();historyEl('historyPlayer').value=entry.player;renderActionChoices();renderMultiwayUnavailable();})));
 const decision=document.createElement('span');decision.className='decision-chip';decision.textContent=`→ ${positionLabel(historyUI.hero)} 決定`.replace('決定','결정');sequence.append(decision);
 if(!historyUI.entries.length){const tip=document.createElement('p');tip.className='field-help';tip.textContent='＋ 액션 추가로 오픈한 자리부터 지정하세요.';sequence.prepend(tip);}
 historyEl('fullHistory').replaceChildren();(projected||s).history.forEach(h=>{const row=document.createElement('div');row.textContent=`${positionLabel(h.player)} ${h.text}${h.implicit?' · 생략된 차례':''}`;historyEl('fullHistory').append(row);});
 historyEl('undoAction').disabled=!historyUI.entries.length;historyEl('resetActions').disabled=!historyUI.entries.length;historyEl('addAction').disabled=!s.pending.length;
 historyEl('actionEditor').classList.toggle('hidden',!historyUI.open);
 const viable=s.pending.filter(p=>{try{const next=PocketHistory.advance(PocketHistory.copy(s),POSITIONS[p]);return next.pending[0]===p;}catch{return false;}});
 const player=historyEl('historyPlayer'),old=player.value;player.replaceChildren();for(const p of viable){const option=document.createElement('option');option.value=POSITIONS[p];option.textContent=positionLabel(POSITIONS[p]);player.append(option);}if(viable.some(i=>POSITIONS[i]===old))player.value=old;
 renderActionChoices();
}
function renderActionChoices(){
 const box=historyEl('historyActions');box.replaceChildren();const s=historyState(),player=historyEl('historyPlayer').value;if(!player)return;
 PocketHistory.advance(s,player);const p=s.pending[0],canRaise=PocketHistory.canRaise(s,p);
 historyEl('historySizeField').classList.toggle('hidden',!canRaise);
 const size=historyEl('historySize');size.min=Math.min(state.stack,s.bet+s.minRaise);size.max=state.stack;size.value=Math.min(state.stack,Math.max(s.bet+s.minRaise,s.raises?s.bet*3:2.5));
 box.append(historyButton('폴드',()=>appendHistory('fold')));
 box.append(historyButton(s.bet>s.paid[p]?(s.bet>=state.stack?'콜 (올인)':'콜'):'체크',()=>appendHistory('call')));
 if(canRaise){box.append(historyButton(s.raises?`${s.raises+2}벳`:'오픈',()=>appendHistory('raise')));box.append(historyButton('올인',()=>appendHistory('allin')));}
}
function appendHistory(kind){
 try{const entry={player:historyEl('historyPlayer').value,kind,target:Number(historyEl('historySize').value)};PocketHistory.replay(state.stack,[...historyUI.entries,entry]);historyUI.entries.push(entry);historyUI.open=false;historyEl('historyError').textContent='';updateMultiwayControls();renderMultiwayUnavailable();}catch(e){historyEl('historyError').textContent=e.message;}
}
function clearHistoryChart(badge,message){
 els.rangeGrid.replaceChildren();els.rangeGrid.classList.add('hidden');els.actionTotals.replaceChildren();els.actionTotals.classList.add('hidden');els.handDetail.replaceChildren();els.handDetail.classList.add('hidden');els.availabilityBadge.textContent=badge;els.chartMessage.classList.remove('hidden');els.chartMessage.textContent=message;
}
async function historyManifest(){
 if(historyUI.manifest)return historyUI.manifest;const response=await fetch('./data/manifest.json');if(!response.ok)throw Error('로컬 데이터 목록을 읽지 못했습니다.');const m=await response.json();if(m.schema!=='gto_pocket_preflop_v1')throw Error('지원하지 않는 데이터 형식입니다.');historyUI.manifest=m;return m;
}
async function renderMultiwayUnavailable(){
 const request=++historyUI.request;document.querySelector('.legend-note').classList.add('hidden');els.chartTitle.textContent=`${positionLabel(historyUI.hero)} · 앞선 액션 대응`;els.chartSubtitle.textContent=`${state.stack}BB · 8인 MTT · 전체 액션 이력 기준`;
 clearHistoryChart('상황 설정','앞선 플레이어의 액션을 추가하세요.');
 if(!historyUI.entries.length)return;
 let decision;try{decision=PocketHistory.decision(state.stack,historyUI.entries,historyUI.hero);}catch{clearHistoryChart('상황 확인','선택한 내 포지션의 결정 차례가 아닙니다. 상대 액션을 더 추가하거나 내 포지션을 변경하세요.');return;}
 if(state.stack!==20){clearHistoryChart('데이터 없음','이 스택의 전체 액션 이력에 대응하는 데이터가 없습니다. 기존 오픈·3벳 대응 차트는 해당 상황 메뉴에서 조회할 수 있습니다.');return;}
 clearHistoryChart('확인 중','20BB 액션 이력 데이터를 확인하는 중입니다.');
 try{
  const m=await historyManifest();if(request!==historyUI.request||state.scenario!=='multiway')return;
  // Fail closed: current export has inferred hand labels and unidentified seat names.
  if(m.mapping.status!=='verified'||m.positions.status!=='verified'||!m.positions.position_to_player){clearHistoryChart('매핑 검증 필요',`20BB 복원 데이터 ${m.nodes.length.toLocaleString()}개 노드가 있지만 핸드·포지션 매핑이 검증되지 않아 이 상황의 확정 GTO 레인지를 표시하지 않습니다. 입력한 이력은 그대로 유지됩니다.`);return;}
  // Do not combine different game contracts, including ante / stack accounting.
  if(m.solve.stack_bb!==20||m.solve.players!==8||m.solve.uniform_stack_convention!=='street_stack_excludes_ante')throw Error('데이터의 스택·앤티 조건을 확인해야 합니다.');
  const history=decision.history.map(h=>h.token).join('.'),player=m.positions.position_to_player[historyUI.hero];const matches=m.nodes.filter(n=>n.history===history&&n.player===player);
  if(matches.length!==1){clearHistoryChart('데이터 없음',matches.length?'같은 이력에 여러 노드가 있어 상황을 확정할 수 없습니다.':'이 액션 이력·사이즈에 정확히 일치하는 데이터가 없습니다.');return;}
  const summary=matches[0],response=await fetch(`./data/${summary.node_id}.json`);if(!response.ok)throw Error('선택한 노드 자료를 읽지 못했습니다.');const bytes=await response.arrayBuffer(),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');if(hash!==summary.sha256)throw Error('데이터 해시가 일치하지 않습니다.');const node=JSON.parse(new TextDecoder().decode(bytes));if(request!==historyUI.request||state.scenario!=='multiway')return;
  const pot=decision.paid.reduce((a,b)=>a+b,0)+(m.solve.bb_ante_bb||0);if(Math.abs(node.pot_bb-pot)>1e-6||Math.abs(node.to_call_bb-(decision.bet-decision.paid[POSITIONS.indexOf(historyUI.hero)]))>1e-6)throw Error('노드의 팟·콜 금액이 입력 이력과 다릅니다.');
  renderHistoryGrid(node,m);
 }catch(e){if(request===historyUI.request&&state.scenario==='multiway')clearHistoryChart('데이터 없음',e.message);}
}
function renderHistoryGrid(node,manifest){
 const hands=new Map();for(const h of node.hands){if(hands.has(h.hand)||manifest.mapping.bucket_to_hand[String(h.bucket)]!==h.hand||h.strategy.length!==node.actions.length||h.strategy.some(p=>!Number.isFinite(p)||p<0||p>1)||Math.abs(h.strategy.reduce((a,b)=>a+b,0)-1)>1e-6)throw Error('전략 데이터 검증에 실패했습니다.');hands.set(h.hand,h);}
 const detail=hand=>{const h=hands.get(hand);els.handDetail.replaceChildren();const title=document.createElement('strong');title.textContent=hand;els.handDetail.append(title);if(!h){els.handDetail.append(' · 저장 자료 없음');return;}node.actions.forEach((a,i)=>{const row=document.createElement('div');row.textContent=`${a}: ${(h.strategy[i]*100).toFixed(2)}%${h.action_ev_bb?' · EV '+h.action_ev_bb[i].toFixed(3)+'BB':''}`;els.handDetail.append(row);});};
 els.handDetail.classList.remove('hidden');els.rangeGrid.replaceChildren();els.rangeGrid.classList.remove('hidden');els.chartMessage.classList.add('hidden');els.availabilityBadge.textContent='로컬 솔버 · 실험 데이터';els.chartSubtitle.textContent+=` · ${node.hands.length}/169핸드 · 수렴 미확인`;
 for(const hand of allHands()){const h=hands.get(hand.label),b=historyButton(hand.label,()=>detail(hand.label));b.className='hand-cell';b.setAttribute('aria-label',hand.label+(h?' 액션 빈도':' 저장 자료 없음'));if(h){const w={allin:0,raise:0,call:0,fold:0};node.actions.forEach((a,i)=>w[a==='allin'?'allin':a==='fold'?'fold':a==='call'||a==='check'?'call':'raise']+=h.strategy[i]);b.style.background=cellGradient(w);}else b.style.background='var(--gray)';els.rangeGrid.append(b);}detail(state.selectedHand);
}
els.multiwayHeroOptions.addEventListener('click',e=>{const b=e.target.closest('[data-position]');if(!b)return;historyUI.hero=b.dataset.position;updateMultiwayControls();renderMultiwayUnavailable();});
historyEl('addAction').onclick=()=>{historyUI.open=true;updateMultiwayControls();};
historyEl('cancelAction').onclick=()=>{historyUI.open=false;updateMultiwayControls();};
historyEl('historyPlayer').onchange=renderActionChoices;
historyEl('undoAction').onclick=()=>{historyUI.entries.pop();historyUI.open=false;historyEl('historyError').textContent='';updateMultiwayControls();renderMultiwayUnavailable();};
historyEl('resetActions').onclick=()=>{historyUI.entries=[];historyUI.open=false;historyEl('historyError').textContent='';updateMultiwayControls();renderMultiwayUnavailable();};
