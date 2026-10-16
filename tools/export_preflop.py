import argparse,sqlite3,json,base64
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('source',type=Path);p.add_argument('output',type=Path);a=p.parse_args()
s=a.source.resolve();o=a.output.resolve()
if s==o or s in o.parents: raise ValueError('Output must be outside source')
def con(p):
 c=sqlite3.connect(p.as_uri()+'?mode=ro',uri=True);c.row_factory=sqlite3.Row;c.execute('pragma query_only=ON');return c
def stats(): return {str(p):[p.stat().st_size,p.stat().st_mtime_ns] for p in s.glob('*.sqlite*')}
before=stats();index=con(s/'node_store.sqlite');routes=index.execute("select * from public_node_directory where street='preflop' order by shard_index,history_token_count,history,player").fetchall();shards={r['shard_index']:con(s/r['filename']) for r in index.execute('select * from shards')};seen=set();missing=0;nodes=0
with o.open('w',encoding='utf8') as f:
 for r in routes:
  c=shards[r['shard_index']];found=False
  for n in c.execute('select * from public_nodes where history=? and street=? and player=?',(r['history'],'preflop',r['player'])):
   found=True;key=(r['shard_index'],n['node_id'])
   if key in seen: continue
   seen.add(key);d=dict(n)
   for k in ['node_id','metadata_fingerprint']:d[k]=str(d[k])
   d['shard']=r['shard_index'];d['blocks']=[]
   for b in c.execute('select * from strategy_blocks where node_id=? order by bucket_min,row_id',(n['node_id'],)):
    x=dict(b);x['payload']=base64.b64encode(x['payload']).decode();x['node_id']=str(x['node_id']);x['metadata_fingerprint']=str(x['metadata_fingerprint']);d['blocks'].append(x)
   f.write(json.dumps(d,separators=(',',':'))+'\n');nodes+=1
  if not found:missing+=1
report={'routes':len(routes),'nodes':nodes,'missing_routes':missing,'source_size_mtime_unchanged':before==stats(),'scope':'all nodes reachable through preflop directory; indexed lookups only'}
o.with_suffix('.report.json').write_text(json.dumps(report,indent=2));print(report)
if missing or not report['source_size_mtime_unchanged']:raise ValueError('Source or directory validation failed')
