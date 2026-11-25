'use strict';
const E=require('./engine.js');
const {WORLD,RULES_BY,TR,SPECIES,MOVES,ITEMS,G}=E;
const W=WORLD.W,H=WORLD.H;
const CH=WORLD.chapters;
function mkClock(){return{move:0,turn:0,line:0,throw:0,menu:0,load:0,catchIntro:0}}
const SEC={move:.22,turn:5,line:3,throw:7,menu:20,load:1,catchIntro:4};
function log(){ if(process.env.SIMV) console.log(...arguments) }
function run(opt){
  opt=Object.assign({seed:7,mode:'normal',shuffleClues:false,maxActions:4e6,verbose:false},opt);
  const s=E.newState(opt.seed), clk=mkClock(), perChapter={}; let curCh=1, chStart={...clk};
  const log=(...a)=>opt.verbose&&console.log(...a);
  const keyOf=(m,x,y)=>m+'|'+x+'|'+y;
  function path(goalFn){ // BFS over tiles+exits with current flags
    const start=keyOf(s.map,s.x,s.y); const prev=new Map([[start,null]]); const q=[[s.map,s.x,s.y]]; let qi=0;
    while(qi<q.length){ const [m,x,y]=q[qi++]; if(goalFn(m,x,y)) { const out=[]; let k=keyOf(m,x,y); while(prev.get(k)){ out.push(prev.get(k).step); k=prev.get(k).from } return out.reverse() }
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const nx=x+dx,ny=y+dy; const t=E.tile(m,nx,ny); if(!'.gD'.includes(t)) continue;
        if(WORLD.maps[m].npcs.some(n=>n.x===nx&&n.y===ny)) continue; let tm=m,tx=nx,ty=ny;
        if(t==='D'){ const e=WORLD.maps[m].exits.find(e=>e.x===nx&&e.y===ny); if(e.req.some(f=>!s.flags[f])) continue; tm=e.to;tx=e.tx;ty=e.ty }
        const k=keyOf(tm,tx,ty); if(prev.has(k)) continue; prev.set(k,{from:keyOf(m,x,y),step:[dx,dy]}); q.push([tm,tx,ty]) } }
    return null }
  function walk(p){ for(const [dx,dy] of p){ const r=E.move(s,dx,dy); if(!r.ok) throw new Error(`walk blocked at ${s.map} ${s.x},${s.y} -> ${dx},${dy} ${JSON.stringify(r)}`); clk.move++; if(r.changed) clk.load++;
      if(r.sight){ const nid=r.sight; const rule=E.RULES_BY[nid].find(x=>x.act==='battle'); const out=E.interact(s,nid,io,'l'); clk.line+=out.length;
        if(!s.flags[rule.set]){ log('SIGHT-LOST',rule.arg); losses++; whiteout(); ensureStrength(rule.arg,Math.min(8,losses)) } return false } } return true }
  let losses=0;
  function go(pf){ for(let g=0;g<60;g++){ const p=pf(); if(!p) return false; if(walk(p)) return true } throw new Error('unreachable (interrupted too often)') }
  function goAdj(nid){ const n=E.NPC[nid]; return go(()=>path((m,x,y)=>m===n.map&&Math.abs(x-n.x)+Math.abs(y-n.y)===1)) }
  function goMap(mapId){ return go(()=>path((m)=>m===mapId)) }
  const hpFrac=()=>s.party.reduce((a,m)=>a+m.hp/E.maxHp(m.sp,m.lv),0)/s.party.length;
  function effScore(m,fsp){ let best=0; for(const mo of m.moves){ const M=MOVES[mo.k]; if(M.power>0&&mo.pp>0){ best=Math.max(best,M.power*E.eff(M.type,SPECIES[fsp].types)*(SPECIES[m.sp].types.includes(M.type)?1.5:1)*M.acc/100) } } return best }
  const leadScore=(m,fsp)=>m.hp>0?(m.lv+10)*(effScore(m,fsp)+5):0;
  function chooseMove(b){ const p=E.active(b),f=E.foe(b); let best=null,bs=-1; for(const mo of p.moves){ const M=MOVES[mo.k]; if(mo.pp<=0)continue; let sc=M.power>0? M.power*E.eff(M.type,SPECIES[f.sp].types)*(SPECIES[p.sp].types.includes(M.type)?1.5:1)*M.acc/100:(f.st?0:20); if(sc>bs){bs=sc;best=mo.k} } return best||p.moves[0].k }
  function battle(foes,trainer,wild){
    { const f0=foes[0]; let bi=-1,bs=-1; s.party.forEach((m,i)=>{ const sc=leadScore(m,f0.sp); if(sc>bs){bs=sc;bi=i} }); if(bi>0){ const t=s.party[0]; s.party[0]=s.party[bi]; s.party[bi]=t } }
    const b=E.newBattle(s,foes,{trainer,wild}); if(b.pi<0) return 'lose'; b.part=new Set([b.pi]); E.dexSee(s,foes[0].sp,false);
    let guard=0; while(!b.over&&guard++<400){ let cmd;
      if(b.needSwitch){ const f=E.foe(b); const best=s.party.map((m,i)=>[m,i]).filter(([m])=>m.hp>0).sort((a,c)=>leadScore(c[0],f.sp)-leadScore(a[0],f.sp))[0]; cmd={t:'switch',i:best[1]} }
      else { const p=E.active(b); const mh=E.maxHp(p.sp,p.lv);
        const pot=['hyper-potion','super-potion','potion'].find(k=>s.bag[k]>0);
        if(p.hp<mh*.3&&pot&&(trainer||wild===false)&&p.hp>0) cmd={t:'item',k:pot,i:b.pi};
        else if(trainer&&b.turn%2===0&&(()=>{ const f=E.foe(b); const alt=s.party.map((m,i)=>[m,i]).filter(([m,i])=>i!==b.pi&&m.hp>E.maxHp(m.sp,m.lv)*.5).sort((a,c)=>leadScore(c[0],f.sp)-leadScore(a[0],f.sp))[0]; if(alt&&leadScore(alt[0],f.sp)>leadScore(p,f.sp)*1.8){ cmd={t:'switch',i:alt[1]}; return true } return false })()){}
        else cmd={t:'move',k:chooseMove(b)} }
      if(!E.turn(b,cmd)){ // fallback
        const alt=s.party.findIndex((m,i)=>m.hp>0&&i!==b.pi); if(b.needSwitch&&alt>=0) E.turn(b,{t:'switch',i:alt}); else E.turn(b,{t:'move',k:'tackle'}) }
      clk.turn++ }
    s.stats.battles++; return b.result }
  function evolveStones(){ for(const m of s.party.concat(s.box)){ for(const sp of Object.values(SPECIES)){ if(sp.evo&&sp.evo.from===m.sp&&sp.evo.item&&s.bag[sp.evo.item]>0){ E.addItem(s,sp.evo.item,-1); E.evolve(s,m,sp.id,null) } } } }
  function whiteout(){ s.stats.wipes++; setTimeout(()=>{},0); s.money=Math.floor(s.money/2); const hub=Object.values(WORLD.areas).filter(a=>a.kind==='hub'&&a.ch<=curCh).pop(); E.healAll(s); const mp=hub.id+'_0'; s.map=mp; s.x=3; s.y=4; if(!'.g'.includes(E.tile(mp,3,4))) {/* center at (3,3) so (3,4) free */} if(E.TRACE.on) E.TRACE.on.push(['w',E.WORLD_IDX[s.map],s.x,s.y]); clk.menu++ }
  function visitCenter(){ const hub=Object.values(WORLD.areas).filter(a=>a.kind==='hub'&&a.ch<=curCh).pop(); const nid=`n_${hub.id}_center`; if(!goAdj(nid)) return false; clk.line+=0; E.interact(s,nid,{}); clk.menu++; return true }
  function shop(){ const hub=Object.values(WORLD.areas).filter(a=>a.kind==='hub'&&a.ch<=curCh).pop(); const nid=`n_${hub.id}_shop`; if(!goAdj(nid)) return;
    const want=(k,n)=>{ const it=ITEMS[k]; if(!it||!E.RULES_BY[nid][0].arg.split(',').includes(k)) return; while((s.bag[k]||0)<n&&s.money>=it.price+300){ s.money-=it.price; E.addItem(s,k,1) } };
    const best=['ultra-ball','great-ball','monster-ball'].find(k=>E.RULES_BY[nid][0].arg.split(',').includes(k)); if(best) want(best,12); want('monster-ball',5);
    const pots=['hyper-potion','super-potion','potion'].filter(k=>E.RULES_BY[nid][0].arg.split(',').includes(k)); if(pots[0]) want(pots[0],10);
    if(E.RULES_BY[nid][0].arg.includes('stone')) for(const k of ['thunder-stone','water-stone','fire-stone','leaf-stone','moon-stone']) if((s.bag[k]||0)<1&&s.money>6000) want(k,1);
    clk.menu++ }
  function grindArea(){ const c=Object.values(WORLD.areas).filter(a=>a.kind!=='gym'&&a.types.length&&a.ch<=curCh&&E.WILD[a.id]); const top=c.filter(a=>a.ch===Math.max(...c.map(x=>x.ch))); return top[0].id }
  function nearGrass(a){ a=a||grindArea(); if(s.map.split('_')[0]===a&&E.tile(s.map,s.x,s.y)==='g') return true; return go(()=>path((m,x,y)=>m.split('_')[0]===a&&E.tile(m,x,y)==='g')) }
  function healItems(){ let used=0; for(const m of s.party){ while(m.hp>0&&m.hp<E.maxHp(m.sp,m.lv)*.6){ const k=['potion','super-potion','hyper-potion'].find(k=>s.bag[k]>0); if(!k) return used; E.useItem(s,k,m,null); used++; clk.menu+=.1 } } return used }
  function promote(m){ // make m the lead (box -> party swap if needed)
    let i=s.party.indexOf(m); if(i<0){ const j=s.box.indexOf(m); s.box.splice(j,1); if(s.party.length>=6){ const w=s.party.reduce((a,c)=>c.lv<a.lv?c:a); s.party.splice(s.party.indexOf(w),1); s.box.push(w) } s.party.push(m); i=s.party.length-1 }
    s.party.splice(i,1); s.party.unshift(m) }
  function grind(target,leads){ let g=0; const ls=leads||[];
    const done=()=>ls.length? ls.every(m=>m.lv>=target) : Math.max(...s.party.slice(0,3).map(m=>m.lv))>=target;
    while(!done()&&g++<2500){
      const alive=s.party.filter(m=>m.hp>0).length;
      if(alive>0&&hpFrac()<.55) healItems(); if(alive===0||hpFrac()<.4){ if(!visitCenter()) E.healAll(s) }
      ls.forEach(m=>{ if(!s.party.includes(m)) promote(m) });
      if(!nearGrass()) return false; clk.move+=6; const w=E.rollWild(s); if(!w) return false; const f=E.mkFoe(w.sp,w.lv);
      const r=battle([f],null,true); if(r==='lose') whiteout() } return true }
  function foeTypes(T){ const set=new Set(); T.party.forEach(p=>SPECIES[p.sp].types.forEach(t=>set.add(t))); return [...set] }
  function teamScore(m,T){ return T.party.reduce((a,p)=>a+effScore(m,p.sp),0)/T.party.length }
  function acquireCounter(T,need){ // catch a wild Pokemon whose moves counter this trainer's party
    const cands=[]; for(const a of WORLD.areas){ if(a.kind==='gym'||!a.types.length||a.ch>curCh||!E.WILD[a.id]) continue;
      for(const e of E.WILD[a.id].entries){ const m=E.mkMon(e.sp,Math.max(e.lo+2,need-6)); const sc=teamScore(m,T); cands.push({a:a.id,sp:e.sp,sc,w:e.w}) } }
    cands.sort((x,y)=>y.sc-x.sc||y.w-x.w); const c=cands[0]; if(!c||c.sc<40) return null;
    for(let g=0;g<600;g++){ if(!nearGrass(c.a)) return null; clk.move+=5; let w=null; for(let k=0;k<80&&!(w&&w.sp===c.sp);k++){ w=E.rollWild(s) } if(!w||w.sp!==c.sp) continue;
      const cc=E.newCatch(s,w.sp,w.lv,w.beh); clk.catchIntro++; let t=0; while(!cc.over&&t++<14){ const ball=['ultra-ball','great-ball','monster-ball'].find(k=>s.bag[k]>0); if(!ball){ shop(); if(!nearGrass(c.a)) return null; continue } E.throwBall(s,cc,ball,'great'); clk.throw++ }
      if(cc.result==='caught'){ const all=s.party.concat(s.box); return all[all.length-1] } }
    return null }
  function ensureStrength(trainerId,extra){ extra=extra||0; const T=TR[trainerId]; const mx=Math.max(...T.party.map(p=>p.lv));
    const strict=T.kind==='gym'||T.kind==='league'||T.kind==='rival'; const need=mx-(strict?1:2)+extra; const want=T.kind==='gym'||T.kind==='league'?Math.min(5,T.party.length):Math.min(3,T.party.length); let tries=0;
    while(tries++<8){
      const all=s.party.concat(s.box); const lvOk=all.filter(m=>m.lv>=need);
      const counterOk=T.kind==='rival'||T.kind==='optional'||lvOk.some(m=>teamScore(m,T)>=45);
      if(lvOk.length>=want&&counterOk&&hpFrac()>.8) break;
      if(!visitCenter()) E.healAll(s); shop(); evolveStones();
      let guard=0; while(s.party.length<Math.min(6,want+1)&&guard++<8){ if(!catchSomeWild(grindArea())) break }
      if(T.kind!=='rival'&&T.kind!=='optional'&&!all.some(m=>teamScore(m,T)>=45)){ acquireCounter(T,need) }
      const ranked=s.party.concat(s.box).sort((a,b)=>(teamScore(b,T)+10)*b.lv-(teamScore(a,T)+10)*a.lv).slice(0,Math.max(want,2));
      const tr=ranked.filter(m=>m.lv<need); if(tr.length) grind(need,tr); else grind(need,null)
    } }
  let grindSecs=0; const wsum=c=>Object.keys(c).reduce((a,k)=>a+c[k]*SEC[k],0);
  const io={battle:(tid)=>{ const T=TR[tid]; return battle(T.party.map(p=>E.mkFoe(p.sp,p.lv)),T,false) },
    shop:()=>{}, static:(sp,lv)=>catchStatic(sp,lv)};
  function battleNpc(nid){ const rule=(E.RULES_BY[nid]||[]).find(r=>r.act==='battle'); let out;
    if(!rule){ if(!goAdj(nid)) throw new Error('unreachable '+nid); return E.interact(s,nid,io) }
    let tries=0; while(!s.flags[rule.set]&&tries<7){ const c0={...clk}; ensureStrength(rule.arg,tries*2); grindSecs+=wsum(clk)-wsum(c0);
      if(!goAdj(nid)) throw new Error('unreachable '+nid); out=E.interact(s,nid,io); tries++; if(!s.flags[rule.set]){ log('LOST',rule.arg); whiteout() } }
    return out||[] }
  function catchStatic(sp,lv){ const c=E.newCatch(s,sp,lv,'flee'); let g=0; while(!c.over&&g++<30){ const ball=['ultra-ball','great-ball','monster-ball'].find(k=>s.bag[k]>0); if(!ball){shop();continue} E.throwBall(s,c,ball,'great'); clk.throw++ } return c.result }
  function catchSomeWild(area){ // capture one wild mon in the area (also sets quest hook)
    for(let g=0;g<60;g++){ if(!nearGrass(area)) return false; clk.move+=5; const w=E.rollWild(s); if(!w) return false; const c=E.newCatch(s,w.sp,w.lv,w.beh); clk.catchIntro++; let t=0;
      while(!c.over&&t++<12){ const ball=['great-ball','monster-ball','ultra-ball'].find(k=>s.bag[k]>0); if(!ball){ shop(); if(!nearGrass(area)) return false; continue } E.throwBall(s,c,ball,'great',false); clk.throw++ }
      if(c.result==="caught"){ E.catchHook(s,area); return true } log("enc",g,c.result,JSON.stringify(s.bag),s.map,s.x,s.y) } return false }
  function solvePuzzle(sid){
    const hints=Object.keys(E.NPC).filter(k=>k===`n_${sid}_hint`||k===`n_${sid}_hint2`).sort(); let txt='';
    for(const h of hints){ if(!goAdj(h)) throw new Error('unreachable '+h); txt+=E.interact(s,h,io).join(' ')+' '; clk.line+=2 }
    let names; let m;
    if((m=txt.match(/기록된 순서: (.+?)\./))) names=m[1].split(' → ');
    else if(txt.includes('앞 절반')){ const a=txt.match(/앞 절반: (.+?)\./)[1].split(' → '), b=txt.match(/뒤 절반: (.+?)\./)[1].split(' → '); names=[...a,...b] }
    else if((m=txt.match(/A 경로: (.+?)\./))) names=m[1].split(' → ');
    else throw new Error('no order in hints '+sid);
    const hm=E.NPC[hints[0]].map;
    for(const nm of names){ const sw=WORLD.maps[hm].npcs.filter(n=>n.kind==='switch'&&n.id.startsWith(`n_${sid}_s`)&&n.label.startsWith(nm)); if(!sw[0]) throw new Error('switch '+nm+' '+sid); if(!goAdj(sw[0].id)) throw new Error('unreachable switch '+sid); E.interact(s,sw[0].id,io); clk.line++ }
    if(!s.flags[sid]) throw new Error('puzzle unsolved '+sid) }
  function doStep(st){
    const flag=st.id; if(s.flags[flag]) return;
    const nid='n_'+st.id; log('step',st.id,st.type,'party',s.party.map(m=>m.sp+':'+m.lv).join(','),'w',s.stats.wipes);
    if(st.type==='catch'){ if(!goAdj(nid)) throw new Error('unreachable '+nid); E.interact(s,nid,io); clk.line+=2; if(!catchSomeWild(st.area)) throw new Error('catch fail '+st.id);
      if(!s.flags[st.id]) throw new Error('catch flag not set '+st.id); return }
    if(st.type==='puzzle'){ solvePuzzle(st.id); return }
    const out=battleNpc(nid); clk.line+=out.length; if(!s.flags[st.id]) throw new Error('step not completed '+st.id+' '+out.join('/'));
    }
  function gymPrep(g){ // traverse gym: practice, trainer, puzzle
    const n=+g.id.slice(1); const a=WORLD.areas.find(x=>x.id===g.id);
    // practice
    const gd=`n_gym${n}_guide`; goAdj(gd); E.interact(s,gd,io); clk.line+=2; const pr=`n_gym${n}_prac`; goAdj(pr); E.interact(s,pr,io);
    const tr=`n_g${n}_t0`; battleNpc(tr); if(!s.flags[`g${n}_t0`]) throw new Error('gym trainer');
    solvePuzzle(`gym${n}_puz`) }
  // ---- main ----
  const orderOf=(arr)=>opt.shuffleClues?[...arr.filter(x=>x.type!=='clue'),...arr.filter(x=>x.type==='clue').reverse()]:arr;
  for(let ch=1;ch<=12;ch++){ curCh=ch; chStart={...clk}; const g0=grindSecs; let steps=CH[ch]; var deferred=[];
    // clue steps are order-free: do them early in shuffled mode, otherwise in listed order
    const clues=steps.filter(x=>x.type==='clue'), rest=steps.filter(x=>x.type!=='clue');
    const key=G.chstep_key[ch]; const tail=rest.filter(x=>x.type==='gym'||x.id===key); const seq=opt.shuffleClues?[...rest.filter(x=>!tail.includes(x)),...clues.slice().reverse(),...tail]:steps;
    for(const st of seq){
      if(st.type==='gym'){ // need all non-gym steps; do gym prep then leader
        // ensure all clues/main flags in chapter exist
        const g=WORLD.areas.find(a=>a.id===st.area); gymPrep(g); }
      try{ doStep(st) }catch(e){ if(/^(unreachable|step not completed)/.test(e.message)&&!st.gym){ (deferred=deferred||[]).push(st) } else throw e }
      if(deferred&&deferred.length){ const q=deferred; deferred=[]; for(const d of q){ try{ doStep(d) }catch(e){ if(/^(unreachable|step not completed)/.test(e.message)) deferred.push(d); else throw e } } }
    }
    for(let g=0;deferred&&deferred.length&&g<5;g++){ const q=deferred; deferred=[]; for(const d of q){ try{ doStep(d) }catch(e){ if(/^(unreachable|step not completed)/.test(e.message)) deferred.push(d); else throw e } } }
    if(deferred&&deferred.length) throw new Error('deferred steps stuck: '+deferred.map(x=>x.id).join(','))
    // optional content in normal mode: gifts available now
    if(opt.mode==='normal'){ for(const nid of Object.keys(E.NPC).filter(k=>k.startsWith('n_gift_'))){ const r=E.RULES_BY[nid][0]; if(s.flags[r.req]&&!s.flags[r.set]){ if(goAdj(nid)){ E.interact(s,nid,io); clk.line+=2 } } } if(s.flags['c'+ch+'_x']){} }
    perChapter[ch]={grind:grindSecs-g0,clk:Object.fromEntries(Object.keys(clk).map(k=>[k,clk[k]-chStart[k]])),lvTop:Math.max(...s.party.map(m=>m.lv)),party:s.party.length};
    evolveStones();
  }
  const secs=Object.fromEntries(Object.keys(perChapter).map(c=>[c,Object.entries(perChapter[c].clk).reduce((a,[k,v])=>a+v*SEC[k],0)]));
  return {s,clk,perChapter,secs,grindSecs,total:Object.values(secs).reduce((a,b)=>a+b,0)}
}
module.exports={run,SEC};
if(require.main===module){ const mode=process.argv[2]||'normal'; const r=run({mode,shuffleClues:process.argv[3]==='shuffle',seed:+process.argv[4]||7});
  console.log(mode,'cleared',r.s.cleared,'badges',r.s.badges.toString(2),'party',r.s.party.map(m=>E.name(m)+m.lv).join(','),'steps',r.s.stats.steps,'battles',r.s.stats.battles,'wipes',r.s.stats.wipes,'throws',r.s.stats.throws);
  console.log('sim hours',(r.total/3600).toFixed(2)); for(const c in r.secs) console.log('ch',c,(r.secs[c]/60).toFixed(0)+'min','lead',r.perChapter[c].lvTop) }
