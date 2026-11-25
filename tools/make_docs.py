# -*- coding: utf-8 -*-
import sys, json, collections
sys.path.insert(0,"tools")
import game_data as GD
from world_def import GYMS, ELITE, CHAMP, Q
W=GD.WORLD; D="docs/"
def md(path,text): open(path,"w",encoding="utf-8").write(text)
# ---- DATA.md ----
o=["# 데이터 유지보수 목록\n\n모든 표는 `tools/world_def.py`(사람이 쓴 설계)와 `tools/build_world.py`(생성기)에서 자동 생성된 `data/*.json`을 기준으로 한다. 수정 순서: `world_def.py` → `python3 tools/build_world.py` → `python3 tools/assemble.py`.\n"]
o.append("## 1. 지역 (58곳, 176화면)\n\n| ID | 이름 | 종류 | 장 | 화면 | 테마 | 야생 타입 | 비고 |\n|---|---|---|---|---|---|---|---|")
for a in W["areas"]: o.append(f"| {a['id']} | {a['name']} | {a['kind']} | {a['ch']} | {a['screens']} | {a['theme']} | {','.join(a['types'])} | {a['note']} |")
o.append("\n## 2. 필수 퀘스트 단계 (113개)\n\n단서(clue) 단계는 순서와 무관하게 해결할 수 있고 화면 출구를 잠그지 않는다. 장 마지막 출구와 체육관 문은 해당 장의 모든 단서가 있어야 열린다.\n")
for ch,steps in Q.items():
    o.append(f"\n### 장 {ch} ({len(steps)}단계)\n\n| 플래그 | 종류 | 위치 | 제목 |\n|---|---|---|---|")
    for s in steps: o.append(f"| `{s[0]}` | {s[1]} | {s[2]}#{s[3]+1} | {s[4]} |")
o.append("\n## 3. 체육관과 리그\n\n| 번 | 타입 | 관장 | 직업 | 규칙 | 두려움 | 관장 레벨 |\n|---|---|---|---|---|---|---|")
for g in GYMS: o.append(f"| {g['n']} | {g['type']} | {g['leader']} | {g['job']} | {g['rule']} | {g['fear']} | {g['level']}* |")
o.append("\n`*` 표의 `level`은 초기 설계값이며 실제 레벨은 `data/trainers.json`(장 레벨+3)이 기준이다.\n")
o.append("\n사천왕: "+", ".join(f"{e[1]}({e[0]}, Lv{e[2]})" for e in ELITE)+f". 챔피언: {CHAMP[0]} (Lv{CHAMP[1]}).\n")
o.append("## 4. 트레이너\n\n총 %d명. 레벨·파티는 `data/trainers.json`.\n"%len(GD.TR))
o.append("## 5. 야생 출현표\n\n| 지역 | 포켓몬(번호:가중치 Lv범위) |\n|---|---|")
for a,wv in GD.WILD.items(): o.append(f"| {a} | "+", ".join(f"{GD.SPECIES[e['sp']-1]['name']}({e['sp']}:{e['w']} Lv{e['lo']}-{e['hi']})" for e in wv['entries'])+" |")
o.append("\n## 6. 상점\n\n| 거점 | 품목 |\n|---|---|")
for r in GD.RULES:
    if r["act"]=="shop": o.append(f"| {r['npc']} | "+", ".join(GD.ITEMS[GD.IIDX[k]-1]['name'] for k in r['arg'].split(','))+" |")
o.append("\n## 7. 선물·고정 조우\n\n| NPC | 포켓몬 | 레벨 | 조건 |\n|---|---|---|---|")
for r in GD.RULES:
    if r["act"] in("gift","static"): sp,lv=r["arg"].split(":"); o.append(f"| {r['npc']} | {GD.SPECIES[int(sp)-1]['name']} | {lv} | {r['req'] or '엔딩 후' if r['act']=='static' else r['req']} |")
o.append("\n## 8. 세이브 코드 형식 `EK1`\n\n`EK1|맵번호|x|y|돈|배지비트|클리어|마지막센터맵|플래그문자열(%d자,0/1)|도감문자열(151자,0/1/2)|가방(점구분 %d개)|파티(~구분)|보관함(~구분)|검사값`\n\n개체 = `종:레벨:경험치:HP:상태:기술1~4:PP1~4`. 검사값은 문자 코드 가중 합산(mod 1000003). 읽을 때 전체를 검증한 뒤에만 적용하며 실패하면 현재 진행을 건드리지 않는다.\n"%(len(GD.FLAGS),len(GD.ITEMS)))
o.append("## 9. 기술 정책\n\n포켓몬별 기술은 PokéAPI의 적청 버전 기술 목록에서 위력 순으로 최대 6개를 레벨 1/6/13/22/32/44에 배치하고 상태 기술 1개를 12레벨에 추가한 **자체 학습 규칙**이다(공식 학습표 아님). 구현한 기술은 %d개(피해 기술과 수면·독·마비·화상 부여 기술).\n"%len(GD.MOVES))
md(D+"DATA.md","\n".join(o))
# ---- SOURCES.md ----
md(D+"SOURCES.md","""# 리소스 출처 목록

| 리소스 | 출처 | 사용 범위·상태 |
|---|---|---|
| 포켓몬 이름(한국어)·타입·능력치·포획률·도감 설명·기술 데이터 | PokéAPI (https://pokeapi.co) 제작 시 1회 수집 → `data/species.json`, `data/moves.json` | 팬 프로젝트용. 포켓몬 및 관련 명칭은 각 권리자의 상표다. 공개 배포 전 권리 확인 필요 |
| 포켓몬 스프라이트 `assets/sprites/001~151.png` (96x96) | PokéAPI `sprites.front_default` | 사용 범위를 확인하지 못했다. **임시 사용**이며 공개 배포 전 직접 제작 에셋으로 교체해야 한다 |
| 타일셋, NPC·플레이어·피카츄 아이콘, 터치 버튼 | `tools/make_assets.py`로 직접 생성 (PIL) | 오리지널. 제한 없음 |
| BGM 8곡 (마을·탐험·야생·전투·관장·로켓단·리그·엔딩) | `tools/make_assets.py`로 직접 작곡·합성한 사각파 멜로디 | 오리지널. 제한 없음 |
| 지역·인물·대사·퀘스트·퍼즐 | `tools/world_def.py` 직접 작성 | 오리지널. 관동 배경, 로켓단, 피카츄 파트너, 체육관 순회, 리그 구조만 참고 |

게임 실행 중에는 외부 네트워크를 쓰지 않는다.
""")
# ---- README ----
md("README.md","""# 포켓몬: 피카츄와 관동의 길 (엔트리 팬 RPG)

엔트리용 2D 컬러 탑다운 RPG. 피카츄와 관동을 여행해 배지 8개를 모으고, 로켓단 본부 작전을 막고, 리그 챔피언을 이기면 엔딩이 나온다.

## 파일
- `build/Pokemon_Pikachu_Kanto_Journey_1.0.ent` — 배포용 프로젝트 (엔트리에서 `불러오기`).
- `build/M0_verify.ent` — M0 기술 검증용 작은 프로젝트.
- `docs/` — `PLAY.md`(조작), `DATA.md`(데이터 목록), `SOURCES.md`(출처), `QA_REPORT.md`(테스트·시간표·제약), `STATUS.md`(인수인계).
- `tools/`, `engine/`, `tests/` — 생성기, 검증용 기준 엔진, 테스트. 재생성: `python3 tools/build_world.py && python3 tools/make_assets.py && python3 tools/assemble.py`.

**중요:** 이 환경에는 엔트리 편집기가 없어 `.ent`를 실제 엔트리에서 열어보지 못했다. 자세한 검증 범위는 `docs/QA_REPORT.md`.
""")
md(D+"PLAY.md","""# 플레이 방법

## 시작
실행하면 대화 입력창이 열린다. `1` 새 게임, `2` 이어하기(세이브 코드 붙여넣기). 입력창에는 숫자를 입력한다.

## 조작
| 동작 | 키보드 | 터치 |
|---|---|---|
| 이동 | 방향키 / WASD | 왼쪽 아래 방향 버튼 |
| 확인·말 걸기 | Space / Z / Enter | 오른쪽 `○` 버튼 |
| 메뉴 | M | 오른쪽 `≡` 버튼 |
| 피카츄 부르기(힌트) | P 또는 피카츄 터치 | - |

말 걸기는 **바라보는 방향의 바로 앞 칸**에 있는 사람·물건에 한다.

## 메뉴 (M)
1 파티(순서 변경) · 2 가방(회복약, 진화의 돌) · 3 도감 · 4 보관함(꺼내기/맡기기/목록) · 5 세이브 코드 · 6 설정(필드 조우 끄기/낮추기) · 8 힌트.

## 포획
풀밭을 걸으면 야생 포켓몬이 나타난다. `1` 포획, `2` 전투, `3` 지나가기. 포획 화면: `1` 볼 던지기(→ 볼 종류 → 타이밍 막대에서 확인 키), `2` 먹이, `3` 떠나기. 타이밍 등급은 숫자와 글자로 표시된다(0 실패 · 1 좋음 · 2 훌륭함 · 3 최고). 센서나 화면 흔들기는 필요 없다.

## 전투
`1 기술 · 2 교체 · 3 가방 · 4 도망`(트레이너전은 도망 불가). 기술은 1~4번 입력. 상성·급소·상태이상(수면·독·마비·화상)이 있다. 벤치의 살아 있는 포켓몬도 경험치를 40% 받는다. 전멸하면 마지막 포켓몬센터로 돌아가고 돈이 절반이 된다. 퀘스트와 퍼즐 진행은 유지된다.

## 저장
포켓몬센터 또는 메뉴 5에서 세이브 코드를 받는다. 이어하기에서 붙여넣으면 복원된다. 코드가 깨졌으면 오류를 표시하고 현재 진행은 그대로다.

## 길이 막혔을 때
잠긴 출구로 가면 아직 필요한 일의 제목이 나온다. 메뉴 8 또는 P 키로 다음 목표를 확인한다. 단서(…단서)는 어떤 순서로 찾아도 된다.
""")
print("docs written")
