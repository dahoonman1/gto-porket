const assert=require('node:assert/strict'),H=require('../history.js');
const raise=(player,target)=>({player,kind:'raise',target}),call=player=>({player,kind:'call'});
for(const [entries,hero] of [
 [[raise('BTN',2.5),call('SB')],'BB'],
 [[raise('UTG',2.5),call('CO')],'BTN'],
 [[raise('UTG',2.5),call('HJ'),call('BTN')],'BB'],
 [[raise('UTG',2.5),raise('CO',7.5),call('BTN')],'UTG']
]){const s=H.decision(20,entries,hero);assert.equal(H.POSITIONS[s.pending[0]],hero);assert.equal(s.history.filter(h=>!h.implicit).length,entries.length);assert(s.history.some(h=>h.implicit));}
assert.throws(()=>H.replay(20,[raise('BTN',1.5)]),/최소/);
assert.throws(()=>H.replay(20,[raise('BTN',21)]),/총액/);
assert.throws(()=>H.replay(20,[raise('BTN',2.5),call('UTG')]),/순서/);
let s=H.initial(20);H.apply(s,'raise',2.5);H.apply(s,'call');H.apply(s,'allin');assert.equal(s.bet,20);assert.equal(s.allin[2],true);assert(!s.pending.includes(2));
s=H.decision(20,[raise('BTN',2.5),call('SB')],'BB');H.apply(s,'call');assert.deepEqual(s.pending,[]);
s=H.decision(20,[raise('BTN',2.5),call('SB')],'BB');H.apply(s,'raise',7.5);assert.deepEqual(s.pending,[5,6]);
// A short all-in does not reopen raising to a player who already acted.
s=H.initial(20);s.bet=19.5;s.minRaise=5;s.paid[0]=19.5;s.acted[0]=19.5;s.pending=[1];H.apply(s,'allin');assert.equal(s.minRaise,5);assert.equal(H.canRaise(s,0),false);
// Missing hero turn and folded/all-in hero cannot be silently reconstructed.
assert.throws(()=>H.decision(20,[raise('UTG',2.5)],'UTG'),/순서/);
console.log('History tests passed: four requested paths, action order, sizes, round completion, short all-in reopening.');
