import json, urllib.request, concurrent.futures as cf, sys
sys.path.insert(0,"tools")
from arc_names import ROSTER, EVO_FROM
def get(u):
    for _ in range(4):
        try: return json.load(urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":"hisui-fan-rpg-build"}),timeout=40))
        except Exception as e: err=e
    raise err
def one(i):
    x=ROSTER[i]; p=get(f"https://pokeapi.co/api/v2/pokemon/{x}"); s=get(p["species"]["url"])
    ko=next((n["name"] for n in s["names"] if n["language"]["name"]=="ko"),p["name"])
    form=isinstance(x,str) and x.endswith("-hisui")
    desc=next((t["flavor_text"].replace("\n"," ").replace("\f"," ") for t in s["flavor_text_entries"] if t["language"]["name"]=="ko"),"")
    def grp(g): return [m["move"]["name"] for m in p["moves"] if any(v["version_group"]["name"]==g for v in m["version_group_details"])]
    la=grp("legends-arceus")
    for g in ("scarlet-violet","sword-shield","ultra-sun-ultra-moon","platinum"):
        if not la: la=grp(g)
    return {"id":i+1,"slug":p["name"],"nat":p["id"],"name_ko":("히스이 " if form else "")+ko,"name_en":p["name"],"species":s["name"],"types":[t["type"]["name"] for t in p["types"]],
      "base":{t["stat"]["name"]:t["base_stat"] for t in p["stats"]},"evolves_from_species":(s["evolves_from_species"]["name"] if s["evolves_from_species"] else None),
      "capture_rate":s["capture_rate"],"base_exp":p["base_experience"] or 60,"moves":la,"sprite_url":p["sprites"]["front_default"],"desc_ko":desc}
with cf.ThreadPoolExecutor(8) as ex: out=list(ex.map(one,range(len(ROSTER))))
# resolve evolves_from -> internal id
key={}
for d in out: key[d["slug"]]=d["id"]; key.setdefault(d["species"],d["id"]); key[d["nat"]]=d["id"]
def idof(ref): return key.get(ref) if not isinstance(ref,int) else key.get(ref)
for k,d in enumerate(out):
    x=ROSTER[k]; ref=EVO_FROM.get(x); par=None
    if ref is not None: par=idof(ref)
    elif d["evolves_from_species"]:
        cand=d["evolves_from_species"]; par=key.get(cand+"-hisui") if d["slug"].endswith("hisui") else key.get(cand)
        if par is None: par=key.get(cand)
    d["evolves_from"]=par
json.dump(out,open("data/species.json","w"),ensure_ascii=False,indent=1)
print(len(out),"species; missing ko:",[d["id"] for d in out if d["name_ko"]==d["name_en"]][:10],"no LA moves:",[d["name_en"] for d in out if not d["moves"]][:10])
