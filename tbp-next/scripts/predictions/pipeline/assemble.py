import json,glob,os,sys
SP=os.path.dirname(os.path.abspath(__file__)); OUT=sys.argv[1]
base={p['id']:p for p in json.load(open(SP+'/all_predictions.json'))}
grades={}
for f in sorted(glob.glob(SP+'/graded/*.json')):
    for g in json.load(open(f)): grades[g['id']]=g
for f in sorted(glob.glob(SP+'/verified/*.json')):
    for g in json.load(open(f)): grades[g['id']]={**grades.get(g['id'],{}),**g}
out=[];drop=0
dead=set()
if os.path.exists(SP+'/urlcheck.txt'):
    for l in open(SP+'/urlcheck.txt'):
        c,u=l.strip().split(' ',1)
        if c in ('404','410','0'): dead.add(u)
BAD=('pages.dev','arcpublishing.com')
for i,g in grades.items():
    if i not in base or g.get('unverified'): drop+=1; continue
    g['sources']=[x for x in (g.get('sources') or []) if x.get('url') not in dead and not any(b in x.get('url','') for b in BAD)]
    if g.get('verdict') in ('hit','partial','miss') and not g.get('sources'): drop+=1; continue
    p=dict(base[i]); p.update({k:g.get(k) for k in ('verdict','confidence','outcome','resolved','sources','subject','headline','relayed')})
    p['subject']=g.get('subject') or base[i].get('subject')
    for k in ('origin','assets'): p.pop(k,None)
    out.append(p)
hl=json.load(open(SP+'/headlines_out.json')) if os.path.exists(SP+'/headlines_out.json') else {}
for p in out:
    if p['id'] in hl: p['headline']=hl[p['id']]
out.sort(key=lambda p:p['id'])
os.makedirs(os.path.dirname(OUT),exist_ok=True); json.dump(out,open(OUT,'w'),indent=1)
print(len(out),'assembled;',drop,'dropped as unverified/unsourced')
