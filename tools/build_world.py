# -*- coding: utf-8 -*-
import json, random, sys, collections, zlib
def hash(x): return zlib.crc32(str(x).encode())
sys.path.insert(0,"tools")
from world_def import *
W,H=20,11
SP=json.load(open("data/species.json")); MV={m["key"]:m for m in json.load(open("data/moves.json"))}
byid={s["id"]:s for s in SP}
for s_ in SP:
    if s_["evolves_from"] and int(s_["evolves_from"])>151: s_["evolves_from"]=None
rng=random.Random(20241)
def Lc(ch): return int(4+(ch-1)*4.6)

# ---------- type chart (18 types) ----------
T=["normal","fire","water","electric","grass","ice","fighting","poison","ground","flying","psychic","bug","rock","ghost","dragon","dark","steel","fairy"]
E={ "normal":{"rock":.5,"ghost":0,"steel":.5},
 "fire":{"fire":.5,"water":.5,"grass":2,"ice":2,"bug":2,"rock":.5,"dragon":.5,"steel":2},
 "water":{"fire":2,"water":.5,"grass":.5,"ground":2,"rock":2,"dragon":.5},
 "electric":{"water":2,"electric":.5,"grass":.5,"ground":0,"flying":2,"dragon":.5},
 "grass":{"fire":.5,"water":2,"grass":.5,"poison":.5,"ground":2,"flying":.5,"bug":.5,"rock":2,"dragon":.5,"steel":.5},
 "ice":{"fire":.5,"water":.5,"grass":2,"ice":.5,"ground":2,"flying":2,"dragon":2,"steel":.5},
 "fighting":{"normal":2,"ice":2,"poison":.5,"flying":.5,"psychic":.5,"bug":.5,"rock":2,"ghost":0,"dark":2,"steel":2,"fairy":.5},
 "poison":{"grass":2,"poison":.5,"ground":.5,"rock":.5,"ghost":.5,"steel":0,"fairy":2},
 "ground":{"fire":2,"electric":2,"grass":.5,"poison":2,"flying":0,"bug":.5,"rock":2,"steel":2},
 "flying":{"electric":.5,"grass":2,"fighting":2,"bug":2,"rock":.5,"steel":.5},
 "psychic":{"fighting":2,"poison":2,"psychic":.5,"dark":0,"steel":.5},
 "bug":{"fire":.5,"grass":2,"fighting":.5,"poison":.5,"flying":.5,"psychic":2,"ghost":.5,"dark":2,"steel":.5,"fairy":.5},
 "rock":{"fire":2,"ice":2,"fighting":.5,"ground":.5,"flying":2,"bug":2,"steel":.5},
 "ghost":{"normal":0,"psychic":2,"ghost":2,"dark":.5},
 "dragon":{"dragon":2,"steel":.5,"fairy":0},
 "dark":{"fighting":.5,"psychic":2,"ghost":2,"dark":.5,"fairy":.5},
 "steel":{"fire":.5,"water":.5,"electric":.5,"ice":2,"rock":2,"steel":.5,"fairy":2},
 "fairy":{"fire":.5,"fighting":2,"poison":.5,"dragon":2,"dark":2,"steel":.5}}
chart=[[E[a].get(d,1) for d in T] for a in T]

# ---------- moves & species ----------
BAN={"fly","dig","solar-beam","skull-bash","razor-wind","sky-attack","hyper-beam","bide","counter","self-destruct","explosion","fissure","guillotine","horn-drill","dream-eater","transform","metronome","mimic","mirror-move","psywave","super-fang","night-shade","seismic-toss","dragon-rage","sonic-boom","bind","wrap","clamp","fire-spin","whirlwind","roar","substitute","struggle","rage","thrash","petal-dance","razor-leaf" if False else "x","focus-energy","double-team","minimize","haze","mist","light-screen","reflect","leech-seed","conversion","disable","splash","teleport","swift" if False else "x2","jump-kick","high-jump-kick","spore" if False else "x3","absorb" if False else "x4","rest","recover","softboiled","sing" if False else "x5","supersonic","confuse-ray","stun-spore" if False else "x6","poison-gas" if False else "x7"}
def usable(m):
    if m["key"] in BAN: return False
    if m["cls"]=="status": return m["ailment"] in ("sleep","poison","paralysis","burn") and m["power"]==0
    return m["power"]>0
gm={k:m for k,m in MV.items() if usable(m)}
def learnset(s):
    ms=[gm[k] for k in s["moves"] if k in gm]
    dmg=sorted([m for m in ms if m["power"]>0],key=lambda m:(m["power"]*(1.5 if m["type"] in s["types"] else 1),m["pp"]))
    sta=[m for m in ms if m["power"]==0]
    if not dmg:
        dmg=[gm.get("tackle") or gm["scratch"]]
    if "tackle" in gm and len(dmg)<2: dmg=[gm["tackle"]]+dmg
    # pick up to 6 damaging spread low→high
    n=min(6,len(dmg)); idx=sorted({round(i*(len(dmg)-1)/max(1,n-1)) for i in range(n)})
    pick=[dmg[i] for i in idx]
    lv=[1,6,13,22,32,44][:len(pick)]
    out=[[l,m["key"]] for l,m in zip(lv,pick)]
    if s["id"]==25: out=[[1,"thunder-shock"],[1,"quick-attack"]]+[[l,k] for l,k in [(9,"thunder-wave"),(16,"slam" if "slam" in gm else "body-slam"),(26,"thunderbolt" if "thunderbolt" in gm else "thunder"),(40,"thunder")] if k in gm]
    elif sta: out.append([12,sta[0]["key"]]); 
    return out
# evolution
STONE={26:"thunder-stone",134:"water-stone",135:"thunder-stone",136:"fire-stone",31:"moon-stone",34:"moon-stone",36:"moon-stone",40:"moon-stone",
 38:"fire-stone",59:"fire-stone",62:"water-stone",91:"water-stone",121:"water-stone",45:"leaf-stone",71:"leaf-stone",103:"leaf-stone"}
TRADE={65:40,68:42,76:44,94:46}
LEGEND={144,145,146,150,151}
kids=collections.defaultdict(list)
for s in SP:
    if s["evolves_from"]: kids[int(s["evolves_from"])].append(s["id"])
def depth(i):
    d=1
    while byid[i]["evolves_from"]: i=int(byid[i]["evolves_from"]); d+=1
    return d
def bst(s): return sum(s["base"].values())
species=[]
for s in SP:
    i=s["id"]; d=depth(i)
    evo=None
    if s["evolves_from"]:
        p=int(s["evolves_from"])
        if i in STONE: evo={"from":p,"item":STONE[i]}
        elif i in TRADE.values() or i in (65,68,76,94): evo={"from":p,"level":TRADE.get(p,40) if False else 40}
        else: evo={"from":p,"level":(16 if bst(byid[p])<=320 else 22) if d==2 else 36}
    if i in (65,68,76,94): evo={"from":int(s["evolves_from"]),"level":40}
    if i in (134,135,136): evo={"from":133,"item":STONE[i]}
    species.append({"id":i,"name":s["name_ko"],"types":s["types"],"base":s["base"],"desc":s["desc_ko"],"capture":s["capture_rate"],
      "exp":s["base_exp"],"evo":evo,"learn":learnset(s),"stage":d,"legend":i in LEGEND})
sbyid={s["id"]:s for s in species}
def natural_level(i):
    e=sbyid[i]["evo"]
    if not e: return 1
    return natural_level(e["from"])+ (e.get("level",25) if "level" in e else 25) if False else (e.get("level") or 25)
moves=[{k:v for k,v in m.items()} for m in gm.values()]
mindex={m["key"]:n for n,m in enumerate(moves)}
for s in species:
    s["learn"]=[[l,k] for l,k in s["learn"] if k in mindex]
    assert s["learn"] , s["id"]

# ---------- map generation ----------
def bfs(tiles,start):
    seen={start}; q=[start]
    while q:
        x,y=q.pop()
        for dx,dy in((1,0),(-1,0),(0,1),(0,-1)):
            nx,ny=x+dx,y+dy
            if 0<=nx<W and 0<=ny<H and (nx,ny) not in seen and tiles[ny][nx] in ".gD": seen.add((nx,ny)); q.append((nx,ny))
    return seen
def gen_tiles(a,scr,doors,seed):
    r=random.Random(seed); kind=a["kind"]
    g=[["."]*W for _ in range(H)]
    for x in range(W): g[0][x]=g[H-1][x]="#"
    for y in range(H): g[y][0]=g[y][W-1]="#"
    dens={"hub":.06,"road":.10,"dungeon":.2,"gym":.07}[kind]
    th=a["theme"]
    for y in range(1,H-1):
        for x in range(1,W-1):
            if 3<=y<=7 and 2<=x<=17 and th!="x" and (4<=y<=6): continue   # keep a clear band
            if r.random()<dens: g[y][x]="#"
    if kind in("road","dungeon") and a["types"]:
        for _ in range(3):
            cx,cy=r.randint(2,17),r.randint(1,9)
            for y in range(cy-1,cy+2):
                for x in range(cx-2,cx+3):
                    if 1<=x<=W-2 and 1<=y<=H-2 and g[y][x]==".": g[y][x]="g"
    if th in("canal","coast","harbor","tide","swamp") :
        for _ in range(2):
            cx,cy=r.choice([(5,1),(14,9),(3,9),(16,1)])
            for y in range(cy-1,cy+2):
                for x in range(cx-2,cx+3):
                    if 1<=x<=W-2 and 1<=y<=H-2 and g[y][x] in ".g" and not(3<=y<=7): g[y][x]="~"
    for (x,y) in doors: g[y][x]="D"
    return ["".join(r_) for r_ in g]
def inward(x,y):
    if x==0: return (1,y)
    if x==W-1: return (W-2,y)
    if y==0: return (x,1)
    return (x,H-2)

maps={}; order=[a for a in A if a["kind"]!="gym" and a["id"] not in("R22","R23","R24")]
def mid(a,s): return f"{a['id']}_{s}"
for a in A:
    for s in range(a["screens"]): maps[mid(a,s)]=dict(id=mid(a,s),area=a["id"],name=f"{a['name']}"+(f" {s+1}" if a['screens']>1 else ""),screen=s,kind=a["kind"],theme=a["theme"],ch=a["ch"],exits=[],npcs=[],doors=[])
def addexit(src,x,y,dst,req=None):
    tx,ty=inward(*maps[dst]["_door"]) if False else None,None
def door_pos(side): return {"L":(0,5),"R":(W-1,5),"T":(10,0),"B":(10,H-1),"TL":(5,0)}[side]
links=[]  # (mapA,sideA,mapB,sideB,reqAB,reqBA)
for i in range(len(order)-1):
    a,b=order[i],order[i+1]
    for s in range(a["screens"]-1): links.append((mid(a,s),"R",mid(a,s+1),"L",None,None))
    links.append((mid(a,a["screens"]-1),"R",mid(b,0),"L","@chain:"+a["id"],None))
for s in range(order[-1]["screens"]-1): links.append((mid(order[-1],s),"R",mid(order[-1],s+1),"L",None,None))
gyma={}
for a in A:
    if a["kind"]=="gym":
        n=int(a["id"][1:]); hub=[h for h in A if h["kind"]=="hub" and h["ch"]==a["ch"]][0]
        links.append((mid(hub,hub["screens"]-1),"B",mid(a,0),"T","@gymdoor:"+a["id"],None))
        for s in range(a["screens"]-1): links.append((mid(a,s),"B",mid(a,s+1),"T","@gympuz:%s:%d"%(a["id"],s),None))
for src,dst,req in [("H02","H11","@sc:badge3"),("H03","H09","@sc:badge6"),("H06","H08","@sc:c6_restore")]:
    sc={"H02":"R22","H03":"R23","H06":"R24"}[src]; a=[x for x in A if x["id"]==sc][0]
    links.append((mid([x for x in A if x["id"]==src][0],0),"TL",mid(a,0),"L",req,None))
    for s in range(a["screens"]-1): links.append((mid(a,s),"R",mid(a,s+1),"L",None,None))
    links.append((mid(a,a["screens"]-1),"R",mid([x for x in A if x["id"]==dst][0],0),"BL2",req,None))
SIDE={"BL2":(5,H-1)}
def pos(side): return SIDE.get(side) or door_pos(side)
for ma,sa,mb,sb,req,_ in links:
    pa,pb=pos(sa),pos(sb)
    maps[ma]["doors"].append(pa); maps[mb]["doors"].append(pb)
    maps[ma]["exits"].append(dict(x=pa[0],y=pa[1],to=mb,tx=inward(*pb)[0],ty=inward(*pb)[1],req=req))
    maps[mb]["exits"].append(dict(x=pb[0],y=pb[1],to=ma,tx=inward(*pa)[0],ty=inward(*pa)[1],req=None if not (req or "").startswith("@sc") else req))
areas={a["id"]:a for a in A}
for m in maps.values():
    a=areas[m["area"]]; m["tiles"]=gen_tiles(a,m["screen"],m["doors"],hash(m["id"])%99991)
    m["tiles"]=[r for r in m["tiles"]]
# clear door-adjacent cells
for m in maps.values():
    t=[list(r) for r in m["tiles"]]
    for (x,y) in m["doors"]:
        ix,iy=inward(x,y)
        if t[iy][ix]!="D": t[iy][ix]="."
    m["tiles"]=["".join(r) for r in t]
json.dump({"T":T,"chart":chart},open("data/typechart.json","w"))
# ---------- placement ----------
slots={}
def free_slot(m):
    t=m["tiles"]; used={(n["x"],n["y"]) for n in m["npcs"]}
    cand=[(x,y) for y in range(2,H-2) for x in range(3,W-3) if t[y][x]=="." and (x,y) not in used and all((x+dx,y+dy) not in used for dx,dy in((1,0),(-1,0),(0,1),(0,-1)))]
    # keep corridor: don't put on y==5 band centre
    rr=random.Random(hash(m["id"]+str(len(m["npcs"]))))
    c=[p for p in cand if p[1]!=5] or cand
    return rr.choice(c)
npcs=[]; rules=[]; trainers={}; flags=set(); gate=collections.defaultdict(list)
def addnpc(mapid,nid,kind,label,pos_=None):
    m=maps[mapid]; p=pos_ or free_slot(m)
    n=dict(id=nid,x=p[0],y=p[1],kind=kind,label=label); m["npcs"].append(n); return n
def R(npc,act="say",text="",req="",nreq="",arg="",set_="",clr=""): rules.append(dict(npc=npc,req=req,nreq=nreq,act=act,arg=str(arg),set=set_,clr=clr,text=text))
# trainer party generator
pool_by_type=collections.defaultdict(list)
for s in species:
    if s["legend"]: continue
    for t in s["types"]: pool_by_type[t].append(s["id"])
def natlvl(i):
    s=sbyid[i]
    if not s["evo"]: return 1
    return max(natlvl(s["evo"]["from"])+1, s["evo"].get("level",30))
def bcap(lvl,extra=0): return 250+lvl*5.5+extra
def pick_species(types,lvl,r,n,ally_types=None,extra=0):
    cand=[i for t in types for i in pool_by_type[t] if natlvl(i)<=lvl+4 and bst(byid[i])<=bcap(lvl,extra)]
    cand=list(dict.fromkeys(cand)) or [i for i in range(1,152) if natlvl(i)<=lvl and not sbyid[i]["legend"]]
    # prefer the strongest allowed stage
    cand.sort(key=lambda i:(-(natlvl(i)<=lvl+2),-sbyid[i]["stage"]))
    top=cand[:max(n+3,8)]
    return r.sample(top,min(n,len(top)))
def party(types,lvl,n,seed,jitter=1,extra=0):
    r=random.Random(seed); ids=pick_species(types,lvl,r,n,None,extra)
    return [dict(sp=i,lv=max(2,lvl+r.randint(-jitter,jitter))) for i in ids]
TR_NAMES=["곤충 소년","채집 소녀","낚시꾼","광부","선원","약초꾼","수영 선수","전기 기사","산악인","등산가","여행자","연구 조교","단원","사육사","탐험가","안전원"]
# step placement
chstep_key={}
for ch,steps in Q.items():
    gym=[s for s in steps if s[1]=="gym"]
    chstep_key[ch]=gym[0][0] if gym else steps[-1][0]
puz={}
for ch,steps in Q.items():
    L=Lc(ch)
    for (sid,typ,aid,scr,title,line) in steps:
        a=areas[aid]; mapid=mid(a,scr)
        flags.add(sid)
        if typ in("talk","scene","item","clue","catch"):
            lab={"talk":"주민","scene":"장면","item":"물건","clue":"단서","catch":"관찰점"}[typ]
            n=addnpc(mapid,"n_"+sid,"obj" if typ in("item","clue","catch","scene") else "npc",title)
            if typ=="catch":
                R(n["id"],"say",line,nreq=sid)
                R(n["id"],"say","이미 확인했다.",req=sid)
                continue
            act="say"; arg=""
            if sid in("c1_box","c3_valve","c2_stone","c3_fossil","c4_log","c5_herb","c7_source","c8_data","c6_tower1","c2_gearshop","c5_compare"):
                act="give"; arg={"c1_box":"monster-ball:5","c3_valve":"super-potion:3","c2_stone":"potion:3","c3_fossil":"fossil:1","c4_log":"great-ball:5","c5_herb":"hyper-potion:3","c7_source":"antidote:5","c8_data":"ultra-ball:5","c6_tower1":"parlyz-heal:3","c2_gearshop":"potion:2","c5_compare":"great-ball:3"}[sid]
            if typ=="scene" and sid=="c1_lab": act="say"
            R(n["id"],act,line,nreq=sid,arg=arg,set_=sid)
            R(n["id"],"say","もう調べた。".replace("もう調べた。","이미 처리했다. 다음 목적지로 가자."),req=sid)
            if typ=="scene" and sid=="c1_lab": R(n["id"],"say","피카츄가 다가와 어깨에 올라탔다.",req=sid)
        elif typ=="puzzle":
            r=random.Random(sid); perm=[0,1,2]; r.shuffle(perm); names=["빨강","파랑","노랑"]
            order_txt=" → ".join(names[p] for p in perm)
            n0=addnpc(mapid,"n_"+sid+"_hint","npc","단서판")
            R(n0["id"],"say",f"{line} 기록된 순서: {order_txt}.")
            sw=[addnpc(mapid,f"n_{sid}_s{k}","switch",names[k]+" 스위치") for k in range(3)]
            p1,p2=sid+"_p1",sid+"_p2"; flags|={p1,p2}
            first,second,third=perm
            R(sw[first]["id"],"say","딸깍. 첫 단계가 켜졌다.",nreq=sid,set_=p1,clr=p2)
            R(sw[second]["id"],"say","딸깍. 두 번째가 켜졌다.",req=p1,nreq=sid,set_=p2)
            R(sw[third]["id"],"say","딸깍. 장치가 열렸다!",req=p2,nreq=sid,set_=sid,arg="",clr=p1)
            for k in range(3):
                R(sw[k]["id"],"say","이미 풀었다.",req=sid) if False else None
            for k in range(3):
                rules.insert(len(rules)-0,dict(npc=sw[k]["id"],req=sid,nreq="",act="say",arg="",set="",clr="",text="이미 열려 있다."))
            for k in range(3):
                R(sw[k]["id"],"reset","순서가 틀렸다. 장치가 원래대로 돌아갔다.",clr=p1+","+p2)
        elif typ in("trainer","rival","rocket"):
            nm={"trainer":TR_NAMES[hash(sid)%len(TR_NAMES)],"rival":"하루","rocket":"로켓단"}[typ]
            n=addnpc(mapid,"n_"+sid,"trainer",nm)
            tid="t_"+sid
            if typ=="rival":
                base=[(133,0),(19,-1),(16,-1),(63,0),(133,0),(133,1)][:min(6,2+ch//3)]
                pty=[dict(sp=i if not(i==133 and ch>=8) else 134,lv=max(2,L+1+d)) for i,d in base]
                pty=[dict(sp=(p["sp"] if (p["sp"]!=19 or ch<5) else 20) if not(p["sp"]==16 and ch>=5) else 17,lv=p["lv"]) for p in pty]
            elif typ=="rocket":
                pty=party(["poison","normal","electric"],L+2,3+ch//5,hash(sid)%1000)
            else:
                th=areas[aid]["types"] or ["normal"]
                pty=party(th,L-1,min(4,1+ch//3),hash(sid)%1000)
            trainers[tid]=dict(id=tid,name=nm,party=pty,reward=L*60,kind=typ)
            R(n["id"],"battle",line,nreq=sid,arg=tid,set_=sid)
            R(n["id"],"say","승부는 졌지만 좋은 배틀이었어.",req=sid)
        elif typ=="gym":
            g=GYMS[int(areas[aid]["id"][1:])-1]; n=addnpc(mapid,"n_"+sid,"leader",g["leader"]+" 관장")
            pty=party([g["type"]],L+3,min(6,3+g["n"]//2),g["n"]*77,0,60)
            pty=[dict(sp=p["sp"],lv=L+3+(1 if k==len(pty)-1 else 0)) for k,p in enumerate(pty)]
            trainers["t_"+sid]=dict(id="t_"+sid,name=g["leader"]+" 관장",party=pty,reward=L*120,kind="gym",badge=g["n"])
            R(n["id"],"battle",line,nreq=sid,arg="t_"+sid,set_=sid)
            R(n["id"],"say",f"{g['leader']}: 배지는 이미 건넸다. 다음 도시에서 만나자.",req=sid)
        elif typ=="league":
            i=len([1 for s_ in steps if s_[1]=="league" and steps.index(s_)<steps.index((sid,typ,aid,scr,title,line))])
            if sid=="c12_champ": nm,ty,lv=CHAMP[0]+" 챔피언",None,CHAMP[1]
            else: ty,nm,lv=[(e[0],e[1],e[2]) for e in ELITE][i][0],ELITE[i][1],ELITE[i][2]
            n=addnpc(mapid,"n_"+sid,"leader",nm+(" (사천왕)" if ty else ""))
            if ty: pty=party([ty],lv,5,hash(sid)%1000,0,200)
            else: pty=[dict(sp=i_,lv=lv) for i_ in (18,65,112,130,59,3)]
            trainers["t_"+sid]=dict(id="t_"+sid,name=nm,party=pty,reward=lv*150,kind="league")
            R(n["id"],"battle",line,nreq=sid,arg="t_"+sid,set_=sid)
            R(n["id"],"say","이미 쓰러뜨렸다. 다음으로 가라.",req=sid)
    # gym internals: practice switch, puzzle, gym trainer
for g in GYMS:
    a=[x for x in A if x["id"]=="G%02d"%g["n"]][0]; ch=a["ch"]; L=Lc(ch)
    # screen0: safe practice -- one switch teaches rule
    pr=addnpc(mid(a,0),f"n_gym{g['n']}_guide","npc","체육관 안내원")
    R(pr["id"],"say",f"안내원: 규칙 소개. {g['rule']}. 이 방의 스위치로 연습해 보세요. 실패해도 불이익은 없습니다.")
    ps=addnpc(mid(a,0),f"n_gym{g['n']}_prac","switch","연습 스위치"); R(ps["id"],"say","딸깍. 연습 성공! 규칙을 이해했다.")
    # screen0 also has a trainer who guards the exit
    flags.add(f"g{g['n']}_t0")
    tn=addnpc(mid(a,0),f"n_g{g['n']}_t0","trainer","체육관 수련생")
    trainers[f"t_g{g['n']}_t0"]=dict(id=f"t_g{g['n']}_t0",name="체육관 수련생",party=party([g["type"]],L+1,2,g["n"]*13),reward=L*40,kind="trainer")
    R(tn["id"],"battle","수련생: 관장님께 가려면 나를 이겨라!",nreq=f"g{g['n']}_t0",arg=f"t_g{g['n']}_t0",set_=f"g{g['n']}_t0")
    R(tn["id"],"say","수련생: 퍼즐 방은 안쪽이에요.",req=f"g{g['n']}_t0")
    # screen1: puzzle
    sid=f"gym{g['n']}_puz"; flags.add(sid)
    r=random.Random(sid); perm=list(range(3)); r.shuffle(perm); names=["하나","둘","셋"]
    hint=addnpc(mid(a,1),f"n_{sid}_hint","npc","규칙판")
    R(hint["id"],"say",f"{g['rule']} 기록된 순서: "+" → ".join(names[p] for p in perm)+".")
    sw=[addnpc(mid(a,1),f"n_{sid}_s{k}","switch",f"{names[k]} 장치") for k in range(3)]
    p1,p2=sid+"_p1",sid+"_p2"; flags|={p1,p2}
    R(sw[perm[0]]["id"],"say","딸깍.",nreq=sid,set_=p1,clr=p2)
    R(sw[perm[1]]["id"],"say","딸깍.",req=p1,nreq=sid,set_=p2)
    R(sw[perm[2]]["id"],"say","퍼즐이 풀렸다!",req=p2,nreq=sid,set_=sid,clr=p1)
    for k in range(3):
        R(sw[k]["id"],"say","이미 풀었다.",req=sid)
    for k in range(3):
        R(sw[k]["id"],"reset","순서가 틀렸다. 장치가 원래대로 돌아갔다. (진행한 방은 그대로 유지됩니다)",clr=p1+","+p2)
# ambient: pokecenter/shop/save & flavor NPCs & optional trainers & gifts
SHOP={"H01":["monster-ball","potion"],"H02":["monster-ball","potion","antidote"],"H03":["monster-ball","great-ball","potion","super-potion","awakening"],
 "H04":["great-ball","super-potion","parlyz-heal","burn-heal"],"H05":["great-ball","super-potion","antidote","bait"],"H06":["great-ball","super-potion","parlyz-heal"],
 "H07":["great-ball","super-potion","antidote","bait"],"H08":["ultra-ball","hyper-potion","revive","thunder-stone","water-stone","fire-stone","leaf-stone","moon-stone","bait"],
 "H09":["ultra-ball","hyper-potion","burn-heal","revive"],"H10":["ultra-ball","hyper-potion","revive","antidote"],"H11":["ultra-ball","hyper-potion","revive","full-heal"],"H12":["ultra-ball","hyper-potion","revive","full-heal"]}
for h in [a for a in A if a["kind"]=="hub"]:
    m0=mid(h,0)
    c=addnpc(m0,f"n_{h['id']}_center","center","포켓몬센터",(3,3)); R(c["id"],"heal","간호사: 파티를 회복했습니다! 세이브 코드도 발급할 수 있어요.",arg="save")
    s=addnpc(m0,f"n_{h['id']}_shop","shop","상점",(16,3)); R(s["id"],"shop","점원: 어서 오세요.",arg=",".join(SHOP[h["id"]]))
    f=addnpc(mid(h,h["screens"]-1),f"n_{h['id']}_flav","npc","주민")
    R(f["id"],"say",f"주민: {h['name']}에 온 걸 환영해. {h['note']}에 대한 이야기라면 내가 좀 알지.")
    for k in range(1):
        pass
for a in A:
    if a["kind"] in("road","dungeon") and a["id"] not in("D14",):
        ch=a["ch"]; L=Lc(ch)
        for s in range(a["screens"]):
            if s%2==0 and a["types"]:
                tid=f"ot_{a['id']}_{s}"; flags.add(tid)
                n=addnpc(mid(a,s),"n_"+tid,"trainer",TR_NAMES[hash(tid)%len(TR_NAMES)])
                trainers["t_"+tid]=dict(id="t_"+tid,name=n["label"],party=party(a["types"],L-1,1+ch//4,hash(tid)%1000),reward=L*35,kind="optional")
                R(n["id"],"battle","트레이너: 눈이 마주쳤네. 승부하자!",nreq=tid,arg="t_"+tid,set_=tid)
                R(n["id"],"say","트레이너: 다음에 또 붙자.",req=tid)
GIFTS=[("n_gift_squirtle","H02",0,7,"c2_hub",9),("n_gift_bulba","R03",0,1,"c2_gate",9),("n_gift_charm","H04",0,4,"c4_hub",18),
 ("n_gift_eevee","H08",1,133,"c8_data",22),("n_gift_lapras","H04",1,131,"c4_log",18),("n_gift_porygon","H08",0,137,"c8_gym",30),
 ("n_gift_omanyte","H03",0,138,"c3_fossil",25),("n_gift_kabuto","H09",0,140,"c9_clue",30),("n_gift_aero","H12",0,142,"c12_end",40),
 ("n_gift_hitmonlee","H10",0,106,"c10_gym",35),("n_gift_hitmonchan","H11",0,107,"c11_hub",35),("n_gift_mrmime","R13",0,122,"c8_gate",25),
 ("n_gift_farfetchd","R02",0,83,"c1_box",8),("n_gift_magikarp","H02",0,129,"c2_hub",5)]
for nid,aid,scr,spid,req,lv in GIFTS:
    sc=min(scr,areas[aid]["screens"]-1); n=addnpc(mid(areas[aid],sc),nid,"npc","贈り物"); n["label"]="선물 주는 사람"
    flags.add("got_"+nid)
    R(n["id"],"gift",f"{sbyid[spid]['name']}을(를) 맡아 줄래? 소중히 키워 줘.",req=req,nreq="got_"+nid,arg=f"{spid}:{lv}",set_="got_"+nid)
    R(n["id"],"say","다른 사람에게 줄 수 있는 건 이미 줬어.",req="got_"+nid)
    R(n["id"],"say","아직은 줄 수 없어. 이 지역의 일이 끝나면 다시 와줘.")
# statics (post-clear)
for nid,aid,scr,spid,lv in [("n_st_articuno","R19",2,144,50),("n_st_zapdos","R20",2,145,50),("n_st_moltres","R21",2,146,50),("n_st_mewtwo","D13",3,150,70),("n_st_mew","H11",1,151,30),("n_st_snorlax","R18",1,143,40)]:
    n=addnpc(mid(areas[aid],scr),nid,"static",sbyid[spid]["name"]); flags.add("got_"+nid)
    R(n["id"],"static",f"{sbyid[spid]['name']}이(가) 앞을 가로막고 있다!",req="c12_end" if spid!=143 else "",nreq="got_"+nid,arg=f"{spid}:{lv}",set_="got_"+nid)
    R(n["id"],"say","조용하다. 지금은 아무것도 없다.")
# end rules
R("n_c12_end","end","크레디트가 시작된다...",req="c12_end") if False else None
LIN={}
for a_ in order:
    for s_ in range(a_['screens']): LIN[mid(a_,s_)]=len(LIN)
for a_ in A:
    if a_['kind']=='gym':
        for s_ in range(a_['screens']): LIN[mid(a_,s_)]=-1
# ---------- gates ----------
steps_all={s[0]:s for ch in Q.values() for s in ch}
def reqflags(token):
    kind,*rest=token[1:].split(":")
    if kind=="chain":
        aid=rest[0]; ch=areas[aid]["ch"]
        # leaving the last main-line area of a chapter
        nxt=[a for a in order if order.index(a)==order.index(areas[aid])+1][0]
        if nxt["ch"]==ch: return None
        return [chstep_key[ch]]+[s[0] for s in Q[ch] if s[1]=="clue"]+[s[0] for s in Q[ch] if s[1]!="gym" and s[1]!="clue" and s[2] in [a["id"] for a in A if a["kind"]!="gym"]]
    if kind=="gymdoor":
        g=areas[rest[0]]; return [s[0] for s in Q[g["ch"]] if s[1]!="gym" and s[1]!="clue"]+[s[0] for s in Q[g["ch"]] if s[1]=="clue"]
    if kind=="gympuz":
        n=int(rest[0][1:]); s=int(rest[1]); return [f"g{n}_t0"] if s==0 else [f"gym{n}_puz"]
    if kind=="sc":
        return [{"badge3":"c4_gym","badge6":"c8_gym"}.get(rest[0],rest[0])]
    return None
for m in maps.values():
    for e in m["exits"]:
        rq=e["req"]
        if rq and rq.startswith("@"):
            fl=reqflags(rq); e["req"]=fl or []
        else: e["req"]=[]
    # screen-level gating: only steps that precede a step located in a LATER main-line map gate the right exit
    for e in m["exits"]:
        if e["x"]==W-1 and m["kind"]!="gym":
            g=set(e["req"])
            for ch,steps in Q.items():
                for p_,st in enumerate(steps):
                    if st[1]=="clue" or mid(areas[st[2]],st[3])!=m["id"]: continue
                    if any(LIN.get(mid(areas[q[2]],q[3]),10**6)>LIN[m["id"]] for q in steps[p_+1:]): g.add(st[0])
            e["req"]=sorted(g)
# fix R22-R24 chain: shortcut exits use sc flags only
for m in maps.values():
    if m["area"] in("R22","R23","R24"):
        for e in m["exits"]: e["req"]=[f for f in e["req"] if f in("c4_gym","c8_gym","ch6_restore","c6_restore")]
# ensure gym bottom exits gating (already by links)
# ---------- wild tables ----------
wild={}
used_roots=set()
for a in A:
    if not a["types"]: continue
    ch=a["ch"]; L=Lc(ch); lo,hi=L-1,L+2
    r=random.Random(a["id"])
    cand=[i for t in a["types"] for i in pool_by_type[t] if natlvl(i)<=hi+1 and bst(byid[i])<=bcap(hi,40)]
    cand=list(dict.fromkeys(cand)); r.shuffle(cand)
    # prefer species whose evolution stage matches level
    cand.sort(key=lambda i:-(sbyid[i]["stage"]>1) if ch>=5 else sbyid[i]["stage"])
    com=cand[:5]; rare=cand[5:7]
    ent=[dict(sp=i,w=30,lo=max(2,lo),hi=hi,beh=r.choice(["slow","pause","flee","approach"])) for i in com]
    ent+=[dict(sp=i,w=5,lo=max(2,lo),hi=hi+1,beh="flee") for i in rare]
    wild[a["id"]]=dict(entries=ent,max_on_screen=2+ (ch>=6),rare_sneak=a["id"]=="D07")
    used_roots|={e["sp"] for e in ent}
# coverage fill: every non-legend root species must be reachable
def roots(i):
    while sbyid[i]["evo"]: i=sbyid[i]["evo"]["from"]
    return i
gifted={int(g[3]) for g in GIFTS}
covered=set(used_roots)|gifted
def reachable(sp):
    return roots(sp) in covered or sp in covered
missing=[s["id"] for s in species if not s["legend"] and not reachable(s["id"])]
adds=[]
for i in missing:
    r_=roots(i)
    if r_ in covered: continue
    ty=sbyid[r_]["types"][0]
    tgt=[a for a in A if a["types"] and ty in a["types"] and a["kind"]!="gym"]
    if not tgt: tgt=[a for a in A if a["types"]]
    a=tgt[r_%len(tgt)]; L=Lc(a["ch"])
    wild[a["id"]]["entries"].append(dict(sp=r_,w=4,lo=max(2,L-1),hi=L+2,beh="flee")); covered.add(r_); adds.append((r_,a["id"]))
# evolve closure
for s in species:
    pass
items=[
 ("monster-ball","몬스터볼",200,"ball",1.0),("great-ball","슈퍼볼",600,"ball",1.5),("ultra-ball","하이퍼볼",1200,"ball",2.0),
 ("bait","먹이",100,"bait",0),("potion","상처약",300,"heal",20),("super-potion","좋은상처약",700,"heal",50),("hyper-potion","고급상처약",1200,"heal",120),
 ("antidote","해독제",100,"cure:poison",0),("parlyz-heal","마비치료제",200,"cure:paralysis",0),("burn-heal","화상치료제",250,"cure:burn",0),
 ("awakening","잠깨는약",250,"cure:sleep",0),("full-heal","만병통치약",600,"cure:all",0),("revive","기력의조각",1500,"revive",0),
 ("thunder-stone","천둥의돌",2100,"stone",0),("water-stone","물의돌",2100,"stone",0),("fire-stone","불꽃의돌",2100,"stone",0),("leaf-stone","리프의돌",2100,"stone",0),("moon-stone","달의돌",2100,"stone",0),
 ("fossil","화석 조각",0,"key",0)]
out=dict(W=W,H=H,maps=maps,areas=A,chapters={str(k):[dict(id=s[0],type=s[1],area=s[2],screen=s[3],title=s[4]) for s in v] for k,v in Q.items()})
json.dump(out,open("data/world.json","w"),ensure_ascii=False)
json.dump(rules,open("data/rules.json","w"),ensure_ascii=False)
json.dump(trainers,open("data/trainers.json","w"),ensure_ascii=False)
json.dump(wild,open("data/wild.json","w"),ensure_ascii=False)
json.dump(dict(species=species,moves=moves,items=[dict(key=k,name=n,price=p,kind=c,val=v) for k,n,p,c,v in items],gyms=GYMS,flags=sorted(flags),
  statics=[], chstep_key=chstep_key),open("data/game.json","w"),ensure_ascii=False)
print("maps",len(maps),"npcs",sum(len(m["npcs"]) for m in maps.values()),"rules",len(rules),"trainers",len(trainers),"wild areas",len(wild),"added roots",len(adds),"species",len(species),"moves",len(moves))
