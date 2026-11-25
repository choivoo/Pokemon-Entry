# -*- coding: utf-8 -*-
"""Part G (Hisui): research tasks, request-board missions, noble calming throws, mounts."""
from bdsl import *
from game_data import *
NM=len(MISSIONS)
MS_MILESTONES=[25,60,120,220,400]
def data_lists():
    ty=lambda t: TYIDX.get(t,0)
    l("MS_area",[AIDX[m["area"]] for m in MISSIONS]); l("MS_type",[m["type"] for m in MISSIONS]); l("MS_arg",[ty(m["arg"]) if m["arg"] else 0 for m in MISSIONS])
    l("MS_n",[m["n"] for m in MISSIONS]); l("MS_item",[IIDX[m["item"]] for m in MISSIONS]); l("MS_qty",[m["qty"] for m in MISSIONS]); l("MS_money",[m["money"] for m in MISSIONS]); l("MS_title",[m["title"] for m in MISSIONS])
    l("MS_prog",[0]*NM); l("MS_done",[0]*NM); l("R_pts",[0]*NSP)
    l("RS_ms",MS_MILESTONES); l("RS_done",[0]*len(MS_MILESTONES)); l("RS_item",[IIDX["great-ball"],IIDX["calm-orb"],IIDX["ultra-ball"],IIDX["hyper-potion"],IIDX["revive"]])
def logic():
    orb=IIDX["calm-orb"]
    with proc("research_add"):  # in ra_sp, ra_pts
        l("R_pts").set(v("ra_sp"),l("R_pts")[v("ra_sp")]+v("ra_pts")); v("res_total").inc(v("ra_pts"))
        k=v("rs_k"); k.set(1)
        with Repeat(len(MS_MILESTONES)):
            with If((l("RS_done")[k]==0)&(v("res_total")>=l("RS_ms")[k])):
                l("RS_done").set(k,1); it=l("RS_item")[k]; l("BAG").set(it,l("BAG")[it]+3)
                say(join("조사 점수 ",l("RS_ms")[k],"점 달성! 보상: ",l("I_name")[it]," x3"))
            k.inc()
    with proc("mission_event"):  # in me_type (1 catch, 3 win), me_sp
        i=v("me_i"); i.set(1)
        with Repeat(NM):
            with If((l("MS_done")[i]==0)&(l("MS_prog")[i]<l("MS_n")[i])):
                with If((l("MS_type")[i]==1)&(v("me_type")==1)): l("MS_prog").set(i,l("MS_prog")[i]+1)
                with If((l("MS_type")[i]==2)&(v("me_type")==1)&((l("S_t1")[v("me_sp")]==l("MS_arg")[i])|(l("S_t2")[v("me_sp")]==l("MS_arg")[i]))): l("MS_prog").set(i,l("MS_prog")[i]+1)
                with If((l("MS_type")[i]==3)&(v("me_type")==3)): l("MS_prog").set(i,l("MS_prog")[i]+1)
            i.inc()
    with proc("mission_menu"):  # in ra1 (area idx)
        v("pt").set("요청 게시판\\n"); i=v("mm_i"); i.set(1); v("mm_cnt").set(0)
        with Repeat(NM):
            with If(l("MS_area")[i]==v("ra1")):
                v("mm_cnt").inc()
                with IfElse(l("MS_done")[i]==1) as ie:
                    v("pt").set(join(v("pt"),i,". ",l("MS_title")[i]," [완료]\\n")); ie.other()
                    v("pt").set(join(v("pt"),i,". ",l("MS_title")[i]," (",l("MS_prog")[i],"/",l("MS_n")[i],")  보상 ",l("I_name")[l("MS_item")[i]]," x",l("MS_qty")[i]," +",l("MS_money")[i],"원\\n"))
            i.inc()
        v("panel_text").set(v("pt")); call("panel_set")
        ask("보상을 받을 임무 번호 (0 닫기)"); v("mm_sel").set(answer()); call("panel_hide")
        with If((v("mm_sel")>=1)&(v("mm_sel")<=NM)):
            j=v("mm_sel")
            with If((l("MS_area")[j]==v("ra1"))&(l("MS_done")[j]==0)&(l("MS_prog")[j]>=l("MS_n")[j])):
                l("MS_done").set(j,1); it=l("MS_item")[j]; l("BAG").set(it,l("BAG")[it]+l("MS_qty")[j]); v("money").inc(l("MS_money")[j])
                sfx("level"); say(join("임무 완료! ",l("I_name")[it]," x",l("MS_qty")[j]," 와 ",l("MS_money")[j],"원을 받았다."))
                v("ra_sp").set(1); v("ra_pts").set(0)
    # ---- noble calming throw ----
    with proc("noble_throw"):
        v("nz_f").set(100); v("nz_hp").set(3); v("nz_calm").set(0); r=v("nz_r"); r.set(1)
        say(join("노블이 분노하고 있다! 진정 구슬(",l("BAG")[orb],"개)을 던져 진정시키자. 돌진을 피하고 타이밍에 맞춰 던진다!"))
        with While((r<=6)&(v("nz_f")>0)&(v("nz_hp")>0)&(l("BAG")[orb]>0)):
            v("nz_dir").set(rnd(1,2)); ask(join("[",r,"/6] 노블이 돌진한다! 피할 방향 1 왼쪽 2 오른쪽  (남은 체력 ",v("nz_hp"),")"))
            with IfElse(answer()==v("nz_dir")) as ie:
                say("재빨리 피했다!"); ie.other(); v("nz_hp").inc(-1); say("돌진에 부딪혔다!"); call("fx_flash_once")
            with If(v("nz_hp")>0):
                ask("진정 구슬을 던진다 (아무 입력 후 확인, 타이밍 막대 시작)"); v("mk").set(0); v("mk_d").set(8); v("aim_done").set(0); v("cmd").set(0)
                with Repeat(40):
                    with If(v("aim_done")==0):
                        v("mk").inc(v("mk_d"))
                        with If((v("mk")>=100)|(v("mk")<=0)): v("mk_d").set(0-v("mk_d"))
                        hud(join("타이밍 ",v("mk")," (확인 키로 던지기)")); wait(0.03)
                        with If(v("cmd")==5): v("aim_done").set(1)
                v("cmd").set(0); d=v("mk_dist"); d.set(v("mk")-50)
                with If(d<0): d.set(0-d)
                v("tb_grade").set(0)
                with If(d<=35): v("tb_grade").set(1)
                with If(d<=20): v("tb_grade").set(2)
                with If(d<=8): v("tb_grade").set(3)
                l("BAG").set(orb,l("BAG")[orb]-1); P.emit(blk("message_cast",P.msg("anim_throw"))); v("dmg_n").set(0)
                with If(v("tb_grade")==1): v("dmg_n").set(12)
                with If(v("tb_grade")==2): v("dmg_n").set(22)
                with If(v("tb_grade")==3): v("dmg_n").set(35)
                v("nz_f").inc(0-v("dmg_n")); call("ball_hide")
                say(join("구슬 명중 등급 ",v("tb_grade"),"! 분노 게이지 ",floor(v("nz_f")) if False else v("nz_f"),"%"))
            r.inc()
        with IfElse(v("nz_f")<=0) as ie:
            v("nz_calm").set(1); sfx("catch"); say("노블이 한결 진정되었다! 힘이 약해진 상태로 승부한다."); ie.other(); say("진정시키지 못했다... 분노한 노블과 그대로 싸운다!")
    # ---- mounts ----
    with proc("mount_menu"):
        a=l("FS")[FIDX["c2_gym"]]; b=l("FS")[FIDX["c4_gym"]]
        ask(join("탈것 0 걷기 1 ",l("S_name")[SID["wyrdeer"]],"(빠른 이동, 노블 클리버 진정 후)  2 ",l("S_name")[SID["lapras"]],"(물 위 이동, 노블 윈디 진정 후)"))
        v("mt_sel").set(answer())
        with If(v("mt_sel")==0): v("mount").set(0); say("걸어서 이동한다.")
        with If(v("mt_sel")==1):
            with IfElse(a==1) as ie:
                v("mount").set(1); say("사슴을 타고 달린다! (한 번에 두 칸)"); ie.other(); say("아직 탈 수 없다. 노블 클리버를 진정시켜야 한다.")
        with If(v("mt_sel")==2):
            with IfElse(b==1) as ie:
                v("mount").set(2); say("탈것에 올랐다! (물 위를 건널 수 있다)"); ie.other(); say("아직 탈 수 없다. 노블 윈디를 진정시켜야 한다.")
    with proc("research_view"):
        v("pt").set(join("조사 점수 ",v("res_total"),"점\\n다음 보상: ")); k=v("rv_k"); k.set(1); v("rv_n").set(0)
        with Repeat(len(MS_MILESTONES)):
            with If((l("RS_done")[k]==0)&(v("rv_n")==0)): v("rv_n").set(l("RS_ms")[k])
            k.inc()
        v("pt").set(join(v("pt"),v("rv_n"),"점\\n(포획 +2, 처치 +1, 알파 포획 +7로 종별 조사가 쌓인다)"))
        v("panel_text").set(v("pt")); call("panel_set"); ask("0 닫기"); call("panel_hide")
