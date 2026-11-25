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
            with If(v("pk_mood")==m): shape(f"PIC:pika:{m}")
    with on_key(80):
        v("aff").inc(); say("피카츄: 피카피카! (귀를 쫑긋 세운다)"); call("hint")
    with on_click("pika"):
        say("피카츄: 피카!"); call("hint")
    # touch buttons
    for name,code in (("btn_up",4),("btn_down",1),("btn_left",2),("btn_right",3),("btn_ok",5),("btn_menu",7)):
        with on_click(name):
            with IfElse(v("busy")==0) as ie:
                v("cmd").set(code); call("handle_cmd"); ie.other()
                with If(code==5): v("cmd").set(5)
