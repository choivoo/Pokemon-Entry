# -*- coding: utf-8 -*-
"""Assemble the Entry project (.ent = tar.gz with temp/project.json + assets)."""
import sys, os, json, hashlib, tarfile, io, wave, subprocess, re
sys.path.insert(0,"tools")
from bdsl import *
import bdsl, build_game, game_data as GD
NAME="Pokemon_Pikachu_Kanto_Journey_1.0"
files={}
def add_file(kind,path):
    data=open(path,"rb").read(); h=hashlib.md5(data).hexdigest(); fn=h[:16]; ext=os.path.splitext(path)[1][1:]
    url=f"temp/{h[:2]}/{h[2:4]}/{kind}/{fn}.{ext}"; files[url]=data; return url,fn,ext
class Obj:
    def __init__(s,name,pics,x=0,y=0,vis=True,size=None,typ="sprite",sounds=()):
        s.name=name; s.pics=pics; s.x=x; s.y=y; s.vis=vis; s.size=size; s.typ=typ; s.sounds=sounds; s.picid={}
def build(out="build/%s.ent"%NAME):
    prog=build_game.build_prog()
    # picture/sound/object ids continue from the same unique pool
    T="assets/gen/tiles/"; U="assets/gen/ui/"
    objs=[]
    for k in ("floor","wall","grass","water","door"):
        objs.append(Obj("tile_"+k,[(str(i+1),f"{T}{k}_{t}.png",24) for i,t in enumerate(GD.THEMES)],vis=False,size=24))
    objs.append(Obj("npc_glyph",[(str(k),f"{U}npc{k}.png",24) for k in range(1,9)],vis=False,size=24))
    objs.append(Obj("player",[(str(d),f"{U}player{d}.png",24) for d in range(1,5)],x=-204,y=3,size=24))
    objs.append(Obj("pika",[(str(m),f"{U}pika{m}.png",24) for m in (1,2,3)],x=-204,y=3,size=24))
    objs.append(Obj("mon_view",[(str(i),f"assets/sprites/{i:03d}.png",96) for i in range(1,152)],x=150,y=35,vis=False,size=96))
    objs.append(Obj("mon_own",[(str(i),f"assets/sprites/{i:03d}.png",96) for i in range(1,152)],x=-150,y=-30,vis=False,size=96))
    pos={"btn_left":(-215,-100),"btn_right":(-155,-100),"btn_up":(-185,-70),"btn_down":(-185,-130),"btn_ok":(205,-100),"btn_menu":(205,-60)}
    for n,(x,y) in pos.items(): objs.append(Obj(n,[("1",f"{U}{n}.png",40)],x=x,y=y,size=40))
    objs.append(Obj("bgm",[("1",U+"blank.png",2)],vis=False,size=2,sounds=[(str(k),f"assets/gen/bgm/bgm{k}.mp3") for k in range(1,9)]))
    objs.append(Obj("hud",[],x=0,y=-125,typ="textBox"))
    objs.append(Obj("main",[("1",U+"blank.png",2)],vis=False,size=2))
    # ids
    sounds_ids={}
    for o in objs:
        for key,path,sz in o.pics: o.picid[key]=uid()
        for key,path in o.sounds: sounds_ids[key]=uid()
    names={o.name:o for o in objs}
    def fix(b):
        for i,pm in enumerate(b["params"]):
            if isinstance(pm,str) and pm.startswith("PIC:"):
                _,on,key=pm.split(":"); b["params"][i]=names[on].picid[key]
            elif isinstance(pm,str) and pm.startswith("SND:"): b["params"][i]=sounds_ids[pm[4:]]
            elif isinstance(pm,dict): fix(pm)
        for st in b["statements"]:
            for c in st: fix(c)
    def reid(b):
        n=dict(b); n["id"]=uid(); n["params"]=[reid(q) if isinstance(q,dict) else q for q in b["params"]]
        n["statements"]=[[reid(c) for c in st] for st in b["statements"]]; return n
    by_obj={}
    for on,sc in prog.scripts:
        for b in sc: fix(b)
        by_obj.setdefault(on,[]).append([reid(b) for b in sc])
    unknown=set(by_obj)-set(names); assert not unknown,unknown
    # build objects json
    oj=[]
    for o in objs:
        sc=by_obj.get(o.name,[])
        d={"id":uid(),"name":o.name,"script":json.dumps(sc,ensure_ascii=False),"objectType":"textBox" if o.typ=="textBox" else "sprite","rotateMethod":"free","scene":"scn1","lock":False}
        if o.typ=="textBox":
            d["text"]=""; d["entity"]={"x":o.x,"y":o.y,"regX":200,"regY":15,"scaleX":1,"scaleY":1,"rotation":0,"direction":90,"width":400,"height":30,"text":"","font":"16px Nanum Gothic","colour":"#ffffff","bgColor":"#000000a0","underLine":False,"strike":False,"fontSize":16,"textAlign":1,"lineBreak":False,"visible":True}
        else:
            pics=[]
            for key,path,sz in o.pics:
                url,fn,ext=add_file("image",path); pics.append({"id":o.picid[key],"name":f"{o.name}_{key}","fileurl":url,"filename":fn,"imageType":"png","dimension":{"width":sz,"height":sz},"scale":100})
            snd=[]
            for key,path in o.sounds:
                url,fn,ext=add_file("sound",path); snd.append({"id":sounds_ids[key],"name":f"bgm{key}","filename":fn,"fileurl":url,"ext":".mp3","duration":12})
            d["sprite"]={"pictures":pics,"sounds":snd}; d["selectedPictureId"]=pics[0]["id"] if pics else None
            sz=o.size or 24
            d["entity"]={"x":o.x,"y":o.y,"regX":sz/2,"regY":sz/2,"scaleX":1,"scaleY":1,"rotation":0,"direction":90,"width":sz,"height":sz,"font":"undefinedpx ","visible":o.vis}
        oj.append(d)
    variables=[]
    for n,i in prog.vars.items(): variables.append({"name":n,"id":i,"visible":False,"value":str(prog.vinit[n]),"variableType":"variable","isCloud":False,"isRealTime":False,"cloudDate":False,"object":None,"x":0,"y":0})
    for n,(i,items) in prog.lists.items(): variables.append({"name":n,"id":i,"visible":False,"value":"","variableType":"list","isCloud":False,"isRealTime":False,"cloudDate":False,"object":None,"x":0,"y":0,"width":100,"height":120,"array":[{"data":str(x)} for x in items]})
    proj={"name":NAME,"objects":oj,"scenes":[{"id":"scn1","name":"장면 1"}],"variables":variables,"messages":[{"id":i,"name":n} for n,i in prog.msgs.items()],"functions":[],"tables":[],"speed":60,
      "interface":{"canvasWidth":480,"menus":{}},"expansionBlocks":[],"aiUtilizeBlocks":[],"hardwareLiteBlocks":[],"externalModules":[],"externalModulesLite":[],"cloudVariable":"[]","learning":"{}","isPracticalCourse":False,"category":"etc"}
    os.makedirs("build",exist_ok=True)
    raw=json.dumps(proj,ensure_ascii=False)
    with tarfile.open(out,"w:gz") as t:
        def addb(n,b): ti=tarfile.TarInfo(n); ti.size=len(b); t.addfile(ti,io.BytesIO(b))
        addb("temp/project.json",raw.encode())
        for u,b in files.items(): addb(u,b)
    return proj,out,prog
def validate(proj):
    """static schema checks: all referenced ids exist"""
    vids={v["id"] for v in proj["variables"] if v["variableType"]=="variable"}; lids={v["id"] for v in proj["variables"] if v["variableType"]=="list"}; mids={m["id"] for m in proj["messages"]}
    pics={p["id"] for o in proj["objects"] if "sprite" in o for p in o["sprite"]["pictures"]}; snds={s["id"] for o in proj["objects"] if "sprite" in o for s in o["sprite"]["sounds"]}
    errs=[]; counts={"blocks":0}; seen={}
    def walk(b,o):
        counts["blocks"]+=1
        if b['id'] in seen: errs.append(('dup block id',b['id']))
        seen[b['id']]=1; t=b["type"]; p=b["params"]
        if t in("get_variable","set_variable","change_variable") and p[0] not in vids: errs.append((o,t,p[0]))
        if t in("add_value_to_list",) and p[1] not in lids: errs.append((o,t,p[1]))
        if t in("value_of_index_from_list","length_of_list","is_included_in_list") and p[1] not in lids: errs.append((o,t,p[1]))
        if t in("change_value_list_index",) and p[0] not in lids: errs.append((o,t,p[0]))
        if t in("remove_value_from_list","insert_value_to_list") and p[1] not in lids: errs.append((o,t,p[1]))
        if t in("message_cast","message_cast_wait") and p[0] not in mids: errs.append((o,t,p[0]))
        if t=="when_message_cast" and p[1] not in mids: errs.append((o,t,p[1]))
        if t=="change_to_some_shape" and p[0] not in pics: errs.append((o,t,p[0]))
        if t=="sound_something_wait_with_block" and p[0] not in snds: errs.append((o,t,p[0]))
        for q in p:
            if isinstance(q,dict): walk(q,o)
        for st in b["statements"]:
            for c in st: walk(c,o)
    allids=[o['id'] for o in proj['objects']]+[v['id'] for v in proj['variables']]+[m['id'] for m in proj['messages']]+[p for p in pics]+[x for x in snds]
    if len(allids)!=len(set(allids)): errs.append(('dup entity id',len(allids)-len(set(allids))))
    for o in proj["objects"]:
        for sc in json.loads(o["script"]):
            for b in sc: walk(b,o["name"])
    clash=set(seen)&set(allids)
    if clash: errs.append(('block/entity id clash',sorted(clash)[:3]))
    return errs,counts["blocks"]
if __name__=="__main__":
    proj,out,prog=build(); errs,nb=validate(proj)
    size=os.path.getsize(out)
    print("wrote",out,"%.1f MB"%(size/1e6),"objects",len(proj["objects"]),"blocks",nb,"files",len(files),"errors",len(errs)); print(errs[:5])
