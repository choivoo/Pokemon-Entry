# -*- coding: utf-8 -*-
"""Part D: drawing, new game/title, menus, shop, ending, input."""
from bdsl import *
from game_data import *
NF=len(FLAGS); NI=len(ITEMS); NTH=len(THEMES)
ST_TXT=["","잠듦","독","마비","화상"]
def logic():
    mp=v("mp"); px=v("px"); py=v("py"); pf=v("pf"); money=v("money"); badges=v("badges"); cleared=v("cleared"); pn=v("pn"); bn=v("bn"); cmd=v("cmd"); busy=v("busy")
    T=l("T_rows")
    # ---------- painters ----------
    for name in ("floor","wall","grass","water","door"):
        with proc("stamp_"+name,obj="tile_"+name):
            locate(v("dx_"),v("dy_"))
            for t in range(1,NTH+1):
                with If(v("th")==t): shape(f"PIC:tile_{name}:{t}")
            stamp()
    with proc("stamp_npc",obj="npc_glyph"):
        locate(v("dx_"),v("dy_"))
        for k in range(1,12):
            with If(v("nk")==k): shape(f"PIC:npc_glyph:{k}")
        stamp()
    with proc("draw_tiles"):
        P.emit(blk("erase_all_stamps"))
        v("th").set(l("M_theme")[mp]); y=v("dm_y"); y.set(0)
        v("dk_r").set(99)
        with If(l("M_dark")[mp]==1):
            v("dk_r").set(3)
            with If(v("aff")>=20): v("dk_r").set(4)
            with If(v("aff")>=50): v("dk_r").set(5)
        with Repeat(11):
            row=v("dm_row"); row.set(T[(mp-1)*11+y+1]); x=v("dm_x"); x.set(0)
            with Repeat(20):
                ch=v("dm_c"); ch.set(charat(row,x+1)); v("dx_").set(-228+24*x); v("dy_").set(123-24*y)
                v("dk_a").set(x-px); v("dk_b").set(y-py)
                with If(v("dk_a")<0): v("dk_a").set(0-v("dk_a"))
                with If(v("dk_b")<0): v("dk_b").set(0-v("dk_b"))
                with If(v("dk_a")+v("dk_b")<=v("dk_r")):
                    with If(ch=="#"): call("stamp_wall")
                    with If(ch=="g"): call("stamp_grass")
                    with If(ch=="~"): call("stamp_water")
                    with If(ch=="D"): call("stamp_door")
                    with If(ch=="."): call("stamp_floor")
                    with If(ch=="h"):
                        with IfElse((l("M_hflag")[mp]>0)&(l("FS")[l("M_hflag")[mp]]==1)) as ieh:
                            call("stamp_floor"); ieh.other(); call("stamp_wall")
                    with If(ch=="D"):
                        v("lk_e").set(1); v("lk_f").set(0)
                        with Repeat(l("X_map").length()):
                            with If((v("lk_f")==0)&(l("X_map")[v("lk_e")]==mp)&(l("X_x")[v("lk_e")]==x)&(l("X_y")[v("lk_e")]==y)):
                                v("lk_f").set(1); v("gi").set(l("X_gate")[v("lk_e")]); call("gate_check")
                                with If(v("ok_")==0): v("nk").set(11); call("stamp_npc")
                            v("lk_e").inc()
                x.inc()
            y.inc()
        i=v("dm_i"); i.set(l("M_nstart")[mp])
        with Repeat(l("M_ncount")[mp]):
            v("dk_a").set(l("N_x")[i]-px); v("dk_b").set(l("N_y")[i]-py)
            with If(v("dk_a")<0): v("dk_a").set(0-v("dk_a"))
            with If(v("dk_b")<0): v("dk_b").set(0-v("dk_b"))
            with If(v("dk_a")+v("dk_b")<=v("dk_r")):
                v("dx_").set(-228+24*l("N_x")[i]); v("dy_").set(123-24*l("N_y")[i]); v("nk").set(l("N_kind")[i])
                with If(v("nk")==3):
                    with If((l("N_on1")[i]>0)&(l("FS")[l("N_on1")[i]]==1)): v("nk").set(10)
                    with If((l("N_on2")[i]>0)&(l("FS")[l("N_on2")[i]]==1)): v("nk").set(10)
                call("stamp_npc")
            i.inc()
    with proc("redraw_dark"): call("draw_tiles"); P.emit(blk("message_cast",P.msg("wild_view")))
    with proc("draw_map"):
        call("draw_tiles"); call("spawn_wild"); v("moved_map").set(1); call("place_actors"); call("bgm_set_for_map"); call("area_greet")
        with IfElse(((v("steps")//300)%2)==1) as ie:
            hud("밤: 어둠 속에서 ghost·독·에스퍼 포켓몬이 더 자주 나타난다"); ie.other(); hud(join(l("M_name")[mp]," (낮)"))
    with proc("place_actors"):
        v("pl_x").set(-228+24*px); v("pl_y").set(123-24*py)
        with IfElse(v("moved_map")==1) as ie:
            v("pk_x").set(v("pl_x")); v("pk_y").set(v("pl_y")); ie.other()
            v("pk_x").set(-228+24*v("ox")); v("pk_y").set(123-24*v("oy"))
        P.emit(blk("message_cast",P.msg("actors_move")))
    with proc("actors_move",obj="player"):
        locate(v("pl_x"),v("pl_y"))
        for d in range(4):
            with If(pf==d):
                with IfElse(v("steps")%2==0) as ie:
                    shape(f"PIC:player:{d+1}_1"); ie.other(); shape(f"PIC:player:{d+1}_2")
    with proc("actors_move",obj="pika"):
        locate(v("pk_x"),v("pk_y"))
    # ---------- new game ----------
    with proc("new_game"):
        i=v("ng_i"); i.set(1)
        with Repeat(NF): l("FS").set(i,0); i.inc()
        i.set(1)
        with Repeat(151): l("DEX").set(i,0); i.inc()
        i.set(1)
        with Repeat(NI): l("BAG").set(i,0); i.inc()
        l("BAG").set(IIDX["monster-ball"],5); l("BAG").set(IIDX["potion"],5)
        with While(l("BX_sp").length()>0):
            for k in ("sp","lv","exp","hp","st"): l("BX_"+k).remove(1)
        with While(l("BX_mv").length()>0): l("BX_mv").remove(1); l("BX_pp").remove(1)
        i.set(1)
        with Repeat(6):
            for k in ("sp","lv","exp","hp","st"): l("PS_"+k).set(i,0)
            i.inc()
        i.set(1)
        with Repeat(24): l("PS_mv").set(i,0); l("PS_pp").set(i,0); i.inc()
        pn.set(0); bn.set(0); money.set(3000); badges.set(0); cleared.set(0); mp.set(MIDX["H01_0"]); px.set(3); py.set(5); pf.set(0); v("lastcenter").set(MIDX["H01_0"])
        v("g_sp").set(25); v("g_lv").set(5); call("add_mon"); l("DEX").set(25,2)
    with proc("title"):
        v("started").set(0)
        with While(v("started")==0):
            ask("포켓몬: 피카츄와 관동의 길  1 새 게임  2 이어하기"); v("t_in").set(answer())
            with If(v("t_in")==1): call("new_game"); v("started").set(1)
            with If(v("t_in")==2):
                ask("세이브 코드를 붙여넣으세요"); v("save_code").set(answer()); call("save_decode")
                with IfElse(v("ld_err")=="") as ie:
                    v("started").set(1); say("불러오기 성공!"); ie.other(); say(join("불러오기 실패: ",v("ld_err"),"  (현재 진행은 그대로입니다)"))
    with proc("start_game"):
        call("title"); v("moved_map").set(1); call("draw_map"); say("피카츄와 관동의 여행이 시작된다! (방향키/WASD 이동, 스페이스/Z 확인, M 메뉴)")
    # ---------- menus ----------
    def status_text(i): return ST_TXT
    with proc("party_view"):
        v("pt").set(""); i=v("pv_i"); i.set(1)
        with Repeat(pn):
            v("st_sp").set(l("PS_sp")[i]); v("st_lv").set(l("PS_lv")[i]); call("max_hp"); v("bar_hp").set(l("PS_hp")[i]); v("bar_mx").set(v("st_out")); call("bar")
            v("pt").set(join(v("pt"),i,". ",l("S_name")[l("PS_sp")[i]]," Lv",l("PS_lv")[i]," ",v("bar_out")," ",l("PS_hp")[i],"/",v("st_out")," [",l("TYPE_name")[l("S_t1")[l("PS_sp")[i]]],"]\n"))
            i.inc()
        v("panel_text").set(v("pt")); call("panel_set")
        ask("0 닫기  1 순서 변경"); 
        with If(answer()==1):
            ask("바꿀 번호 첫 번째?"); v("sw_a").set(answer()); ask("바꿀 번호 두 번째?"); v("sw_b").set(answer())
            with If((v("sw_a")>=1)&(v("sw_a")<=pn)&(v("sw_b")>=1)&(v("sw_b")<=pn)&(v("sw_a")!=v("sw_b"))): call("swap_party")
        call("panel_hide")
    with proc("swap_party"):
        a=v("sw_a"); b=v("sw_b")
        for k in ("sp","lv","exp","hp","st"):
            v("sw_t").set(l("PS_"+k)[a]); l("PS_"+k).set(a,l("PS_"+k)[b]); l("PS_"+k).set(b,v("sw_t"))
        for q in range(1,5):
            v("sw_t").set(l("PS_mv")[(a-1)*4+q]); l("PS_mv").set((a-1)*4+q,l("PS_mv")[(b-1)*4+q]); l("PS_mv").set((b-1)*4+q,v("sw_t"))
            v("sw_t").set(l("PS_pp")[(a-1)*4+q]); l("PS_pp").set((a-1)*4+q,l("PS_pp")[(b-1)*4+q]); l("PS_pp").set((b-1)*4+q,v("sw_t"))
    with proc("bag_view"):
        v("pt").set(join("소지금 ",money,"원\n")); i=v("bg_i"); i.set(1)
        with Repeat(NI):
            with If(l("BAG")[i]>0): v("pt").set(join(v("pt"),i,". ",l("I_name")[i]," x",l("BAG")[i],"\n"))
            i.inc()
        v("panel_text").set(v("pt")); call("panel_set")
        ask("사용할 아이템 번호 (0 닫기)"); v("ui_item").set(answer()); call("panel_hide")
        with If((v("ui_item")>=1)&(v("ui_item")<=NI)):
            with IfElse(l("I_kind")[v("ui_item")]==6) as ie:
                ask("진화시킬 포켓몬 번호?"); v("ui_i").set(answer()); call("use_stone"); ie.other()
                ask("대상 포켓몬 번호?"); v("ui_i").set(answer()); call("use_item")
                with If(v("ui_ok")==0): say("사용할 수 없다.")
    with proc("use_stone"):
        v("us_ok").set(0)
        with If((l("BAG")[v("ui_item")]>0)&(v("ui_i")>=1)&(v("ui_i")<=pn)):
            e=v("us_e"); e.set(1)
            with Repeat(l("E_from").length()):
                with If((l("E_from")[e]==l("PS_sp")[v("ui_i")])&(l("E_item")[e]==v("ui_item"))&(v("us_ok")==0)):
                    v("us_ok").set(1); l("BAG").set(v("ui_item"),l("BAG")[v("ui_item")]-1); v("ev_i").set(v("ui_i")); v("ev_to").set(l("E_to")[e]); call("evolve")
                e.inc()
            with If(v("us_ok")==0): say("아무 일도 일어나지 않았다.")
    with proc("dex_view"):
        seen=v("dx_seen"); caught=v("dx_caught"); seen.set(0); caught.set(0); i=v("dx_i"); i.set(1)
        with Repeat(151):
            with If(l("DEX")[i]>=1): seen.inc()
            with If(l("DEX")[i]==2): caught.inc()
            i.inc()
        say(join("도감: 본 포켓몬 ",seen," / 잡은 포켓몬 ",caught," / 151")); ask("페이지 1~16 (한 페이지 10마리, 0 닫기)"); pg=v("dx_pg"); pg.set(answer())
        with If((pg>=1)&(pg<=16)):
            v("pt").set(join("도감 ",pg,"쪽  (? 미발견 · 본 · 잡음)\n")); i.set((pg-1)*10+1)
            with Repeat(10):
                with If(i<=151):
                    with IfElse(l("DEX")[i]==0) as ie:
                        v("pt").set(join(v("pt"),i,". ??? \n")); ie.other()
                        v("pt").set(join(v("pt"),i,". ",l("S_name")[i],"  [",l("TYPE_name")[l("S_t1")[i]],"] ",txt("본")+"" if False else "","\n"))
                i.inc()
            v("panel_text").set(v("pt")); call("panel_set")
        ask("자세히 볼 번호 (0 닫기)"); v("dx_q").set(answer()); call("panel_hide")
        with If((v("dx_q")>=1)&(v("dx_q")<=151)):
            with IfElse(l("DEX")[v("dx_q")]==0) as ie:
                say("???  아직 만나지 못했다."); ie.other()
                say(join("No.",v("dx_q")," ",l("S_name")[v("dx_q")]," [",l("TYPE_name")[l("S_t1")[v("dx_q")]],"] ",txt("")+"")) 
                with If(l("DEX")[v("dx_q")]==2): say(l("S_desc")[v("dx_q")])
    with proc("party_remove"):  # in pr_i
        j=v("pr_j"); j.set(v("pr_i"))
        with Repeat(pn-v("pr_i")):
            for k in ("sp","lv","exp","hp","st"): l("PS_"+k).set(j,l("PS_"+k)[j+1])
            for q in range(1,5): l("PS_mv").set((j-1)*4+q,l("PS_mv")[j*4+q]); l("PS_pp").set((j-1)*4+q,l("PS_pp")[j*4+q])
            j.inc()
        pn.inc(-1)
    with proc("box_view"):
        ask("보관함 1 꺼내기  2 맡기기  3 목록 (페이지)  0 닫기"); v("bx_in").set(answer())
        with If(v("bx_in")==3):
            ask("페이지 번호 (1부터, 10개씩)"); pg=v("bx_pg"); pg.set(answer()); i=v("bx_i"); i.set((pg-1)*10+1)
            with Repeat(10):
                with If((i>=1)&(i<=bn)): say(join(i,". ",l("S_name")[l("BX_sp")[i]]," Lv",l("BX_lv")[i]))
                i.inc()
            with If(bn==0): say("보관함이 비어 있다.")
        with If(v("bx_in")==1):
            ask("꺼낼 보관함 번호?"); v("bx_n").set(answer())
            with IfElse((v("bx_n")>=1)&(v("bx_n")<=bn)) as ie:
                with IfElse(pn<6) as ie2:
                    pn.inc(); i=pn; n=v("bx_n")
                    for k in ("sp","lv","exp","hp","st"): l("PS_"+k).set(i,l("BX_"+k)[n])
                    for q in range(1,5): l("PS_mv").set((i-1)*4+q,l("BX_mv")[(n-1)*4+q]); l("PS_pp").set((i-1)*4+q,l("BX_pp")[(n-1)*4+q])
                    for k in ("sp","lv","exp","hp","st"): l("BX_"+k).remove(n)
                    for q in range(4): l("BX_mv").remove((n-1)*4+1); l("BX_pp").remove((n-1)*4+1)
                    bn.inc(-1); say("파티에 합류했다!")
                    ie2.other(); say("파티가 가득 찼다. 먼저 한 마리를 맡겨야 한다.")
                ie.other(); say("그런 번호는 없다.")
        with If(v("bx_in")==2):
            ask("맡길 파티 번호?"); v("pr_i").set(answer())
            with IfElse((v("pr_i")>=1)&(v("pr_i")<=pn)&(pn>1)) as ie:
                i=v("pr_i")
                for k in ("sp","lv","exp","hp","st"): l("BX_"+k).append(l("PS_"+k)[i])
                for q in range(1,5): l("BX_mv").append(l("PS_mv")[(i-1)*4+q]); l("BX_pp").append(l("PS_pp")[(i-1)*4+q])
                bn.inc(); call("party_remove"); say("보관함에 맡겼다.")
                ie.other(); say("마지막 한 마리는 맡길 수 없다.")
    with proc("settings"):
        ask("설정 1 우연 조우 끄기/켜기  2 조우율  3 글자 속도  4 음량(0~10)  5 효과 깜빡임  6 닫기"); v("se_in").set(answer())
        with If(v("se_in")==1):
            with IfElse(v("enc_on")==1) as ie:
                v("enc_on").set(0); say("필드 야생 포켓몬과 우연 조우를 껐다."); ie.other(); v("enc_on").set(1); say("필드 야생 포켓몬과 우연 조우를 켰다.")
        with If(v("se_in")==2):
            with IfElse(v("enc_rate")!=1) as ie:
                v("enc_rate").set(1); ie.other(); v("enc_rate").set(12)
            say(join("우연 조우율: ",v("enc_rate"),"%"))
        with If(v("se_in")==3):
            ask("글자 속도 1 느림  2 보통  3 빠름"); v("se_v").set(answer())
            with If(v("se_v")==1): v("txt_wait").set(0.8)
            with If(v("se_v")==2): v("txt_wait").set(0.2)
            with If(v("se_v")==3): v("txt_wait").set(0)
            say(join("글자 속도 설정: ",v("se_v")))
        with If(v("se_in")==4):
            ask("음량 0~10"); v("se_v").set(answer())
            with If((v("se_v")>=0)&(v("se_v")<=10)): v("vol").set(v("se_v")+0); P.emit(blk("message_cast",P.msg("apply_vol"))); say(join("음량: ",v("vol")))
        with If(v("se_in")==5):
            with IfElse(v("fx_blink")==1) as ie:
                v("fx_blink").set(0); say("피격 깜빡임 효과를 껐다."); ie.other(); v("fx_blink").set(1); say("피격 깜빡임 효과를 켰다.")
    with proc("main_menu"):
        ask("메뉴 1 파티  2 가방  3 도감  4 보관함  5 세이브  6 설정  7 닫기  8 힌트"); v("mm_in").set(answer())
        with If(v("mm_in")==1): call("party_view")
        with If(v("mm_in")==2): call("bag_view")
        with If(v("mm_in")==3): call("dex_view")
        with If(v("mm_in")==4): call("box_view")
        with If(v("mm_in")==5): call("save_encode"); say("세이브 코드 (복사해 두세요):"); say(v("save_code")); hud(v("save_code"))
        with If(v("mm_in")==6): call("settings")
        with If(v("mm_in")==8): call("hint")
    with proc("hint"):  # step-by-step hint: first unfinished main step in order
        i=v("ht_i"); i.set(1); v("ht_done").set(0)
        with Repeat(l("F_name").length()):
            with If((v("ht_done")==0)&(l("F_title")[i]!="")&(l("FS")[i]==0)): v("ht_done").set(1); say(join("다음 목표 후보: ",l("F_title")[i]))
            i.inc()
        with If(v("ht_done")==0): say("지금 남은 필수 목표가 없다!")
        say("피카츄: (귀를 쫑긋 세우고 주변을 살핀다) 반짝이는 곳이나 사람에게 말을 걸어 보자.")
    with proc("shop_menu"):  # in ra1 (shop idx)
        s0=l("SH_start")[v("ra1")]; c0=l("SH_count")[v("ra1")]; i=v("sh_i")
        v("sh_go").set(1)
        with While(v("sh_go")==1):
            say(join("보유 금액 ",money,"원")); i.set(0)
            with Repeat(c0):
                it=l("SH_item")[s0+i]; say(join(i+1,". ",l("I_name")[it]," ",l("I_price")[it],"원 (보유 ",l("BAG")[it],")")); i.inc()
            ask("구매할 번호 (0 종료)"); v("sh_n").set(answer())
            with IfElse((v("sh_n")>=1)&(v("sh_n")<=c0)) as ie:
                v("sh_it").set(l("SH_item")[s0+v("sh_n")-1]); ask("수량 (1~99)"); v("sh_q").set(answer())
                with IfElse((v("sh_q")>=1)&(v("sh_q")<=99)&(money>=l("I_price")[v("sh_it")]*v("sh_q"))&(l("BAG")[v("sh_it")]+v("sh_q")<=999)) as ie2:
                    money.inc(0-l("I_price")[v("sh_it")]*v("sh_q")); l("BAG").set(v("sh_it"),l("BAG")[v("sh_it")]+v("sh_q")); say("구매했다!")
                    ie2.other(); say("살 수 없다. (금액/수량 확인)")
                ie.other(); v("sh_go").set(0)
    with proc("center_menu"):
        v("lastcenter").set(mp); ask("세이브 코드를 발급할까요? 1 예  2 아니오")
        with If(answer()==1): call("save_encode"); say(v("save_code")); hud(v("save_code"))
    with proc("ending_scene"):
        say("챔피언 바라: 대단했어. 여행의 모든 순간이 네 포켓몬에게 새겨져 있구나.")
        say("돌여울은 낙반 방지 공사를 마쳤고, 물안개의 수문엔 순서표가 붙었다. 푸른닻 항구는 다시 불을 밝힌다.")
        say("잎새장터의 약초는 제자리로 돌아왔고, 늪숲 서식지는 맑아졌다. 로켓단의 작전은 막을 내렸다.")
        say("하루: 다음엔 내가 이긴다. ...피카츄, 잘 부탁해.")
        say("제작: 이 팬 프로젝트에 쓰인 포켓몬 이름·이미지는 PokéAPI 출처, 지역·인물·대사는 오리지널.")
        say("The End. 여행은 계속된다 - 같은 세이브로 이어하기 할 수 있다.")
        call("save_encode"); say("클리어 기록 세이브 코드:"); say(v("save_code"))
    # ---------- input ----------
    keymap=[(38,4),(87,4),(40,1),(83,1),(37,2),(65,2),(39,3),(68,3),(32,5),(90,5),(13,5),(77,7),(88,6),(27,6)]
    with proc("handle_cmd"):
        with If(busy==0):
            busy.set(1)
            with If((cmd>=1)&(cmd<=4)): call("try_move")
            with If(cmd==5): call("talk")
            with If(cmd==7): call("main_menu")
            cmd.set(0); busy.set(0)
    for code,c in keymap:
        with on_key(code):
            with IfElse(busy==0) as ie:
                cmd.set(c); call("handle_cmd"); ie.other()
                with If(c==5): cmd.set(5)
    with on_start():
        call("start_game")
