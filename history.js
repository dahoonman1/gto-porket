/* Preflop history model. Uniform stacks; omitted pending seats explicitly fold. */
(function(root){
'use strict';
const POSITIONS=['UTG','UTG1','LJ','HJ','CO','BTN','SB','BB'];
const label=p=>p==='UTG1'?'UTG+1':p;
function initial(stack,bbAnte=0){if(!Number.isFinite(stack)||stack<1)throw Error('잘못된 스택');return {stack,bbAnte,caps:Array.from({length:8},(_,i)=>stack-(i===7?bbAnte:0)),paid:[0,0,0,0,0,0,.5,1],folded:Array(8).fill(false),allin:Array(8).fill(false),acted:Array(8).fill(null),bet:1,minRaise:1,raises:0,pending:[0,1,2,3,4,5,6,7],history:[]};}
const copy=s=>JSON.parse(JSON.stringify(s));
function canRaise(s,p){return s.caps[p]>s.bet&&(s.acted[p]===null||s.bet-s.acted[p]>=s.minRaise-1e-8)&&s.folded.some((f,i)=>i!==p&&!f&&!s.allin[i]);}
function apply(s,kind,target,implicit=false){
 const p=s.pending[0];if(p===undefined)throw Error('프리플랍 행동이 끝났습니다.');let token,text;
 if(kind==='fold'){s.folded[p]=true;token='fold';text='폴드';}
 else if(kind==='call'){
  const delta=Math.max(0,s.bet-s.paid[p]);s.paid[p]=Math.min(s.bet,s.caps[p]);token=delta>0?'call':'check';text=delta>0?'콜':'체크';if(s.paid[p]>=s.caps[p]){s.allin[p]=true;text='콜 (올인)';}
 }else if(kind==='raise'||kind==='allin'){
  if(!canRaise(s,p))throw Error('레이즈할 수 없는 차례입니다.');target=kind==='allin'?s.caps[p]:Math.round(Number(target)*100)/100;
  if(!Number.isFinite(target)||target<=s.bet||target>s.caps[p])throw Error('레이즈 총액을 확인하세요.');const delta=target-s.bet;
  if(delta<s.minRaise-1e-8&&target!==s.caps[p])throw Error(`최소 레이즈 총액은 ${(s.bet+s.minRaise).toFixed(2)}BB입니다.`);
  if(delta>=s.minRaise-1e-8)s.minRaise=delta;s.bet=target;s.paid[p]=target;s.raises++;s.allin[p]=target===s.caps[p];
  token=s.allin[p]?'allin':`raise_${Math.round(target*100)}cb`;text=s.allin[p]?'올인':`${s.raises===1?'오픈':(s.raises+1)+'벳'} ${target}BB`;
 }else throw Error('알 수 없는 행동');
 s.acted[p]=s.bet;s.pending.shift();
 if(kind==='raise'||kind==='allin')s.pending=Array.from({length:7},(_,i)=>(p+1+i)%8).filter(i=>!s.folded[i]&&!s.allin[i]);
 if(s.folded.filter(f=>!f).length<=1)s.pending=[];
 // A lone non-all-in seat only acts if it still faces a bet.
 if(s.pending.length===1&&s.pending.every(i=>s.paid[i]>=s.bet)&&s.folded.every((f,i)=>f||s.allin[i]||i===s.pending[0]))s.pending=[];
 s.history.push({player:POSITIONS[p],kind,token,text,implicit,target:s.paid[p]});return s;
}
function advance(s,player){const p=POSITIONS.indexOf(player);if(!s.pending.includes(p))throw Error('이미 폴드·올인했거나 현재 행동 순서에 없는 포지션입니다.');while(s.pending.length&&s.pending[0]!==p)apply(s,'fold',null,true);if(!s.pending.length)throw Error('앞선 차례가 모두 폴드하여 프리플랍이 종료됩니다.');return s;}
function replay(stack,entries,bbAnte=0){const s=initial(stack,bbAnte);for(let index=0;index<entries.length;index++){const e=entries[index];advance(s,e.player);apply(s,e.kind,e.target);s.history[s.history.length-1].entryIndex=index;}return s;}
function decision(stack,entries,hero,bbAnte=0){const s=replay(stack,entries,bbAnte);advance(s,hero);return s;}
const api={POSITIONS,label,initial,copy,canRaise,apply,advance,replay,decision};if(typeof module!=='undefined')module.exports=api;else root.PocketHistory=api;
})(globalThis);
