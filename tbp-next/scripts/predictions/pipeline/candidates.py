import json,glob,os,re,sys
import collections
ROOT=sys.argv[1]; OUT=sys.argv[2]
T=ROOT+"/data/transcripts"; E=ROOT+"/../content/episodes"
CUE=re.compile(r"\b(i predict|prediction|predicting|will be worth|going to be worth|in (the next )?(two|three|four|five|ten|2|3|4|5|10|twenty|fifteen) years|by (the end of )?(20[12]\d|next year)|within (a|the next|two|three|five|ten) (year|years|decade)|i bet|bet you|mark my words|my guess is|i guarantee|never going to|will never|is going to (die|fail|win|happen|replace|overtake|flip|hit|reach|crash|go to zero)|are going to (die|fail|win|replace)|we('| a)?ll see (bitcoin|ethereum|a )|will (hit|reach|surpass|overtake|flip|replace|die|fail|go to zero)|(hundred|million) dollars? (a|per) (coin|bitcoin)|\$?\d+k (bitcoin|btc)|ten years from now|five years from now|in the future|someday|eventually|long term|the next bull|bear market|etf|halving)\b",re.I)
mined=set(json.loads(l)['slug'] for l in open(os.path.dirname(OUT)+"/index.jsonl"))
eps=[];tot=0
for f in sorted(glob.glob(T+"/*/**/*.json",recursive=True)):
    rel=os.path.relpath(f,T)[:-5]
    if rel.split('/')[0] not in ("tbp","hio","an-ethereum-podcast") or os.path.basename(rel).startswith('_'): continue
    md=E+"/"+rel+".md"
    if not os.path.exists(md): continue
    txt=open(md).read()
    m=re.search(r'^date:\s*["\']?(\d{4}-\d{2}-\d{2})',txt,re.M)
    if not m or m.group(1)>"2024-12-31": continue
    t=re.search(r'^title:\s*["\']?(.*?)["\']?\s*$',txt,re.M)
    segs=json.load(open(f)).get("segments") or []
    hits=[i for i,(s,x) in enumerate(segs) if CUE.search(x)]
    keep=sorted(set(j for i in hits for j in (i-1,i,i+1) if 0<=j<len(segs)))
    if not keep: continue
    lines=[];prev=-5
    for j in keep:
        if j!=prev+1: lines.append("...")
        lines.append(f"[{segs[j][0]:.1f}] {segs[j][1]}"); prev=j
    body="\n".join(lines)
    tot+=len(body)
    eps.append(dict(slug=rel,date=m.group(1),title=t.group(1) if t else rel,mined=rel in mined,excerpt=body))
json.dump(eps,open(OUT,"w"))
print(len(eps),"episodes",tot/4/1e6,"M tokens approx", collections.Counter(e['slug'].split('/')[0] for e in eps))
