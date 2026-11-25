# -*- coding: utf-8 -*-
"""Part E: sprites views, BGM moods, Pikachu moods/call, touch buttons."""
from bdsl import *
from game_data import *
MOOD={"town":1,"hub":1,"market":1,"harbor":1,"city":1,"quarry":1,"canal":1,"league":7,"hq":6}
def mood_for_theme(t):
    if t.startswith("gym"): return 5
    if t in ("town","market","harbor","city","quarry","canal","league","swamp"): return {"league":7}.get(t,1)
    if t=="hq": return 6
    return 2
def logic():
    for who,obj in (("foe","mon_view"),("own","mon_own")):
        with proc("show_"+who,obj=obj):
            for sp in range(1,152):
                with If(v("view_"+who)==sp): shape(f"PIC:{obj}:{sp}")
            show()
        with proc("hide_"+who,obj=obj): hide()
    # BGM
    with proc("bgm_set_for_map"):
        v("bgm_mood").set(2)
        for t in THEMES:
            with If(l("M_theme")[v("mp")]==THIDX[t]): v("bgm_mood").set(mood_for_theme(t))
        call("play_bgm")
    with proc("play_bgm",obj="bgm"):
        with Forever():
            for k in range(1,9):
                with If(v("bgm_mood")==k): P.emit(blk("sound_something_wait_with_block",f"SND:{k}"))
            wait(0.1)
    # pikachu mood from flags
    with proc("pika_react"):
        # in a1: flag idx just set
        v("pk_mood").set(2)
    with proc("actors_move",obj="pika"):
        for m in range(1,4):
            with If(v("pk_mood")==m):
                with IfElse(v("steps")%2==0) as ie:
                    shape(f"PIC:pika:{m}_1"); ie.other(); shape(f"PIC:pika:{m}_2")
    with proc("pika_sniff"):  # Pikachu points to the nearest unfinished story step on this screen (needs affection >= 10)
        best=v("sn_best"); best.set(999); cnt=v("sn_cnt"); cnt.set(0); i=v("sn_i"); i.set(l("M_nstart")[v("mp")]); v("sn_dx").set(0); v("sn_dy").set(0)
        with Repeat(l("M_ncount")[v("mp")]):
            with If(l("N_step")[i]>0):
                with If(l("FS")[l("N_step")[i]]==0):
                    cnt.inc(); a=v("sn_a"); b=v("sn_b"); a.set(l("N_x")[i]-v("px")); b.set(l("N_y")[i]-v("py")); v("sn_da").set(a); v("sn_db").set(b)
                    with If(a<0): a.set(0-a)
                    with If(b<0): b.set(0-b)
                    with If(a+b<best): best.set(a+b); v("sn_dx").set(v("sn_da")); v("sn_dy").set(v("sn_db"))
            i.inc()
        with IfElse(cnt==0) as ie:
            say("피카츄: (코를 킁킁) 이 화면엔 지금 할 일이 없어. 다른 곳을 둘러보자."); ie.other()
            say(join("피카츄: (코를 킁킁) 이 화면에 할 일이 ",cnt,"개 있어! 가장 가까운 곳은 ",best,"칸 거리야."))
            with IfElse(v("sn_dx")*v("sn_dx")>=v("sn_dy")*v("sn_dy")) as ie2:
                with IfElse(v("sn_dx")>0) as ie3:
                    say("피카츄: (오른쪽을 가리킨다)"); ie3.other(); say("피카츄: (왼쪽을 가리킨다)")
                ie2.other()
                with IfElse(v("sn_dy")>0) as ie3:
                    say("피카츄: (아래쪽을 가리킨다)"); ie3.other(); say("피카츄: (위쪽을 가리킨다)")
    with proc("pika_open_hidden"):  # affection >= 10: Pikachu scratches a wall gap that hides a cache
        v("oh_done").set(0)
        for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
            v("tx").set(v("px")+dx); v("ty").set(v("py")+dy)
            with If((v("tx")>=0)&(v("tx")<=19)&(v("ty")>=0)&(v("ty")<=10)):
                with If((charat(l("T_rows")[(v("mp")-1)*11+v("ty")+1],v("tx")+1)=="h")&(l("M_hflag")[v("mp")]>0)&(v("oh_done")==0)):
                    with If(l("FS")[l("M_hflag")[v("mp")]]==0):
                        l("FS").set(l("M_hflag")[v("mp")],1); v("oh_done").set(1); say("피카츄: 피카! (벽 틈을 긁자 숨은 통로가 열렸다!)"); call("draw_tiles")
    with on_key(80):
        v("aff").inc(); say("피카츄: 피카피카! (귀를 쫑긋 세운다)")
        with IfElse(v("aff")>=10) as ie:
            call("pika_open_hidden"); call("pika_sniff"); ie.other(); call("hint")
    with on_click("pika"):
        say("피카츄: 피카!"); v("aff").inc(); call("pika_sniff")
    with on_click("btn_pika"):
        v("aff").inc(); say("피카츄: 피카피카! (귀를 쫑긋 세운다)")
        with IfElse(v("aff")>=10) as ie:
            call("pika_open_hidden"); call("pika_sniff"); ie.other(); call("hint")
    # touch buttons
    for name,code in (("btn_up",4),("btn_down",1),("btn_left",2),("btn_right",3),("btn_ok",5),("btn_menu",7)):
        with on_click(name):
            with IfElse(v("busy")==0) as ie:
                v("cmd").set(code); call("handle_cmd"); ie.other()
                with If(code==5): v("cmd").set(5)
    for k in (1,2):
        with proc("wild_view",obj=f"wild{k}"):
            with IfElse(v(f"vw{k}x")>=0) as ie:
                locate(-228+24*v(f"vw{k}x"),123-24*v(f"vw{k}y"))
                with IfElse(v("steps")%2==0) as iev:
                    v("wv").set(0); iev.other(); v("wv").set(1)
                with If(v(f"vw{k}dir")==2): v("wv").inc(2)
                for sp in range(1,152):
                    with If(v(f"vw{k}sp")==sp):
                        for var in range(4):
                            with If(v("wv")==var): shape(f"PIC:wild{k}:{sp}_{var}")
                show(); ie.other(); hide()
    with proc("panel_set",obj="panel"): hud(v("panel_text")); show()
    with proc("panel_hide",obj="panel"): hide()
    with proc("apply_vol",obj="bgm"): P.emit(blk("sound_volume_set",(v("vol")*10).b))
    for who,obj in (("foe","mon_view"),("own","mon_own")):
        with proc("blink_"+who,obj=obj):
            with If(v("fx_blink")==1):
                with Repeat(2): hide(); wait(0.06); show(); wait(0.06)
    # animations
    with proc("anim_throw",obj="fx_ball"):
        with If(v("fx_blink")==1):
            show(); i=v("an_i"); i.set(0)
            with Repeat(8):
                locate(-150+i*38,-30+i*(8-i)*4+i*6); wait(0.03); i.inc()
            hide()
    with proc("anim_evolve",obj="fx_flash"):
        with If(v("fx_blink")==1):
            with Repeat(3): show(); wait(0.1); hide(); wait(0.1)
