import json,hashlib,struct,collections
from pathlib import Path
p=Path(r'C:\Users\User\nlhe_solver_artifacts\runtime\preflop_bucket_tables\preflop_equity_v2_high_nlhe2_b169_r2048.u16');data=p.read_bytes();meta=json.loads(p.with_suffix('.json').read_text());buckets=struct.unpack('<1326H',data);counts=collections.Counter(buckets)
assert hashlib.sha256(data).hexdigest()==meta['sha256'];assert all(counts[i]==c for i,c in enumerate(meta['bucket_hand_counts']))
classes=collections.defaultdict(set);ranks='23456789TJQKA'
for (a,b),bucket in zip(((a,b) for a in range(52) for b in range(a+1,52)),buckets):
 ra,sa=divmod(a,4);rb,sb=divmod(b,4);hi,lo=sorted([ra,rb],reverse=True);classes[bucket].add(ranks[hi]+ranks[lo]+('' if hi==lo else 's' if sa==sb else 'o'))
assert len(classes)==169 and all(len(c)==1 for c in classes.values())
p=Path('data/manifest.json');m=json.loads(p.read_text());assert len(m['nodes'])==5875;assert all(m['mapping']['bucket_to_hand'][str(b)]==next(iter(h)) for b,h in classes.items())
m['mapping'].update(status='structurally_validated_inference',solver_source_verified=False,cache_sha256=hashlib.sha256(data).hexdigest(),combos_checked=1326)
m['positions']={'status':'all_exported_histories_validated','solver_source_verified':False,'position_to_player':dict(zip(['UTG','UTG1','LJ','HJ','CO','BTN','SB','BB'],[3,4,5,6,7,0,1,2])),'evidence':{'histories_checked':5875,'actor_pot_to_call_matches':5875,'bb_street_stack_bb':19,'bb_ante_bb':1}}
m['solve']['uniform_stack_convention']='bb_ante_deducted_from_stack';m['validation']['gto_fidelity_confirmed']=False
p.write_text(json.dumps(m,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
Path('data/mapping-validation.json').write_text(json.dumps({'hand_mapping':m['mapping'],'positions':m['positions'],'limitations':['Card numbering and combination enumeration inferred, not solver-source verified.','Data-level replay verifies seat rotation and BB ante accounting, not equilibrium quality.','Solve is experimental and stopped; no convergence/GTO-fidelity claim.']},ensure_ascii=False,indent=2),encoding='utf-8')
print('1326 combinations, 169 unique classes, cache SHA-256 and bucket counts match. Manifest retains inference status.')
