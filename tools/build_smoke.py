# -*- coding: utf-8 -*-
"""Tiny smoke-test project in REAL Entry block layout (10 blocks): checks that the .ent import path works at all."""
import sys, os, json, tarfile, io, hashlib; sys.path.insert(0,"tools")
import bdsl; from bdsl import *; import entry_real
bdsl.reset_ids(); p=Prog(); use(p)
n=v("n",0); L=l("목록",["a","b"])
with on_start():
    say("엔트리 불러오기 성공! 이 말풍선이 보이면 .ent 형식은 정상입니다."); ask("숫자를 입력하세요"); n.set(answer()); say(join("입력: ",n," / 목록 길이: ",L.length()))
    with If(n==1): say("1을 입력했습니다")
    with Repeat(3): n.inc()
    say(join("n=",n))
data=open("assets/gen/ui/player1_1.png","rb").read(); h=hashlib.md5(data).hexdigest(); url=f"temp/{h[:2]}/{h[2:4]}/image/{h}.png"
pid=uid(); sc=[[entry_real.normalize(b,uid) for b in s_] for o,s_ in p.scripts]
obj={"id":uid(),"name":"테스트","script":json.dumps(sc,ensure_ascii=False),"objectType":"sprite","rotateMethod":"free","scene":"scn1","lock":False,
 "sprite":{"pictures":[{"id":pid,"name":"p","fileurl":url,"filename":h,"imageType":"png","dimension":{"width":24,"height":24},"scale":100}],"sounds":[]},"selectedPictureId":pid,
 "entity":{"x":0,"y":0,"regX":12,"regY":12,"scaleX":2,"scaleY":2,"rotation":0,"direction":90,"width":24,"height":24,"font":"undefinedpx ","visible":True}}
variables=[{"name":"n","id":p.vars["n"],"visible":False,"value":0,"variableType":"variable","isCloud":False,"isRealTime":False,"cloudDate":False,"object":None,"x":0,"y":0},
 {"name":"목록","id":p.lists["목록"][0],"visible":False,"value":0,"variableType":"list","isCloud":False,"isRealTime":False,"cloudDate":False,"object":None,"x":0,"y":0,"width":100,"height":120,"array":[{"data":"a"},{"data":"b"}]}]
proj={"name":"Smoke_Test","objects":[obj],"scenes":[{"id":"scn1","name":"장면 1"}],"variables":variables,"messages":[],"functions":[],"tables":[],"speed":60,"interface":{"canvasWidth":480,"menuWidth":280,"object":obj["id"]},
 "expansionBlocks":[],"aiUtilizeBlocks":[],"hardwareLiteBlocks":[],"externalModules":[],"externalModulesLite":[],"isPracticalCourse":False}
errs=[]; [entry_real.check(b,errs) for s_ in sc for b in s_]; print("check errors",errs)
with tarfile.open("build/Smoke_Test.ent","w:gz") as t:
    def add(nm,b): ti=tarfile.TarInfo(nm); ti.size=len(b); t.addfile(ti,io.BytesIO(b))
    add("temp/project.json",json.dumps(proj,ensure_ascii=False).encode()); add(url,data)
print("wrote build/Smoke_Test.ent")
