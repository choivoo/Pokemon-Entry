# -*- coding: utf-8 -*-
import sys, json, subprocess, random, math
sys.path.insert(0,"tools"); sys.path.insert(0,"tests")
from bdsl import *
import build_game, game_data as GD
fails=[]; passes=0
def ok(c,m):
    global passes
    if c: passes+=1
    else: fails.append(m)
def fresh(seed=3):
    p=build_game.build_prog(); it=Interp(p,seed=seed); it.inputs=["1"]; it.call("title"); it.stubs["draw_map"]=lambda i:None; it.stubs["place_actors"]=lambda i:None; return p,it
def js(code):
    return json.loads(subprocess.check_output(["node","-e","const E=require('./engine/engine.js');"+code],text=True))
p,it=fresh()
# 1 stats / type effectiveness vs engine
samples=[(25,5),(6,36),(150,70),(129,5),(1,100),(143,40)]
exp=js("console.log(JSON.stringify(%s.map(([sp,lv])=>[E.maxHp(sp,lv),...['attack','defense','special-attack','special-defense','speed'].map(k=>E.stat(sp,lv,k))])))" % json.dumps(samples))
for (sp,lv),row in zip(samples,exp):
    for k in range(1,7):
        it.setv("st_sp",sp); it.setv("st_lv",lv); it.setv("st_kind",k); it.call("calc_stat"); ok(it.var["st_out"]==row[k-1],f"stat {sp} lv{lv} kind{k}: {it.var['st_out']} vs {row[k-1]}")
for mt in range(1,19):
    for sp in (1,6,25,74,95,130,143):
        it.setv("te_mt",mt); it.setv("te_sp",sp); it.call("type_eff")
        e=js("console.log(JSON.stringify(E.eff(E.G.species?%s:0,E.SPECIES[%d].types)))"%(json.dumps(GD.TYPES[mt-1]),sp))
        ok(abs(it.var["te_out"]-e)<1e-9,f"type eff {GD.TYPES[mt-1]} vs {sp}")
# 2 damage: deterministic rnd => max roll, no crit
it.rndfn=lambda a,b: b
cases=[(25,20,0,74,20,GD.MVIDX["thunder-shock"]),(7,30,0,4,30,GD.MVIDX["tackle"]),(130,50,4,59,40,GD.MVIDX["surf"] if "surf" in GD.MVIDX else GD.MVIDX["tackle"])]
for a,al,ast,d,dl,mv in cases:
    for k,x in zip(("ds_asp","ds_alv","ds_ast","ds_dsp","ds_dlv","ds_mv"),(a,al,ast,d,dl,mv)): it.setv(k,x)
    it.call("calc_damage")
    r=js("const M=E.G.moves[%d];const A=E.mkMon(%d,%d);A.st=%s;const D=E.mkMon(%d,%d);const r=E.SPECIES;console.log(JSON.stringify(require('./engine/engine.js').__dmg?0:0))"%(mv-1,a,al,json.dumps(['','sleep','poison','paralysis','burn'][ast]),d,dl))
    # reference damage formula (independent re-derivation in python)
    M=GD.MOVES[mv-1]; sp=GD.SPECIES[a-1]; dp=GD.SPECIES[d-1]
    phys=M["cls"]=="physical"; A=math.floor(2*sp["base"]["attack" if phys else "special-attack"]*al/100)+5; Dv=math.floor(2*dp["base"]["defense" if phys else "special-defense"]*dl/100)+5
    if phys and ast==4: A//=2
    stab=1.5 if M["type"] in sp["types"] else 1; e=1
    for t in dp["types"]: e*=GD.TC["chart"][GD.TYIDX[M["type"]]-1][GD.TYIDX[t]-1]
    base=math.floor(math.floor(math.floor(2*al/5+2)*M["power"]*A/Dv)/50)+2
    ref=math.floor(base*stab*e*1*(100)/100) if e>0 else 0
    if e>0 and ref<1: ref=1
    ok(it.var["ds_dmg"]==ref,f"damage {sp['name']}->{dp['name']} {M['key']}: blocks {it.var['ds_dmg']} ref {ref}")
it.rndfn=None
# 3 level-up / learn / evolution
p,it=fresh(); it.rndfn=None
it.setv("g_sp",4); it.setv("g_lv",15); it.call("add_mon"); i=it.var["pn"]
it.setv("xp_i",i); it.setv("xp_amt",16**3-it.lst["PS_exp"][i-1]+1); it.call("give_exp")
ok(it.lst["PS_sp"][i-1]==5 and it.lst["PS_lv"][i-1]==16,"charmander evolves at 16: sp=%s lv=%s"%(it.lst["PS_sp"][i-1],it.lst["PS_lv"][i-1]))
st=it.lst["PS_hp"][i-1]; it.setv("st_sp",5); it.setv("st_lv",16); it.call("max_hp"); ok(0<st<=it.var["st_out"],"hp after evolve within max")
ok(it.lst["DEX"][4]==2,"dex updated on evolve")
# stone evolution
it.lst["BAG"][GD.IIDX["fire-stone"]-1]=1; it.setv("g_sp",58); it.setv("g_lv",20); it.call("add_mon"); j=it.var["pn"]
it.setv("ui_item",GD.IIDX["fire-stone"]); it.setv("ui_i",j); it.call("use_stone"); ok(it.lst["PS_sp"][j-1]==59 and it.lst["BAG"][GD.IIDX["fire-stone"]-1]==0,"stone evolution consumes stone")
it.lst["BAG"][GD.IIDX["fire-stone"]-1]=1; it.setv("ui_i",1); it.call("use_stone"); ok(it.lst["BAG"][GD.IIDX["fire-stone"]-1]==1,"wrong-target stone not consumed")
# 4 battles: scripted, many trials vs engine win-rates
def blocks_battle(sp,lv,esp,elv,seed):
    p,it=fresh(seed); it.setv("pn",0); it.setv("g_sp",sp); it.setv("g_lv",lv); it.call("add_mon")
    it.setv("w_sp",esp); it.setv("w_lv",elv); it.setv("is_trainer",0)
    it.input_fn=lambda i,pr: "1" if "1 기술" in pr else ("1" if "기술 선택" in pr else "1")
    before=list(it.lst["PS_exp"]); it.call("foe_setup_single"); it.call("battle_run")
    mx=it.var["pn"]
    ok(all(h>=0 for h in it.lst["PS_hp"]) and all(h>=0 for h in it.lst["FO_hp"]),"hp nonneg")
    ok(all(x>=0 for x in it.lst["PS_pp"]),"pp nonneg")
    return it.var["bres"],it
res=[blocks_battle(25,20,19,8,s)[0] for s in range(60)]
ok(res.count(1)>=55,"strong mon wins wild battle %s"%res.count(1))
res2=[blocks_battle(19,5,25,20,s)[0] for s in range(40)]
ok(res2.count(1)<=2,"weak mon rarely wins %d"%res2.count(1))
# engine comparison for even matchup: pikachu 12 vs geodude 12 (immune) etc -> win rates within tolerance
def engine_rate(sp,lv,esp,elv,n=200):
    return js("""let w=0;const n=%d;for(let i=0;i<n;i++){const s=E.newState(1000+i);s.party=[E.mkMon(%d,%d)];const b=E.newBattle(s,[E.mkMon(%d,%d)],{wild:true});b.part=new Set([0]);let g=0;while(!b.over&&g++<400){E.turn(b,{t:'move',k:s.party[0].moves[0].k})}if(b.result==='win')w++}console.log(w/n)"""%(n,sp,lv,esp,elv))
for sp,lv,esp,elv in [(25,12,16,12),(7,14,4,14),(1,10,10,10)]:
    er=engine_rate(sp,lv,esp,elv)
    wins=0;n=80
    for s in range(n):
        p,it=fresh(500+s); it.setv("pn",0); it.setv("g_sp",sp); it.setv("g_lv",lv); it.call("add_mon"); it.setv("w_sp",esp); it.setv("w_lv",elv); it.setv("is_trainer",0)
        it.input_fn=lambda i,pr: "1"; it.call("foe_setup_single"); it.call("battle_run"); wins+= it.var["bres"]==1
    ok(abs(wins/n-er)<=0.18,f"win rate {sp}v{esp}: blocks {wins/n:.2f} engine {er:.2f}")
# 5 capture
def cap_rate_blocks(sp,lv,ball,grade,n=300):
    got=0; used_ok=True
    for s in range(n):
        p,it=fresh(900+s); it.lst["BAG"][ball-1]=5
        it.setv("c_sp",sp); it.setv("c_lv",lv); it.setv("c_over",0); it.setv("c_res",0); it.setv("c_bait",0)
        it.setv("st_sp",sp); it.setv("st_lv",lv); it.call("max_hp"); it.setv("c_hp",it.var["st_out"]); it.setv("tb_ball",ball); it.setv("tb_grade",grade)
        pn0=it.var["pn"]; it.call("throw_ball")
        used_ok&= it.lst["BAG"][ball-1]==4
        got+= it.var["c_res"]==1
        if it.var["c_res"]==1: used_ok&= it.var["pn"]==pn0+1
    return got/n,used_ok
def cap_rate_engine(sp,lv,ball,grade,n=3000):
    return js("""let c=0;for(let i=0;i<%d;i++){const s=E.newState(7000+i);s.bag['%s']=5;const k=E.newCatch(s,%d,%d,'slow');E.throwBall(s,k,'%s','%s');if(k.result==='caught')c++}console.log(c/%d)"""%(n,ball,sp,lv,ball,grade,n))
for sp,lv,ball,grade,gname in [(16,5,1,2,"great"),(129,5,2,3,"excellent"),(143,40,3,1,"nice")]:
    br,u=cap_rate_blocks(sp,lv,ball,grade); er=cap_rate_engine(sp,lv,GD.ITEMS[ball-1]["key"],gname)
    ok(u,f"ball accounting sp{sp}"); ok(abs(br-er)<=0.09,f"capture rate sp{sp}: blocks {br:.2f} engine {er:.2f}")
# miss: ball spent, no capture
p,it=fresh(); it.lst["BAG"][0]=3; it.setv("c_sp",16); it.setv("c_lv",5); it.setv("c_over",0); it.setv("tb_ball",1); it.setv("tb_grade",0); it.call("throw_ball"); ok(it.lst["BAG"][0]==2,"miss still costs one ball")
# capture screen: scripted - one input => one ball; no balls => safe exit
p,it=fresh(); it.lst["BAG"][0]=0; it.setv("c_sp",16); it.setv("c_lv",5); it.inputs=["1"]; it.call("capture_screen"); ok(it.var["c_over"]==1 and it.var["pn"]==1,"capture screen with no balls exits safely")
p,it=fresh(11); it.lst["BAG"][0]=4; it.setv("c_sp",16); it.setv("c_lv",5)
def aim(i):
    i.setv("cmd",5)
it.on_wait=aim; it.input_fn=lambda i,pr:"1" if "던지기" in pr else "1"
b0=it.lst["BAG"][0]; it.call("capture_screen"); used=b0-it.lst["BAG"][0]
ok(used>=1 and used<=4,"capture screen consumed %d balls"%used); ok(it.var["c_over"]==1,"capture screen terminates")
ok(it.var["pn"]+it.var["bn"]==(2 if it.var["c_res"]==1 else 1),"caught registered exactly once")
# party full -> box
p,it=fresh(21)
for _ in range(5): it.setv("g_sp",19); it.setv("g_lv",5); it.call("add_mon")
ok(it.var["pn"]==6,"party 6"); it.setv("g_sp",129); it.setv("g_lv",5); it.call("add_mon"); ok(it.var["pn"]==6 and it.var["bn"]==1 and it.var["where"]==2,"full party -> box")
# box ops
it.input_fn=None
it.inputs=["2","6"]; it.call("box_view"); ok(it.var["pn"]==5 and it.var["bn"]==2,"deposit moves one mon (pn=%d bn=%d)"%(it.var["pn"],it.var["bn"]))
it.input_fn=None; it.inputs=["1","1"]; it.call("box_view"); ok(it.var["pn"]==6 and it.var["bn"]==1,"withdraw (pn=%d bn=%d)"%(it.var["pn"],it.var["bn"]))
it.inputs=["1","1"]; it.call("box_view"); ok(it.var["pn"]==6 and it.var["bn"]==1,"withdraw refused when party full")
# box full
p,it=fresh(77)
for _ in range(5): it.setv("g_sp",19); it.setv("g_lv",5); it.call("add_mon")
for _ in range(200): it.setv("g_sp",16); it.setv("g_lv",3); it.call("add_mon")
ok(it.var["pn"]==6 and it.var["bn"]==200,"box fills to 200 (bn=%d)"%it.var["bn"])
it.setv("g_sp",129); it.setv("g_lv",5); it.call("add_mon"); ok(it.var["where"]==3 and it.var["bn"]==200 and it.var["pn"]==6,"box full -> not added")
it.setv("mp",GD.MIDX["H02_0"]); it.lst["FS"][GD.FIDX["c2_hub"]-1]=1; gi=GD.NIDX["n_gift_squirtle"]; it.setv("cur_npc",gi); it.call("run_rules")
ok(it.lst["FS"][GD.FIDX["got_n_gift_squirtle"]-1]==0,"gift flag not set when box full")
# 6 shop
p,it=fresh(); it.setv("money",1000); shopidx=1
it.setv("ra1",1); it.inputs=["1","3","0"]; it.call("shop_menu"); ok(it.var["money"]==1000-3*GD.ITEMS[GD.IIDX[ "monster-ball"]-1]["price"] and it.lst["BAG"][0]==8,"buy 3 balls")
m0=it.var["money"]; it.inputs=["1","-5","0"]; it.call("shop_menu"); ok(it.var["money"]==m0,"negative quantity rejected")
it.inputs=["1","99","0"]; it.call("shop_menu"); ok(it.var["money"]==m0 or it.var["money"]>=0,"over-budget purchase not negative money"); ok(it.var["money"]>=0,"money never negative")
# 7 save roundtrip & corruption
p,it=fresh(31); it.setv("g_sp",129); it.setv("g_lv",9); it.call("add_mon"); it.lst["FS"][5]=1; it.lst["FS"][100]=1; it.lst["BAG"][3]=7; it.setv("money",4321); it.setv("badges",5); it.lst["DEX"][3]=2
for _ in range(5): it.setv("g_sp",52); it.setv("g_lv",9); it.call("add_mon")
it.call("save_encode"); code=it.var["save_code"]
def snapshot(i): return json.dumps([i.var.get(k) for k in ("mp","px","py","money","badges","cleared","pn","bn")]+[i.lst[k] for k in ("FS","DEX","BAG","PS_sp","PS_lv","PS_hp","BX_sp")])
def tryload(c, base):
    base.setv("save_code",c); base.call("save_decode"); return base.var["ld_err"]
p2,it2=fresh(32); snap0=snapshot(it2); e=tryload(code,it2)
ok(e=="","valid save loads: err=%r"%e); it2.call("save_encode"); ok(it2.var["save_code"]==code,"encode(decode(x)) == x")
ok(snapshot(it2)==snapshot(it),"loaded state == saved state")
def ck(body):
    a=0
    for ch in body:
        c={"|":11,":":12,"~":13,".":14,"-":15,"E":16,"K":17}.get(ch)
        if c is None: c=int(ch)+1 if ch.isdigit() else 18
        a=(a*131+c)%1000003
    return a
parts=code.split("|"); body="|".join(parts[:-1])
def rebuild(fields): b="|".join(fields); return b+"|"+str(ck(b))
f=parts[:-1]
bad={"checksum":code[:-1]+("1" if code[-1]!="1" else "2"),"version":rebuild(["EK2"]+f[1:]),"unknown map":rebuild([f[0],"9999"]+f[2:]),"neg money":rebuild(f[:4]+["-5"]+f[5:]),"wall pos":rebuild([f[0],f[1],"0","0"]+f[4:]),
 "neg qty":rebuild(f[:10]+[f[10].replace(f[10].split(".")[0],"-3",1)]+f[11:]),"bad species":rebuild(f[:11]+[f[11].replace(f[11].split(":")[0],"999",1)]+f[12:]),"garbage":"hello","empty":"","trunc":code[:50],"flag len":rebuild(f[:8]+[f[8]+"1"]+f[9:]),
 "hp over":rebuild(f[:11]+[":".join([f[11].split(":")[0],f[11].split(":")[1],f[11].split(":")[2],"99999"]+f[11].split("~")[0].split(":")[4:])+("~"+"~".join(f[11].split("~")[1:]) if "~" in f[11] else "")]+f[12:])}
for name,c in bad.items():
    p3,it3=fresh(40); s0=snapshot(it3); e=tryload(c,it3); ok(e!="",f"bad save '{name}' accepted"); ok(snapshot(it3)==s0,f"state mutated by bad save '{name}'")
# 8 center heal/shop/gate behaviours via blocks
p,it=fresh(); it.lst["PS_hp"][0]=1; it.lst["PS_st"][0]=2; it.call("heal_all"); it.setv("st_sp",25); it.setv("st_lv",5); it.call("max_hp"); ok(it.lst["PS_hp"][0]==it.var["st_out"] and it.lst["PS_st"][0]==0,"heal restores hp/status")

# ---- new systems ----
def fresh2(seed=3):
    p,it=fresh(seed); it.stubs["redraw_dark"]=lambda i:None; return p,it
# stat stages: exec growl on foe, swords-dance on self, staged damage
p,it=fresh2(); it.rndfn=lambda a,b:b
it.setv("g_sp",19); it.setv("g_lv",10); it.call("foe_setup_single") if False else None
it.setv("w_sp",19); it.setv("w_lv",10); it.call("foe_setup_single"); it.setv("pa",1); it.setv("fi",1)
GR=GD.MVIDX["growl"]; SD=GD.MVIDX["swords-dance"]
it.setv("ex_mvidx",GR); it.setv("slp_p",0); it.call("exec_p"); ok(it.lst["FO_stg"][0]==-1,"growl lowers foe attack stage (%s)"%it.lst["FO_stg"][:5])
it.setv("ex_mvidx",SD); it.call("exec_p"); ok(it.lst["PS_stg"][0]==2,"swords dance raises own attack by 2 (%s)"%it.lst["PS_stg"][:5])
for _ in range(5): it.call("exec_p")
ok(it.lst["PS_stg"][0]==6,"stage clamps at +6")
# staged damage vs reference
for g in (-2,0,3):
    it.setv("ds_asp",19); it.setv("ds_alv",30); it.setv("ds_ast",0); it.setv("ds_dsp",74); it.setv("ds_dlv",30); it.setv("ds_mv",GD.MVIDX["tackle"]); it.setv("ds_asg",g); it.setv("ds_dsg",0); it.call("calc_damage")
    mul=(2+g)/2 if g>=0 else 2/(2-g); A=math.floor((math.floor(2*GD.SPECIES[18]["base"]["attack"]*30/100)+5)*mul); Dv=math.floor(2*GD.SPECIES[73]["base"]["defense"]*30/100)+5
    base=math.floor(math.floor(math.floor(2*30/5+2)*GD.MOVES[GD.MVIDX["tackle"]-1]["power"]*A/Dv)/50)+2
    e=1
    for t in GD.SPECIES[73]["types"]: e*=GD.TC["chart"][GD.TYIDX["normal"]-1][GD.TYIDX[t]-1]
    stab=1.5 if "normal" in GD.SPECIES[18]["types"] else 1
    ref=max(1,math.floor(base*stab*e)) if e>0 else 0
    ok(it.var["ds_dmg"]==ref,f"staged damage g={g}: {it.var['ds_dmg']} vs {ref}")
it.rndfn=None
# trainer sight + rival loss branch
tn=next(n for n in GD.WORLD["maps"]["R01_2"]["npcs"] if n["kind"]=="trainer" and n["id"]=="n_c1_tr1") if any(n["id"]=="n_c1_tr1" for n in GD.WORLD["maps"]["R01_2"]["npcs"]) else None
for mid,m in GD.WORLD["maps"].items():
    for n in m["npcs"]:
        if n["id"]=="n_c1_tr1": tn=n; tmid=mid
p,it=fresh2(); it.stubs["place_actors"]=lambda i:None
calls=[]; it.stubs["trainer_battle"]=lambda i:(calls.append(i.var["tr_idx"]),i.setv("bres",1))
it.setv("mp",GD.MIDX[tmid]); 
placed=None
for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
    for dd in (3,2,1):
        x,y=tn["x"]+dx*dd,tn["y"]+dy*dd
        if 0<=x<20 and 0<=y<11 and GD.WORLD["maps"][tmid]["tiles"][y][x] in ".g" and all(GD.WORLD["maps"][tmid]["tiles"][tn["y"]+dy*k][tn["x"]+dx*k] in ".g" for k in range(1,dd)): placed=(x,y)
it.setv("px",placed[0]); it.setv("py",placed[1]); it.call("check_sight"); ok(len(calls)==1,"trainer sees player within 3 tiles -> fight starts (%d)"%len(calls))
ok(it.lst["FS"][GD.FIDX["c1_tr1"]-1]==1,"sight fight win sets trainer flag"); it.call("check_sight"); ok(calls.count(GD.TRIDX["t_c1_tr1"])==1,"defeated trainer no longer triggers")
p,it=fresh2(); it.stubs["place_actors"]=lambda i:None; it.stubs["trainer_battle"]=lambda i:i.setv("bres",2); it.stubs["whiteout"]=lambda i:None
for mid,m in GD.WORLD["maps"].items():
    for n in m["npcs"]:
        if n["id"]=="n_c1_rival": rmid=mid
it.setv("mp",GD.MIDX[rmid]); it.setv("cur_npc",GD.NIDX["n_c1_rival"]); it.call("run_rules")
ok(it.lst["FS"][GD.FIDX["c1_rival_lost"]-1]==1 and it.lst["FS"][GD.FIDX["c1_rival"]-1]==0,"rival loss records a lost flag, step not complete")
it.out.clear(); it.call("run_rules"); ok(any("또 나한테 졌지" in o for o in it.out),"rival says a different line after a loss")
# visible wild movement behaviours
p,it=fresh2(); it.stubs["place_actors"]=lambda i:None; it.stubs["wild_prompt"]=lambda i:None; it.stubs["draw_map"]=lambda i:None
it.setv("mp",GD.MIDX["R01_1"]); it.setv("enc_on",1); it.call("spawn_wild")
x0,y0=it.var["vw1x"],it.var["vw1y"]; it.setv("vw1beh",4); it.setv("px",max(1,min(18,x0+3))); it.setv("py",y0)
it.rndfn=lambda a,b:a; d0=abs(it.var["vw1x"]-it.var["px"])+abs(it.var["vw1y"]-it.var["py"]); 
for _ in range(6): it.call("wild_step")
d1=abs(it.var["vw1x"]-it.var["px"])+abs(it.var["vw1y"]-it.var["py"]); ok(d1<=d0,"approaching wild does not move away (%d->%d)"%(d0,d1))
tiles=GD.WORLD["maps"]["R01_1"]["tiles"]; ok(tiles[it.var["vw1y"]][it.var["vw1x"]] in ".g","wild stays on walkable tile")
it.setv("vw1beh",3); it.setv("px",it.var["vw1x"]+1 if it.var["vw1x"]<18 else it.var["vw1x"]-1); it.setv("py",it.var["vw1y"]); d0=1
for _ in range(4): it.call("wild_step")
d2=abs(it.var["vw1x"]-it.var["px"])+abs(it.var["vw1y"]-it.var["py"]); ok(d2>=d0,"fleeing wild does not approach")
it.rndfn=None
# day/night weighting
def night_share(steps):
    cnt=0; N=400
    for s_ in range(N):
        p,it=fresh2(1000+s_); it.setv("mp",GD.MIDX["D04_1"]); it.setv("steps",steps); it.call("wild_roll"); cnt+= GD.SPECIES[it.var["w_sp"]-1]["types"].__contains__("ghost") or GD.SPECIES[it.var["w_sp"]-1]["types"].__contains__("poison")
    return cnt/N
dn,nn=night_share(0),night_share(300); ok(nn>dn+0.1,"night raises ghost/poison share (day %.2f night %.2f)"%(dn,nn))
# darkness radius
p,it=fresh2(); it.setv("mp",GD.MIDX["D02_1"]); it.setv("px",5); it.setv("py",5); it.setv("aff",0); it.call("draw_tiles"); s_dark=it.stamps
p,it=fresh2(); it.setv("mp",GD.MIDX["R01_1"]); it.setv("px",5); it.setv("py",5); it.call("draw_tiles"); s_light=it.stamps
ok(s_dark<s_light//2,"dark cave stamps far fewer tiles (%d vs %d)"%(s_dark,s_light))
p,it=fresh2(); it.setv("mp",GD.MIDX["D02_1"]); it.setv("px",5); it.setv("py",5); it.setv("aff",50); it.call("draw_tiles"); ok(it.stamps>s_dark,"affection widens light radius")
# pikachu sniff + bond
p,it=fresh2(); it.setv("mp",GD.MIDX["H01_0"]); it.setv("px",3); it.setv("py",5); it.call("pika_sniff"); ok(any("할 일이" in o and "있어" in o for o in it.out),"sniff finds unfinished step on screen: %s"%it.out[-2:])
for i_ in range(len(it.lst["FS"])): it.lst["FS"][i_]=1
it.out.clear(); it.call("pika_sniff"); ok(any("지금 할 일이 없어" in o for o in it.out),"sniff says none when screen is done")
it.rndfn=lambda a,b:b
for aff,exp in ((0,1.0),(40,1.1)):
    it.setv("aff",aff)
    for k,x in zip(("ds_asp","ds_alv","ds_ast","ds_dsp","ds_dlv","ds_mv","ds_asg","ds_dsg"),(25,20,0,19,20,GD.MVIDX["thunder-shock"],0,0)): it.setv(k,x)
    it.call("calc_damage"); (base if aff==0 else None) if False else None
    if aff==0: b0=it.var["ds_dmg"]
    else: ok(it.var["ds_dmg"]==math.floor(b0*1.1),"bond bonus x1.1 for Pikachu at affection>=30 (%s vs %s)"%(it.var["ds_dmg"],b0))
it.rndfn=None
# panel menu + settings
p,it=fresh2(); it.inputs=["0"]; it.call("party_view"); ok(any("피카츄 Lv5" in h for h in it.hudlog),"party panel lists Pikachu with HP bar: %s"%it.hudlog[-1:])
it.inputs=["3","1"]; it.call("settings"); ok(it.var["txt_wait"]==0.8,"text speed setting"); it.inputs=["4","3"]; it.call("settings"); ok(it.var["vol"]==3,"volume setting"); it.inputs=["5"]; it.call("settings"); ok(it.var["fx_blink"]==0,"blink toggle")
it.inputs=["4","99"]; it.call("settings"); ok(it.var["vol"]==3,"volume out of range rejected")
# epilogue NPC only speaks after the ending
p,it=fresh2(); it.setv("mp",GD.MIDX["H02_1"]); it.setv("cur_npc",GD.NIDX["n_H02_epi"]); it.call("run_rules"); ok(any("평범한 이야기" in o for o in it.out),"epilogue NPC quiet before ending")
it.lst["FS"][GD.FIDX["c12_end"]-1]=1; it.out.clear(); it.call("run_rules"); ok(any("낙반 방지" in o for o in it.out),"epilogue NPC speaks after ending")
print("blocks2: pass",passes,"fail",len(fails)); [print(" ",f) for f in fails[:15]]
sys.exit(1 if fails else 0)
