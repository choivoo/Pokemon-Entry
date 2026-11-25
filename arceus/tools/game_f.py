# -*- coding: utf-8 -*-
"""Part F: direction effects (fade, letterbox cut-ins, tint/particles, capture/evolve/level effects, SFX)."""
from bdsl import *
from game_data import *
SFX=["hit","crit","faint","catch","shake","level","evolve","sting","select","door","flee"]
def logic():
    on=lambda: v("fx_blink")==1
    # --- fade ---
    with proc("fx_fade_out",obj="fx_fade"):
        with If(v("fx_blink")==1):
            effect_set("transparency",100); show(); i=v("fa_i"); i.set(0)
            with Repeat(5): effect_add("transparency",-20); wait(0.02); i.inc()
    with proc("fx_fade_in",obj="fx_fade"):
        with If(v("fx_blink")==1):
            Repeat_=None
            with Repeat(5): effect_add("transparency",20); wait(0.02)
            hide()
    # --- letterbox bars ---
    for nm,y0,y1 in (("fx_top",160,116),("fx_bot",-160,-116)):
        with proc("bars_in",obj=nm):
            show(); i=v("bi_"+nm); i.set(0)
            with Repeat(6): loc_y(y0+(y1-y0)*i/5); wait(0.02); i.inc()
        with proc("bars_out",obj=nm):
            i=v("bo_"+nm); i.set(0)
            with Repeat(6): loc_y(y1+(y0-y1)*i/5); wait(0.02); i.inc()
            hide()
    # --- flash ---
    with proc("fx_flash_once",obj="fx_flash"):
        with If(v("fx_blink")==1):
            effect_set("transparency",40); show(); wait(0.05); effect_set("transparency",70); wait(0.05); effect_set("transparency",90); wait(0.04); hide()
    # --- monster view effects ---
    for who,obj in (("foe","mon_view"),("own","mon_own")):
        with proc("shake_"+who,obj=obj):
            with If(v("fx_blink")==1):
                with Repeat(3): mx(7); wait(0.02); mx(-14); wait(0.02); mx(7)
        with proc("faint_"+who,obj=obj):
            with IfElse(v("fx_blink")==1) as ie:
                with Repeat(6): my(-8); wait(0.03)
                hide(); my(48); ie.other(); hide()
    with proc("mon_big",obj="mon_view"):
        scale(220); show()
    with proc("mon_small",obj="mon_view"): scale(100)
    with proc("slide_in",obj="mon_view"):
        with If(v("fx_blink")==1):
            i=v("sl_i"); i.set(0); show()
            with Repeat(7): loc_x(330-(330-150)*i/6); wait(0.02); i.inc()
        loc_x(150)
    # --- ball wobble / burst ---
    with proc("ball_wobble",obj="fx_ball"):
        with If(v("fx_blink")==1): rot(28); wait(0.08); rot(-28); wait(0.08); rot(0)
    with proc("ball_hide",obj="fx_ball"): hide(); rot(0)
    with proc("capture_burst",obj="fx_ball"):
        with If(v("fx_blink")==1):
            i=v("cb_i"); i.set(0)
            with Repeat(4): scale(100+i*30); wait(0.04); i.inc()
            scale(100)
    # --- cut-in for bosses/alpha ---
    with proc("cutscene_boss"):  # in cut_sp, cut_title
        with If(v("fx_blink")==1):
            call("bars_in"); sfx("sting"); call("fx_flash_once")
            v("view_foe").set(v("cut_sp")); call("show_foe"); call("mon_big"); hud(v("cut_title")); wait(0.9)
            call("mon_small"); call("hide_foe"); call("bars_out")
    # --- tint + particles ---
    with proc("fx_tint_update"):
        v("tint_k").set(0); v("part_k").set(0); v("is_night").set((v("steps")//300)%2)
        v("fw").set(l("TH_weather")[l("M_theme")[v("mp")]])
        with If(v("is_night")==1): v("tint_k").set(1)
        with If(v("fw")==1): v("tint_k").set(2); v("part_k").set(1)
        with If(v("fw")==2): v("tint_k").set(3)
        with If(v("fw")==3): v("tint_k").set(4); v("part_k").set(3)
        with If(v("fw")==4): v("tint_k").set(5); v("part_k").set(2)
        with If((l("M_dark")[v("mp")]==1)&(v("tint_k")==0)): v("tint_k").set(6)
        P.emit(blk("message_cast",P.msg("tint_apply")))
    TINT={1:("night",55),2:("rain",70),3:("sun",82),4:("sand",70),5:("hail",78),6:("dark",45)}
    with proc("tint_apply",obj="fx_tint"):
        with IfElse((v("tint_k")==0)|(v("fx_blink")==0)) as ie:
            hide(); ie.other()
            for k,(nm,tr) in TINT.items():
                with If(v("tint_k")==k): shape(f"PIC:fx_tint:{nm}"); effect_set("transparency",tr)
            show()
    with proc("particles_loop",obj="fx_part"):
        with Forever():
            with IfElse((v("part_k")==0)|(v("fx_blink")==0)) as ie:
                hide(); wait(0.3); ie.other()
                show()
                for k,nm in ((1,"rain"),(2,"snow"),(3,"sand")):
                    with If(v("part_k")==k):
                        shape(f"PIC:fx_part:{nm}1"); wait(0.1); shape(f"PIC:fx_part:{nm}2"); wait(0.1)
    with on_start("fx_part"):
        P.emit(blk("message_cast",P.msg("particles_loop")))
    # --- title ---
    with proc("title_show"):
        P.emit(blk("message_cast",P.msg("title_art_show")))
    with proc("title_art_show",obj="title_art"): show()
    with proc("title_art_hide",obj="title_art"): hide()
    with proc("title_text_show",obj="title_text"): P.emit(blk("text_write",v("title_str").b)); show()
    with proc("title_text_hide",obj="title_text"): hide()
    # --- sfx ---
    for nm in SFX:
        with proc("sfx_"+nm,obj="sfx"): play_sfx(nm)
