'use strict';
const E=require('../engine/engine.js'); const {run}=require('../engine/sim.js');
const {WORLD,RULES,TR,WILD,SPECIES,MOVES,ITEMS,G}=E; const W=20,H=11;
let pass=0,fail=0; const fails=[];
const ok=(c,m)=>{ if(c)pass++; else {fail++;fails.push(m)} };
// 1 map integrity
const maps=Object.values(WORLD.maps);
ok(maps.length===213,'map count '+maps.length);
const kinds=k=>WORLD.areas.filter(a=>a.kind===k).length;
ok(kinds('hub')===12&&kinds('road')===24&&kinds('dungeon')===14&&kinds('gym')===8,'area kinds');
for(const m of maps){
  ok(m.tiles.length===H&&m.tiles.every(r=>r.length===W),'dims '+m.id);
  const doors=[]; m.tiles.forEach((r,y)=>[...r].forEach((c,x)=>{ if(c==='D') doors.push([x,y]) }));
  ok(doors.length===m.exits.length,'door/exit mismatch '+m.id+' '+doors.length+'/'+m.exits.length);
  for(const e of m.exits){ ok(m.tiles[e.y][e.x]==='D','exit not on D '+m.id);
    const t=WORLD.maps[e.to]; ok(!!t,'exit target '+e.to); if(!t) continue; ok('.g'.includes(t.tiles[e.ty][e.tx]),'arrival tile blocked '+m.id+'->'+e.to);
    ok(t.tiles[e.ty][e.tx]!=='D','arrival on door');
    ok(t.exits.some(b=>b.to===m.id),'no reverse exit '+m.id+'->'+e.to); }
  // reachability from first arrival
  const start=m.exits.length?[...m.exits.map(e=>{const d=[e.x,e.y]; return d})][0]:null; if(!start) continue;
  const inw=(x,y)=>x===0?[1,y]:x===W-1?[W-2,y]:y===0?[x,1]:[x,H-2]; const st=inw(...start);
  const seen=new Set([st.join()]),q=[st];
  while(q.length){ const [x,y]=q.pop(); for(const[dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const nx=x+dx,ny=y+dy; if(nx<0||ny<0||nx>=W||ny>=H) continue; const c=m.tiles[ny][nx]; if(!'.gD'.includes(c)||seen.has(nx+','+ny)) continue; if(m.npcs.some(n=>n.x===nx&&n.y===ny)) continue; seen.add(nx+','+ny); if(c!=='D') q.push([nx,ny]) } }
  for(const e of m.exits) ok(seen.has(e.x+','+e.y),'exit unreachable '+m.id);
  for(const n of m.npcs){ ok('.g'.includes(m.tiles[n.y][n.x]),'npc on blocked '+n.id); ok([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>seen.has((n.x+dx)+','+(n.y+dy))),'npc unreachable '+n.id) }
}
for(const m of maps){ const seen=new Set(); for(const n of m.npcs){ const k=n.x+','+n.y; ok(!seen.has(k),'npc overlap '+m.id+' '+k); seen.add(k) } }
// 2 rules integrity
const FS=new Set(G.flags);
for(const r of RULES){ for(const f of [r.req,r.nreq,r.set,...(r.clr?r.clr.split(','):[])]) if(f) ok(FS.has(f),'unknown flag '+f+' in '+r.npc);
  ok(!!E.NPC[r.npc],'rule npc '+r.npc); if(r.act==='battle') ok(!!TR[r.arg],'trainer '+r.arg);
  if(r.act==='give'){const [k,q]=r.arg.split(':'); ok(!!ITEMS[k]&&+q>0,'give '+r.arg)} if(r.act==='shop') r.arg.split(',').forEach(k=>ok(!!ITEMS[k],'shop item '+k)); }
for(const t of Object.values(TR)) for(const p of t.party){ ok(!!SPECIES[p.sp]&&p.lv>=2&&p.lv<=100,'trainer mon '+t.id); }
for(const ch of Object.values(WORLD.chapters)) for(const st of ch) ok(!!E.NPC['n_'+st.id]||st.type==='puzzle','step npc '+st.id);
for(const e of Object.values(WORLD.maps).flatMap(m=>m.exits)) for(const f of e.req) ok(FS.has(f),'gate flag '+f);
// 3 dex coverage
const cov=new Set(); Object.values(WILD).forEach(w=>w.entries.forEach(e=>cov.add(e.sp))); RULES.filter(r=>r.act==='gift'||r.act==='static').forEach(r=>cov.add(+r.arg.split(':')[0]));
let ch=true; while(ch){ ch=false; for(const s of Object.values(SPECIES)) if(!cov.has(s.id)&&s.evo&&cov.has(s.evo.from)){ cov.add(s.id); ch=true } }
const miss=Object.values(SPECIES).filter(s=>!cov.has(s.id)).map(s=>s.id); ok(miss.length===0,'dex uncovered '+miss);
for(const s of Object.values(SPECIES)) ok(s.learn.length>0&&s.learn.every(([l,k])=>MOVES[k]),'learnset '+s.id);
// 4 capture & inventory
{ const s=E.newState(5); s.bag['monster-ball']=3; const before=s.bag['monster-ball']; const c=E.newCatch(s,16,3,'slow'); let n=0;
  while(!c.over&&s.bag['monster-ball']>0){ E.throwBall(s,c,'monster-ball','excellent'); n++ }
  ok(before-s.bag['monster-ball']===n,'one ball per throw'); ok(!(c.over&&E.throwBall(s,c,'monster-ball','great')),'no throw after over');
  const s2=E.newState(1); const c2=E.newCatch(s2,16,3); ok(E.throwBall(s2,c2,'great-ball','great')===false,'no ball no throw'); ok(s2.stats.throws===0,'throws unchanged');
  // party full -> box, exactly once
  const s3=E.newState(9); while(s3.party.length<6) s3.party.push(E.mkMon(19,5)); s3.bag['ultra-ball']=60; let got=0; for(let i=0;i<20;i++){ const c3=E.newCatch(s3,129,3); const b0=s3.box.length; while(!c3.over&&s3.bag['ultra-ball']>0) E.throwBall(s3,c3,'ultra-ball','excellent'); if(c3.result==='caught'){ got++; ok(s3.box.length===b0+1,'box +1'); ok(s3.party.length===6,'party stays 6'); } }
  ok(got>0,'caught something'); ok(s3.dex[129]===2,'dex caught'); }
{ const s=E.newState(4); while(s.party.length<6) s.party.push(E.mkMon(19,5)); for(let i=0;i<E.BOX_MAX;i++) s.box.push(E.mkMon(16,3));
  s.bag['ultra-ball']=50; let c; for(let t=0;t<30;t++){ c=E.newCatch(s,129,3); while(!c.over&&s.bag['ultra-ball']>0) E.throwBall(s,c,'ultra-ball','excellent'); if(c.result==='caught') break }
  ok(c.result==='caught'&&c.dest==='full','box-full capture released'); ok(s.box.length===E.BOX_MAX&&s.party.length===6,'box cap enforced');
  s.flags.c2_hub=1; const before=JSON.stringify(s.flags); const out=E.interact(s,'n_gift_squirtle',{}); ok(!s.flags.got_n_gift_squirtle&&out.some(x=>x.includes('가득')),'gift not consumed when box full'); }
{ // stat stages and sight
  const s=E.newState(21); const a=E.mkMon(25,20), d=E.mkMon(19,20); s.party=[a]; const b=E.newBattle(s,[d],{wild:true}); b.part=new Set([0]);
  const g=E.MOVES['growl']? 'growl':null; a.moves=[{k:g,pp:40}]; let guard=0; while(d.stg[0]>-6&&guard++<40&&!b.over){ E.turn(b,{t:'move',k:g}); }
  ok(d.stg[0]<=-1||b.over,'growl lowers attack stage: '+d.stg[0]);
  const m1=E.mkMon(25,30), m2=E.mkMon(19,30); m1.stg=[0,0,0,0,0]; m2.stg=[0,0,0,0,0]; const r0=0; 
  const s2=E.newState(3); s2.map='R01_1'; const tr=WORLD.maps['R01_1'].npcs.find(n=>n.kind==='trainer'||true);
  const tn=Object.values(WORLD.maps).flatMap(m=>m.npcs.filter(n=>n.kind==='trainer').map(n=>({...n,map:m.id})))[0];
  const s3=E.newState(4); s3.map=tn.map; const T=WORLD.maps[tn.map]; let seen=null;
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ for(let dd=1;dd<=3;dd++){ s3.x=tn.x+dx*dd; s3.y=tn.y+dy*dd; if('.g'.includes(E.tile(s3.map,s3.x,s3.y))){ const r=E.sight(s3); if(r===tn.id) seen=[dx,dy,dd] } } }
  ok(!!seen,'trainer sight works along a row/column'); s3.x=tn.x+4>19?tn.x-4:tn.x+4; s3.y=tn.y; if('.g'.includes(E.tile(s3.map,s3.x,s3.y))) ok(E.sight(s3)!==tn.id,'no sight beyond 3 tiles'); }
// 5 battle rules
{ ok(E.eff('water',['fire'])===2&&E.eff('electric',['ground'])===0&&E.eff('fire',['water','rock'])===0.25,'type chart');
  const s=E.newState(11); const a=E.mkMon(7,20), d=E.mkMon(4,20); s.party=[a]; const b=E.newBattle(s,[d],{wild:true}); b.part=new Set([0]);
  let g=0; while(!b.over&&g++<80) E.turn(b,{t:'move',k:a.moves[a.moves.length-1].k}); ok(b.over,'battle ends'); ok(a.hp>=0&&d.hp>=0,'hp nonneg'); ok(a.moves.every(m=>m.pp>=0),'pp nonneg');
  // evolution via level
  const m=E.mkMon(4,15); E.giveExp(s,m,E.expFor(16)-m.exp+1,null); ok(m.sp===5,'charmander->charmeleon at 16 got '+m.sp);
  // illegal command doesn't consume
  const s2=E.newState(2); const bb=E.newBattle(s2,[E.mkMon(19,3)],{wild:true}); const pp=s2.party[0].moves[0].pp; ok(E.turn(bb,{t:'move',k:'surf'})===false&&s2.party[0].moves[0].pp===pp,'invalid move rejected');
  ok(E.turn(bb,{t:'switch',i:0})===false,'switch to self rejected'); }
// 6 save
{ const r=run({mode:'normal',seed:3}); const s=r.s; ok(s.cleared,'normal run cleared');
  const code=E.encode(s); const d=E.decode(code); ok(!!d.s,'decode '+(d.err||'')); if(d.s){ const c2=E.encode(d.s); ok(c2===code,'encode(decode(x))==x'); ok(JSON.stringify(Object.keys(d.s.flags).sort())===JSON.stringify(Object.keys(s.flags).sort()),'flags equal'); ok(d.s.party.length===s.party.length&&d.s.box.length===s.box.length,'party/box'); ok(d.s.money===s.money&&d.s.badges===s.badges,'money/badges') }
  const bad=[code.replace('KP1','KP9'),code.slice(0,-1)+(code.slice(-1)==='0'?'1':'0'),code.replace(/\|(\d+)\|/,'|9999|'),'garbage',code.replace('KP1|','KP1|-')];
  bad.forEach((b,i)=>ok(!!E.decode(b).err,'bad save accepted #'+i));
  const parts=code.split('|'); parts[4]='-5'; const body=parts.slice(0,-1).join('|'); // negative money w/ recomputed checksum must still fail
  const ck=(()=>{let a=1,b=0;for(const ch of body){a=(a+ch.charCodeAt(0))%65521;b=(b+a)%65521}return ((b*65536+a)>>>0).toString(36)})(); ok(!!E.decode(body+'|'+ck).err,'negative money rejected');
  const p2=code.split('|'); p2[12]=p2[12].replace(/^\d+/,'-3'); const b2=p2.slice(0,-1).join('|'); const ck2=(()=>{let a=1,b=0;for(const ch of b2){a=(a+ch.charCodeAt(0))%65521;b=(b+a)%65521}return ((b2.length&&(b*65536+a)>>>0)).toString(36)})(); ok(!!E.decode(b2+'|'+ck2).err,'negative qty rejected');
  const p3=code.split('|'); p3[13]=p3[13].replace(/^\d+/,'999'); const b3=p3.slice(0,-1).join('|'); const ck3=(()=>{let a=1,b=0;for(const ch of b3){a=(a+ch.charCodeAt(0))%65521;b=(b+a)%65521}return ((b*65536+a)>>>0).toString(36)})(); ok(!!E.decode(b3+'|'+ck3).err,'unknown species rejected');
  // idempotence of rewards after clear
  const snap=()=>JSON.stringify([s.money,s.bag,s.party.length,s.box.length,s.flags]);
  const io={battle:()=>'lose',shop:()=>{},static:()=>'lose'}; let dup=0;
  for(const nid of Object.keys(E.NPC)){ const rs=E.RULES_BY[nid]||[]; if(rs.some(r=>r.act==='heal'||r.act==='shop')) continue; const before=snap(); E.interact(s,nid,io); E.interact(s,nid,io); if(snap()!==before){ dup++; fails.push('re-interact changed state: '+nid) } }
  ok(dup===0,'re-interaction changes state '+dup); }
// 7 playthrough variants
for(const [mode,sh,seed] of [['fast',false,7],['fast',true,8],['normal',false,9],['normal',true,10],['fast',false,11]]){ let r; try{ r=run({mode,shuffleClues:sh,seed}) }catch(e){ ok(false,`run ${mode}/${sh}/${seed}: `+e.message); continue }
  ok(r.s.cleared&&r.s.badges===255,`run ${mode}/${sh}/${seed} cleared`); ok(Object.values(r.s.bag).every(v=>v>=0),'bag nonneg'); ok(r.s.money>=0,'money nonneg');
  const badgeFlags=Object.keys(r.s.flags).filter(f=>/_gym$/.test(f)).length; ok(badgeFlags===8,'8 gym flags'); }
console.log(`pass ${pass} fail ${fail}`); if(fail){ console.log([...new Set(fails)].slice(0,25).join('\n')); process.exit(1) }
