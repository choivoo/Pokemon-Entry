# -*- coding: utf-8 -*-
"""Convert DSL blocks <-> real Entry block layout, using block definitions extracted from the official @entrylabs/entry 4.0.26 source
(tools/entry_block_defs.json: param type lists per block)."""
import json, os
DEFS=json.load(open(os.path.join(os.path.dirname(__file__),"entry_block_defs.json")))
PAD={"Text","Indicator","LineBreak"}
RENAME={"stamp":"brush_stamp","erase_all_stamps":"brush_erase_all"}
REVERSE={v:k for k,v in RENAME.items()}
REALLEN={"value_of_index_from_list","length_of_list","when_message_cast","when_some_key_pressed","calc_basic","boolean_basic_operator","boolean_and_or","add_value_to_list","remove_value_from_list","change_value_list_index"}
def _mk(type,params,bid):
    return {"id":bid,"x":0,"y":0,"type":type,"params":params,"statements":[],"movable":None,"deletable":1,"emphasized":False,"readOnly":None,"copyable":True,"extensions":[]}
def normalize(b,uid):
    """b: DSL block dict -> real layout (new dict)."""
    t=RENAME.get(b["type"],b["type"]); mine=[normalize(q,uid) if isinstance(q,dict) else q for q in b["params"]]
    if t=="calc_basic" and len(mine)>1 and mine[1]=="MULTIPLY": mine[1]="MULTI"
    if t=="repeat_inf": params=[None]
    elif t in("brush_stamp","brush_erase_all"): params=[None]
    elif t in("change_to_some_shape","sound_something_wait_with_block"):
        kind="get_pictures" if t=="change_to_some_shape" else "get_sounds"
        v=mine[0]; params=[_mk(kind,[v],uid()) if not isinstance(v,dict) else v,None]
    elif t in DEFS:
        real=DEFS[t][0]
        if len(mine)==len(real) and t in REALLEN: params=mine
        else:
            vals=[x for x in mine]; params=[]; vi=0
            if len(mine)==len(real) and all(r in PAD for r in real): params=[None]*len(real)
            else:
                for r in real:
                    if r in PAD: params.append(None)
                    else: params.append(vals[vi] if vi<len(vals) else None); vi+=1
                assert vi==len(vals),(t,mine,real)
    else: params=mine
    n=dict(b); n["type"]=t; n["params"]=params; n["id"]=uid()
    n["statements"]=[[normalize(c,uid) for c in st] for st in b["statements"]]
    n.pop("assemble",None)
    return n
def denormalize(b):
    t=REVERSE.get(b["type"],b["type"]); ps=[denormalize(q) if isinstance(q,dict) else q for q in b["params"]]
    if t in("change_to_some_shape","sound_something_wait_with_block"):
        v=ps[0]; ps=[v["params"][0] if isinstance(v,dict) else v]
    elif t=="repeat_inf" or t in("stamp","erase_all_stamps"): ps=[]
    elif t in DEFS and t not in REALLEN:
        real=DEFS[t][0]; ps=[x for x,r in zip(ps,real) if r not in PAD]
    if t=="calc_basic" and len(ps)>1 and ps[1]=="MULTI": ps[1]="MULTIPLY"
    n=dict(b); n["type"]=t; n["params"]=ps; n["statements"]=[[denormalize(c) for c in st] for st in b["statements"]]; return n
def check(b,errs,path=""):
    t=b["type"]
    if t in("number","text","get_pictures","get_sounds"): return
    if t not in DEFS: errs.append(("unknown block type",t)); return
    if t=="repeat_inf":
        for st in b["statements"]:
            for c in st: check(c,errs)
        return
    real=DEFS[t][0]
    if len(b["params"])!=len(real): errs.append(("param count",t,len(b["params"]),len(real)))
    for q in b["params"]:
        if isinstance(q,dict): check(q,errs)
    for st in b["statements"]:
        for c in st: check(c,errs)
