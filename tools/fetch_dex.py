#!/usr/bin/env python3
"""Fetch Kanto dex 001-151 from PokeAPI at build time (never at Entry runtime)."""
import json, sys, urllib.request, concurrent.futures as cf
def get(u):
    for _ in range(4):
        try:
            return json.load(urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent":"kanto-fan-rpg-build"}), timeout=30))
        except Exception as e: err=e
    raise err
def one(n):
    p=get(f"https://pokeapi.co/api/v2/pokemon/{n}"); s=get(f"https://pokeapi.co/api/v2/pokemon-species/{n}")
    ko=next((x["name"] for x in s["names"] if x["language"]["name"]=="ko"),p["name"])
    desc=next((x["flavor_text"].replace("\n"," ").replace("\f"," ") for x in s["flavor_text_entries"] if x["language"]["name"]=="ko"),"")
    return {"id":n,"name_ko":ko,"name_en":p["name"],"types":[t["type"]["name"] for t in p["types"]],
      "base":{x["stat"]["name"]:x["base_stat"] for x in p["stats"]},
      "evolves_from":(s["evolves_from_species"]["url"].rstrip("/").split("/")[-1] if s["evolves_from_species"] else None),
      "capture_rate":s["capture_rate"],"base_exp":p["base_experience"],
      "moves":[m["move"]["name"] for m in p["moves"] if any(v["version_group"]["name"]=="red-blue" for v in m["version_group_details"])],
      "sprite_url":p["sprites"]["front_default"],"desc_ko":desc}
with cf.ThreadPoolExecutor(8) as ex: out=list(ex.map(one,range(1,152)))
json.dump(out,open("data/species.json","w"),ensure_ascii=False,indent=1)
print(len(out),"species; missing ko:",[d["id"] for d in out if d["name_ko"]==d["name_en"]])
