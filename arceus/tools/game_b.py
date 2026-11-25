# -*- coding: utf-8 -*-
"""Part B: party/box, stats, battle, capture, progression."""
from bdsl import *
from game_data import *
def party_lists():
    for p in ("PS","FO"):
        for k in ("sp","lv","exp","hp","st"): l(f"{p}_{k}",[0]*6)
        l(f"{p}_mv",[0]*24); l(f"{p}_pp",[0]*24); l(f"{p}_stg",[0]*42); l(f"{p}_chg",[0]*6); l(f"{p}_rech",[0]*6)
    for k in ("sp","lv","exp","hp","st"): l(f"BX_{k}",[])
    l("BX_mv",[]); l("BX_pp",[])
    l("PART",[0]*6)
class Side:
    def __init__(s,pre,idx): s.pre=pre; s.idx=idx
    def L(s,k): return l(f"{s.pre}_{k}")
    def g(s,k): return s.L(k)[s.idx]
    def s_(s,k,val): s.L(k).set(s.idx,val)
    def mv(s,j): return l(f"{s.pre}_mv")[(s.idx-1)*4+j]
    def pp(s,j): return l(f"{s.pre}_pp")[(s.idx-1)*4+j]
    def set_pp(s,j,val): l(f"{s.pre}_pp").set((s.idx-1)*4+j,val)
    def set_mv(s,j,val): l(f"{s.pre}_mv").set((s.idx-1)*4+j,val)
def logic():
    pn=v("pn",1); bn=v("bn",0); pa=v("pa",1); fi=v("fi",1); fn=v("fn",0); bover=v("bover",0); bres=v("bres",0); money=v("money")
    S_=lambda n:l(n)
    # ---------- stats ----------
    st_sp=v("st_sp"); st_lv=v("st_lv"); st_kind=v("st_kind"); st_out=v("st_out")
    with proc("calc_stat"):
        base=v("st_base")
        with If(st_kind==1): base.set(l("S_hp")[st_sp])
        with If(st_kind==2): base.set(l("S_atk")[st_sp])
        with If(st_kind==3): base.set(l("S_def")[st_sp])
        with If(st_kind==4): base.set(l("S_spa")[st_sp])
        with If(st_kind==5): base.set(l("S_spd")[st_sp])
        with If(st_kind==6): base.set(l("S_spe")[st_sp])
        with IfElse(st_kind==1) as ie:
            st_out.set(floor(2*base*st_lv/100)+st_lv+10); ie.other(); st_out.set(floor(2*base*st_lv/100)+5)
    with proc("max_hp"):
        st_kind.set(1); call("calc_stat")
    with proc("stage_mul"):  # in sm_g -> sm_out
        with IfElse(v("sm_g")>=0) as ie:
            v("sm_out").set((2+v("sm_g"))/2); ie.other(); v("sm_out").set(2/(2-v("sm_g")))
    te_mt=v("te_mt"); te_sp=v("te_sp"); te_out=v("te_out")
    with proc("type_eff"):
        te_out.set(l("TC")[(te_mt-1)*18+l("S_t1")[te_sp]])
        with If(l("S_t2")[te_sp]>0): te_out.set(te_out*l("TC")[(te_mt-1)*18+l("S_t2")[te_sp]])
    # damage: in ds_asp ds_alv ds_ast ds_dsp ds_dlv ds_mv -> ds_dmg ds_e ds_crit
    ds=[v(n) for n in ("ds_asp","ds_alv","ds_ast","ds_dsp","ds_dlv","ds_mv")]
    ds_dmg=v("ds_dmg"); ds_e=v("ds_e"); ds_crit=v("ds_crit"); ds_a=v("ds_a"); ds_d=v("ds_d"); ds_stab=v("ds_stab"); ds_base=v("ds_base")
    with proc("calc_damage"):
        ds_dmg.set(0); ds_e.set(1); ds_crit.set(0)
        with If(l("MV_pow")[v("ds_mv")]>0):
            st_sp.set(v("ds_asp")); st_lv.set(v("ds_alv"))
            with IfElse(l("MV_cls")[v("ds_mv")]==1) as ie:
                st_kind.set(2); ie.other(); st_kind.set(4)
            call("calc_stat"); ds_a.set(st_out)
            v("sm_g").set(v("ds_asg")); call("stage_mul"); ds_a.set(floor(ds_a*v("sm_out")))
            with If((l("MV_cls")[v("ds_mv")]==1)&(v("ds_ast")==4)): ds_a.set(floor(ds_a/2))
            st_sp.set(v("ds_dsp")); st_lv.set(v("ds_dlv"))
            with IfElse(l("MV_cls")[v("ds_mv")]==1) as ie:
                st_kind.set(3); ie.other(); st_kind.set(5)
            call("calc_stat"); ds_d.set(st_out)
            v("sm_g").set(v("ds_dsg")); call("stage_mul"); ds_d.set(floor(ds_d*v("sm_out")))
            with If(ds_d<1): ds_d.set(1)
            ds_stab.set(1)
            with If((l("S_t1")[v("ds_asp")]==l("MV_type")[v("ds_mv")])|(l("S_t2")[v("ds_asp")]==l("MV_type")[v("ds_mv")])): ds_stab.set(1.5)
            te_mt.set(l("MV_type")[v("ds_mv")]); te_sp.set(v("ds_dsp")); call("type_eff"); ds_e.set(te_out)
            with If(rnd(1,10000)<=625*(1+l("MV_crit")[v("ds_mv")])): ds_crit.set(1)
            ds_base.set(floor(floor(floor(2*v("ds_alv")/5+2)*l("MV_pow")[v("ds_mv")]*ds_a/ds_d)/50)+2)
            v("ds_f").set(1)
            with If(ds_crit==1): v("ds_f").set(1.5)
            wm=v("ds_wm"); wm.set(1); mtyp=l("MV_type")[v("ds_mv")]
            with If((v("weather")==1)&(mtyp==TYIDX["water"])): wm.set(1.5)
            with If((v("weather")==1)&(mtyp==TYIDX["fire"])): wm.set(0.5)
            with If((v("weather")==2)&(mtyp==TYIDX["fire"])): wm.set(1.5)
            with If((v("weather")==2)&(mtyp==TYIDX["water"])): wm.set(0.5)
            st_sp.set(v("ds_asp")); st_lv.set(v("ds_alv")); call("max_hp")
            with If((v("ds_ahp")>0)&(v("ds_ahp")<=st_out/3)):
                with If((l("S_abil")[v("ds_asp")]==8)&(mtyp==TYIDX["grass"])): wm.set(wm*1.5)
                with If((l("S_abil")[v("ds_asp")]==9)&(mtyp==TYIDX["fire"])): wm.set(wm*1.5)
                with If((l("S_abil")[v("ds_asp")]==10)&(mtyp==TYIDX["water"])): wm.set(wm*1.5)
            ds_dmg.set(floor(ds_base*ds_stab*ds_e*v("ds_f")*wm*(85+rnd(0,15))/100))
            with If((ds_e>0)&(ds_dmg<1)): ds_dmg.set(1)
            with If((v("ds_asp")==v("bond_sp"))&(v("aff")>=30)&(ds_dmg>0)): ds_dmg.set(floor(ds_dmg*1.1))
    # ---------- templated per-side exec ----------
    def gen_exec(name,A,D,asideP):
        ak=v("ex_k"); mvv=v("ex_mv")
        with proc(name):
            v("ex_ok").set(1)
            # sleep
            with If(A.g("st")==1):
                with If(v("slp_"+("p" if asideP else "f"))==0): v("slp_"+("p" if asideP else "f")).set(rnd(1,3))
                with IfElse(v("slp_"+("p" if asideP else "f"))>0) as ie:
                    v("slp_"+("p" if asideP else "f")).inc(-1); say(join(l("S_name")[A.g("sp")],"은(는) 잠들어 있다.")); v("ex_ok").set(0)
                    ie.other()
                    A.s_("st",0); say(join(l("S_name")[A.g("sp")],"은(는) 잠에서 깼다!"))
            with If((v("ex_ok")==1)&(A.g("st")==3)&(rnd(1,100)<=25)): say(join(l("S_name")[A.g("sp")],"은(는) 몸이 저려 움직일 수 없다!")); v("ex_ok").set(0)
            v("ex_cont").set(0)
            with If((v("ex_ok")==1)&(l(A.pre+"_rech")[A.idx]==1)):
                l(A.pre+"_rech").set(A.idx,0); say(join(l("S_name")[A.g("sp")],"은(는) 반동으로 움직일 수 없다!")); v("ex_ok").set(0)
            with If(v("ex_ok")==1):
                mvv.set(v("ex_mvidx"))
                with If(l(A.pre+"_chg")[A.idx]==mvv): v("ex_cont").set(1)
                # PP use (player only; tackle fallback has no slot)
                if asideP:
                    v("ex_slot").set(0); j=v("ex_j"); j.set(1)
                    with Repeat(4):
                        with If(A.mv(j)==mvv): v("ex_slot").set(j)
                        j.inc()
                    with If((v("ex_slot")>0)&(v("ex_cont")==0)): l("PS_pp").set((A.idx-1)*4+v("ex_slot"),l("PS_pp")[(A.idx-1)*4+v("ex_slot")]-1)
                say(join(l("S_name")[A.g("sp")],"의 ",l("M_nm")[mvv],"!"))
                with If((l("MV_two")[mvv]==1)&(v("ex_cont")==0)):
                    l(A.pre+"_chg").set(A.idx,mvv); say(join(l("S_name")[A.g("sp")],"은(는) 힘을 모으고 있다!")); v("ex_ok").set(0)
                with If(v("ex_cont")==1): l(A.pre+"_chg").set(A.idx,0)
                ak=l(A.pre+"_stg"); dk=l(D.pre+"_stg")
                v("ex_as").set(ak[(A.idx-1)*7+6]-dk[(D.idx-1)*7+7])
                with If(v("ex_as")>6): v("ex_as").set(6)
                with If(v("ex_as")<-6): v("ex_as").set(-6)
                with IfElse(v("ex_as")>=0) as ie5:
                    v("ex_am").set((3+v("ex_as"))/3); ie5.other(); v("ex_am").set(3/(3-v("ex_as")))
                with If(v("ex_ok")==1):
                    with IfElse(rnd(1,100)>l("MV_acc")[mvv]*v("ex_am")) as ie:
                        say("그러나 빗나갔다!"); ie.other()
                        ds[0].set(A.g("sp")); ds[1].set(A.g("lv")); ds[2].set(A.g("st")); ds[3].set(D.g("sp")); ds[4].set(D.g("lv")); ds[5].set(mvv); v("ds_ahp").set(A.g("hp"))
                        ak=l(A.pre+"_stg"); dk=l(D.pre+"_stg")
                        with IfElse(l("MV_cls")[mvv]==1) as ie9:
                            v("ds_asg").set(ak[(A.idx-1)*7+1]); v("ds_dsg").set(dk[(D.idx-1)*7+2]); ie9.other()
                            v("ds_asg").set(ak[(A.idx-1)*7+3]); v("ds_dsg").set(dk[(D.idx-1)*7+4])
                        call("calc_damage")

                        v("ex_abs").set(0); dab=l("S_abil")[D.g("sp")]; mty=l("MV_type")[mvv]
                        with If((dab==4)&(mty==TYIDX["water"])): v("ex_abs").set(1)
                        with If((dab==5)&(mty==TYIDX["electric"])): v("ex_abs").set(1)
                        with If((dab==6)&(mty==TYIDX["ground"])): v("ex_abs").set(2)
                        with If(l("MV_pow")[mvv]>0):
                            with IfElse((ds_e==0)|(v("ex_abs")>0)) as ie2:
                                with IfElse(v("ex_abs")==2) as ie8:
                                    say(join(l("S_name")[D.g("sp")],"은(는) 부유로 맞지 않는다!")); ie8.other()
                                    with IfElse(v("ex_abs")==1) as ie9:
                                        st_sp.set(D.g("sp")); st_lv.set(D.g("lv")); call("max_hp")
                                        D.s_("hp",D.g("hp")+floor(st_out/4))
                                        with If(D.g("hp")>st_out): D.s_("hp",st_out)
                                        say(join(l("S_name")[D.g("sp")],"은(는) 특성으로 HP를 회복했다!")); ie9.other(); say("효과가 없는 것 같다...")
                                ie2.other()
                                v("ex_dealt").set(ds_dmg)
                                with If(v("ex_dealt")>D.g("hp")): v("ex_dealt").set(D.g("hp"))
                                D.s_("hp",D.g("hp")-v("ex_dealt")); call("blink_foe" if asideP else "blink_own"); sfx("hit")
                                with If((ds_e>1)|(ds_crit==1)): call("shake_foe" if asideP else "shake_own")
                                with If(ds_crit==1): sfx("crit"); call("fx_flash_once")
                                with If((l("MV_rech")[mvv]==1)&(D.g("hp")>0)): l(A.pre+"_rech").set(A.idx,1)

                                with If((l("MV_cls")[mvv]==1)&(dab>=1)&(dab<=3)&(A.g("st")==0)&(A.g("hp")>0)&(rnd(1,100)<=30)):
                                    v("ct_st").set(0)
                                    with If(dab==1): v("ct_st").set(3)
                                    with If(dab==2): v("ct_st").set(2)
                                    with If(dab==3): v("ct_st").set(4)
                                    a_sp=A.g("sp"); v("ct_imm").set(0)
                                    with If((v("ct_st")==3)&((l("S_t1")[a_sp]==TYIDX["electric"])|(l("S_t2")[a_sp]==TYIDX["electric"]))): v("ct_imm").set(1)
                                    with If((v("ct_st")==2)&((l("S_t1")[a_sp]==TYIDX["poison"])|(l("S_t2")[a_sp]==TYIDX["poison"])|(l("S_t1")[a_sp]==TYIDX["steel"])|(l("S_t2")[a_sp]==TYIDX["steel"]))): v("ct_imm").set(1)
                                    with If((v("ct_st")==4)&((l("S_t1")[a_sp]==TYIDX["fire"])|(l("S_t2")[a_sp]==TYIDX["fire"]))): v("ct_imm").set(1)
                                    with If(v("ct_imm")==0): A.s_("st",v("ct_st")); say(join(l("S_name")[a_sp],"은(는) 특성 때문에 상태가 변했다!"))
                                with If(ds_crit==1): say("급소에 맞았다!")
                                with If(ds_e>1): say("효과는 굉장했다!")
                                with If(ds_e<1): say("효과는 별로인 듯하다...")
                                with If(l("MV_drain")[mvv]>0):
                                    st_sp.set(A.g("sp")); st_lv.set(A.g("lv")); call("max_hp")
                                    A.s_("hp",A.g("hp")+floor(v("ex_dealt")*l("MV_drain")[mvv]/100))
                                    with If(A.g("hp")>st_out): A.s_("hp",st_out)
                                with If(l("MV_drain")[mvv]<0):
                                    A.s_("hp",A.g("hp")-floor(v("ex_dealt")*(0-l("MV_drain")[mvv])/100))
                                    with If(A.g("hp")<0): A.s_("hp",0)
                                    say("반동 피해를 입었다!")
                        # ailment
                        with If((D.g("hp")>0)&(l("MV_ail")[mvv]>0)&(D.g("st")==0)&(~((ds_e==0)&(l("MV_pow")[mvv]>0)))):
                            v("ex_ch").set(l("MV_chance")[mvv])
                            with If(l("MV_pow")[mvv]==0): v("ex_ch").set(100)
                            v("ex_imm").set(0); d_sp=D.g("sp")
                            with If((l("MV_ail")[mvv]==2)&((l("S_t1")[d_sp]==TYIDX["poison"])|(l("S_t2")[d_sp]==TYIDX["poison"])|(l("S_t1")[d_sp]==TYIDX["steel"])|(l("S_t2")[d_sp]==TYIDX["steel"]))): v("ex_imm").set(1)
                            with If((l("MV_ail")[mvv]==4)&((l("S_t1")[d_sp]==TYIDX["fire"])|(l("S_t2")[d_sp]==TYIDX["fire"]))): v("ex_imm").set(1)
                            with If((l("MV_ail")[mvv]==3)&(l("MV_type")[mvv]==TYIDX["electric"])&((l("S_t1")[d_sp]==TYIDX["electric"])|(l("S_t2")[d_sp]==TYIDX["electric"]))): v("ex_imm").set(1)
                            with IfElse((v("ex_imm")==0)&(v("ex_ch")>0)&(rnd(1,100)<=v("ex_ch"))) as ie3:
                                D.s_("st",l("MV_ail")[mvv]); say(join(l("S_name")[d_sp],"의 상태가 변했다!")); ie3.other()
                                with If(l("MV_pow")[mvv]==0): say("그러나 실패했다!")
                        # stat stage changes (self or target)
                        def apply_sc(side):
                            sl=l(side.pre+"_stg")
                            v("sc_ch").set(100)
                            with If(l("MV_pow")[mvv]>0): v("sc_ch").set(l("MV_schance")[mvv])
                            with If((side.g("hp")>0)&(v("sc_ch")>0)&(rnd(1,100)<=v("sc_ch"))):
                                for slot in ("1","2"):
                                    with If(l("MV_s"+slot)[mvv]>0):
                                        ix=(side.idx-1)*7+l("MV_s"+slot)[mvv]
                                        v("sc_old").set(sl[ix]); v("sc_new").set(v("sc_old")+l("MV_d"+slot)[mvv])
                                        with If(v("sc_new")>6): v("sc_new").set(6)
                                        with If(v("sc_new")<-6): v("sc_new").set(-6)
                                        sl.set(ix,v("sc_new"))
                                        with IfElse(v("sc_new")==v("sc_old")) as ie8:
                                            say(join(l("S_name")[side.g("sp")],"의 능력은 더 이상 변하지 않는다!")); ie8.other()
                                            with IfElse(l("MV_d"+slot)[mvv]>0) as ie7:
                                                say(join(l("S_name")[side.g("sp")],"의 ",l("STAT_name")[l("MV_s"+slot)[mvv]],"이(가) 올랐다!")); ie7.other()
                                                say(join(l("S_name")[side.g("sp")],"의 ",l("STAT_name")[l("MV_s"+slot)[mvv]],"이(가) 떨어졌다!"))
                        with If(l("MV_s1")[mvv]>0):
                            with IfElse(l("MV_self")[mvv]==1) as ie6:
                                apply_sc(A); ie6.other(); apply_sc(D)
    P_=Side("PS",pa); F_=Side("FO",fi)
    gen_exec("exec_p",P_,F_,True); gen_exec("exec_f",F_,P_,False)
    # ---------- progression ----------
    xp_i=v("xp_i"); xp_amt=v("xp_amt")
    def party_mon(i): return Side("PS",i)
    with proc("learn_check"):  # in: lc_sp, lc_lv, lc_i (party idx)
        j=v("lc_j"); j.set(l("LN_start")[v("lc_sp")])
        with Repeat(l("LN_count")[v("lc_sp")]):
            with If(l("LN_lv")[j]==v("lc_lv")):
                mvn=l("LN_mv")[j]; v("lc_has").set(0); k=v("lc_k"); k.set(1)
                with Repeat(4):
                    with If(l("PS_mv")[(v("lc_i")-1)*4+k]==mvn): v("lc_has").set(1)
                    k.inc()
                with If(v("lc_has")==0):
                    v("lc_slot").set(0); k.set(1)
                    with Repeat(4):
                        with If((l("PS_mv")[(v("lc_i")-1)*4+k]==0)&(v("lc_slot")==0)): v("lc_slot").set(k)
                        k.inc()
                    with If(v("lc_slot")==0):   # replace weakest power
                        v("lc_slot").set(1); k.set(2)
                        with Repeat(3):
                            with If(l("MV_pow")[l("PS_mv")[(v("lc_i")-1)*4+k]]<l("MV_pow")[l("PS_mv")[(v("lc_i")-1)*4+v("lc_slot")]]): v("lc_slot").set(k)
                            k.inc()
                    l("PS_mv").set((v("lc_i")-1)*4+v("lc_slot"),mvn); l("PS_pp").set((v("lc_i")-1)*4+v("lc_slot"),l("MV_pp")[mvn])
                    say(join(l("S_name")[v("lc_sp")],"은(는) ",l("M_nm")[mvn],"을(를) 배웠다!"))
            j.inc()
    with proc("give_exp"):  # in: xp_i (party idx), xp_amt
        m=party_mon(1)
        l("PS_exp").set(xp_i,l("PS_exp")[xp_i]+xp_amt); v("xp_go").set(1)
        with While(v("xp_go")==1):
            v("xp_go").set(0)
            with If((l("PS_exp")[xp_i]>=(l("PS_lv")[xp_i]+1)*(l("PS_lv")[xp_i]+1)*(l("PS_lv")[xp_i]+1))&(l("PS_lv")[xp_i]<100)):
                v("xp_go").set(1); st_sp.set(l("PS_sp")[xp_i]); st_lv.set(l("PS_lv")[xp_i]); call("max_hp"); v("xp_old").set(st_out)
                l("PS_lv").set(xp_i,l("PS_lv")[xp_i]+1); st_lv.set(l("PS_lv")[xp_i]); call("max_hp")
                with If(l("PS_hp")[xp_i]>0): l("PS_hp").set(xp_i,l("PS_hp")[xp_i]+st_out-v("xp_old"))
                sfx("level"); call("fx_flash_once"); say(join(l("S_name")[l("PS_sp")[xp_i]],"의 레벨이 ",l("PS_lv")[xp_i],"로 올랐다!"))
                v("lc_sp").set(l("PS_sp")[xp_i]); v("lc_lv").set(l("PS_lv")[xp_i]); v("lc_i").set(xp_i); call("learn_check")
                with If((l("S_evto")[l("PS_sp")[xp_i]]>0)&(l("PS_lv")[xp_i]>=l("S_evlv")[l("PS_sp")[xp_i]])):
                    v("ev_i").set(xp_i); v("ev_to").set(l("S_evto")[l("PS_sp")[xp_i]]); call("evolve")
    with proc("evolve"):  # in ev_i, ev_to
        st_sp.set(l("PS_sp")[v("ev_i")]); st_lv.set(l("PS_lv")[v("ev_i")]); call("max_hp"); v("ev_old").set(st_out)
        sfx("evolve"); P.emit(blk("message_cast",P.msg("anim_evolve")))
        say(join(l("S_name")[l("PS_sp")[v("ev_i")]],"의 모습이... ",l("S_name")[v("ev_to")],"(으)로 진화했다!"))
        l("PS_sp").set(v("ev_i"),v("ev_to")); st_sp.set(v("ev_to")); call("max_hp")
        l("PS_hp").set(v("ev_i"),l("PS_hp")[v("ev_i")]+st_out-v("ev_old")); 
        with If(l("PS_hp")[v("ev_i")]>st_out): l("PS_hp").set(v("ev_i"),st_out)
        l("DEX").set(v("ev_to"),2)
        v("lc_sp").set(v("ev_to")); v("lc_lv").set(l("PS_lv")[v("ev_i")]); v("lc_i").set(v("ev_i")); 
        # learn any move at current level or earlier that is missing (fills empty slots)
        j=v("evj"); j.set(l("LN_start")[v("ev_to")])
        with Repeat(l("LN_count")[v("ev_to")]):
            with If(l("LN_lv")[j]<=l("PS_lv")[v("ev_i")]):
                mvn=l("LN_mv")[j]; v("ev_has").set(0); k=v("evk"); k.set(1); v("ev_empty").set(0)
                with Repeat(4):
                    with If(l("PS_mv")[(v("ev_i")-1)*4+k]==mvn): v("ev_has").set(1)
                    with If((l("PS_mv")[(v("ev_i")-1)*4+k]==0)&(v("ev_empty")==0)): v("ev_empty").set(k)
                    k.inc()
                with If((v("ev_has")==0)&(v("ev_empty")>0)): l("PS_mv").set((v("ev_i")-1)*4+v("ev_empty"),mvn); l("PS_pp").set((v("ev_i")-1)*4+v("ev_empty"),l("MV_pp")[mvn])
            j.inc()
    # ---------- party mgmt ----------
    with proc("make_mon"):  # in g_sp g_lv -> fills slot 'mm_*' temp (appended to party or box)
        # initial moves: last up to 4 distinct from learnset <= lv
        v("mm_n").set(0); j=v("mm_j"); j.set(l("LN_start")[v("g_sp")]); 
        for k in range(1,5): v(f"mm_m{k}").set(0)
        with Repeat(l("LN_count")[v("g_sp")]):
            with If(l("LN_lv")[j]<=v("g_lv")):
                mvn=l("LN_mv")[j]; v("mm_dup").set(0)
                for k in range(1,5):
                    with If(v(f"mm_m{k}")==mvn): v("mm_dup").set(1)
                with If(v("mm_dup")==0):
                    # push (shift left when full)
                    with IfElse(v("mm_n")<4) as ie:
                        v("mm_n").inc(1)
                        with If(v("mm_n")==1): v("mm_m1").set(mvn)
                        with If(v("mm_n")==2): v("mm_m2").set(mvn)
                        with If(v("mm_n")==3): v("mm_m3").set(mvn)
                        with If(v("mm_n")==4): v("mm_m4").set(mvn)
                        ie.other()
                        v("mm_m1").set(v("mm_m2")); v("mm_m2").set(v("mm_m3")); v("mm_m3").set(v("mm_m4")); v("mm_m4").set(mvn)
            j.inc()
    with proc("add_mon"):  # in g_sp g_lv; uses make_mon; -> where (1 party,2 box)
        call("make_mon"); st_sp.set(v("g_sp")); st_lv.set(v("g_lv")); call("max_hp")
        with IfElse(pn<6) as ie:
            pn.inc(); i=pn
            l("PS_sp").set(i,v("g_sp")); l("PS_lv").set(i,v("g_lv")); l("PS_exp").set(i,v("g_lv")*v("g_lv")*v("g_lv")); l("PS_hp").set(i,st_out); l("PS_st").set(i,0)
            for k in range(1,5):
                l("PS_mv").set((i-1)*4+k,v(f"mm_m{k}")); l("PS_pp").set((i-1)*4+k,l("MV_pp")[v(f"mm_m{k}")] if True else 0)
            v("where").set(1)
            ie.other()
            with IfElse(bn>=200) as ie2:
                v("where").set(3); ie2.other()
                l("BX_sp").append(v("g_sp")); l("BX_lv").append(v("g_lv")); l("BX_exp").append(v("g_lv")*v("g_lv")*v("g_lv")); l("BX_hp").append(st_out); l("BX_st").append(0)
                for k in range(1,5): l("BX_mv").append(v(f"mm_m{k}")); l("BX_pp").append(l("MV_pp")[v(f"mm_m{k}")])
                bn.inc(); v("where").set(2)
        with If(l("DEX")[v("g_sp")]<2): l("DEX").set(v("g_sp"),2)
    with proc("give_mon"):
        call("add_mon")
        with IfElse(v("where")==3) as ie:
            say("보관함이 가득 차서 받을 수 없다. 보관함을 정리하고 다시 말을 걸자."); ie.other(); say(join(l("S_name")[v("g_sp")]," 을(를) 받았다!",""))
    with proc("heal_all"):
        i=v("ha_i"); i.set(1)
        with Repeat(pn):
            st_sp.set(l("PS_sp")[i]); st_lv.set(l("PS_lv")[i]); call("max_hp"); l("PS_hp").set(i,st_out); l("PS_st").set(i,0)
            k=v("ha_k"); k.set(1)
            with Repeat(4):
                with If(l("PS_mv")[(i-1)*4+k]>0): l("PS_pp").set((i-1)*4+k,l("MV_pp")[l("PS_mv")[(i-1)*4+k]])
                k.inc()
            i.inc()
        # box members too
        i.set(1)
        with Repeat(bn):
            st_sp.set(l("BX_sp")[i]); st_lv.set(l("BX_lv")[i]); call("max_hp"); l("BX_hp").set(i,st_out); l("BX_st").set(i,0); i.inc()
    # ---------- foe setup / AI ----------
    with proc("foe_setup_trainer"):  # in tr_idx
        i=v("fs_i"); i.set(1); fn.set(0)
        with Repeat(6):
            tsp=l("TR_sp")[(v("tr_idx")-1)*6+i]
            l("FO_sp").set(i,tsp); l("FO_lv").set(i,l("TR_lv")[(v("tr_idx")-1)*6+i]); l("FO_st").set(i,0); l("FO_exp").set(i,0)
            with If(tsp>0):
                fn.inc(); v("g_sp").set(tsp); v("g_lv").set(l("TR_lv")[(v("tr_idx")-1)*6+i]); call("make_mon")
                st_sp.set(tsp); st_lv.set(v("g_lv")); call("max_hp"); l("FO_hp").set(i,st_out)
                for k in range(1,5): l("FO_mv").set((i-1)*4+k,v(f"mm_m{k}")); l("FO_pp").set((i-1)*4+k,l("MV_pp")[v(f"mm_m{k}")] if True else 0)
            i.inc()
    with proc("foe_setup_single"):  # in w_sp w_lv
        fn.set(1); v("g_sp").set(v("w_sp")); v("g_lv").set(v("w_lv")); call("make_mon"); st_sp.set(v("w_sp")); st_lv.set(v("w_lv")); call("max_hp")
        l("FO_sp").set(1,v("w_sp")); l("FO_lv").set(1,v("w_lv")); l("FO_hp").set(1,st_out); l("FO_st").set(1,0); l("FO_exp").set(1,0)
        for k in range(1,5): l("FO_mv").set(k,v(f"mm_m{k}")); l("FO_pp").set(k,l("MV_pp")[v(f"mm_m{k}")])
    with proc("ai_pick"):  # -> ex_mvidx
        best=v("ai_best"); bs=v("ai_bs"); best.set(0); bs.set(-1); k=v("ai_k"); k.set(1)
        with Repeat(4):
            mvn=l("FO_mv")[(fi-1)*4+k]
            with If((mvn>0)&(l("FO_pp")[(fi-1)*4+k]>0)):
                v("ai_sc").set(0)
                with IfElse(l("MV_pow")[mvn]>0) as ie:
                    te_mt.set(l("MV_type")[mvn]); te_sp.set(l("PS_sp")[pa]); call("type_eff")
                    v("ai_stab").set(1)
                    with If((l("S_t1")[l("FO_sp")[fi]]==l("MV_type")[mvn])|(l("S_t2")[l("FO_sp")[fi]]==l("MV_type")[mvn])): v("ai_stab").set(1.5)
                    v("ai_sc").set(l("MV_pow")[mvn]*te_out*v("ai_stab")*l("MV_acc")[mvn]/100)
                    ie.other()
                    v("ai_sc").set(0)
                    with If((l("MV_s1")[mvn]>0)&(l("MV_ail")[mvn]==0)): v("ai_sc").set(22)
                    with If((l("MV_s1")[mvn]==0)|(l("MV_ail")[mvn]>0)):
                        with If(l("PS_st")[pa]==0): v("ai_sc").set(35)
                v("ai_sc").set(v("ai_sc")*(90+rnd(0,20))/100)
                with If(v("ai_sc")>bs): bs.set(v("ai_sc")); best.set(mvn)
            k.inc()
        with If(best==0): best.set(l("FO_mv")[(fi-1)*4+1])
        v("ex_mvidx").set(best)
        # consume foe PP
        k.set(1)
        with Repeat(4):
            with If(l("FO_mv")[(fi-1)*4+k]==best): l("FO_pp").set((fi-1)*4+k,l("FO_pp")[(fi-1)*4+k]-1)
            k.inc()
    # ---------- faints & turn ----------
    need_sw=v("need_sw",0)
    with proc("handle_faints"):
        with If((l("FO_hp")[fi]<=0)&(bover==0)):
            v("ra_sp").set(l("FO_sp")[fi]); v("ra_pts").set(1); call("research_add"); sfx("faint"); call("faint_foe"); say(join("상대 ",l("S_name")[l("FO_sp")[fi]],"은(는) 쓰러졌다!"))
            v("xp_base").set(floor(l("S_exp")[l("FO_sp")[fi]]*l("FO_lv")[fi]/7*(1+0.5*v("is_trainer"))))
            v("sh_n").set(0); i=v("hf_i"); i.set(1)
            with Repeat(pn):
                with If((l("PART")[i]==1)&(l("PS_hp")[i]>0)): v("sh_n").inc()
                i.inc()
            with If(v("sh_n")==0): v("sh_n").set(1); l("PART").set(pa,1)
            i.set(1)
            with Repeat(pn):
                with If(l("PS_hp")[i]>0):
                    with IfElse(l("PART")[i]==1) as ie:
                        xp_i.set(i); xp_amt.set(floor(v("xp_base")/v("sh_n"))+1); call("give_exp")
                        ie.other()
                        xp_i.set(i); xp_amt.set(floor(v("xp_base")*0.4)+1); call("give_exp")
                i.inc()
            with If(l("DEX")[l("FO_sp")[fi]]<1): l("DEX").set(l("FO_sp")[fi],1)
            with IfElse(fi<fn) as ie:
                fi.inc(); i.set(1)
                with Repeat(6): l("PART").set(i,0); i.inc()
                l("PART").set(pa,1)
                with If(l("DEX")[l("FO_sp")[fi]]<1): l("DEX").set(l("FO_sp")[fi],1)
                say(join("상대는 ",l("S_name")[l("FO_sp")[fi]],"을(를) 내보냈다!")); call("enter_f")
                ie.other()
                bover.set(1); bres.set(1)
                with If(v("is_trainer")==1): money.inc(l("TR_reward")[v("tr_idx")]); say(join(l("TR_reward")[v("tr_idx")],"원을 얻었다!"))
        with If((l("PS_hp")[pa]<=0)&(bover==0)):
            sfx("faint"); call("faint_own"); say(join(l("S_name")[l("PS_sp")[pa]],"은(는) 쓰러졌다!"))
            v("nx").set(0); i=v("hf2_i"); i.set(1)
            with Repeat(pn):
                with If((l("PS_hp")[i]>0)&(v("nx")==0)): v("nx").set(i)
                i.inc()
            with IfElse(v("nx")==0) as ie:
                bover.set(1); bres.set(2); ie.other(); need_sw.set(1)
