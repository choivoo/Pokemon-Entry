"""Minimal Entry project.json builder (block DSL + .ent packer)."""
import json, random, string, struct, zlib, tarfile, io, hashlib
_r = random.Random(7)
def uid(): return "".join(_r.choice(string.ascii_lowercase+string.digits) for _ in range(4))
def B(type, *params, st=None):
    return {"id":uid(),"x":0,"y":0,"type":type,"params":list(params),
            "statements":st or [],"movable":None,"deletable":1,"emphasized":False,
            "readOnly":None,"copyable":True,"assemble":True,"extensions":[]}
def N(v): return B("number", str(v))
def T(s): return B("text", s)
def VAR(i): return B("get_variable", i)
def SETV(i,v): return B("set_variable", i, v)
def ADDV(i,v): return B("change_variable", i, v)
def rect_png(w,h,rgba):
    raw=b"".join(b"\0"+bytes(rgba)*w for _ in range(h))
    def ch(t,d): c=struct.pack(">I",len(d))+t+d; return c+struct.pack(">I",zlib.crc32(t+d)&0xffffffff)
    return b"\x89PNG\r\n\x1a\n"+ch(b"IHDR",struct.pack(">IIBBBBB",w,h,8,6,0,0,0))+ch(b"IDAT",zlib.compress(raw))+ch(b"IEND",b"")
class Project:
    def __init__(s,name): s.name=name; s.objs=[]; s.vars=[]; s.msgs=[]; s.lists=[]; s.files={}
    def variable(s,name,val=0):
        i=uid(); s.vars.append({"name":name,"id":i,"visible":False,"value":str(val),"variableType":"variable","isCloud":False,"isRealTime":False,"cloudDate":False,"object":None,"x":0,"y":0}); return i
    def list_(s,name,items):
        i=uid(); s.lists.append({"name":name,"id":i,"visible":False,"value":"","variableType":"list","isCloud":False,"isRealTime":False,"cloudDate":False,"object":None,"x":0,"y":0,"width":100,"height":120,"array":[{"data":str(x)} for x in items]}); return i
    def message(s,name):
        i=uid(); s.msgs.append({"id":i,"name":name}); return i
    def sprite(s,name,png,scripts,x=0,y=0,size=32):
        h=hashlib.md5(png).hexdigest(); fn=h[:16]; url=f"temp/{h[:2]}/{h[2:4]}/image/{fn}.png"; s.files[url]=png
        pid=uid()
        s.objs.append({"id":uid(),"name":name,"script":json.dumps(scripts),"objectType":"sprite","rotateMethod":"free","scene":"scn1","lock":False,
          "sprite":{"pictures":[{"id":pid,"name":name,"fileurl":url,"filename":fn,"imageType":"png","dimension":{"width":size,"height":size},"scale":100}],"sounds":[]},
          "selectedPictureId":pid,
          "entity":{"x":x,"y":y,"regX":size/2,"regY":size/2,"scaleX":1,"scaleY":1,"rotation":0,"direction":90,"width":size,"height":size,"font":"undefinedpx ","visible":True}})
    def json_(s):
        return {"name":s.name,"objects":s.objs,"scenes":[{"id":"scn1","name":"장면 1"}],"variables":s.vars+s.lists,
          "messages":s.msgs,"functions":[],"tables":[],"speed":60,"interface":{"canvasWidth":480,"menus":{}},
          "expansionBlocks":[],"aiUtilizeBlocks":[],"hardwareLiteBlocks":[],"externalModules":[],"externalModulesLite":[],"cloudVariable":"[]","learning":"{}","isPracticalCourse":False,"category":"etc"}
    def pack(s,path):
        with tarfile.open(path,"w:gz") as t:
            def add(n,b): i=tarfile.TarInfo(n); i.size=len(b); t.addfile(i,io.BytesIO(b))
            add("temp/project.json",json.dumps(s.json_(),ensure_ascii=False).encode())
            for u,b in s.files.items(): add(u,b)
