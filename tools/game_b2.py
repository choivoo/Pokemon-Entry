# -*- coding: utf-8 -*-
"""Part B2: battle loop, wild/capture, whiteout."""
from bdsl import *
from game_data import *
from game_b import Side
def logic():
    pn=v("pn"); pa=v("pa"); fi=v("fi"); fn=v("fn"); bover=v("bover"); bres=v("bres"); money=v("money"); need_sw=v("need_sw"); mp=v("mp"); px=v("px"); py=v("py")
    P_=Side("PS",pa); F_=Side("FO",fi)
    TACKLE=MVIDX["tackle"]
    def speed_of(side,out):
        st_sp=v("st_sp"); st_lv=v("st_lv"); st_kind=v("st_kind"); st_out=v("st_out")
        st_sp.set(side.g("sp")); st_lv.set(side.g("lv")); st_kind.set(6); call("calc_stat"); out.set(st_out)
        with If(side.g("st")==3): out.set(floor(out/2))
    with proc("end_status"):  # in es_side 1/2
        with IfElse(v("es_side")==1) as ie:
            with If((l("PS_hp")[pa]>0)&((l("PS_st")[pa]==2)|(l("PS_st")[pa]==4))):
                v("st_sp").set(l("PS_sp")[pa]); v("st_lv").set(l("PS_lv")[pa]); call("max_hp"); v("es_d").set(floor(v("st_out")/8))
                with If(v("es_d")<1): v("es_d").set(1)
                l("PS_hp").set(pa,l("PS_hp")[pa]-v("es_d"))
                with If(l("PS_hp")[pa]<0): l("PS_hp").set(pa,0)
                say(join(l("S_name")[l("PS_sp")[pa]],"은(는) 상태 이상 피해를 입었다!"))
            ie.other()
            with If((l("FO_hp")[fi]>0)&((l("FO_st")[fi]==2)|(l("FO_st")[fi]==4))):
                v("st_sp").set(l("FO_sp")[fi]); v("st_lv").set(l("FO_lv")[fi]); call("max_hp"); v("es_d").set(floor(v("st_out")/8))
                with If(v("es_d")<1): v("es_d").set(1)
                l("FO_hp").set(fi,l("FO_hp")[fi]-v("es_d"))
                with If(l("FO_hp")[fi]<0): l("FO_hp").set(fi,0)
                say(join("상대 ",l("S_name")[l("FO_sp")[fi]],"은(는) 상태 이상 피해를 입었다!"))
    # command: bt_cmd 1 move(bt_mv=move idx) 2 switch(bt_i) 3 item(bt_item,bt_i) 4 run ; -> bt_ok
    with proc("battle_turn"):
        v("bt_ok").set(1)
        with IfElse(need_sw==1) as ie:
            with IfElse((v("bt_cmd")==2)&(v("bt_i")>=1)&(v("bt_i")<=pn)) as ie2:
                with IfElse(l("PS_hp")[v("bt_i")]>0) as ie3:
                    pa.set(v("bt_i")); l("PART").set(pa,1); need_sw.set(0); say(join(l("S_name")[l("PS_sp")[pa]],", 나가!"))
                    ie3.other(); v("bt_ok").set(0)
                ie2.other(); v("bt_ok").set(0)
            ie.other()
            v("p_act").set(0); v("f_act").set(0)
            with If(v("bt_cmd")==4):
                with IfElse(v("is_trainer")==1) as ie2:
                    say("트레이너 배틀에서는 도망칠 수 없다!"); v("bt_ok").set(0)
                    ie2.other(); bover.set(1); bres.set(4); v("bt_ok").set(2)
            with If((v("bt_cmd")==2)&(v("bt_ok")==1)):
                with IfElse((v("bt_i")==pa)|(v("bt_i")<1)|(v("bt_i")>pn)) as ie2:
                    v("bt_ok").set(0); ie2.other()
                    with IfElse(l("PS_hp")[v("bt_i")]<=0) as ie3:
                        v("bt_ok").set(0); ie3.other(); pa.set(v("bt_i")); l("PART").set(pa,1); say(join(l("S_name")[l("PS_sp")[pa]],", 나가!"))
            with If((v("bt_cmd")==3)&(v("bt_ok")==1)):
                v("ui_item").set(v("bt_item")); v("ui_i").set(v("bt_i")); call("use_item")
                with If(v("ui_ok")==0): v("bt_ok").set(0)
            with If((v("bt_cmd")==1)&(v("bt_ok")==1)):
                # validate move
                v("bt_has").set(0); v("bt_any").set(0); k=v("bt_k"); k.set(1)
                with Repeat(4):
                    with If((l("PS_mv")[(pa-1)*4+k]>0)&(l("PS_pp")[(pa-1)*4+k]>0)): v("bt_any").set(1)
                    with If((l("PS_mv")[(pa-1)*4+k]==v("bt_mv"))&(v("bt_mv")>0)): v("bt_has").set(1); v("bt_pp").set(l("PS_pp")[(pa-1)*4+k])
                    k.inc()
                with IfElse(v("bt_has")==0) as ie2:
                    v("bt_ok").set(0)
                    ie2.other()
                    with IfElse((v("bt_pp")<=0)&(v("bt_any")==1)) as ie3:
                        v("bt_ok").set(0)
                        ie3.other()
                        v("p_act").set(v("bt_mv"))
                        with If(v("bt_pp")<=0): say("쓸 수 있는 기술이 없다! 발버둥친다!"); v("p_act").set(TACKLE)
            with If(v("bt_ok")==1):
                # foe decision
                v("st_sp").set(l("FO_sp")[fi]); v("st_lv").set(l("FO_lv")[fi]); call("max_hp"); v("f_mx").set(v("st_out"))
                with IfElse((v("ai_pot")>0)&(l("FO_hp")[fi]*4<v("f_mx"))) as ie2:
                    v("ai_pot").inc(-1); l("FO_hp").set(fi,l("FO_hp")[fi]+120)
                    with If(l("FO_hp")[fi]>v("f_mx")): l("FO_hp").set(fi,v("f_mx"))
                    say("상대는 회복약을 썼다!"); ie2.other()
                    call("ai_pick"); v("f_act").set(v("ex_mvidx"))
                # order
                p_pr=v("p_pr"); f_pr=v("f_pr"); p_sp=v("p_spd"); f_sp=v("f_spd")
                p_pr.set(-9); f_pr.set(-9)
                with If(v("p_act")>0): p_pr.set(l("MV_prio")[v("p_act")]); speed_of(P_,p_sp)
                with If(v("f_act")>0): f_pr.set(l("MV_prio")[v("f_act")]); speed_of(F_,f_sp)
                v("p_first").set(0)
                with If(v("p_act")>0):
                    with IfElse(v("f_act")==0) as ie2:
                        v("p_first").set(1); ie2.other()
                        with If((p_pr>f_pr)|((p_pr==f_pr)&(p_sp>f_sp))|((p_pr==f_pr)&(p_sp==f_sp)&(rnd(0,1)==0))): v("p_first").set(1)
                # run in order
                v("act_i").set(1)
                with Repeat(2):
                    with If((bover==0)&(need_sw==0)):
                        v("who").set(0)
                        with IfElse(v("p_first")==1) as ie2:
                            with If(v("act_i")==1): v("who").set(1)
                            with If(v("act_i")==2): v("who").set(2)
                            ie2.other()
                            with If(v("act_i")==1): v("who").set(2)
                            with If(v("act_i")==2): v("who").set(1)
                        with If((v("who")==1)&(v("p_act")>0)&(l("PS_hp")[pa]>0)&(l("FO_hp")[fi]>0)):
                            v("ex_mvidx").set(v("p_act")); call("exec_p"); call("handle_faints")
                        with If((v("who")==2)&(v("f_act")>0)&(l("FO_hp")[fi]>0)&(l("PS_hp")[pa]>0)):
                            v("ex_mvidx").set(v("f_act")); call("exec_f"); call("handle_faints")
                    v("act_i").inc()
                with If((bover==0)&(need_sw==0)):
                    v("es_side").set(1); call("end_status"); v("es_side").set(2); call("end_status"); call("handle_faints")
                with If(v("p_act")==0): pass
    with proc("use_item"):  # in ui_item, ui_i (party idx) -> ui_ok
        v("ui_ok").set(0)
        with If((l("BAG")[v("ui_item")]>0)&(v("ui_i")>=1)&(v("ui_i")<=pn)):
            i=v("ui_i"); kd=l("I_kind")[v("ui_item")]
            v("st_sp").set(l("PS_sp")[i]); v("st_lv").set(l("PS_lv")[i]); call("max_hp"); v("ui_mx").set(v("st_out"))
            with If(kd==3):
                with If((l("PS_hp")[i]>0)&(l("PS_hp")[i]<v("ui_mx"))):
                    l("PS_hp").set(i,l("PS_hp")[i]+l("I_val")[v("ui_item")])
                    with If(l("PS_hp")[i]>v("ui_mx")): l("PS_hp").set(i,v("ui_mx"))
                    v("ui_ok").set(1)
            with If(kd==5):
                with If(l("PS_hp")[i]==0): l("PS_hp").set(i,floor(v("ui_mx")/2)); l("PS_st").set(i,0); v("ui_ok").set(1)
            with If(kd==4):
                with If((l("PS_st")[i]>0)&((l("I_cure")[v("ui_item")]==9)|(l("I_cure")[v("ui_item")]==l("PS_st")[i]))): l("PS_st").set(i,0); v("ui_ok").set(1)
            with If(v("ui_ok")==1): l("BAG").set(v("ui_item"),l("BAG")[v("ui_item")]-1); say(join(l("S_name")[l("PS_sp")[i]],"에게 ",l("I_name")[v("ui_item")],"을(를) 썼다."))
    with proc("battle_run"):  # in is_trainer, foes set. loop with asks.
        bover.set(0); bres.set(0); need_sw.set(0); fi.set(1); l("PART").set(1,0)
        j=v("br_j"); j.set(1)
        with Repeat(6): l("PART").set(j,0); j.inc()
        pa.set(0); j.set(1)
        with Repeat(pn):
            with If((l("PS_hp")[j]>0)&(pa==0)): pa.set(j)
            j.inc()
        with IfElse(pa==0) as ie:
            bover.set(1); bres.set(2); ie.other()
            l("PART").set(pa,1); v("bturns").set(0)
            v("bgm_mood").set(4)
            with If(v("is_trainer")==1):
                with If(l("TR_kind")[v("tr_idx")]==3): v("bgm_mood").set(5)
                with If(l("TR_kind")[v("tr_idx")]==2): v("bgm_mood").set(6)
            call("play_bgm")
            with If(l("DEX")[l("FO_sp")[1]]<1): l("DEX").set(l("FO_sp")[1],1)
            with While(bover==0):
                v("bturns").inc(); v("stat_turns").inc(); call("refresh_views")
                with If(v("bturns")>600): bover.set(1); bres.set(0)
                hud(join(l("S_name")[l("PS_sp")[pa]]," Lv",l("PS_lv")[pa]," HP ",l("PS_hp")[pa]," / 상대 ",l("S_name")[l("FO_sp")[fi]]," Lv",l("FO_lv")[fi]," HP ",l("FO_hp")[fi]))
                with IfElse(need_sw==1) as ie2:
                    ask("교체할 포켓몬 번호?"); v("bt_cmd").set(2); v("bt_i").set(answer())
                    ie2.other()
                    ask("1 기술  2 교체  3 가방  4 도망"); v("bt_cmd").set(answer())
                    with If(v("bt_cmd")==1):
                        ask(join("기술 선택 (1~4): ",l("M_nm")[l("PS_mv")[(pa-1)*4+1]],"/",l("M_nm")[l("PS_mv")[(pa-1)*4+2]],"/",l("M_nm")[l("PS_mv")[(pa-1)*4+3]],"/",l("M_nm")[l("PS_mv")[(pa-1)*4+4]]))
                        v("bt_mv").set(l("PS_mv")[(pa-1)*4+answer()])
                    with If(v("bt_cmd")==2): ask("교체할 포켓몬 번호?"); v("bt_i").set(answer())
                    with If(v("bt_cmd")==3): ask("사용할 아이템 번호와 대상(예: 5)?"); v("bt_item").set(answer()); ask("대상 포켓몬 번호?"); v("bt_i").set(answer())
                call("battle_turn")
            v("stat_battles").inc(); call("hide_foe"); call("hide_own"); call("bgm_set_for_map")
    with proc("refresh_views"):
        v("view_foe").set(l("FO_sp")[fi]); v("view_own").set(l("PS_sp")[pa]); call("show_foe"); call("show_own")
    with proc("whiteout"):
        v("stat_wipes").inc(); money.set(floor(money/2)); call("heal_all"); mp.set(v("lastcenter")); px.set(3); py.set(4); call("draw_map")
        say("눈앞이 깜깜해졌다... 포켓몬센터로 돌아왔다.")
    with proc("trainer_battle"):  # in tr_idx
        v("is_trainer").set(1); v("ai_pot").set(0)
        with If(l("TR_kind")[v("tr_idx")]>=2): v("ai_pot").set(2)
        call("foe_setup_trainer"); say(join(l("TR_name")[v("tr_idx")],"이(가) 승부를 걸어왔다!")); call("battle_run")
        with If(bres==2): call("whiteout")
    with proc("wild_battle"):  # in w_sp w_lv
        v("is_trainer").set(0); v("ai_pot").set(0); call("foe_setup_single"); call("battle_run")
        with If(bres==2): call("whiteout")
    # ---------- capture ----------
    with proc("catch_hook"):
        with If((l("M_area")[mp]==AIDX["R01"])&(l("FS")[FIDX["c1_catch"]]==0)): l("FS").set(FIDX["c1_catch"],1)
        with If((mp==MIDX["D07_3"])&(l("FS")[FIDX["c7_rare"]]==0)): l("FS").set(FIDX["c7_rare"],1)
    with proc("throw_ball"):  # in tb_ball (item idx), tb_grade (0 miss,1 nice,2 great,3 excellent), c_sp,c_lv,c_bait ; -> c_over, c_res (1 caught 2 fled 0 broke free)
        l("BAG").set(v("tb_ball"),l("BAG")[v("tb_ball")]-1); v("stat_throws").inc()
        with IfElse(v("tb_grade")==0) as ie:
            say("볼이 빗나갔다!")
            with If(rnd(1,100)<=15): v("c_over").set(1); v("c_res").set(2); say("포켓몬이 도망쳤다!")
            ie.other()
            v("st_sp").set(v("c_sp")); v("st_lv").set(v("c_lv")); call("max_hp"); mh=v("c_mh"); mh.set(v("st_out")); hp=v("c_hp")
            gm=v("c_gm"); gm.set(1.15)
            with If(v("tb_grade")==2): gm.set(1.3)
            with If(v("tb_grade")==3): gm.set(1.7)
            bm=v("c_bm"); bm.set(1)
            with If(v("c_bait")>=2): bm.set(2)
            with If(v("c_bait")==1): bm.set(1.5)
            a=v("c_a"); a.set(((3*mh-2*hp)*l("S_cap")[v("c_sp")]*l("I_val")[v("tb_ball")]/(3*mh))*gm*bm)
            with If(a>255): a.set(255)
            with If(a<1): a.set(1)
            b=v("c_b"); b.set(1048560/X(blk("calc_operation",X(blk("calc_operation",C(16711680/a).b,"root")).b,"root")))
            sh=v("c_sh"); sh.set(0); stop=v("c_stop"); stop.set(0)
            with Repeat(4):
                with If(stop==0):
                    with IfElse(rnd(0,65535)<b) as ie2:
                        sh.inc(); ie2.other(); stop.set(1)
            with IfElse(sh==4) as ie2:
                v("c_over").set(1); v("c_res").set(1); v("g_sp").set(v("c_sp")); v("g_lv").set(v("c_lv")); call("add_mon"); say("잡았다!"); call("catch_hook")
                with If(v("where")==2): say("파티가 가득 차서 보관함으로 보냈다.")
                with If(v("where")==3): say("보관함도 가득 차서 놓아주었다. (보관함을 정리하자)")
                ie2.other()
                say(join("볼이 ",sh,"번 흔들렸다..."))
                with If(rnd(1,100)<=18): v("c_over").set(1); v("c_res").set(2); say("포켓몬이 도망쳤다!")
    with proc("capture_screen"):  # in c_sp c_lv
        v("c_over").set(0); v("c_res").set(0); v("c_bait").set(0); v("c_hp").set(0); v("view_foe").set(v("c_sp")); call("show_foe"); v("bgm_mood").set(3); call("play_bgm")
        v("st_sp").set(v("c_sp")); v("st_lv").set(v("c_lv")); call("max_hp"); v("c_hp").set(v("st_out"))
        with If(l("DEX")[v("c_sp")]<1): l("DEX").set(v("c_sp"),1)
        with While(v("c_over")==0):
            ask("1 볼 던지기  2 먹이  3 떠나기"); v("c_in").set(answer())
            with If(v("c_in")==3): v("c_over").set(1); v("c_res").set(2)
            with If(v("c_in")==2):
                with IfElse(l("BAG")[IIDX["bait"]]>0) as ie:
                    l("BAG").set(IIDX["bait"],l("BAG")[IIDX["bait"]]-1); v("c_bait").inc(); say("먹이를 던졌다. 포켓몬이 관심을 보인다."); ie.other(); say("먹이가 없다.")
            with If(v("c_in")==1):
                # choose ball: first ball type available by user's choice
                v("c_nb").set(0); i=v("cb_i"); i.set(1)
                with Repeat(l("I_name").length()):
                    with If((l("I_kind")[i]==1)&(l("BAG")[i]>0)): v("c_nb").inc()
                    i.inc()
                with IfElse(v("c_nb")==0) as ie:
                    say("볼이 없다!"); v("c_over").set(1); v("c_res").set(2)
                    ie.other()
                    ask("볼 선택: 1 몬스터볼 2 슈퍼볼 3 하이퍼볼"); v("tb_ball").set(answer())
                    with IfElse((v("tb_ball")>=1)&(v("tb_ball")<=3)) as ie2:
                        with IfElse(l("BAG")[v("tb_ball")]>0) as ie3:
                            # aim: marker oscillates; confirm key (cmd==5) stops it
                            v("mk").set(0); v("mk_d").set(7); v("aim_done").set(0); v("cmd").set(0)
                            with Repeat(40):
                                with If(v("aim_done")==0):
                                    v("mk").inc(v("mk_d"))
                                    with If((v("mk")>=100)|(v("mk")<=0)): v("mk_d").set(0-v("mk_d"))
                                    hud(join("타이밍 ",v("mk")," (확인 키로 던지기)")); wait(0.03)
                                    with If(v("cmd")==5): v("aim_done").set(1)
                            v("cmd").set(0); dist=v("mk_dist"); dist.set(v("mk")-50)
                            with If(dist<0): dist.set(0-dist)
                            v("tb_grade").set(0)
                            with If(dist<=35): v("tb_grade").set(1)
                            with If(dist<=20): v("tb_grade").set(2)
                            with If(dist<=8): v("tb_grade").set(3)
                            hud(join("판정 등급: ",v("tb_grade")," (0 실패, 1 좋음, 2 훌륭함, 3 최고)"))
                            call("throw_ball")
                            ie3.other(); say("그 볼은 없다.")
                        ie2.other(); say("그 볼은 없다.")
        call("hide_foe"); call("bgm_set_for_map")
    with proc("wild_roll"):  # uses mp area -> w_sp w_lv (w_sp=0 if none)
        ar=l("M_area")[mp]; v("w_sp").set(0)
        with If(l("W_count")[ar]>0):
            r=v("wr"); r.set(rnd(1,l("W_total")[ar])); i=v("wi"); i.set(l("W_start")[ar]); v("wdone").set(0)
            with Repeat(l("W_count")[ar]):
                with If(v("wdone")==0):
                    r.inc(0-l("W_w")[i])
                    with If(r<=0): v("wdone").set(1); v("w_sp").set(l("W_sp")[i]); v("w_lv").set(l("W_lo")[i]+rnd(0,l("W_hi")[i]-l("W_lo")[i]))
                i.inc()
    with proc("maybe_encounter"):
        with If(rnd(1,100)<=v("enc_rate")):
            call("wild_roll")
            with If(v("w_sp")>0):
                with If(l("DEX")[v("w_sp")]<1): l("DEX").set(v("w_sp"),1)
                say(join("야생 ",l("S_name")[v("w_sp")],"(Lv",v("w_lv"),")이(가) 나타났다!"))
                ask("1 포획  2 전투  3 지나간다"); v("we_in").set(answer())
                with If(v("we_in")==1): v("c_sp").set(v("w_sp")); v("c_lv").set(v("w_lv")); call("capture_screen")
                with If(v("we_in")==2): call("wild_battle")
    with proc("static_battle"):  # in g_sp g_lv
        v("c_sp").set(v("g_sp")); v("c_lv").set(v("g_lv")); call("capture_screen")
        with IfElse(v("c_res")==1) as ie:
            bres.set(3); ie.other(); bres.set(4)
