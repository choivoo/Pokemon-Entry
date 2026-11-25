# -*- coding: utf-8 -*-
"""Python-embedded DSL that emits Entry blocks + a block interpreter used to test the emitted blocks headlessly.
The interpreter encodes MY ASSUMPTIONS about Entry block semantics (not verified in the Entry editor)."""
import json, random, string, math
_r=random.Random(11); _used=set()
def uid():
    while True:
        i="".join(_r.choice(string.ascii_lowercase+string.digits) for _ in range(4))
        if i not in _used: _used.add(i); return i
def reset_ids():
    global _r
    _r=random.Random(11); _used.clear()
def blk(type,*params,st=None):
    return {"id":uid(),"x":0,"y":0,"type":type,"params":list(params),"statements":st if st is not None else [],"movable":None,"deletable":1,"emphasized":False,"readOnly":None,"copyable":True,"assemble":True,"extensions":[]}
class X:
    """expression wrapper"""
    def __init__(s,b): s.b=b
    def _c(s,o): return o if isinstance(o,X) else num(o) if isinstance(o,(int,float)) else txt(o)
    def _op(s,o,op): return X(blk("calc_basic",s.b,op,s._c(o).b))
    def __add__(s,o): return s._op(o,"PLUS")
    def __radd__(s,o): return s._c(o)._op(s,"PLUS")
    def __sub__(s,o): return s._op(o,"MINUS")
    def __rsub__(s,o): return s._c(o)._op(s,"MINUS")
    def __mul__(s,o): return s._op(o,"MULTIPLY")
    def __rmul__(s,o): return s._c(o)._op(s,"MULTIPLY")
    def __truediv__(s,o): return s._op(o,"DIVIDE")
    def __rtruediv__(s,o): return s._c(o)._op(s,"DIVIDE")
    def __floordiv__(s,o): return X(blk("quotient_and_mod",s.b,"QUOTIENT",s._c(o).b))
    def __mod__(s,o): return X(blk("quotient_and_mod",s.b,"MOD",s._c(o).b))
    def _cmp(s,o,op): return X(blk("boolean_basic_operator",s.b,op,s._c(o).b))
    def __eq__(s,o): return s._cmp(o,"EQUAL")
    def __ne__(s,o): return s._cmp(o,"NOT_EQUAL")
    def __lt__(s,o): return s._cmp(o,"LESS")
    def __le__(s,o): return s._cmp(o,"LESS_OR_EQUAL")
    def __gt__(s,o): return s._cmp(o,"GREATER")
    def __ge__(s,o): return s._cmp(o,"GREATER_OR_EQUAL")
    def __and__(s,o): return X(blk("boolean_and_or",s.b,"AND",s._c(o).b))
    def __or__(s,o): return X(blk("boolean_and_or",s.b,"OR",s._c(o).b))
    def __invert__(s): return X(blk("boolean_not",s.b))
    __hash__=None
def num(n): return X(blk("number",str(n if not isinstance(n,float) or n!=int(n) else int(n))))
def txt(t): return X(blk("text",t))
def C(o): return o if isinstance(o,X) else num(o) if isinstance(o,(int,float)) else txt(o)
class Prog:
    def __init__(s): s.vars={}; s.lists={}; s.msgs={}; s.scripts=[]; s.stack=[]; s.vinit={}
    def var(s,name,val=0):
        if name not in s.vars: s.vars[name]=uid(); s.vinit[name]=val
        return Var(s,name)
    def lst(s,name,items=None):
        if name not in s.lists: s.lists[name]=[uid(),list(items or [])]
        return Lst(s,name)
    def msg(s,name):
        if name not in s.msgs: s.msgs[name]=uid()
        return s.msgs[name]
    # statements
    def emit(s,b): s.stack[-1].append(b)
class Var(X):
    def __init__(s,p,name): s.p=p; s.name=name; s.b=blk("get_variable",p.vars[name])
    def set(s,v): s.p.emit(blk("set_variable",s.p.vars[s.name],C(v).b))
    def inc(s,v=1): s.p.emit(blk("change_variable",s.p.vars[s.name],C(v).b))
class Lst:
    def __init__(s,p,name): s.p=p; s.name=name
    @property
    def id(s): return s.p.lists[s.name][0]
    def __getitem__(s,i): return X(blk("value_of_index_from_list",None,s.id,None,C(i).b,None))
    def __len__(s): raise TypeError
    def length(s): return X(blk("length_of_list",None,s.id,None))
    def has(s,v): return X(blk("is_included_in_list",None,s.id,None,C(v).b,None))
    def append(s,v): s.p.emit(blk("add_value_to_list",C(v).b,s.id,None))
    def set(s,i,v): s.p.emit(blk("change_value_list_index",s.id,C(i).b,C(v).b,None))
    def remove(s,i): s.p.emit(blk("remove_value_from_list",C(i).b,s.id,None))
    def insert(s,i,v): s.p.emit(blk("insert_value_to_list",C(v).b,s.id,C(i).b,None))
# helpers bound to the active program
_CUR=None
class _PX:
    def __getattr__(s,n): return getattr(_CUR,n)
P=_PX()
def use(p):
    global _CUR; _CUR=p
def v(name,val=0): return P.var(name,val)
def l(name,items=None): return P.lst(name,items)
def floor(x): return X(blk("calc_operation",C(x).b,"floor"))
def rnd(a,b): return X(blk("calc_rand",C(a).b,C(b).b))
def join(*a):
    r=C(a[0])
    for t in a[1:]: r=X(blk("combine_something",r.b,C(t).b))
    return r
def strlen(x): return X(blk("length_of_string",C(x).b))
def substr(x,a,b): return X(blk("substring",C(x).b,C(a).b,C(b).b))
def charat(x,i): return X(blk("char_at",C(x).b,C(i).b))
def answer(): return X(blk("get_canvas_input_value"))
def mn(a,b): return X(blk("calc_basic",blk("number","0"),"PLUS",blk("number","0"))) if False else None
def say(t):
    P.emit(blk("dialog",C(t).b,"speak"))
    if "txt_wait" in P.vars: P.emit(blk("wait_second",blk("get_variable",P.vars["txt_wait"])))
def ask(t): P.emit(blk("ask_and_wait",C(t).b))
def wait(t): P.emit(blk("wait_second",C(t).b))
def call(name): P.emit(blk("message_cast_wait",P.msg(name)))
def hud(t): P.emit(blk("text_write",C(t).b))
def stamp(): P.emit(blk("stamp"))
def locate(x,y): P.emit(blk("locate_xy",C(x).b,C(y).b))
def shape(pid): P.emit(blk("change_to_some_shape",pid))
def erase(): P.emit(blk("erase_all_stamps"))
def show(): P.emit(blk("show"))
def hide(): P.emit(blk("hide"))
def stop_loop(): P.emit(blk("stop_repeat"))
def cont(): P.emit(blk("continue_repeat"))
def stop_proc(): P.emit(blk("stop_object","thisOnly"))
def sound(): P.emit(blk("sound_something_with_block","none"))
class _Ctx:
    def __init__(s,kind,*params): s.kind=kind; s.params=params
    def __enter__(s): P.stack.append([]); return s
    def __exit__(s,*a):
        body=P.stack.pop(); P.emit(blk(s.kind,*s.params,st=[body]))
def If(c): return _Ctx("_if",C(c).b)
def While(c): return _Ctx("repeat_while_true",C(c).b,"while")
def Repeat(n): return _Ctx("repeat_basic",C(n).b)
def Forever(): return _Ctx("repeat_inf")
class IfElse:
    def __init__(s,c): s.c=C(c).b
    def __enter__(s): P.stack.append([]); s.then=None; return s
    def other(s): s.then=P.stack.pop(); P.stack.append([])
    def __exit__(s,*a):
        els=P.stack.pop()
        if s.then is None: s.then,els=els,[]
        P.emit(blk("if_else",s.c,st=[s.then,els]))
class proc:
    def __init__(s,name,obj="main"): s.name=name; s.obj=obj
    def __enter__(s): P.stack.append([]); return s
    def __exit__(s,*a):
        body=P.stack.pop(); P.scripts.append((s.obj,[blk("when_message_cast",None,P.msg(s.name))]+body))
class on_start:
    def __init__(s,obj="main"): s.obj=obj
    def __enter__(s): P.stack.append([]); return s
    def __exit__(s,*a): body=P.stack.pop(); P.scripts.append((s.obj,[blk("when_run_button_click")]+body))
class on_key:
    def __init__(s,code,obj="main"): s.code=code; s.obj=obj
    def __enter__(s): P.stack.append([]); return s
    def __exit__(s,*a): body=P.stack.pop(); P.scripts.append((s.obj,[blk("when_some_key_pressed",None,str(s.code))]+body))
class on_click:
    def __init__(s,obj): s.obj=obj
    def __enter__(s): P.stack.append([]); return s
    def __exit__(s,*a): body=P.stack.pop(); P.scripts.append((s.obj,[blk("when_object_click")]+body))
# ------------- interpreter -------------
class Stop(Exception): pass
class Break(Exception): pass
class Continue(Exception): pass
class Interp:
    def __init__(s,prog,seed=1):
        s.p=prog; s.var={n:prog.vinit[n] for n in prog.vars}; s.lst={n:list(prog.lists[n][1]) for n in prog.lists}
        s.vid={i:n for n,i in prog.vars.items()}; s.lid={prog.lists[n][0]:n for n in prog.lists}; s.mid={i:n for n,i in prog.msgs.items()}
        s.out=[]; s.inputs=[]; s.hudlog=[]; s.rng=random.Random(seed); s.handlers={}; s.steps=0; s.stubs={}; s.stamps=0; s.rndfn=None
        for obj,sc in prog.scripts:
            h=sc[0]
            if h["type"]=="when_message_cast": s.handlers.setdefault(s.mid[h["params"][1]],[]).append(sc[1:])
    def num(s,x):
        if isinstance(x,bool): return 1 if x else 0
        if isinstance(x,(int,float)): return x
        try:
            f=float(x); return int(f) if f==int(f) else f
        except: return 0
    def isnum(s,x):
        if isinstance(x,(int,float)): return True
        try: float(x); return True
        except: return False
    def ev(s,b):
        t=b["type"]; p=b["params"]
        if t=="number": return s.num(p[0])
        if t=="text": return p[0]
        if t=="get_variable": return s.var[s.vid[p[0]]]
        if t=="calc_basic":
            a,o,c=s.ev(p[0]),p[1],s.ev(p[2])
            if o=="PLUS": return s.num(a)+s.num(c)
            if o=="MINUS": return s.num(a)-s.num(c)
            if o=="MULTIPLY": return s.num(a)*s.num(c)
            if o=="DIVIDE": c=s.num(c); return s.num(a)/c if c else 0
        if t=="quotient_and_mod":
            a,o,c=s.num(s.ev(p[0])),p[1],s.num(s.ev(p[2]))
            if c==0: return 0
            return int(a//c) if o=="QUOTIENT" else a%c
        if t=="calc_operation":
            a=s.num(s.ev(p[0]))
            if p[1]=="floor": return math.floor(a)
            if p[1]=="root": return math.sqrt(a)
            if p[1]=="abs": return abs(a)
            return a
        if t=="calc_rand":
            a,c=int(s.num(s.ev(p[0]))),int(s.num(s.ev(p[1])))
            if s.rndfn: return s.rndfn(a,c)
            return s.rng.randint(min(a,c),max(a,c))
        if t=="boolean_basic_operator":
            a,o,c=s.ev(p[0]),p[1],s.ev(p[2])
            if s.isnum(a) and s.isnum(c): a,c=s.num(a),s.num(c)
            else: a,c=str(a),str(c)
            return {"EQUAL":a==c,"NOT_EQUAL":a!=c,"LESS":a<c,"LESS_OR_EQUAL":a<=c,"GREATER":a>c,"GREATER_OR_EQUAL":a>=c}[o]
        if t=="boolean_and_or": a,c=s.ev(p[0]),s.ev(p[2]); return (bool(a) and bool(c)) if p[1]=="AND" else (bool(a) or bool(c))
        if t=="boolean_not": return not s.ev(p[0])
        if t=="value_of_index_from_list":
            L=s.lst[s.lid[p[1]]]; i=int(s.num(s.ev(p[3])))
            return L[i-1] if 1<=i<=len(L) else 0
        if t=="length_of_list": return len(s.lst[s.lid[p[1]]])
        if t=="is_included_in_list": return any(str(x)==str(s.ev(p[3])) for x in s.lst[s.lid[p[1]]])
        if t=="combine_something":
            a,c=s.ev(p[0]),s.ev(p[1]); f=lambda x:str(int(x)) if isinstance(x,float) and x==int(x) else str(x); return f(a)+f(c)
        if t=="length_of_string": return len(str(s.ev(p[0])))
        if t=="substring": x=str(s.ev(p[0])); a=int(s.num(s.ev(p[1]))); c=int(s.num(s.ev(p[2]))); return x[a-1:c]
        if t=="char_at": x=str(s.ev(p[0])); i=int(s.num(s.ev(p[1]))); return x[i-1] if 1<=i<=len(x) else ""
        if t=="get_canvas_input_value": return s.last_answer if hasattr(s,"last_answer") else ""
        raise Exception("eval? "+t)
    def run_list(s,body):
        for b in body: s.exec(b)
    def exec(s,b):
        s.steps+=1
        if s.steps>80_000_000: raise Exception("step limit")
        t=b["type"]; p=b["params"]
        if t=="set_variable": s.var[s.vid[p[0]]]=s.ev(p[1]); return
        if t=="change_variable": n=s.vid[p[0]]; s.var[n]=s.num(s.var[n])+s.num(s.ev(p[1])); return
        if t=="add_value_to_list": s.lst[s.lid[p[1]]].append(s.ev(p[0])); return
        if t=="change_value_list_index":
            L=s.lst[s.lid[p[0]]]; i=int(s.num(s.ev(p[1])))
            if not 1<=i<=len(L): raise Exception(f"list index {i} out of range in {s.lid[p[0]]}")
            L[i-1]=s.ev(p[2]); return
        if t=="remove_value_from_list":
            L=s.lst[s.lid[p[1]]]; i=int(s.num(s.ev(p[0])))
            if not 1<=i<=len(L): raise Exception("remove index")
            L.pop(i-1); return
        if t=="insert_value_to_list":
            L=s.lst[s.lid[p[1]]]; i=int(s.num(s.ev(p[2]))); L.insert(i-1,s.ev(p[0])); return
        if t=="_if":
            if s.ev(p[0]): s.run_list(b["statements"][0]); return
            return
        if t=="if_else":
            s.run_list(b["statements"][0] if s.ev(p[0]) else b["statements"][1]); return
        if t=="repeat_basic":
            for _ in range(int(s.num(s.ev(p[0])))):
                try: s.run_list(b["statements"][0])
                except Break: break
                except Continue: continue
            return
        if t=="repeat_while_true":
            while s.ev(p[0]):
                try: s.run_list(b["statements"][0])
                except Break: break
                except Continue: continue
            return
        if t=="repeat_inf":
            while True:
                try: s.run_list(b["statements"][0])
                except Break: break
                except Continue: continue
            return
        if t=="stop_repeat": raise Break()
        if t=="continue_repeat": raise Continue()
        if t=="stop_object": raise Stop()
        if t in("message_cast_wait","message_cast"):
            name=s.mid[p[0]]
            if name in s.stubs: s.stubs[name](s); return
            for sc in s.handlers.get(name,[]):
                try: s.run_list(sc)
                except Stop: pass
            return
        if t=="dialog": s.out.append(str(s.fmt(s.ev(p[0])))); return
        if t=="text_write": s.hudlog.append(str(s.fmt(s.ev(p[0])))); return
        if t=="ask_and_wait":
            prompt=str(s.fmt(s.ev(p[0]))); s.out.append("?"+prompt)
            s.last_answer=(s.input_fn(s,prompt) if getattr(s,"input_fn",None) else (s.inputs.pop(0) if s.inputs else "")); return
        if t=="stamp": s.stamps+=1; return
        if t=="sound_something_wait_with_block":
            s.__dict__.setdefault("sounds",[]).append(p[0]); raise Break()
        if t in("sound_volume_set",):
            return
        if t=="wait_second":
            if getattr(s,"on_wait",None): s.on_wait(s)
            return
        if t in("locate_xy","change_to_some_shape","erase_all_stamps","show","hide","sound_something_with_block"): return
        raise Exception("exec? "+t)
    def fmt(s,x): return str(int(x)) if isinstance(x,float) and x==int(x) else x
    def call(s,name):
        if name in s.stubs: s.stubs[name](s); return
        for sc in s.handlers.get(name,[]):
            try: s.run_list(sc)
            except Stop: pass
    def get(s,n): return s.var[n]
    def setv(s,n,val): s.var[n]=val

class ProgFromEnt:
    """Rebuild a Prog-like object from a packed .ent so the SERIALIZED project (not the DSL objects) can be executed."""
    def __init__(s,path):
        import tarfile
        t=tarfile.open(path); proj=json.load(t.extractfile("temp/project.json")); s.proj=proj
        def co(x):
            try:
                f=float(x); return int(f) if f==int(f) and "." not in str(x) else f
            except: return x
        s.vars={}; s.vinit={}; s.lists={}; s.msgs={m["name"]:m["id"] for m in proj["messages"]}; s.scripts=[]
        for v in proj["variables"]:
            if v["variableType"]=="variable": s.vars[v["name"]]=v["id"]; s.vinit[v["name"]]=co(v["value"])
            else: s.lists[v["name"]]=[v["id"],[co(x["data"]) for x in v["array"]]]
        for o in proj["objects"]:
            for sc in json.loads(o["script"]): s.scripts.append((o["name"],sc))
