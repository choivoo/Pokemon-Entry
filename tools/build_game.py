# -*- coding: utf-8 -*-
import sys; sys.path.insert(0,"tools")
import bdsl
from bdsl import *
import game_data as GD, game_a, game_b, game_b2, game_c, game_d, game_e
def build_prog():
    bdsl.reset_ids(); p=Prog(); use(p)
    v("enc_rate",3); v("lastcenter",GD.MIDX["H01_0"]); v("enc_on",1); v("mp",GD.MIDX["H01_0"]); v("px",3); v("py",5); v("money",3000)
    for n in ("stat_turns","stat_battles","stat_wipes","stat_throws","is_trainer","ai_pot","moved_map","ox","oy","pf","cmd","busy","bres","pn","bn"): v(n,0)
    v("pn",0); v("vw1x",-1); v("vw2x",-1); v("vw1y",-1); v("vw2y",-1); v("pk_mood",1); v("vw1dir",2); v("vw2dir",2); v("wv",0); v("weather",0); v("ds_ahp",0); v("panel_text",""); v("pt",""); v("txt_wait",0.2); v("vol",7); v("fx_blink",1); v("is_night",0); v("vw1beh",1); v("vw2beh",1); v("vw1sp",0); v("vw2sp",0); v("bgm_mood",2); v("aff",0)
    game_a.data_lists(); game_b.party_lists(); game_a.field_logic(); game_b.logic(); game_b2.logic(); game_c.logic(); game_d.logic(); game_e.logic()
    return p
if __name__=="__main__":
    p=build_prog(); import collections
    cnt=collections.Counter(); 
    def walk(b): 
        cnt["blocks"]+=1
        for st in b["statements"]:
            for c in st: walk(c)
        for q in b["params"]:
            if isinstance(q,dict): walk(q)
    for o,sc in p.scripts:
        for b in sc: walk(b)
    print("scripts",len(p.scripts),"blocks",cnt["blocks"],"vars",len(p.vars),"lists",len(p.lists),"list items",sum(len(x[1]) for x in p.lists.values()))
