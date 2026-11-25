import json,urllib.request,concurrent.futures as cf
sp=json.load(open("data/species.json"))
names=sorted({m for s in sp for m in s["moves"]})
def get(u):
    for _ in range(4):
        try: return json.load(urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":"kanto-fan-rpg-build"}),timeout=30))
        except Exception as e: err=e
    raise err
def one(n):
    m=get(f"https://pokeapi.co/api/v2/move/{n}")
    ko=next((x["name"] for x in m["names"] if x["language"]["name"]=="ko"),n)
    ef=m.get("meta") or {}
    return {"key":n,"name_ko":ko,"type":m["type"]["name"],"power":m["power"] or 0,"acc":m["accuracy"] or 100,"pp":m["pp"] or 5,
            "prio":m["priority"],"cls":m["damage_class"]["name"],"ailment":(ef.get("ailment") or {}).get("name","none"),
            "ail_chance":ef.get("ailment_chance",0),"crit":ef.get("crit_rate",0),"drain":ef.get("drain",0),"heal":ef.get("healing",0)}
with cf.ThreadPoolExecutor(8) as ex: out=list(ex.map(one,names))
json.dump(out,open("data/moves.json","w"),ensure_ascii=False,indent=1); print(len(out))
