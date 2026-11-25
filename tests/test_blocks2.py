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
print("blocks2: pass",passes,"fail",len(fails)); [print(" ",f) for f in fails[:15]]
sys.exit(1 if fails else 0)
