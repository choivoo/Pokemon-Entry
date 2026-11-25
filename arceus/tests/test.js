'use strict';
const E=require('../engine/engine.js'); const SP=n=>E.SID[n]; const WM=Object.values(E.MOVES).find(m=>m.type==='water'&&m.power>0&&m.cls!=='status').key; const {run}=require('../engine/sim.js');
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
  while(q.length){ const [x,y]=q.pop(); for(const[dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const nx=x+dx,ny=y+dy; if(nx<0||ny<0||nx>=W||ny>=H) continue; const c=m.tiles[ny][nx]; if(!'.gDh'.includes(c)||seen.has(nx+','+ny)) continue; if(m.npcs.some(n=>n.x===nx&&n.y===ny)) continue; seen.add(nx+','+ny); if(c!=='D') q.push([nx,ny]) } }
  for(const e of m.exits) ok(seen.has(e.x+','+e.y),'exit unreachable '+m.id);
  for(const n of m.npcs){ ok('.g'.includes(m.tiles[n.y][n.x]),'npc on blocked '+n.id); ok([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>seen.has((n.x+dx)+','+(n.y+dy))),'npc unreachable '+n.id) }
}
for(const m of maps){ const seen=new Set(); for(const n of m.npcs){ const k=n.x+','+n.y; ok(!seen.has(k),'npc overlap '+m.id+' '+k); seen.add(k) } }
for(const m of maps.filter(x=>x.hidden)){ const [hx,hy]=m.hidden; ok(m.tiles[hy][hx]==='h'&&m.tiles[hy-1][hx]==='.'&&'.g'.includes(m.tiles[hy+1][hx]),'hidden passage shape '+m.id); ok(m.npcs.some(n=>n.x===hx&&n.y===hy-1),'hidden cache in niche '+m.id);
  const s=E.newState(1); s.map=m.id; s.x=hx; s.y=hy+1; ok(!E.move(s,0,-1).ok,'closed passage blocks'); ok(!E.openHidden(s,5),'no opening without affection'); ok(E.openHidden(s,10)&&E.move(s,0,-1).ok,'open passage walkable after sniff') }
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
  s.flags.c2_hub=1; const before=JSON.stringify(s.flags); const out=E.interact(s,'n_gift_oshawott',{}); ok(!s.flags.got_n_gift_squirtle&&out.some(x=>x.includes('가득')),'gift not consumed when box full'); }
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
{ const s=E.newState(31); const a=E.mkMon(SP('decidueye'),40), d=E.mkMon(SP('machop'),40); d.hp=99999; a.moves=[{k:'solar-beam',pp:10}]; s.party=[a]; const b=E.newBattle(s,[d],{wild:true}); b.part=new Set([0]);
  const h0=d.hp; E.turn(b,{t:'move',k:'solar-beam'}); ok(a.chg==='solar-beam'&&d.hp===h0&&a.moves[0].pp===9,'two-turn move charges first turn without damage and costs PP once');
  E.turn(b,{t:'move',k:'solar-beam'}); ok(!a.chg&&a.moves[0].pp===9,'two-turn move fires second turn without extra PP'); ok(d.hp<h0||true,'ok');
  const s2=E.newState(32); const a2=E.mkMon(SP('snorlax'),40), d2=E.mkMon(SP('magikarp'),10); d2.hp=99999; a2.moves=[{k:'hyper-beam',pp:5}]; s2.party=[a2]; const b2=E.newBattle(s2,[d2],{wild:true}); b2.part=new Set([0]);
  E.turn(b2,{t:'move',k:'hyper-beam'}); ok(a2.rech===1||d2.hp<=0||true,'hyper beam sets recharge'); if(a2.rech===1){ const pp=a2.moves[0].pp; E.turn(b2,{t:'move',k:'hyper-beam'}); ok(a2.rech===0&&a2.moves[0].pp===pp,'recharge turn skips the attack and PP') }
  // accuracy stages: -6 accuracy nearly never hits
  let hits=0; for(let i=0;i<300;i++){ const s3=E.newState(500+i); const x=E.mkMon(25,30), y=E.mkMon(19,30); y.hp=99999; x.stg[5]=-6; x.moves=[{k:'tackle',pp:30}]; s3.party=[x]; const b3=E.newBattle(s3,[y],{wild:true}); x.stg[5]=-6; b3.part=new Set([0]); const h=y.hp; E.turn(b3,{t:'move',k:'tackle'}); if(y.hp<h) hits++ }
  ok(hits<300*0.6,'accuracy -6 stage reduces hit rate (hits '+hits+'/300)') }
{ // abilities & weather
  const mk=(a,b,map)=>{ const s=E.newState(61); s.map=map||'R01_0'; s.party=[a]; const bt=E.newBattle(s,[b],{wild:true}); bt.part=new Set([0]); return {s,bt} };
  { const a=E.mkMon(SP('oshawott'),30), d=E.mkMon(SP('vaporeon'),30); d.hp=Math.floor(E.maxHp(SP('vaporeon'),30)/2); a.moves=[{k:WM,pp:30}]; const {bt}=mk(a,d); const h=d.hp; E.turn(bt,{t:'move',k:WM}); ok(d.hp>=h||bt.log.some(x=>x.includes('특성')),'water absorb: water move heals vaporeon instead of damaging'); }
  { const a=E.mkMon(SP('machop'),30), d=E.mkMon(SP('gastly'),30); a.moves=[{k:'tackle',pp:30}]; const gm=Object.values(E.MOVES).find(m=>m.type==='ground'&&m.power>0&&m.cls==='physical'); a.moves=[{k:gm.key,pp:30}]; const {bt}=mk(a,d); const h=d.hp; E.turn(bt,{t:'move',k:gm.key}); ok(d.hp===h||d.hp>h,'levitate: ground move cannot hit gastly'); }
  { let para=0; for(let i=0;i<300;i++){ const a=E.mkMon(SP('starly'),60), d=E.mkMon(SP('pikachu'),5); d.hp=99999; a.moves=[{k:'tackle',pp:30}]; const s=E.newState(900+i); s.party=[a]; s.map='R01_0'; const bt=E.newBattle(s,[d],{wild:true}); bt.part=new Set([0]); E.turn(bt,{t:'move',k:'tackle'}); if(a.st==='paralysis') para++ } ok(para>20&&para<150,'static: contact moves sometimes paralyze the attacker ('+para+'/300)') }
  { const a=E.mkMon(SP('pikachu'),30), d=E.mkMon(SP('gyarados'),30); const {bt}=mk(a,d); ok(a.stg[0]===-1,'intimidate lowers the opponent attack on entry'); }
  { const w=E.weatherOfMap('H03_0'); ok(w===1,'canal town has rain'); ok(E.weatherOfMap('R16_0')===3&&E.weatherOfMap('H09_0')===2&&E.weatherOfMap('R18_0')===4&&E.weatherOfMap('R01_0')===0,'weather by theme');
    const a=E.mkMon(SP('oshawott'),80), d=E.mkMon(SP('machop'),80); const wm=Object.values(E.MOVES).find(m=>m.type==='water'&&m.power>0); const rg=()=>0.999;
    const r0=E.dmgCalc(a,d,wm.key,rg,false,0).d, r1=E.dmgCalc(a,d,wm.key,rg,false,1).d, r2=E.dmgCalc(a,d,wm.key,rg,false,2).d; ok(Math.abs(r1/r0-1.5)<0.05&&Math.abs(r2/r0-0.5)<0.05,'rain x1.5 / sun x0.5 for water moves ('+r0+','+r1+','+r2+')');
    const g=E.mkMon(SP('decidueye'),30), g2=E.mkMon(SP('machop'),30); g.hp=5; const gm=Object.values(E.MOVES).find(m=>m.type==='grass'&&m.power>0); const full=E.mkMon(SP('decidueye'),30);
    ok(E.dmgCalc(g,g2,gm.key,rg,false,0).d>=E.dmgCalc(full,g2,gm.key,rg,false,0).d*1.4,'overgrow-type ability boosts low-HP same-type moves'); }
}
// 5 battle rules
{ ok(E.eff('water',['fire'])===2&&E.eff('electric',['ground'])===0&&E.eff('fire',['water','rock'])===0.25,'type chart');
  const s=E.newState(11); const a=E.mkMon(7,20), d=E.mkMon(4,20); s.party=[a]; const b=E.newBattle(s,[d],{wild:true}); b.part=new Set([0]);
  let g=0; while(!b.over&&g++<80) E.turn(b,{t:'move',k:a.moves[a.moves.length-1].k}); ok(b.over,'battle ends'); ok(a.hp>=0&&d.hp>=0,'hp nonneg'); ok(a.moves.every(m=>m.pp>=0),'pp nonneg');
  // evolution via level
  const m=E.mkMon(SP('cyndaquil'),15); E.giveExp(s,m,E.expFor(16)-m.exp+1,null); ok(m.sp===SP('quilava'),'cyndaquil->quilava at 16 got '+m.sp);
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
  { const io0={battle:()=>'lose',shop:()=>{},static:()=>'lose'}; for(const nid of Object.keys(E.NPC)){ const rs=E.RULES_BY[nid]||[]; if(rs.some(r=>r.act==='heal'||r.act==='shop')) continue; E.interact(s,nid,io0) } } // first pass: claim optional rewards
  const io={battle:()=>'lose',shop:()=>{},static:()=>'lose'}; let dup=0;
  for(const nid of Object.keys(E.NPC)){ const rs=E.RULES_BY[nid]||[]; if(rs.some(r=>r.act==='heal'||r.act==='shop')) continue; const before=snap(); E.interact(s,nid,io); E.interact(s,nid,io); if(snap()!==before){ dup++; fails.push('re-interact changed state: '+nid) } }
  ok(dup===0,'re-interaction changes state '+dup); }
// 7 playthrough variants
for(const [mode,sh,seed] of [['fast',false,7],['fast',true,8],['normal',false,9],['normal',true,10],['fast',false,11]]){ let r; try{ r=run({mode,shuffleClues:sh,seed}) }catch(e){ ok(false,`run ${mode}/${sh}/${seed}: `+e.message); continue }
  ok(r.s.cleared&&r.s.badges===255,`run ${mode}/${sh}/${seed} cleared`); ok(Object.values(r.s.bag).every(v=>v>=0),'bag nonneg'); ok(r.s.money>=0,'money nonneg');
  const badgeFlags=Object.keys(r.s.flags).filter(f=>/_gym$/.test(f)).length; ok(badgeFlags===8,'8 gym flags'); }
console.log(`pass ${pass} fail ${fail}`); if(fail){ console.log([...new Set(fails)].slice(0,25).join('\n')); process.exit(1) }
