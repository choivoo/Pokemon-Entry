# -*- coding: utf-8 -*-
"""Load JSON data and compute index tables used by the Entry program."""
import json
G=json.load(open("data/game.json")); WORLD=json.load(open("data/world.json")); RULES=json.load(open("data/rules.json"))
TR=json.load(open("data/trainers.json")); WILD=json.load(open("data/wild.json")); TC=json.load(open("data/typechart.json"))
MAPS=list(WORLD["maps"].keys()); MIDX={m:i+1 for i,m in enumerate(MAPS)}
FLAGS=G["flags"]; FIDX={f:i+1 for i,f in enumerate(FLAGS)}
ITEMS=G["items"]; IIDX={it["key"]:i+1 for i,it in enumerate(ITEMS)}
MOVES=G["moves"]; MVIDX={m["key"]:i+1 for i,m in enumerate(MOVES)}
SPECIES=G["species"]
NSP=len(SPECIES)
NPAGES=(NSP+9)//10
SID={s["slug"]:s["id"] for s in SPECIES}
for _s in SPECIES: SID.setdefault(_s["species"],_s["id"])
STARTERS=[SID["rowlet"],SID["cyndaquil"],SID["oshawott"]]
AREAS=[a["id"] for a in WORLD["areas"]]; AIDX={a:i+1 for i,a in enumerate(AREAS)}
THEMES=sorted({a["theme"] for a in WORLD["areas"]}); THIDX={t:i+1 for i,t in enumerate(THEMES)}
TYPES=TC["T"]; TYIDX={t:i+1 for i,t in enumerate(TYPES)}
TRIDS=list(TR.keys()); TRIDX={t:i+1 for i,t in enumerate(TRIDS)}
MISSIONS=G.get("missions",[])
KIND={"npc":1,"obj":2,"switch":3,"trainer":4,"leader":5,"center":6,"shop":7,"static":8}
ACT={"say":1,"reset":2,"give":3,"heal":4,"shop":5,"gift":6,"static":7,"battle":8,"mission":9}
CLS={"physical":1,"special":2,"status":3}; AIL={"none":0,"sleep":1,"poison":2,"paralysis":3,"burn":4}
# NPCs sorted by map
NPCS=[]; 
for mid in MAPS:
    for n in WORLD["maps"][mid]["npcs"]: NPCS.append((mid,n))
NIDX={n["id"]:i+1 for i,(m,n) in enumerate(NPCS)}
RBY={}
for r in RULES: RBY.setdefault(r["npc"],[]).append(r)
# gates
GATES=[]; EXITS=[]  # exits: (mapIdx,x,y,to,tx,ty,gateId)
for mid in MAPS:
    for e in WORLD["maps"][mid]["exits"]:
        gid=0
        if e["req"]: GATES.append(e["req"]); gid=len(GATES)
        EXITS.append((MIDX[mid],e["x"],e["y"],MIDX[e["to"]],e["tx"],e["ty"],gid))
TITLES={}
for ch,steps in WORLD["chapters"].items():
    for s in steps: TITLES[s["id"]]=s["title"]
SHOPS=[]  # (npc)
