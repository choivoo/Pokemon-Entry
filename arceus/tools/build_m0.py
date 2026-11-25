"""M0 verification project: grid move, input lock, wall list, door->signal->map switch.
STATIC output only: block type names/params follow Entry's project.json but are UNVERIFIED in the editor."""
import sys; sys.path.insert(0,"tools")
from entry_dsl import *
P=Project("M0_검증")
mapid=P.variable("맵ID",1); busy=P.variable("입력잠금",0); steps=P.variable("걸음수",0)
P.list_("벽_맵1",["3,0","3,1","3,2"])
door=P.message("맵전환")
def mv(key,dx,dy):
    return [B("when_some_key_pressed",None,key),
            B("_if",B("boolean_basic_operator",VAR(busy),"EQUAL",N(0)),st=[[
                SETV(busy,N(1)),B("move_x",N(dx)),B("move_y",N(dy)),ADDV(steps,N(1)),
                B("wait_second",N(0.12)),SETV(busy,N(0))]])]
player=[[B("when_run_button_click"),B("locate_xy",N(-192),N(0)),SETV(busy,N(0)),SETV(mapid,N(1))],
        mv(37,-32,0),mv(39,32,0),mv(38,0,32),mv(40,0,-32),
        [B("when_message_cast",door),SETV(busy,N(1)),B("wait_second",N(0.3)),
         SETV(mapid,N(2)),B("locate_xy",N(-192),N(0)),SETV(busy,N(0))]]
P.sprite("플레이어",rect_png(32,32,(220,40,40,255)),player,-192,0)
pid=P.objs[0]["id"]
P.sprite("문",rect_png(32,32,(40,80,220,255)),
  [[B("when_run_button_click"),B("repeat_inf",st=[[B("_if",B("is_touch_object",pid,None),
      st=[[B("message_cast",door),B("wait_second",1)]])]])]],160,0)
P.pack("build/M0_verify.ent"); json.dump(P.json_(),open("build/M0_project.json","w"),ensure_ascii=False,indent=1)
