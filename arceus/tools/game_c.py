# -*- coding: utf-8 -*-
"""Part C: save codes, menus, drawing, title/boot, input."""
from bdsl import *
from game_data import *
NF=len(FLAGS); NI=len(ITEMS)
def logic():
    mp=v("mp"); px=v("px"); py=v("py"); money=v("money"); badges=v("badges"); cleared=v("cleared"); pn=v("pn"); bn=v("bn")
    # ---- string helpers ----
    DIG=l("DIGITS",["0","1","2","3","4","5","6","7","8","9"])
    with proc("checksum"):  # in ck_str -> ck_out
        v("ck_out").set(0); i=v("ck_i"); i.set(1)
        with Repeat(strlen(v("ck_str"))):
            c=v("ck_c"); c.set(charat(v("ck_str"),i)); v("ck_code").set(18)
            j=v("ck_j"); j.set(1)
            with Repeat(10):
                with If(c==DIG[j]): v("ck_code").set(j)
                j.inc()
            with If(c=="|"): v("ck_code").set(11)
            with If(c==":"): v("ck_code").set(12)
            with If(c=="~"): v("ck_code").set(13)
            with If(c=="."): v("ck_code").set(14)
            with If(c=="-"): v("ck_code").set(15)
            with If(c=="E"): v("ck_code").set(16)
            with If(c=="K"): v("ck_code").set(17)
            v("ck_out").set((v("ck_out")*131+v("ck_code"))%1000003)
            i.inc()
    SPL=l("SPL")
    with proc("split"):  # in sp_str, sp_sep -> SPL (list of strings)
        with While(SPL.length()>0): SPL.remove(1)
        cur=v("sp_cur"); cur.set(""); i=v("sp_i"); i.set(1)
        with Repeat(strlen(v("sp_str"))):
            c=v("sp_c"); c.set(charat(v("sp_str"),i))
            with IfElse(c==v("sp_sep")) as ie:
                SPL.append(cur); cur.set(""); ie.other(); cur.set(join(cur,c))
            i.inc()
        SPL.append(cur)
    # parse int: pi_str -> pi_val, pi_ok
    with proc("parse_int"):
        v("pi_ok").set(1); v("pi_val").set(0); v("pi_neg").set(0); i=v("pi_i"); i.set(1)
        with If(strlen(v("pi_str"))==0): v("pi_ok").set(0)
        with If(charat(v("pi_str"),1)=="-"): v("pi_neg").set(1); i.set(2); 
        with If((v("pi_neg")==1)&(strlen(v("pi_str"))==1)): v("pi_ok").set(0)
        with Repeat(strlen(v("pi_str"))-i+1):
            c=v("pi_c"); c.set(charat(v("pi_str"),i)); v("pi_d").set(-1); j=v("pi_j"); j.set(1)
            with Repeat(10):
                with If(c==DIG[j]): v("pi_d").set(j-1)
                j.inc()
            with IfElse(v("pi_d")<0) as ie:
                v("pi_ok").set(0); ie.other(); v("pi_val").set(v("pi_val")*10+v("pi_d"))
            i.inc()
        with If(v("pi_neg")==1): v("pi_val").set(0-v("pi_val"))
    # ---- encode ----
    def mon_str(pre,idx,out):
        out.set(join(l(pre+"_sp")[idx],":",l(pre+"_lv")[idx],":",l(pre+"_exp")[idx],":",l(pre+"_hp")[idx],":",l(pre+"_st")[idx],":",
            l(pre+"_mv")[(idx-1)*4+1],":",l(pre+"_mv")[(idx-1)*4+2],":",l(pre+"_mv")[(idx-1)*4+3],":",l(pre+"_mv")[(idx-1)*4+4],":",
            l(pre+"_pp")[(idx-1)*4+1],":",l(pre+"_pp")[(idx-1)*4+2],":",l(pre+"_pp")[(idx-1)*4+3],":",l(pre+"_pp")[(idx-1)*4+4]))
    with proc("save_encode"):  # -> save_code
        fl=v("sv_f"); fl.set(""); i=v("sv_i"); i.set(1)
        with Repeat(NF): fl.set(join(fl,l("FS")[i])); i.inc()
        dx=v("sv_d"); dx.set(""); i.set(1)
        with Repeat(NSP): dx.set(join(dx,l("DEX")[i])); i.inc()
        bg=v("sv_b"); bg.set(""); i.set(1)
        with Repeat(NI):
            with IfElse(i==1) as ie:
                bg.set(l("BAG")[i]); ie.other(); bg.set(join(bg,".",l("BAG")[i]))
            i.inc()
        pt=v("sv_p"); pt.set(""); i.set(1); m=v("sv_m")
        with Repeat(pn):
            mon_str("PS",i,m)
            with IfElse(i==1) as ie:
                pt.set(m); ie.other(); pt.set(join(pt,"~",m))
            i.inc()
        bx=v("sv_x"); bx.set(""); i.set(1)
        with Repeat(bn):
            mon_str("BX",i,m)
            with IfElse(i==1) as ie:
                bx.set(m); ie.other(); bx.set(join(bx,"~",m))
            i.inc()
        v("sv_body").set(join("EK1|",mp,"|",px,"|",py,"|",money,"|",badges,"|",cleared,"|",v("lastcenter"),"|",fl,"|",dx,"|",bg,"|",pt,"|",bx))
        v("ck_str").set(v("sv_body")); call("checksum")
        v("save_code").set(join(v("sv_body"),"|",v("ck_out")))
    # ---- decode (validate fully, then apply) ----
    err=v("ld_err",""); 
    def need_int(sv,out,lo,hi,what):
        v("pi_str").set(sv); call("parse_int")
        with If((v("pi_ok")==0)|(v("pi_val")<lo)|(v("pi_val")>hi)):
            with If(err==""): err.set(what)
        out.set(v("pi_val"))
    TM={k:l("TMP_"+k,[0]*200) for k in ("sp","lv","exp","hp","st")}; TMV=l("TMP_mv",[0]*800); TPP=l("TMP_pp",[0]*800)
    with proc("parse_mons"):  # in pm_str, pm_max -> fills TMP_*, pm_n  (error in ld_err)
        v("pm_n").set(0)
        with If(v("pm_str")!=""):
            v("sp_str").set(v("pm_str")); v("sp_sep").set("~"); call("split")
            v("pm_cnt").set(SPL.length())
            with If(v("pm_cnt")>v("pm_max")): err.set("파티/보관함 수 오류") if False else None
            with IfElse(v("pm_cnt")>v("pm_max")) as ie:
                with If(err==""): err.set("개체 수 오류")
                ie.other()
                # copy SPL entries to temp string list first (SPL reused by inner split)
                l("PM_ent",[]); 
                with While(l("PM_ent").length()>0): l("PM_ent").remove(1)
                j=v("pm_j"); j.set(1)
                with Repeat(v("pm_cnt")): l("PM_ent").append(SPL[j]); j.inc()
                j.set(1)
                with Repeat(v("pm_cnt")):
                    v("sp_str").set(l("PM_ent")[j]); v("sp_sep").set(":"); call("split")
                    with IfElse(SPL.length()!=13) as ie2:
                        with If(err==""): err.set("개체 형식 오류")
                        ie2.other()
                        base=(j-1)*4
                        need_int(SPL[1],v("pm_sp"),1,NSP,"포켓몬 번호 오류"); need_int(SPL[2],v("pm_lv"),1,100,"레벨 오류"); need_int(SPL[3],v("pm_exp"),0,100000000,"경험치 오류")
                        need_int(SPL[4],v("pm_hp"),0,100000,"HP 오류"); need_int(SPL[5],v("pm_st"),0,4,"상태 오류")
                        with If(err==""):
                            v("st_sp").set(v("pm_sp")); v("st_lv").set(v("pm_lv")); call("max_hp")
                            with If(v("pm_hp")>v("st_out")): err.set("HP 범위 오류")
                        TM["sp"].set(j,v("pm_sp")); TM["lv"].set(j,v("pm_lv")); TM["exp"].set(j,v("pm_exp")); TM["hp"].set(j,v("pm_hp")); TM["st"].set(j,v("pm_st"))
                        for k in range(4):
                            need_int(SPL[6+k],v("pm_mv"),0,len(MOVES),"기술 오류"); TMV.set(base+k+1,v("pm_mv"))
                            need_int(SPL[10+k],v("pm_pp"),0,64,"PP 오류"); TPP.set(base+k+1,v("pm_pp"))
                        with If(TMV[base+1]==0): 
                            with If(err==""): err.set("기술 없음")
                    j.inc()
                v("pm_n").set(v("pm_cnt"))
    with proc("save_decode"):  # in save_code -> ld_err ("" ok); applies on success
        err.set("")
        code=v("save_code"); n=v("ld_n"); n.set(strlen(code)); i=v("ld_i"); lastbar=v("ld_lb"); lastbar.set(0); i.set(1)
        with Repeat(n):
            with If(charat(code,i)=="|"): lastbar.set(i)
            i.inc()
        with If(lastbar<2): err.set("형식 오류")
        with If(err==""):
            v("ld_body").set(substr(code,1,lastbar-1)); v("ld_ck").set(substr(code,lastbar+1,n))
            v("ck_str").set(v("ld_body")); call("checksum"); v("pi_str").set(v("ld_ck")); call("parse_int")
            with If((v("pi_ok")==0)|(v("pi_val")!=v("ck_out"))): err.set("검사값 불일치")
        with If(err==""):
            v("sp_str").set(v("ld_body")); v("sp_sep").set("|"); call("split")
            with IfElse(SPL.length()!=13) as ie:
                err.set("필드 수 오류"); ie.other()
                with If(SPL[1]!="EK1"): err.set("버전 불일치")
        with If(err==""):
            l("LD_f",[]); 
            with While(l("LD_f").length()>0): l("LD_f").remove(1)
            j=v("ld_j"); j.set(1)
            with Repeat(13): l("LD_f").append(SPL[j]); j.inc()
            LF=l("LD_f")
            need_int(LF[2],v("ld_mp"),1,len(MAPS),"알 수 없는 맵"); need_int(LF[3],v("ld_x"),0,19,"좌표 오류"); need_int(LF[4],v("ld_y"),0,10,"좌표 오류")
            need_int(LF[5],v("ld_money"),0,99999999,"돈 오류"); need_int(LF[6],v("ld_badges"),0,255,"배지 오류"); need_int(LF[7],v("ld_clear"),0,1,"클리어 오류"); need_int(LF[8],v("ld_lc"),1,len(MAPS),"센터 오류")
            with If(err==""):
                tx=v("tx"); ty=v("ty"); tx.set(v("ld_x")); ty.set(v("ld_y"))
                save_mp=v("ld_savemp"); save_mp.set(mp); mp.set(v("ld_mp")); call("tile_at"); mp.set(save_mp)
                with If(v("tch")=="#"): err.set("좌표가 벽 위")
            with If((err=="")&(strlen(LF[9])!=NF)): err.set("플래그 길이 오류")
            with If((err=="")&(strlen(LF[10])!=NSP)): err.set("도감 길이 오류")
            # flags & dex chars must be digits
            i.set(1)
            with Repeat(NF):
                with If((err=="")&(charat(LF[9],i)!="0")&(charat(LF[9],i)!="1")): err.set("플래그 값 오류")
                i.inc()
            i.set(1)
            with Repeat(NSP):
                with If((err=="")&(charat(LF[10],i)!="0")&(charat(LF[10],i)!="1")&(charat(LF[10],i)!="2")): err.set("도감 값 오류")
                i.inc()
            with If(err==""):
                v("sp_str").set(LF[11]); v("sp_sep").set("."); call("split")
                with IfElse(SPL.length()!=NI) as ie:
                    err.set("가방 형식 오류"); ie.other()
                    l("LD_bag",[0]*NI); i.set(1)
                    with Repeat(NI):
                        need_int(SPL[i],v("ld_q"),0,9999,"수량 오류"); l("LD_bag").set(i,v("ld_q")); i.inc()
            with If(err==""):
                v("pm_str").set(LF[12]); v("pm_max").set(6); call("parse_mons")
                with If((err=="")&((v("pm_n")<1))): err.set("파티가 비어 있음")
                # stash party temp into holders
                for k in ("sp","lv","exp","hp","st"):
                    l("LP_"+k,[0]*6)
                    j=v("lp_j"); j.set(1)
                    with Repeat(6): l("LP_"+k).set(j,TM[k][j]); j.inc()
                l("LP_mv",[0]*24); l("LP_pp",[0]*24); j.set(1)
                with Repeat(24): l("LP_mv").set(j,TMV[j]); l("LP_pp").set(j,TPP[j]); j.inc()
                v("ld_pn").set(v("pm_n"))
            with If(err==""):
                v("pm_str").set(LF[13]); v("pm_max").set(200); call("parse_mons"); v("ld_bn").set(v("pm_n"))
        # apply
        with If(err==""):
            call("apply_loaded")
    with proc("apply_loaded"):
        mp.set(v("ld_mp")); px.set(v("ld_x")); py.set(v("ld_y")); money.set(v("ld_money")); badges.set(v("ld_badges")); cleared.set(v("ld_clear")); v("lastcenter").set(v("ld_lc"))
        i=v("al_i"); i.set(1)
        with Repeat(NF): l("FS").set(i,charat(l("LD_f")[9],i)+0); i.inc()
        i.set(1)
        with Repeat(NSP): l("DEX").set(i,charat(l("LD_f")[10],i)+0); i.inc()
        i.set(1)
        with Repeat(NI): l("BAG").set(i,l("LD_bag")[i]); i.inc()
        pn.set(v("ld_pn")); i.set(1)
        with Repeat(6):
            for k in ("sp","lv","exp","hp","st"): l("PS_"+k).set(i,l("LP_"+k)[i])
            i.inc()
        i.set(1)
        with Repeat(24): l("PS_mv").set(i,l("LP_mv")[i]); l("PS_pp").set(i,l("LP_pp")[i]); i.inc()
        with While(l("BX_sp").length()>0):
            for k in ("sp","lv","exp","hp","st"): l("BX_"+k).remove(1)
        with While(l("BX_mv").length()>0): l("BX_mv").remove(1); l("BX_pp").remove(1)
        bn.set(v("ld_bn")); i.set(1)
        with Repeat(bn):
            for k in ("sp","lv","exp","hp","st"): l("BX_"+k).append(TM[k][i])
            for q in range(1,5): l("BX_mv").append(TMV[(i-1)*4+q]); l("BX_pp").append(TPP[(i-1)*4+q])
            i.inc()
