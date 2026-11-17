import json,glob,re,os,sys
SP=os.path.dirname(os.path.abspath(__file__))
T=sys.argv[1]+"/data/transcripts"
def norm(s): return re.sub(r"[^a-z0-9 ]","",re.sub(r"\s+"," ",s.lower())).strip()
cache={}
def segs(slug):
    if slug not in cache:
        f=f"{T}/{slug}.json"; cache[slug]=json.load(open(f))["segments"] if os.path.exists(f) else None
    return cache[slug]
def locate(slug,quote):
    s=segs(slug)
    if not s: return None
    n=[norm(x) for _,x in s]; q=norm(quote)[:80]
    for i in range(len(n)):
        w=n[i]+" "+(n[i+1] if i+1<len(n) else "")
        p=w.find(q)
        if 0<=p<len(n[i])+1: return s[i][0]
    return None
out=[];drop=0
# legacy cards
for l in open(SP+"/index.jsonl"):
    r=json.loads(l)
    if r["type"]!="prediction": continue
    out.append(dict(slug=r["slug"],date=r["date"][:10],start=r["start"],quote=r["quote"],claim=r["claim"],speaker=r["speaker"],subject=None,assets=[],horizon=None,boldness=None,origin="factcards"))
for f in sorted(glob.glob(SP+"/mined/*.json")):
    try: arr=json.load(open(f))
    except Exception as e: print("bad",f,e); continue
    for r in arr:
        t=locate(r.get("slug",""),r.get("quote",""))
        if t is None: drop+=1; continue
        r["start"]=t; r["origin"]=os.path.basename(f); out.append(r)
# dedupe by slug+start proximity
out.sort(key=lambda r:(r["slug"],r["start"]))
ded=[];seenq=set()
for r in out:
    if ded and ded[-1]["slug"]==r["slug"] and abs(ded[-1]["start"]-r["start"])<20: continue
    k=norm(r["quote"])[:60]
    if k in seenq: continue
    seenq.add(k); ded.append(r)
for i,r in enumerate(sorted(ded,key=lambda r:(r["date"],r["slug"],r["start"]))): r["id"]=f"p{i:04d}"
json.dump(ded,open(SP+"/all_predictions.json","w"),indent=0)
print(len(ded),"predictions; dropped unverifiable quotes:",drop)
