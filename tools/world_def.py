# -*- coding: utf-8 -*-
"""Hand-authored design data: areas, chapters, quest steps, characters. Consumed by build_world.py."""
# area: id, name, kind(hub/road/dungeon/gym), chapter, theme, screens, wild types, hint
A=[]
def area(i,name,kind,ch,theme,scr,types=(),note=""): A.append(dict(id=i,name=name,kind=kind,ch=ch,theme=theme,screens=scr,types=list(types),note=note))
# ch1
area("H01","초록골","hub",1,"town",2,note="출발 마을. 연구소와 집")
area("R01","풀빛길","road",1,"meadow",3,["normal","flying","bug"],"첫 포획")
area("R02","샛바람 평야","road",1,"meadow",3,["normal","flying","poison"],"짧은 샛길")
# ch2
area("R03","이끼숲길","road",2,"forest",3,["bug","grass","normal"],"수풀 움직임")
area("D01","오래된 숲","dungeon",2,"forest",4,["bug","grass","poison"],"그늘 길, 방향 지름길")
area("H02","돌여울","hub",2,"quarry",2,note="채석 도시")
area("G01","바위 체육관","gym",2,"gym_rock",3)
# ch3
area("R04","동굴 입구길","road",3,"cave",3,["rock","ground","normal"])
area("D02","메아리 동굴","dungeon",3,"cave",4,["rock","ground","normal","fighting"],"시야 제한, 화석 조사")
area("R05","지하수로길","road",3,"canal",3,["water","normal","bug"])
area("H03","물안개","hub",3,"canal",2,note="수로 도시")
area("G02","물 체육관","gym",3,"gym_water",3)
# ch4
area("R06","항구길","road",4,"coast",3,["water","normal","flying"])
area("H04","푸른닻","hub",4,"harbor",2,note="항구")
area("D03","창고가","dungeon",4,"harbor",4,["normal","electric","poison"],"부두와 창고")
area("D04","침몰선","dungeon",4,"ship",4,["water","ghost","poison"],"선박 조사")
area("G03","전기 체육관","gym",4,"gym_electric",3)
# ch5
area("R07","삼림길","road",5,"forest",3,["grass","bug","normal"])
area("R08","시장길","road",5,"market",3,["normal","grass","fairy"])
area("H05","잎새장터","hub",5,"market",2,note="삼림 시장")
area("D05","시장 지하창고","dungeon",5,"cellar",4,["poison","bug","normal"])
area("G04","풀 체육관","gym",5,"gym_grass",3)
# ch6
area("R09","연락선로","road",6,"rail",3,["electric","normal","flying"])
area("R10","중계탑길","road",6,"hill",3,["electric","flying","rock"])
area("H06","고리나루","hub",6,"rail",2,note="연락망 허브")
area("D06","중계소","dungeon",6,"lab",4,["electric","normal","steel"],"중반 로켓단 사건")
# ch7
area("R11","늪길","road",7,"swamp",3,["poison","water","grass"])
area("R12","보호구역 외곽","road",7,"swamp",3,["grass","poison","normal"])
area("H07","늪숲마을","hub",7,"swamp",2,note="보호구역 거점")
area("D07","서식지 심부","dungeon",7,"swamp",4,["poison","grass","psychic","bug"],"조용히 접근")
area("G05","독 체육관","gym",7,"gym_poison",3)
# ch8
area("R13","대도시 진입로","road",8,"city",3,["normal","electric","psychic"])
area("H08","중앙시","hub",8,"city",2,note="대도시")
area("D08","연구 시설","dungeon",8,"lab",4,["psychic","electric","normal"])
area("D09","지하 통로","dungeon",8,"cellar",4,["poison","normal","fighting"])
area("G06","에스퍼 체육관","gym",8,"gym_psychic",3)
# ch9
area("R14","해안 항로","road",9,"coast",3,["water","flying","normal"])
area("R15","조수길","road",9,"tide",3,["water","rock","ground"])
area("H09","불뫼섬","hub",9,"volcano",2,note="외해의 섬")
area("D10","화산 동굴","dungeon",9,"volcano",4,["fire","rock","ground"])
area("D11","관측소","dungeon",9,"lab",4,["fire","normal","psychic"])
area("G07","불꽃 체육관","gym",9,"gym_fire",3)
# ch10
area("R16","사막길","road",10,"desert",3,["ground","rock","normal"])
area("R17","황토길","road",10,"desert",3,["ground","fighting","normal"])
area("H10","황토읍","hub",10,"desert",2,note="운송 도시")
area("D12","로켓단 본부","dungeon",10,"hq",4,["poison","normal","electric"],"본부 작전")
area("G08","땅 체육관","gym",10,"gym_ground",3)
# ch11
area("R18","북부 산길","road",11,"mountain",3,["rock","ice","flying"])
area("H11","산채","hub",11,"mountain",2,note="준비 거점, 초반과 지름길 연결")
area("R19","챔피언로드 1","road",11,"road",3,["rock","fighting","ground","dragon"])
area("R20","챔피언로드 2","road",11,"road",3,["rock","fighting","ice","ghost"])
area("D13","로드 동굴","dungeon",11,"cave",4,["rock","ground","dragon","fighting"])
area("R21","리그 진입길","road",11,"road",3,["normal","flying","fighting"])
# ch12
area("H12","리그마을","hub",12,"league",2,note="휴식과 리그 진입")
area("D14","리그 본관","dungeon",12,"league",4,[])
# shortcuts
area("R22","북부 지름길","road",11,"mountain",3,["rock","ice"],"돌여울↔산채 (배지 3 이후)")
area("R23","해상 지름길","road",9,"tide",3,["water","flying"],"물안개↔불뫼섬 (배지 6 이후)")
area("R24","옛 철도길","road",8,"rail",3,["electric","steel","normal"],"고리나루↔중앙시 (연락망 복구 후)")

# Characters
RIVAL=dict(id="rival",name="하루",goal="형이 못 이룬 챔피언 도전을 증명하고 싶다")
GYMS=[ # type, leader, job, rule, party types
 dict(n=1,type="rock",leader="한돌",job="채석장 감독",rule="무게 발판: 단서대로 발판 순서를 밟아 통로를 연다",fear="낙반 사고 재발",level=14),
 dict(n=2,type="water",leader="소라",job="수문 관리인",rule="수문 순서: 물길이 막힌 순서를 읽고 수문을 연다",fear="수로 범람",level=20),
 dict(n=3,type="electric",leader="전서",job="항구 등대·전력 기사",rule="회로 연결: 끊긴 선로 순서를 이어 문을 연다",fear="정전으로 인한 항구 마비",level=26),
 dict(n=4,type="grass",leader="이파",job="장터 약초상 조합장",rule="시야 퍼즐: 자라난 덩굴 순서에 따라 길을 연다",fear="약초 서식지 소실",level=32),
 dict(n=5,type="poison",leader="독초",job="보호구역 수의사",rule="오염 지도: 안전한 길 순서를 지도에서 찾는다",fear="서식지 오염",level=38),
 dict(n=6,type="psychic",leader="서연",job="연구소 연구원",rule="선택 통로: 고른 순서가 통로를 바꾼다",fear="연구 시설 오용",level=44),
 dict(n=7,type="fire",leader="불씨",job="화산 관측소장",rule="열 장치 순환: 밸브 순서로 열을 돌린다",fear="분화 예측 실패",level=50),
 dict(n=8,type="ground",leader="황토",job="운송조합 대표",rule="지형 전환: 복합 스위치로 지형을 바꾼다",fear="조합이 로켓단에 이용당한 일",level=56),
]
ELITE=[("ice","한빙",58),("fighting","철권",60),("ghost","그림자",62),("dragon","용담",64)]
CHAMP=("바라",67)

# Required quest steps per chapter.  type: talk/item/trainer/puzzle/gym/rival/rocket/clue/catch/scene/league
# (id, type, area, screen, title, line)   screen index 0-based; 'any' marks clue steps (order-free)
Q={}
Q[1]=[
 ("c1_wake","talk","H01",0,"출발 아침","엄마: 오늘 송 박사님께 가기로 했잖니. 피카츄가 기다리고 있을 거야."),
 ("c1_lab","scene","H01",1,"피카츄를 만나다","송 박사: 이 피카츄는 몬스터볼을 싫어해서 늘 밖에 있어. 잘 부탁한다."),
 ("c1_lost","talk","H01",1,"잃어버린 상자","주민: 어제 마을로 오던 보급 상자가 사라졌어. 풀빛길 쪽에서 발자국을 봤단다."),
 ("c1_catch","catch","R01",0,"첫 포획","피카츄: (풀 사이를 가리킨다) 가까이 가서 볼을 던져 보자."),
 ("c1_clue1","clue","R01",1,"부러진 상자 조각","상자 조각이다. 로켓 모양 도장이 찍혀 있다."),
 ("c1_tr1","trainer","R01",2,"곤충 소년","소년: 풀빛길을 지나려면 나를 이기고 가!"),
 ("c1_clue2","clue","R02",0,"짧은 샛길","풀 사이로 좁은 길이 보인다. 피카츄가 꼬리로 풀을 가리킨다."),
 ("c1_box","item","R02",1,"보급 상자 회수","상자를 찾았다. 안에 몬스터볼 5개가 들어 있다."),
 ("c1_rival","rival","R02",2,"라이벌 첫전","하루: 나도 챔피언이 될 거야. 네 피카츄 어디 한 번 보자!"),
 ("c1_report","talk","H01",1,"박사에게 보고","송 박사: 로켓 도장이라고? 일단 이 도감과 지도를 가져가렴. 동쪽 숲을 지나 돌여울로 가 봐."),
]
Q[2]=[
 ("c2_gate","talk","R03",0,"숲의 안내인","안내인: 이끼숲은 풀이 흔들리는 쪽에 포켓몬이 있어. 그림자가 진 길은 지름길이야."),
 ("c2_clue1","clue","R03",1,"흔들리는 수풀","풀이 계속 흔들린다. 안쪽에 반짝이는 것이 있다."),
 ("c2_tr","trainer","R03",2,"채집 소녀","소녀: 숲에 들어가기 전에 몸풀기 한 판!"),
 ("c2_wood1","puzzle","D01",1,"방향 갈림길","표지: 해가 지는 쪽으로 세 번, 이끼가 두꺼운 쪽으로 한 번."),
 ("c2_clue2","clue","D01",2,"숨은 표식","나무 줄기에 새긴 로켓 표식이 있다."),
 ("c2_tr2","trainer","D01",3,"벌레잡이","벌레잡이: 여기서부터는 그늘이 깊어!"),
 ("c2_stone","item","D01",3,"채석 허가증","오래된 상자 안에 돌여울 채석 허가증이 있다."),
 ("c2_hub","talk","H02",0,"돌여울 입구","경비: 낙반 사고로 체육관이 닫혀 있소. 한돌 관장에게 허가증을 전해 주시오."),
 ("c2_gearshop","item","H02",1,"등산 장화","상인: 허가증이 있으면 이 장화를 드리지. 바위 샛길을 걸을 수 있어."),
 ("c2_gym","gym","G01",2,"바위 체육관","한돌: 낙반이 두려워 발판 순서를 외웠다. 너도 순서를 읽어 봐라!"),
]
Q[3]=[
 ("c3_rival","rival","R04",1,"라이벌 재회","하루: 배지 한 개? 나는 벌써 동굴을 한 번 돌았어."),
 ("c3_cave1","puzzle","D02",0,"소리 표식","동굴: 박수 소리가 두 번 울리는 쪽이 출구야."),
 ("c3_fossil","item","D02",1,"화석 조사","바위 속에 화석 같은 윤곽이 보인다. 조각을 모았다."),
 ("c3_tr","trainer","D02",2,"광부","광부: 불빛 없이 걷는 건 위험하지!"),
 ("c3_clue","clue","D02",3,"끊긴 수로 지도","지하수로 지도 한 조각이다. 수문 번호가 적혀 있다."),
 ("c3_canal","puzzle","R05",1,"수문 우회","수문 두 곳을 열어야 물길이 비켜난다."),
 ("c3_tr2","trainer","R05",2,"낚시꾼","낚시꾼: 물가에서 승부다!"),
 ("c3_hub","talk","H03",0,"물안개 시장","주민: 수문 관리인 소라가 수로 점검 중이라 체육관이 늦게 열려."),
 ("c3_valve","item","H03",1,"수문 열쇠","수문 열쇠를 얻었다."),
 ("c3_gym","gym","G02",2,"물 체육관","소라: 범람은 순서가 틀릴 때 생겨. 수문 순서를 맞춰 보렴."),
]
Q[4]=[
 ("c4_block","talk","R06",0,"항구 봉쇄","경비: 항구는 봉쇄되었어. 선박 한 척이 짐을 풀지 않았다네."),
 ("c4_tr","trainer","R06",2,"선원","선원: 이 길로는 못 보내!"),
 ("c4_hub","talk","H04",0,"푸른닻 부두","부두 노동자: 어젯밤부터 창고 불이 계속 깜빡여."),
 ("c4_ware","puzzle","D03",1,"창고 배전함","배전함: 빨강, 파랑, 노랑 순으로 켜야 문이 열린다."),
 ("c4_clue","clue","D03",2,"짐 목록","짐 목록에 로켓단 계열사 이름이 적혀 있다."),
 ("c4_ship1","puzzle","D04",0,"침몰선 진입","선체 틈으로 들어가는 길이 두 갈래다."),
 ("c4_tr2","trainer","D04",2,"유령 괴담꾼","괴담꾼: 이 배엔 소리가 나!"),
 ("c4_log","item","D04",3,"선박 항해일지","항해일지: 중앙시 연구소로 보낼 화물이 있었다."),
 ("c4_rocket1","rocket","H04",1,"로켓단 하수인","하수인: 일지를 내놔! 우리 작전을 방해하지 마!"),
 ("c4_gym","gym","G03",2,"전기 체육관","전서: 전력은 흐름이야. 끊긴 선로를 이어 봐라."),
]
Q[5]=[
 ("c5_rival","rival","R07",1,"라이벌 삼전","하루: 항구 일은 들었어. 난 숲을 먼저 지나갈 거야."),
 ("c5_tr","trainer","R07",2,"약초꾼","약초꾼: 풀 타입은 방심하면 당한다!"),
 ("c5_compare","item","R08",1,"장비 비교","상인 둘이 같은 가방을 다른 값에 판다. 더 좋은 쪽을 골라 가방을 샀다."),
 ("c5_hub","talk","H05",0,"장터 소문","상인: 지하창고에서 약초가 사라진대. 이파 조합장이 걱정이 크셔."),
 ("c5_cell1","puzzle","D05",1,"지하창고 환기","환기구 세 곳을 열어야 안쪽 길이 보인다."),
 ("c5_clue","clue","D05",2,"약초 장부","장부에 보호구역 이름이 적혀 있다."),
 ("c5_tr2","trainer","D05",3,"도둑 무리","도둑: 장부를 보면 안 돼!"),
 ("c5_herb","item","D05",3,"약초 상자","사라진 약초를 되찾았다."),
 ("c5_return","talk","H05",1,"조합장에게","이파: 고맙다. 대신 체육관의 시험은 봐주지 않는다."),
 ("c5_gym","gym","G04",2,"풀 체육관","이파: 자란 덩굴은 길을 가린다. 순서를 읽어라."),
]
Q[6]=[
 ("c6_net","talk","H06",0,"끊긴 연락망","역장: 도시 간 연락이 끊겼네. 선로와 중계탑 둘 다 확인해 줘."),
 ("c6_rail","puzzle","R09",1,"선로 점검","선로 분기기를 정해진 쪽으로 돌려야 한다."),
 ("c6_tr","trainer","R09",2,"전기 기사","기사: 선로 위에서 승부는 짜릿하지!"),
 ("c6_tower1","item","R10",1,"중계탑 부품","중계탑 부품을 주웠다."),
 ("c6_tr2","trainer","R10",2,"등산가","등산가: 탑까지 가려면 나를 넘어야지."),
 ("c6_relay","puzzle","D06",1,"중계소 입구","암호 패널: 선로 번호를 이어 입력하라."),
 ("c6_rocket2","rocket","D06",2,"중계소 로켓단","간부: 연락망이 끊기면 도시는 고립된다. 우리 계획의 첫 단계다!"),
 ("c6_rival","rival","D06",3,"라이벌 사전","하루: 이거 로켓단이 꾸민 거였어? 같이 가자... 아니, 따로 가자!"),
 ("c6_restore","scene","H06",1,"연락망 복구","역장: 도시 간 연락이 이어졌어. 옛 철도길도 다시 열 수 있다네."),
]
Q[7]=[
 ("c7_gate","talk","R11",0,"보호구역 안내","관리인: 보호구역은 소리를 낮추고 천천히 걸어야 해."),
 ("c7_tr","trainer","R11",2,"늪 탐험가","탐험가: 늪에서 길을 잃기 쉬워!"),
 ("c7_quiet","puzzle","R12",1,"조용히 접근","멈춰 서면 풀 속 포켓몬이 다가온다. 기다렸다 다가가라."),
 ("c7_hub","talk","H07",0,"늪숲마을","주민: 독초 관장이 서식지 오염 원인을 찾는다."),
 ("c7_hide","puzzle","D07",1,"숨은 통로","갈대 뒤에 숨은 통로가 있다."),
 ("c7_clue","clue","D07",2,"오염 표본","표본에서 로켓단 약품 성분이 검출된다."),
 ("c7_rare","catch","D07",3,"희귀종 관찰","희귀 서식지: 소리를 내지 않고 접근해 한 마리를 관찰했다."),
 ("c7_tr2","trainer","D07",3,"독 사냥꾼","사냥꾼: 오염원을 건드리지 마!"),
 ("c7_source","item","D07",3,"오염 장치 회수","오염 장치를 해체해 서식지를 지켰다."),
 ("c7_gym","gym","G05",2,"독 체육관","독초: 안전한 길은 지도가 말해 준다."),
]
Q[8]=[
 ("c8_gate","talk","R13",0,"대도시 진입로","안내원: 중앙시는 구역이 여럿이야. 지도를 확인하게."),
 ("c8_rival","rival","R13",2,"라이벌 오전","하루: 로켓단 때문에 형의 연구가 틀어졌어. 나도 막고 싶어."),
 ("c8_hub","talk","H08",0,"중앙시 광장","시민: 연구소 쪽에서 이상한 전력 소리가 나."),
 ("c8_lab1","puzzle","D08",1,"연구소 보안문","연구원: 카드키는 지하통로 쪽 보관함에 있어."),
 ("c8_sub","puzzle","D09",1,"지하통로 분기","분기점에서 선택에 따라 다른 방으로 이어진다."),
 ("c8_clue","clue","D09",2,"카드키 조각","카드키 조각이다."),
 ("c8_tr","trainer","D09",3,"연구 조교","조교: 카드키는 내가 지킨다!"),
 ("c8_data","item","D08",3,"실험 기록","실험 기록: 포켓몬 에너지를 억지로 뽑는 장치가 있다."),
 ("c8_rocket3","rocket","D08",3,"연구소 로켓단","간부: 기록은 가져간다. 섬의 관측소에 모든 것이 있다."),
 ("c8_gym","gym","G06",2,"에스퍼 체육관","서연: 길은 네가 고른 선택으로 바뀐다."),
]
Q[9]=[
 ("c9_ship","talk","R14",0,"항로 안내","선장: 섬까지는 해안 항로로 가야 한다. 조수가 낮을 때만 길이 드러나."),
 ("c9_tr","trainer","R14",2,"수영 선수","선수: 파도 위에서 승부!"),
 ("c9_tide","puzzle","R15",1,"조수로 드러나는 길","조수가 빠질 때까지 두 구간을 차례로 건넌다."),
 ("c9_hub","talk","H09",0,"불뫼섬 선착장","소장: 관측소 계측이 이상하다. 화산 동굴을 먼저 봐 줘."),
 ("c9_vol","puzzle","D10",1,"열 밸브 점검","열 밸브를 순서대로 열어 길을 식힌다."),
 ("c9_tr2","trainer","D10",2,"화산 안전원","안전원: 용암 가까이는 위험해!"),
 ("c9_clue","clue","D11",1,"관측소 문서","로켓단 본부가 사막 지역에 있다는 문서다."),
 ("c9_rocket","rocket","D11",3,"관측소 로켓단","간부: 화산 에너지를 본부로 보낸다. 늦었군!"),
 ("c9_gym","gym","G07",2,"불꽃 체육관","불씨: 열은 돌려야 한다. 밸브를 읽어라."),
]
Q[10]=[
 ("c10_gate","talk","R16",0,"사막 안내","운전사: 황토읍 운송조합이 수상한 화물을 받았다고 해."),
 ("c10_tr","trainer","R16",2,"사막 여행자","여행자: 모래바람 속에서 승부!"),
 ("c10_rival","rival","R17",2,"라이벌 육전","하루: 본부는 황토읍 지하에 있어. 먼저 들어간다!"),
 ("c10_hub","talk","H10",0,"황토읍 운송조합","황토 관장: 조합이 이용당했다. 본부 입구를 연다."),
 ("c10_hq1","puzzle","D12",0,"본부 입구","화물 컨테이너 번호를 맞춰 문을 연다."),
 ("c10_tr1","trainer","D12",1,"본부 단원","단원: 침입자다!"),
 ("c10_clue","clue","D12",2,"작전 계획서","작전 계획서: 리그 진입 심사를 방해할 계획이다."),
 ("c10_cap","rocket","D12",3,"간부 격파","간부: 총수님이 계획을 앞당길 것이다..."),
 ("c10_save","scene","D12",3,"작전 저지","에너지 송출 장치를 멈췄다. 섬과 도시의 전력이 돌아온다."),
 ("c10_gym","gym","G08",2,"땅 체육관","황토: 지형이 바뀌는 순서를 읽어라."),
]
Q[11]=[
 ("c11_gate","talk","R18",0,"북부 산길","산악인: 배지 여덟 개가 있어야 챔피언로드로 통한다."),
 ("c11_hub","talk","H11",0,"산채 휴식","산채 주인: 여기서 정비하고 가게. 돌여울과 지름길도 연결돼 있지."),
 ("c11_road1","trainer","R19",2,"산길 수련자","수련자: 챔피언로드의 문턱이다!"),
 ("c11_road2","puzzle","R20",1,"낙석 구간","낙석을 피하는 순서로 길을 건넌다."),
 ("c11_cave","puzzle","D13",2,"로드 동굴","로드 동굴 안 표식을 따라 출구로 향한다."),
 ("c11_tr","trainer","D13",3,"용 사육사","사육사: 끝이 가까워졌다고 방심하지 마!"),
 ("c11_inspect","scene","R21",1,"리그 진입 심사","심사관: 배지 확인 완료. 로켓단 작전이 저지된 것도 보고되었다."),
 ("c11_rival","rival","R21",2,"라이벌 결전","하루: 여기까지 왔네. 이번엔 내 모든 걸 보여줄게!"),
]
Q[12]=[
 ("c12_hub","talk","H12",0,"리그마을 대기","접수원: 사천왕과 챔피언 순서로 도전합니다."),
 ("c12_e1","league","D14",0,"사천왕 한빙","한빙: 얼음은 서둘지 않는다."),
 ("c12_e2","league","D14",1,"사천왕 철권","철권: 한 방으로 승부를 낸다."),
 ("c12_e3","league","D14",2,"사천왕 그림자","그림자: 보이지 않는 것을 믿어라."),
 ("c12_e4","league","D14",3,"사천왕 용담","용담: 마지막 관문이다."),
 ("c12_champ","league","D14",3,"챔피언 바라","바라: 모든 여정을 보여줘!"),
 ("c12_end","scene","H12",1,"후일담과 엔딩","엔딩: 돌여울은 낙반 방지 공사를 마쳤고, 물안개의 수문은 순서표를 붙였다. 항구와 연락망, 보호구역은 평화를 되찾았다."),
]
