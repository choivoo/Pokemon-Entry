# -*- coding: utf-8 -*-
"""Part A: data lists, field movement, exits/gates, NPC rule interpreter."""
from bdsl import *
from game_data import *
def mk(x): return x
def data_lists():
    # maps
    rows=[]; mtheme=[]; mname=[]; marea=[]; mn_s=[]; mn_c=[]; mkind=[]
    nidx=0
    for mid in MAPS:
        m=WORLD["maps"][mid]; rows+=m["tiles"]; mtheme.append(THIDX[next(a for a in WORLD["areas"] if a["id"]==m["area"])["theme"]]); mname.append(m["name"]); marea.append(AIDX[m["area"]])
        mn_s.append(nidx+1); mn_c.append(len(m["npcs"])); nidx+=len(m["npcs"])
    l("T_rows",rows); l("M_theme",mtheme); l("M_name",mname); l("M_area",marea); l("M_nstart",mn_s); l("M_ncount",mn_c)
    l("X_map",[e[0] for e in EXITS]); l("X_x",[e[1] for e in EXITS]); l("X_y",[e[2] for e in EXITS]); l("X_to",[e[3] for e in EXITS]); l("X_tx",[e[4] for e in EXITS]); l("X_ty",[e[5] for e in EXITS]); l("X_gate",[e[6] for e in EXITS])
    gid=[];gfl=[]
    for i,g in enumerate(GATES):
        for f in g: gid.append(i+1); gfl.append(FIDX[f])
    l("G_id",gid); l("G_flag",gfl)
    # first row index of gate: simple scan at runtime
    l("F_clue",[1 if "_clue" in f else 0 for f in FLAGS]); l("F_name",FLAGS); l("F_title",[TITLES.get(f,"") for f in FLAGS]); l("FS",[0]*len(FLAGS))
    l("N_map",[MIDX[m] for m,n in NPCS]); l("N_x",[n["x"] for m,n in NPCS]); l("N_y",[n["y"] for m,n in NPCS]); l("N_kind",[KIND[n["kind"]] for m,n in NPCS]); l("N_label",[n["label"] for m,n in NPCS])
    tf=[]; stp=[]
    for m,n in NPCS:
        rr=RBY.get(n["id"],[]); b=next((x for x in rr if x["act"]=="battle"),None)
        tf.append(FIDX[b["set"]] if (n["kind"]=="trainer" and b) else 0)
        st=next((FIDX[x["set"]] for x in rr if x["set"] and TITLES.get(x["set"])),0); stp.append(st)
    on1=[];on2=[]
    for m,n in NPCS:
        sets=[FIDX[x["set"]] for x in RBY.get(n["id"],[]) if x["set"] and n["kind"]=="switch"]
        on1.append(sets[0] if sets else 0); on2.append(sets[1] if len(sets)>1 else 0)
    l("N_on1",on1); l("N_on2",on2)
    l("M_hflag",[FIDX.get("open_"+m,0) for m in MAPS]); l("N_tflag",tf); l("N_step",stp)
    l("M_dark",[1 if next(a for a in WORLD["areas"] if a["id"]==WORLD["maps"][m]["area"])["theme"] in ("cave","cellar","ship","hq") else 0 for m in MAPS])
    rs=[];rc=[]; R=[]
    for m,n in NPCS:
        rr=RBY.get(n["id"],[]); rs.append(len(R)+1); rc.append(len(rr)); R+=rr
    l("N_rstart",rs); l("N_rcount",rc)
    def fi(f): return FIDX[f] if f else 0
    l("R_req",[fi(r["req"]) for r in R]); l("R_nreq",[fi(r["nreq"]) for r in R]); l("R_act",[ACT[r["act"]] for r in R]); l("R_set",[fi(r["set"]) for r in R])
    cl=[(r["clr"].split(",")+["","","",""])[:4] for r in R]; l("R_clr1",[fi(c[0]) for c in cl]); l("R_clr2",[fi(c[1]) for c in cl]); l("R_clr3",[fi(c[2]) for c in cl]); l("R_clr4",[fi(c[3]) for c in cl]); l("R_text",[r["text"] for r in R])
    a1=[];a2=[]; shops=[]
    for r in R:
        x=y=0
        if r["act"]=="give": k,q=r["arg"].split(":"); x,y=IIDX[k],int(q)
        elif r["act"] in("gift","static"): x,y=map(int,r["arg"].split(":"))
        elif r["act"]=="mission": x=AIDX[r["arg"]]
        elif r["act"]=="battle": x=TRIDX[r["arg"]]; y=FIDX[r["lose"]] if r.get("lose") else 0
        elif r["act"]=="shop": shops.append([IIDX[k] for k in r["arg"].split(",")]); x=len(shops)
        a1.append(x); a2.append(y)
    l("R_a1",a1); l("R_a2",a2)
    l("SH_start",[]); l("SH_count",[]); l("SH_item",[])
    s=[];c=[];it=[]
    for sh in shops: s.append(len(it)+1); c.append(len(sh)); it+=sh
    P.lists["SH_start"][1]=s; P.lists["SH_count"][1]=c; P.lists["SH_item"][1]=it
    # items
    kind={"ball":1,"bait":2,"heal":3,"revive":5,"stone":6,"key":7,"balm":8}
    def ik(i):
        if i["kind"].startswith("cure:"): return 4
        return kind[i["kind"]]
    cm={"poison":2,"paralysis":3,"burn":4,"sleep":1,"all":9}
    l("I_name",[i["name"] for i in ITEMS]); l("I_price",[i["price"] for i in ITEMS]); l("I_kind",[ik(i) for i in ITEMS]); l("I_val",[i["val"] for i in ITEMS]); l("I_cure",[cm[i["kind"][5:]] if i["kind"].startswith("cure:") else 0 for i in ITEMS])
    l("I_key",[i["key"] for i in ITEMS]); l("BAG",[0]*len(ITEMS))
    # species
    S=SPECIES
    l("S_name",[s["name"] for s in S]); l("S_t1",[TYIDX[s["types"][0]] for s in S]); l("S_t2",[TYIDX[s["types"][1]] if len(s["types"])>1 else 0 for s in S])
    for k,key in (("hp","hp"),("atk","attack"),("def","defense"),("spa","special-attack"),("spd","special-defense"),("spe","speed")): l("S_"+k,[s["base"][key] for s in S])
    l("S_exp",[s["exp"] for s in S]); l("S_cap",[s["capture"] for s in S]); l("S_desc",[s["desc"] for s in S])
    # level evolution target: species id -> evolves into (by level) ; stone rows
    evt=[0]*NSP; evl=[0]*NSP; er_from=[];er_to=[];er_item=[]
    for s in S:
        e=s["evo"]
        if not e: continue
        if "level" in e: evt[e["from"]-1]=s["id"]; evl[e["from"]-1]=e["level"]
        else: er_from.append(e["from"]); er_to.append(s["id"]); er_item.append(IIDX[e["item"]])
    l("S_evto",evt); l("S_evlv",evl); l("E_from",er_from); l("E_to",er_to); l("E_item",er_item)
    ln_s=[];ln_c=[];lsp=[];llv=[];lmv=[]
    for s in S:
        ln_s.append(len(lsp)+1); ln_c.append(len(s["learn"]))
        for lv,k in s["learn"]: lsp.append(s["id"]); llv.append(lv); lmv.append(MVIDX[k])
    l("LN_start",ln_s); l("LN_count",ln_c); l("LN_lv",llv); l("LN_mv",lmv)
    l("M_nm",[m["name_ko"] for m in MOVES]); l("MV_type",[TYIDX[m["type"]] for m in MOVES]); l("MV_pow",[m["power"] for m in MOVES]); l("MV_acc",[m["acc"] for m in MOVES]); l("MV_pp",[m["pp"] for m in MOVES])
    l("MV_prio",[m["prio"] for m in MOVES]); l("MV_cls",[CLS[m["cls"]] for m in MOVES]); l("MV_ail",[AIL.get(m["ailment"],0) for m in MOVES]); l("MV_chance",[m["ail_chance"] for m in MOVES]); l("MV_drain",[m["drain"] for m in MOVES]); l("MV_crit",[m["crit"] for m in MOVES])
    def sc(m,i,k): return m["sc"][i][k] if len(m["sc"])>i else 0
    l("MV_s1",[sc(m,0,0) for m in MOVES]); l("MV_d1",[sc(m,0,1) for m in MOVES]); l("MV_s2",[sc(m,1,0) for m in MOVES]); l("MV_d2",[sc(m,1,1) for m in MOVES])
    l("STAT_name",["","공격","방어","특수공격","특수방어","스피드","명중률","회피율"]); WM={"canal":1,"coast":1,"tide":1,"harbor":1,"swamp":1,"volcano":2,"desert":3,"mountain":4}
    l("TH_weather",[WM.get(t,0) for t in THEMES]); l("S_abil",[sp.get("abil",0) for sp in SPECIES]); l("MV_two",[m.get("two",0) for m in MOVES]); l("MV_rech",[m.get("rech",0) for m in MOVES]); l("MV_self",[1 if m["sc_self"] else 0 for m in MOVES]); l("MV_schance",[m["stat_chance"] for m in MOVES])
    l("TC",[x for row in TC["chart"] for x in row]); l("TYPE_name",TYPES)
    # trainers
    l("TR_name",[TR[t]["name"] for t in TRIDS]); l("TR_reward",[TR[t]["reward"] for t in TRIDS]); l("TR_badge",[TR[t].get("badge",0) for t in TRIDS]); l("TR_n",[len(TR[t]["party"]) for t in TRIDS])
    tsp=[];tlv=[]
    for t in TRIDS:
        p=TR[t]["party"]
        for k in range(6): tsp.append(p[k]["sp"] if k<len(p) else 0); tlv.append(p[k]["lv"] if k<len(p) else 0)
    l("TR_sp",tsp); l("TR_lv",tlv); l("TR_kind",[{"gym":3,"league":3,"rival":2,"rocket":2}.get(TR[t]["kind"],1) for t in TRIDS])
    # wild
    ws=[];wc=[];wt=[];wsp=[];ww=[];wlo=[];whi=[]
    for a in AREAS:
        if a in WILD:
            ents=WILD[a]["entries"]; ws.append(len(wsp)+1); wc.append(len(ents)); wt.append(sum(e["w"] for e in ents))
            for e in ents: wsp.append(e["sp"]); ww.append(e["w"]); wlo.append(e["lo"]); whi.append(e["hi"])
        else: ws.append(0); wc.append(0); wt.append(0)
    BEH={"slow":1,"pause":2,"flee":3,"approach":4}
    wb=[BEH.get(e["beh"],1) for a in AREAS if a in WILD for e in WILD[a]["entries"]]
    l("W_beh",wb); l("S_night",[1 if set(sp["types"])&{"ghost","poison","psychic","dark"} else 0 for sp in SPECIES]); l("W_start",ws); l("W_count",wc); l("W_total",wt); l("W_sp",wsp); l("W_w",ww); l("W_lo",wlo); l("W_hi",whi)
    TL={"town":"(코를 킁킁) 집 냄새가 나. 안심돼.","meadow":"(풀 사이를 가리킨다) 저기 뭔가 움직여!","forest":"(귀를 쫑긋) 나뭇잎 소리 말고 다른 소리가 나.","quarry":"(바위를 톡톡) 단단하다. 낙석 조심해.","cave":"(꼬리를 곧게 세운다) 어두워... 내 뒤에 붙어.","canal":"(물소리에 귀를 기울인다) 물길이 막힌 곳이 있나 봐.","coast":"(바닷바람에 수염이 흔들린다) 짠 냄새!","harbor":"(뺨에서 파직) 전선이 많아. 전기 장치 근처야.","ship":"(몸을 웅크린다) 삐걱거리는 소리가 무서워...","market":"(냄새를 맡는다) 맛있는 열매 냄새!","cellar":"(콜록) 곰팡이 냄새. 환기구를 찾자.","rail":"(귀 끝이 파직 튄다) 선로에 전기가 흐르고 있어.","hill":"(높이 올라가려 한다) 전망이 좋을 것 같아.","lab":"(뺨이 따끔) 기계 소리... 전기 장치 단서가 있을지도.","swamp":"(발을 털며) 질척거려. 조용히 걷자.","city":"(두리번) 사람도 건물도 너무 많아!","tide":"(첨벙) 물이 빠지는 중이야.","volcano":"(땀을 닦는다) 뜨거워! 빨리 지나가자.","desert":"(눈을 가늘게 뜬다) 모래바람이야...","hq":"(털을 곤두세운다) 나쁜 기운이 느껴져.","mountain":"(몸을 부르르) 바람이 차가워.","road":"(앞장서 달려간다) 이 길이 챔피언로드로 이어지는 걸까?","league":"(기대에 찬 눈) 여기가 리그... 두근두근."}
    l("A_pika",[("(주먹을 불끈) 피카! 관장과의 승부다!" if a["theme"].startswith("gym") else TL[a["theme"]]) for a in WORLD["areas"]]); l("VIS",[0]*len(WORLD["areas"]))
    l("DEX",[0]*NSP); l("CHAIN_key",[FIDX[G["chstep_key"][str(c)]] for c in range(1,13)])

def M_dark_here(): return l("M_dark")[v("mp")]==1
def field_logic():
    mp=v("mp",1); px=v("px",3); py=v("py",5); pf=v("pf",0); money=v("money",3000); badges=v("badges",0); cleared=v("cleared",0)
    busy=v("busy",0); cmd=v("cmd",0); enc_on=v("enc_on",1); steps=v("steps",0); msg=v("msg",""); mode=v("mode",0)
    FS=l("FS"); T=l("T_rows")
    tx=v("tx"); ty=v("ty"); tch=v("tch",""); hit=v("hit"); ei=v("ei"); ok_=v("ok_"); gi=v("gi"); gmiss=v("gmiss"); mi=v("mi")
    with proc("tile_at"):  # in: tx,ty -> tch ('#' if out of range)
        with IfElse((tx<0)|(ty<0)|(tx>19)|(ty>10)) as ie:
            tch.set("#"); ie.other(); tch.set(charat(T[(mp-1)*11+ty+1],tx+1))
            with If(tch=="h"):
                with IfElse((l("M_hflag")[mp]>0)&(FS[l("M_hflag")[mp]]==1)) as ie2:
                    tch.set("."); ie2.other(); tch.set("#")
    with proc("npc_at"):   # in: tx,ty -> hit (npc idx or 0)
        hit.set(0); mi.set(l("M_nstart")[mp])
        with Repeat(l("M_ncount")[mp]):
            with If((l("N_x")[mi]==tx)&(l("N_y")[mi]==ty)): hit.set(mi)
            mi.inc()
    with proc("set_flag"):  # in: a1 (flag idx)
        a1=v("a1"); 
        with If(a1>0):
            FS.set(a1,1); v("pk_mood").set(2)
            with If(l("F_clue")[a1]==1): v("pk_mood").set(3)
            with If((a1==FIDX["c12_end"])&(cleared==0)): cleared.set(1); call("ending_scene")
    with proc("gate_check"):  # in: gi -> ok_ (1 if open), gmiss (first missing flag idx)
        ok_.set(1); gmiss.set(0); ei2=v("gci"); ei2.set(1)
        with If(gi>0):
            with Repeat(l("G_id").length()):
                with If((l("G_id")[ei2]==gi)&(ok_==1)):
                    with If(FS[l("G_flag")[ei2]]==0): ok_.set(0); gmiss.set(l("G_flag")[ei2])
                ei2.inc()
    with proc("check_exit"):  # called when player stands on door tile at (px,py)
        ei.set(1); v("exfound").set(0)
        with Repeat(l("X_map").length()):
            with If((l("X_map")[ei]==mp)&(l("X_x")[ei]==px)&(l("X_y")[ei]==py)&(v("exfound")==0)):
                v("exfound").set(1); gi.set(l("X_gate")[ei]); call("gate_check")
                with IfElse(ok_==1) as ie:
                    sfx("door"); mp.set(l("X_to")[ei]); px.set(l("X_tx")[ei]); py.set(l("X_ty")[ei]); call("draw_map"); v("moved_map").set(1)
                    ie.other()
                    say(join("길이 열리지 않았다. 아직 필요한 일: ",l("F_title")[gmiss],"")); 
                    # step back (undo move)
                    px.set(v("ox")); py.set(v("oy")); call("place_actors")
            ei.inc()
    with proc("try_move"):  # in: cmd 1..4 (down,left,right,up)
        dx=v("dx"); dy=v("dy"); dx.set(0); dy.set(0)
        with If(cmd==1): dy.set(1); pf.set(0)
        with If(cmd==2): dx.set(-1); pf.set(1)
        with If(cmd==3): dx.set(1); pf.set(2)
        with If(cmd==4): dy.set(-1); pf.set(3)
        v("last_moved").set(0); tx.set(px+dx); ty.set(py+dy); call("tile_at"); v("pk_mood").set(1)
        with If((tch=="D")|(tch==".")|(tch=="g")|((tch=="~")&(v("mount")==2))):
            call("npc_at")
            with If(hit==0):
                v("ox").set(px); v("oy").set(py); v("moved_map").set(0)
                px.set(tx); py.set(ty); steps.inc(); v("last_moved").set(1)
                with IfElse(tch=="D") as ie:
                    call("check_exit"); ie.other()
                    call("place_actors")
                with If((v("moved_map")==0)&(tch!="D")): call("check_sight")
                with If((v("moved_map")==0)&(enc_on==1)&(tch!="D")): call("wild_step"); call("check_visible_wild")
                with If((v("moved_map")==0)&(M_dark_here())): call("redraw_dark")
                with If((steps%25==0)&(v("aff")<100)): v("aff").inc()
                with If(steps%150==0): call("fx_tint_update")
                with If((tch=="g")&(v("moved_map")==0)&(enc_on==1)): call("maybe_encounter")
    with proc("check_sight"):  # trainers see 3 tiles along row/column when no wall is between; fires once per trainer
        v("sg_hit").set(0); i=v("sg_i"); i.set(l("M_nstart")[mp])
        with Repeat(l("M_ncount")[mp]):
            with If((v("sg_hit")==0)&(l("N_tflag")[i]>0)):
                with If(FS[l("N_tflag")[i]]==0):
                    nx=l("N_x")[i]; ny=l("N_y")[i]; d=v("sg_d"); d.set(0); v("sg_dx").set(0); v("sg_dy").set(0)
                    with If(nx==px):
                        d.set(py-ny); v("sg_dy").set(1)
                        with If(d<0): d.set(0-d); v("sg_dy").set(-1)
                    with If((nx!=px)&(ny==py)):
                        d.set(px-nx); v("sg_dx").set(1)
                        with If(d<0): d.set(0-d); v("sg_dx").set(-1)
                    with If((d>=1)&(d<=3)):
                        v("sg_ok").set(1); k=v("sg_k"); k.set(1)
                        with Repeat(d-1):
                            tx.set(nx+v("sg_dx")*k); ty.set(ny+v("sg_dy")*k); call("tile_at")
                            with If((tch!=".")&(tch!="g")): v("sg_ok").set(0)
                            k.inc()
                        with If(v("sg_ok")==1): v("sg_hit").set(1); v("cur_npc").set(i)
            i.inc()
        with If(v("sg_hit")==1): say("!  트레이너와 눈이 마주쳤다!"); call("run_rules")
    with proc("talk"):  # facing target
        dx=v("dx"); dy=v("dy"); dx.set(0); dy.set(0)
        with If(pf==0): dy.set(1)
        with If(pf==1): dx.set(-1)
        with If(pf==2): dx.set(1)
        with If(pf==3): dy.set(-1)
        tx.set(px+dx); ty.set(py+dy); call("npc_at")
        with If(hit>0):
            v("cur_npc").set(hit); call("run_rules")
            with If(l("N_kind")[hit]==3): call("draw_tiles")
    # rules
    n=v("cur_npc"); r=v("rr"); k=v("rk"); done=v("rdone"); act=v("ract")
    with proc("run_rules"):
        r.set(l("N_rstart")[n]); done.set(0); k.set(0)
        with Repeat(l("N_rcount")[n]):
            with If(done==0):
                with If(((l("R_req")[r]==0)|(FS[l("R_req")[r]]==1))&((l("R_nreq")[r]==0)|(FS[l("R_nreq")[r]]==0))):
                    done.set(1); act.set(l("R_act")[r]); v("rtext").set(l("R_text")[r])
                    with If(v("rtext")!=""): say(v("rtext"))
                    v("rset").set(l("R_set")[r]); v("ra1").set(l("R_a1")[r]); v("ra2").set(l("R_a2")[r]); v("rhold").set(r)
                    v("do_set").set(1)
                    with If(act==2):   # reset
                        with If(l("R_clr1")[r]>0): FS.set(l("R_clr1")[r],0)
                        with If(l("R_clr2")[r]>0): FS.set(l("R_clr2")[r],0)
                        with If(l("R_clr3")[r]>0): FS.set(l("R_clr3")[r],0)
                        with If(l("R_clr4")[r]>0): FS.set(l("R_clr4")[r],0)
                        v("do_set").set(0)
                    with If(act==3):  # give item
                        l("BAG").set(v("ra1"),l("BAG")[v("ra1")]+v("ra2"))
                    with If(act==4):  # heal
                        call("heal_all"); call("center_menu")
                    with If(act==5): call("shop_menu"); v("do_set").set(0)
                    with If(act==9): call("mission_menu"); v("do_set").set(0)
                    with If(act==6):
                        v("g_sp").set(v("ra1")); v("g_lv").set(v("ra2")); call("give_mon")
                        with If(v("where")==3): v("do_set").set(0)
                    with If(act==7):  # static
                        v("g_sp").set(v("ra1")); v("g_lv").set(v("ra2")); call("static_battle")
                        with If((v("bres")!=3)&(v("bres")!=1)&(v("bres")!=4)): v("do_set").set(0)
                    with If(act==8):  # battle
                        v("tr_idx").set(v("ra1")); call("trainer_battle")
                        with IfElse(v("bres")==1) as ie:
                            with If(l("TR_badge")[v("tr_idx")]>0): call("grant_badge")
                            ie.other()
                            say("(패배했다)"); v("do_set").set(0)
                            with If(v("ra2")>0): FS.set(v("ra2"),1)
                    with If(v("do_set")==1):
                        a1=v("a1"); a1.set(v("rset")); call("set_flag")
            r.inc()
    with proc("grant_badge"):
        v("bd_pos").set(l("TR_badge")[v("tr_idx")]); v("bd_bit").set(1); v("bd_i").set(1)
        with Repeat(v("bd_pos")-1): v("bd_bit").set(v("bd_bit")*2)
        with If((badges//v("bd_bit"))%2==0): badges.inc(v("bd_bit"))
