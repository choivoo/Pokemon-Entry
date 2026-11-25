# -*- coding: utf-8 -*-
import sys, json, time
sys.path.insert(0,"tools")
from bdsl import *
import build_game, game_data as GD
t0=time.time()
fails=[]; passes=0
def ok(c,m):
    global passes
    if c: passes+=1
    else: fails.append(m)
ENT=None
def fresh():
    p=ProgFromEnt(ENT) if ENT else build_game.build_prog(); it=Interp(p,seed=5); return p,it
def setup_game(it):
    it.inputs=["1"]; it.call("title")  # new game
    return it
def replay(path,it,limit=None):
    tr=json.load(open(path)); ev=tr["trace"]
    W={n["id"]:n for m in GD.WORLD["maps"].values() for n in m["npcs"]}
    FS=it.lst["FS"]; it.setv("enc_on",0)
    it.stubs["draw_map"]=lambda i:None; it.stubs["place_actors"]=lambda i:None
    pend=[]; 
    def trainer_battle(i): r=pend.pop(0); i.setv("bres",1 if r=="win" else 2)
    def static_battle(i):
        r=pend.pop(0); i.setv("bres",{"caught":3,"fled":4,"win":1}.get(r,2))
    it.stubs["trainer_battle"]=trainer_battle; it.stubs["static_battle"]=static_battle
    it.stubs["heal_all"]=lambda i:None  # party state is validated separately
    it.input_fn=lambda i,pr:"2" if "세이브" in pr else "0"
    cmdmap={(0,1):1,(-1,0):2,(1,0):3,(0,-1):4}
    n=0; bad=0
    for k,e in enumerate(ev):
        if limit and k>limit: break
        t=e[0]
        if t=="m":
            it.setv("cmd",cmdmap[(e[1],e[2])]); it.call("try_move")
            got=(it.var["mp"],it.var["px"],it.var["py"])
            if got!=(e[3],e[4],e[5]):
                bad+=1; fails.append(f"pos mismatch at ev {k}: blocks {got} engine {tuple(e[3:6])}")
                if bad>3: return False
                it.setv("mp",e[3]); it.setv("px",e[4]); it.setv("py",e[5])
        elif t=="i":
            nid=e[1]; npc=W[nid]
            # the next 'b'/'s' events belong to this interaction
            j=k+1; pend.clear()
            while j<len(ev) and ev[j][0] in("b","s"): pend.append(ev[j][1]); j+=1
            idx=GD.NIDX[nid]; dx=npc["x"]-it.var["px"]; dy=npc["y"]-it.var["py"]
            it.setv("pf",{(0,1):0,(-1,0):1,(1,0):2,(0,-1):3}[(dx,dy)]); it.call("talk")
            have=sum(1 for x in FS if x==1)
            if have!=e[2]:
                bad+=1; fails.append(f"flag count mismatch after {nid} (ev {k}): blocks {have} engine {e[2]}")
                if bad>3: return False
        elif t=="h":
            it.call("catch_hook")
        elif t=="w":
            it.setv("mp",e[1]); it.setv("px",e[2]); it.setv("py",e[3])
        n+=1
    names=[GD.FLAGS[i] for i,x in enumerate(FS) if x==1]
    ok(sorted(names)==tr["flags"],"final flags differ: only-blocks %s only-engine %s"%(sorted(set(names)-set(tr["flags"]))[:6],sorted(set(tr["flags"])-set(names))[:6]))
    ok((it.var["mp"],it.var["px"],it.var["py"])==(tr["map"],tr["x"],tr["y"]),"final position")
    ok(it.var["badges"]==tr["badges"],"badges %s vs %s"%(it.var["badges"],tr["badges"]))
    ok(it.var["cleared"]==1,"cleared flag in blocks")
    return True

def idempotence(it):
    """after a full playthrough, talking to every NPC twice must not change money/bag/party/flags"""
    snap=lambda: json.dumps([it.var["money"],it.lst["BAG"],it.var["pn"],it.var["bn"],it.lst["FS"],it.lst["PS_sp"]])
    it.stubs["trainer_battle"]=lambda i:i.setv("bres",2); it.stubs["static_battle"]=lambda i:i.setv("bres",2)
    skipk={GD.KIND["center"],GD.KIND["shop"]}; bad=[]
    for idx,(mid,n) in enumerate(GD.NPCS,1):   # first pass: claim anything still unclaimed (e.g. optional gifts)
        if GD.KIND[n["kind"]] in skipk: continue
        it.setv("mp",GD.MIDX[mid]); it.setv("cur_npc",idx); it.call("run_rules")
    for idx,(mid,n) in enumerate(GD.NPCS,1):
        if GD.KIND[n["kind"]] in skipk: continue
        it.setv("mp",GD.MIDX[mid]); it.setv("cur_npc",idx); b=snap(); it.call("run_rules"); it.call("run_rules")
        if snap()!=b: bad.append(n["id"])
    ok(not bad,"re-interaction changed state: %s"%bad[:5])
def gate_test():
    p,it=fresh(); it.setv("enc_on",0); it.stubs["place_actors"]=lambda i:None; it.stubs["draw_map"]=lambda i:None
    # H01_1 right door at (19,5): needs c1_lab,c1_lost
    it.setv("mp",GD.MIDX["H01_1"]); it.setv("px",18); it.setv("py",5); it.setv("cmd",3); it.call("try_move")
    ok((it.var["mp"],it.var["px"],it.var["py"])==(GD.MIDX["H01_1"],18,5),"locked door keeps player in place, got %s"%((it.var["mp"],it.var["px"],it.var["py"]),))
    ok(any("길이 열리지 않았다" in o for o in it.out),"locked door explains what is needed")
    for f in ("c1_lab","c1_lost"): it.lst["FS"][GD.FIDX[f]-1]=1
    it.setv("cmd",3); it.call("try_move"); ok(it.var["mp"]==GD.MIDX["R01_0"] and it.var["px"]==1,"door opens after flags, arrival tile not a door")
    it.setv("cmd",2); it.call("try_move"); ok(it.var["mp"]==GD.MIDX["R01_0"] and it.var["px"]==1 or it.var["mp"]==GD.MIDX["H01_1"],"no instant bounce on arrival")
    # walls and npc blocking
    p,it=fresh(); it.stubs["place_actors"]=lambda i:None; it.stubs["draw_map"]=lambda i:None; it.setv("enc_on",0)
    it.setv("mp",GD.MIDX["H01_0"]); it.setv("px",1); it.setv("py",1); it.setv("cmd",4); it.call("try_move"); ok(it.var["py"]==1,"wall blocks")
    it.setv("px",3); it.setv("py",4); it.setv("cmd",4); it.call("try_move"); ok(it.var["py"]==4,"npc tile blocks (center at 3,3)")
    # encounter does not trigger when disabled; busy lock prevents re-entrancy
    it.setv("busy",1); it.setv("cmd",3); it.call("handle_cmd"); ok(it.var["px"]==3,"busy lock ignores input")
if __name__=="__main__":
    args=sys.argv[1:]
    if args and args[0]=="--ent": ENT=args[1]; args=args[2:]
    which=args or ["build/trace_normal9.json"]
    for path in which:
        p,it=fresh(); setup_game(it); it.stubs["ending_scene"]=lambda i:i.out.append("ENDING")
        ok(it.var["mp"]==GD.MIDX["H01_0"] and it.var["pn"]==1,"new game state")
        t1=time.time(); replay(path,it); print(path,"replayed in %.0fs"%(time.time()-t1),"steps",it.steps)
        ok("ENDING" in it.out,"ending scene triggered"); idempotence(it)
    gate_test()
    print("pass",passes,"fail",len(fails)); [print(" ",f) for f in fails[:10]]
    sys.exit(1 if fails else 0)
