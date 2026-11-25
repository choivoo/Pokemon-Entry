'use strict';
// Reference engine: same data tables that the Entry project embeds. Used for verification, not shipped in .ent.
const fs=require('fs');
const D='data/';
const G=JSON.parse(fs.readFileSync(D+'game.json')), WORLD=JSON.parse(fs.readFileSync(D+'world.json')),
  RULES=JSON.parse(fs.readFileSync(D+'rules.json')), TR=JSON.parse(fs.readFileSync(D+'trainers.json')),
  WILD=JSON.parse(fs.readFileSync(D+'wild.json')), TC=JSON.parse(fs.readFileSync(D+'typechart.json'));
const SPECIES={}, MOVES={}, ITEMS={};
G.species.forEach(s=>SPECIES[s.id]=s); G.moves.forEach(m=>MOVES[m.key]=m); G.items.forEach(i=>ITEMS[i.key]=i);
const TI={}; TC.T.forEach((t,i)=>TI[t]=i);
const FLAGSET=new Set(G.flags);
const RULES_BY={}; RULES.forEach(r=>(RULES_BY[r.npc]=RULES_BY[r.npc]||[]).push(r));
const WORLD_IDX={}; Object.keys(WORLD.maps).forEach((k,i)=>WORLD_IDX[k]=i+1);
const WEATHER_OF_THEME={canal:1,coast:1,tide:1,harbor:1,swamp:1,volcano:2,desert:3,mountain:4}; // 1 rain 2 sun 3 sandstorm 4 hail
const AREA_THEME={}; WORLD.areas.forEach(a=>AREA_THEME[a.id]=a.theme);
const weatherOfMap=m=>WEATHER_OF_THEME[AREA_THEME[m.split('_')[0]]]||0;
const NPC={}; Object.values(WORLD.maps).forEach(m=>m.npcs.forEach(n=>NPC[n.id]={...n,map:m.id}));
function rngMake(seed){let s=seed>>>0||1;return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296;}}
const eff=(mt,dts)=>dts.reduce((a,d)=>a*TC.chart[TI[mt]][TI[d]],1);
const maxHp=(sp,lv)=>Math.floor(2*SPECIES[sp].base.hp*lv/100)+lv+10;
const stat=(sp,lv,k)=>Math.floor(2*SPECIES[sp].base[k]*lv/100)+5;
const expFor=lv=>lv*lv*lv;
function moveSetAt(sp,lv){const l=SPECIES[sp].learn.filter(x=>x[0]<=lv).map(x=>x[1]);const u=[...new Set(l)].slice(-4);return u.map(k=>({k,pp:MOVES[k].pp}))}
let UID=1;
function mkMon(sp,lv,where){return{stg:[0,0,0,0,0,0,0],uid:UID++,sp,nick:'',lv,exp:expFor(lv),hp:maxHp(sp,lv),st:'',moves:moveSetAt(sp,lv),where:where||''}}
function newState(seed){
  const s={ver:1,map:'H01_0',x:3,y:5,flags:{},money:3000,bag:{'monster-ball':5,'potion':5},party:[],box:[],dex:{},badges:0,pika:{aff:0,mood:'idle'},
    settings:{text:2,vol:5,shake:1},cleared:false,seed:seed||12345,rngn:0,stats:{steps:0,battles:0,turns:0,lines:0,throws:0,wipes:0,heals:0}};
  const st=G.starters[0]; const p=mkMon(st,5,'H01'); s.party.push(p); s.dex[st]=2; return s;
}
function rnd(s){ // stateless-seeded rng for save/replay (murmur-style finalizer)
  s.rngn++; let x=(s.seed+Math.imul(s.rngn,0x9E3779B9))>>>0; x=Math.imul(x^(x>>>16),0x85ebca6b); x=Math.imul(x^(x>>>13),0xc2b2ae35); x^=x>>>16; return (x>>>0)/4294967296 }
const has=(s,f)=>!f||!!s.flags[f];
const BOX_MAX=200;
function addMon(s,m){ if(s.party.length<6){s.party.push(m);return 'party'} if(s.box.length>=BOX_MAX) return 'full'; s.box.push(m); return 'box'; }
function dexSee(s,sp,caught){ s.dex[sp]=Math.max(s.dex[sp]||0,caught?2:1) }
function addItem(s,k,n){ s.bag[k]=(s.bag[k]||0)+n; if(s.bag[k]<0) throw new Error('negative '+k) }
function giveExp(s,mon,amt,log){
  mon.exp+=amt;
  while(mon.exp>=expFor(mon.lv+1)&&mon.lv<100){
    const oldMax=maxHp(mon.sp,mon.lv); mon.lv++; const nm=maxHp(mon.sp,mon.lv); mon.hp+= (mon.hp>0? nm-oldMax:0);
    log&&log(`${name(mon)}의 레벨이 ${mon.lv}로 올랐다!`);
    for(const [l,k] of SPECIES[mon.sp].learn){ if(l===mon.lv && !mon.moves.some(m=>m.k===k)){
      if(mon.moves.length<4) mon.moves.push({k,pp:MOVES[k].pp});
      else{ let wi=0; mon.moves.forEach((m,i)=>{if(MOVES[m.k].power<MOVES[mon.moves[wi].k].power) wi=i}); mon.moves[wi]={k,pp:MOVES[k].pp}}
      log&&log(`${name(mon)}은(는) ${MOVES[k].name_ko}을(를) 배웠다!`)}}
    // level evolution
    for(const sp of Object.values(SPECIES)) if(sp.evo&&sp.evo.from===mon.sp&&sp.evo.level&&mon.lv>=sp.evo.level){ evolve(s,mon,sp.id,log); break }
  }
}
function evolve(s,mon,to,log){ const keepNick=mon.nick&&mon.nick!==SPECIES[mon.sp].name; const r=maxHp(mon.sp,mon.lv);
  mon.sp=to; if(!keepNick) mon.nick=''; const nm=maxHp(to,mon.lv); mon.hp=Math.min(nm,mon.hp+(nm-r)); dexSee(s,to,true);
  for(const [l,k] of SPECIES[to].learn) if(l<=mon.lv&&mon.moves.length<4&&!mon.moves.some(m=>m.k===k)) mon.moves.push({k,pp:MOVES[k].pp});
  log&&log(`${name(mon)}(으)로 진화했다!`)}
const name=m=>m.nick||SPECIES[m.sp].name;
// ---- battle ----
function mkFoe(sp,lv){const m=mkMon(sp,lv);return m}
const STG={attack:0,defense:1,'special-attack':2,'special-defense':3,speed:4};
function stageMul(g){ return g>=0?(2+g)/2:2/(2-g) }
function calcStat(m,k){ let v=stat(m.sp,m.lv,k); if(m.stg&&STG[k]!==undefined) v=Math.floor(v*stageMul(m.stg[STG[k]])); if(k==='speed'&&m.st==='paralysis') v=Math.floor(v/2); if(k==='attack'&&m.st==='burn') v=Math.floor(v/2); return Math.max(1,v) }
function dmgCalc(a,d,mv,rng,forceCrit,weather){
  const M=MOVES[mv]; if(M.power<=0) return {d:0,e:1,crit:false};
  const phys=M.cls==='physical'; const A=calcStat(a,phys?'attack':'special-attack'), Df=calcStat(d,phys?'defense':'special-defense');
  const stab=SPECIES[a.sp].types.includes(M.type)?1.5:1; const e=eff(M.type,SPECIES[d.sp].types);
  const crit=forceCrit??(rng()<(1/16)*(1+(M.crit||0)));
  let wmul=1; if(weather===1){ if(M.type==='water') wmul=1.5; if(M.type==='fire') wmul=.5 } if(weather===2){ if(M.type==='fire') wmul=1.5; if(M.type==='water') wmul=.5 }
  const ab=SPECIES[a.sp].abil; if(ab>=8&&ab<=10&&a.hp<=maxHp(a.sp,a.lv)/3&&M.type===['grass','fire','water'][ab-8]) wmul*=1.5;
  const base=Math.floor(Math.floor(Math.floor(2*a.lv/5+2)*M.power*A/Df)/50)+2;
  let dmg=Math.floor(base*stab*e*(crit?1.5:1)*wmul*(0.85+rng()*0.15)); if(e>0&&dmg<1) dmg=1; return {d:dmg,e,crit}
}
function newBattle(s,foes,opt){ // opt: {trainer, wild}
  const wt=weatherOfMap(s.map||'H01_0');
  s.party.forEach(m=>{m.stg=[0,0,0,0,0,0,0];m.chg=null;m.rech=0}); foes.forEach(m=>{m.stg=[0,0,0,0,0,0,0];m.chg=null;m.rech=0});
  const bb={weather:wt,s,foes:foes.map(f=>f),fi:0,pi:s.party.findIndex(m=>m.hp>0),log:[],over:false,result:'',trainer:opt.trainer||null,wild:!!opt.wild,turn:0,
    seen:new Set(),sleep:{},aiPot:opt.trainer&&['league','gym','rival','rocket'].includes(opt.trainer.kind)?2:0,part:new Set(),run:0}
  enterBattle(bb); return bb
}
function active(b){return b.s.party[b.pi]}
function intimidate(b,att,def){ if(SPECIES[att.sp].abil===7&&def&&def.stg){ const o=def.stg[0]; def.stg[0]=Math.max(-6,o-1); if(def.stg[0]!==o) b.log.push(`${name(att)}의 위협! ${name(def)}의 공격이 떨어졌다!`) } }
function foe(b){return b.foes[b.fi]}
function enterBattle(b){ if(b.pi>=0) intimidate(b,active(b),foe(b)); intimidate(b,foe(b),active(b)) }
function exec(b,att,def,mvk,side,rng){ // returns false if mon cannot act
  const L=t=>b.log.push(t);
  if(att.st==='sleep'){ if(b.sleep[att.uid]===undefined) b.sleep[att.uid]=1+Math.floor(rng()*3); if(b.sleep[att.uid]-->0){ L(`${name(att)}은(는) 잠들어 있다.`); return } else {att.st=''; delete b.sleep[att.uid]; L(`${name(att)}은(는) 잠에서 깼다!`)} }
  if(att.st==='paralysis'&&rng()<.25){ L(`${name(att)}은(는) 몸이 저려 움직일 수 없다!`); return }
  if(att.rech){ att.rech=0; L(`${name(att)}은(는) 반동으로 움직일 수 없다!`); return }
  const M=MOVES[mvk]; const cont=att.chg===mvk;
  const mo=att.moves.find(m=>m.k===mvk); if(side==='p'&&mo&&!cont){ if(mo.pp<=0){L('PP가 없다!');return} mo.pp--; }
  L(`${name(att)}의 ${M.name_ko}!`);
  if(M.two&&!cont){ att.chg=mvk; L(`${name(att)}은(는) 힘을 모으고 있다!`); return }
  if(cont) att.chg=null;
  const as=Math.max(-6,Math.min(6,(att.stg?att.stg[5]:0)-(def.stg?def.stg[6]:0))); const am=as>=0?(3+as)/3:3/(3-as);
  if(rng()*100>=M.acc*am){ L('그러나 빗나갔다!'); return }
  if(M.power>0){ const r0=dmgCalc(att,def,mvk,rng,undefined,b.weather); let r=r0; const da=SPECIES[def.sp].abil, mt=M.type;
    if((da===4&&mt==='water')||(da===5&&mt==='electric')||(da===6&&mt==='ground')){ if(da===6) L(`${name(def)}은(는) 부유로 맞지 않는다!`); else { def.hp=Math.min(maxHp(def.sp,def.lv),def.hp+Math.floor(maxHp(def.sp,def.lv)/4)); L(`${name(def)}은(는) 특성으로 HP를 회복했다!`) } return } if(r.e===0){L('효과가 없는 것 같다...');return}
    const dealt=Math.min(def.hp,r.d); def.hp-=dealt; if(r.crit) L('급소에 맞았다!'); if(r.e>1) L('효과는 굉장했다!'); if(r.e<1) L('효과는 별로인 듯하다...');
    if(M.rech&&def.hp>0) att.rech=1;
    if(M.cls==='physical'&&[1,2,3].includes(SPECIES[def.sp].abil)&&!att.st&&att.hp>0&&rng()<.3){ const k=SPECIES[def.sp].abil; const st=['','paralysis','poison','burn'][k]; const at=SPECIES[att.sp].types; if(!(st==='paralysis'&&at.includes('electric'))&&!(st==='poison'&&(at.includes('poison')||at.includes('steel')))&&!(st==='burn'&&at.includes('fire'))){ att.st=st; L(`${name(att)}은(는) 특성 때문에 상태가 변했다!`) } }
    if(M.drain>0){att.hp=Math.min(maxHp(att.sp,att.lv),att.hp+Math.floor(dealt*M.drain/100))}
    if(M.drain<0){att.hp=Math.max(0,att.hp-Math.floor(dealt*-M.drain/100)); L('반동 피해를 입었다!')} }
  if(def.hp>0&&['sleep','poison','paralysis','burn'].includes(M.ailment)&&!def.st){
    const ch=M.power>0?M.ail_chance:100; const imm=(M.ailment==='poison'&&SPECIES[def.sp].types.some(t=>t==='poison'||t==='steel'))||(M.ailment==='burn'&&SPECIES[def.sp].types.includes('fire'))||(M.ailment==='paralysis'&&SPECIES[def.sp].types.includes('electric')&&M.type==='electric');
    if(!imm&&ch>0&&rng()*100<ch){def.st=M.ailment; L(`${name(def)}은(는) ${{sleep:'잠들었다',poison:'독에 걸렸다',paralysis:'마비되었다',burn:'화상을 입었다'}[M.ailment]}!`)}
    else if(M.power===0&&M.ail_chance===0&&!(M.sc&&M.sc.length)) L('그러나 실패했다!') }
  if(M.sc&&M.sc.length){ const tgt=M.sc_self?att:def; const ch=M.power>0?M.stat_chance:100;
    if(tgt.hp>0&&ch>0&&rng()*100<ch){ const names=['공격','방어','특수공격','특수방어','스피드','명중률','회피율']; for(const [i,d] of M.sc){ const old=tgt.stg[i-1]; tgt.stg[i-1]=Math.max(-6,Math.min(6,old+d));
      L(tgt.stg[i-1]===old?`${name(tgt)}의 ${names[i-1]}은(는) 더 이상 ${d>0?'오르지':'떨어지지'} 않는다!`:`${name(tgt)}의 ${names[i-1]}이(가) ${Math.abs(d)>1?'크게 ':''}${d>0?'올랐다':'떨어졌다'}!`) } } }
}
function aiPick(b,rng){
  const f=foe(b),p=active(b);
  let best=null,bs=-1;
  for(const mo of f.moves){ const M=MOVES[mo.k]; if(mo.pp<=0) continue; let sc;
    if(M.power>0){ sc=M.power*(eff(M.type,SPECIES[p.sp].types))*(SPECIES[f.sp].types.includes(M.type)?1.5:1)*M.acc/100 }
    else sc=(M.sc&&M.sc.length&&!M.ail_chance)?22:(p.st?0:35); sc*=(0.9+rng()*0.2); if(sc>bs){bs=sc;best=mo.k}}
  return best||f.moves[0].k
}
function endTurnStatus(b,m){ if(m.hp<=0)return;
  if(b.weather===3||b.weather===4){ const t=SPECIES[m.sp].types; const imm=b.weather===3?(t.includes('rock')||t.includes('ground')||t.includes('steel')):t.includes('ice'); if(!imm){ m.hp=Math.max(0,m.hp-Math.max(1,Math.floor(maxHp(m.sp,m.lv)/16))); b.log.push(`${name(m)}은(는) ${b.weather===3?'모래바람':'싸라기눈'}에 휩쓸렸다!`) } } if(m.st==='poison'||m.st==='burn'){const d=Math.max(1,Math.floor(maxHp(m.sp,m.lv)/8)); m.hp=Math.max(0,m.hp-d); b.log.push(`${name(m)}은(는) ${m.st==='poison'?'독':'화상'} 피해를 입었다!`)}}
function handleFaints(b){
  const s=b.s,f=foe(b);
  if(f.hp<=0&&!f._done){ f._done=1; b.log.push(`상대 ${name(f)}은(는) 쓰러졌다!`);
    const amt=Math.floor(SPECIES[f.sp].exp*f.lv/7*(b.trainer?1.5:1)); const eligible=[...b.part].map(i=>s.party[i]).filter(m=>m&&m.hp>0);
    const share=eligible.length?eligible:[active(b)]; share.forEach(m=>{ if(m.hp>0) giveExp(s,m,Math.floor(amt/share.length)+1,t=>b.log.push(t)) });
    s.party.forEach((m,i)=>{ if(m.hp>0&&!share.includes(m)) giveExp(s,m,Math.floor(amt*0.4)+1,t=>b.log.push(t)) });
    dexSee(s,f.sp,false);
    if(b.fi+1<b.foes.length){ b.fi++; b.part=new Set([b.pi]); dexSee(s,foe(b).sp,false); b.log.push(`상대는 ${name(foe(b))}을(를) 내보냈다!`); intimidate(b,foe(b),active(b)) }
    else { b.over=true; b.result='win'; if(b.trainer){ s.money+=b.trainer.reward; b.log.push(`${b.trainer.reward}원을 얻었다!`)} }
  }
  if(!b.over&&active(b).hp<=0){ b.log.push(`${name(active(b))}은(는) 쓰러졌다!`); const nx=s.party.findIndex(m=>m.hp>0);
    if(nx<0){ b.over=true; b.result='lose' } else b.needSwitch=true }
}
function turn(b,cmd){ // cmd: {t:'move',k} | {t:'switch',i} | {t:'item',k,i} | {t:'run'}
  const s=b.s, rng=()=>rnd(s); b.log=[]; b.turn++; s.stats.turns++;
  if(b.needSwitch){ if(cmd.t!=='switch'||!s.party[cmd.i]||s.party[cmd.i].hp<=0) return false; active(b).stg=[0,0,0,0,0,0,0]; active(b).chg=null; active(b).rech=0; b.pi=cmd.i; active(b).stg=[0,0,0,0,0,0,0]; active(b).chg=null; active(b).rech=0; b.part.add(b.pi); b.needSwitch=false; b.log.push(`${name(active(b))}, 나가!`); intimidate(b,active(b),foe(b)); return true }
  const f=foe(b); let pAct=null;
  if(cmd.t==='run'){ if(!b.wild){b.log.push('트레이너 배틀에서는 도망칠 수 없다!');return false} b.over=true;b.result='run';return true }
  if(cmd.t==='switch'){ if(cmd.i===b.pi||!s.party[cmd.i]||s.party[cmd.i].hp<=0) return false; active(b).stg=[0,0,0,0,0,0,0]; active(b).chg=null; active(b).rech=0; b.pi=cmd.i; active(b).stg=[0,0,0,0,0,0,0]; active(b).chg=null; active(b).rech=0; b.part.add(b.pi); b.log.push(`${name(active(b))}, 나가!`); intimidate(b,active(b),foe(b)) }
  else if(cmd.t==='item'){ const it=ITEMS[cmd.k]; if(!it||!(s.bag[cmd.k]>0)) return false; const m=s.party[cmd.i]; if(!m) return false; if(!useItem(s,cmd.k,m,t=>b.log.push(t))) return false }
  else if(cmd.t==='move'&&active(b).chg){ pAct=active(b).chg }
  else if(cmd.t==='move'&&active(b).rech){ pAct=cmd.k||active(b).moves[0].k }
  else if(cmd.t==='move'){ const mo=active(b).moves.find(m=>m.k===cmd.k); if(!mo) return false; if(mo.pp<=0&&active(b).moves.some(m=>m.pp>0)) return false; pAct=cmd.k; if(mo.pp<=0){ b.log.push('쓸 수 있는 기술이 없다! 발버둥친다!'); pAct='tackle'; } } else return false;
  // foe decision
  let fk=null;
  if(b.aiPot>0&&f.hp<maxHp(f.sp,f.lv)*.25){ b.aiPot--; f.hp=Math.min(maxHp(f.sp,f.lv),f.hp+120); b.log.push(`상대는 회복약을 썼다!`) } else fk=f.chg?f.chg:aiPick(b,rng);
  const order=[]; const p=active(b);
  if(pAct) order.push({side:'p',mon:p,k:pAct,pr:MOVES[pAct].prio,sp:calcStat(p,'speed')});
  if(fk) order.push({side:'f',mon:f,k:fk,pr:MOVES[fk].prio,sp:calcStat(f,'speed')});
  order.sort((a,b2)=>b2.pr-a.pr||b2.sp-a.sp||(rng()<.5?-1:1));
  for(const a of order){ const att=a.mon, def=a.side==='p'?foe(b):active(b); if(att.hp<=0||b.over) continue;
    if(a.side==='f'&&foe(b)!==a.mon) continue; if(a.side==='p'&&active(b)!==a.mon) continue; exec(b,att,def,a.k,a.side,rng); handleFaints(b); if(b.over||b.needSwitch) break }
  if(!b.over&&!b.needSwitch){ endTurnStatus(b,active(b)); endTurnStatus(b,foe(b)); handleFaints(b) }
  return true
}
function useItem(s,k,m,log){ const it=ITEMS[k]; const mh=maxHp(m.sp,m.lv);
  if(it.kind==='heal'){ if(m.hp<=0||m.hp>=mh) return false; m.hp=Math.min(mh,m.hp+it.val); }
  else if(it.kind==='revive'){ if(m.hp>0) return false; m.hp=Math.floor(mh/2); m.st='' }
  else if(it.kind.startsWith('cure:')){ const w=it.kind.slice(5); if(!m.st||(w!=='all'&&m.st!==w)) return false; m.st='' }
  else return false;
  addItem(s,k,-1); log&&log(`${name(m)}에게 ${it.name}을(를) 썼다.`); return true }
function healAll(s){ s.party.forEach(m=>{m.hp=maxHp(m.sp,m.lv);m.st='';m.moves.forEach(x=>x.pp=MOVES[x.k].pp)}); s.box.forEach(m=>{m.hp=maxHp(m.sp,m.lv);m.st=''}) }
// ---- capture ----
function newCatch(s,sp,lv,beh){ dexSee(s,sp,false); return {sp,lv,beh:beh||'slow',mon:mkMon(sp,lv),bait:0,over:false,result:'',log:[],throws:0} }
const GRADE={miss:0,nice:1.15,great:1.3,excellent:1.7};
function throwBall(s,c,ball,grade,sneak){ // one input = one ball
  if(c.over) return false;
  if(!(s.bag[ball]>0)) return false; if(!ITEMS[ball]||ITEMS[ball].kind!=='ball') return false;
  addItem(s,ball,-1); s.stats.throws++; c.throws++; const rng=()=>rnd(s);
  if(grade==='miss'){ c.log=['볼이 빗나갔다!']; if(rng()<.15){c.over=true;c.result='fled';c.log.push('포켓몬이 도망쳤다!')} return true }
  const sp=SPECIES[c.sp], mh=maxHp(c.sp,c.lv), hp=c.mon.hp;
  let a=((3*mh-2*hp)*sp.capture*ITEMS[ball].val/(3*mh))*GRADE[grade]*(1+0.5*Math.min(c.bait,2))*(c.mon.st?1.5:1)*(sneak?1.2:1);
  a=Math.min(255,Math.max(1,a)); const b=1048560/Math.sqrt(Math.sqrt(16711680/a)); let shakes=0;
  for(let i=0;i<4;i++){ if(rng()*65536<b) shakes++; else break }
  if(shakes===4){ c.over=true; c.result='caught'; c.log=['잡았다!']; const m=c.mon; m.where=s.map.split('_')[0]; const dest=addMon(s,m); dexSee(s,c.sp,true); c.dest=dest; if(dest==='full') c.log.push('보관함이 가득 차서 놓아주었다.'); }
  else { c.log=[`볼이 ${shakes}번 흔들렸다...`]; if(rng()<(c.beh==='flee'?.25:.1)){c.over=true;c.result='fled';c.log.push('포켓몬이 도망쳤다!')} }
  return true }
// ---- world ----
function tile(m,x,y){ const r=WORLD.maps[m].tiles[y]; return r?r[x]:'#' }
function npcAt(s,x,y){ return WORLD.maps[s.map].npcs.find(n=>n.x===x&&n.y===y) }
function exitAt(s,x,y){ return WORLD.maps[s.map].exits.find(e=>e.x===x&&e.y===y) }
const TRACE={on:null};
const BATTLE_RULE={}; RULES.forEach(r=>{ if(r.act==='battle'&&!BATTLE_RULE[r.npc]) BATTLE_RULE[r.npc]=r });
function sight(s){ // trainers see 3 tiles along their row/column if no wall between
  for(const n of WORLD.maps[s.map].npcs){ if(n.kind!=='trainer') continue; const br=RULES_BY[n.id].find(r=>r.act==='battle'); if(!br||s.flags[br.set]) continue;
    let dx=0,dy=0,d=0; if(n.x===s.x){ d=Math.abs(n.y-s.y); dy=Math.sign(s.y-n.y) } else if(n.y===s.y){ d=Math.abs(n.x-s.x); dx=Math.sign(s.x-n.x) } else continue;
    if(d<1||d>3) continue; let clear=true; for(let i=1;i<d;i++){ if(!'.g'.includes(tile(s.map,n.x+dx*i,n.y+dy*i))){clear=false;break} } if(clear) return n.id }
  return null }
function move(s,dx,dy){ const r=move0(s,dx,dy); if(r.ok&&!r.changed) r.sight=sight(s); if(TRACE.on&&r.ok) TRACE.on.push(['m',dx,dy,WORLD_IDX[s.map],s.x,s.y]); return r }
function move0(s,dx,dy){
  const nx=s.x+dx, ny=s.y+dy; let t=tile(s.map,nx,ny); if(t==='h'&&s.flags['open_'+s.map]) t='.'; if(!'.gD'.includes(t)) return {ok:false};
  const n=npcAt(s,nx,ny); if(n) return {ok:false,npc:n};
  if(t==='D'){ const e=exitAt(s,nx,ny); const miss=e.req.filter(f=>!s.flags[f]); if(miss.length) return {ok:false,locked:miss};
    s.map=e.to; s.x=e.tx; s.y=e.ty; s.stats.steps++; return {ok:true,changed:true} }
  s.x=nx; s.y=ny; s.stats.steps++; return {ok:true,grass:t==='g'}
}
function rollWild(s){ const a=s.map.split('_')[0]; const w=WILD[a]; if(!w) return null; const tot=w.entries.reduce((x,e)=>x+e.w,0); let r=rnd(s)*tot;
  for(const e of w.entries){ r-=e.w; if(r<=0) return {sp:e.sp,lv:e.lo+Math.floor(rnd(s)*(e.hi-e.lo+1)),beh:e.beh} } return null }
function interact(s,nid,io0,kind){ const io=io0; if(TRACE.on){ TRACE.on.push([kind||'i',nid,0]); const idx=TRACE.on.length-1; const o=interact0(s,nid,{...io0,battle:t=>{const r=io0.battle(t);TRACE.on.push(['b',r]);return r},static:(a,b)=>{const r=io0.static(a,b);TRACE.on.push(['s',r]);return r}}); TRACE.on[idx][2]=Object.keys(s.flags).length; return o } return interact0(s,nid,io0) }
function interact0(s,nid,io){
  const n=NPC[nid]; const out=[]; s.stats.lines++;
  for(const r of RULES_BY[nid]||[]){
    if(r.req&&!s.flags[r.req]) continue; if(r.nreq&&s.flags[r.nreq]) continue;
    const say=t=>{ if(t){out.push(t);s.stats.lines++} };
    if(r.act==='say'){ say(r.text) }
    else if(r.act==='reset'){ say(r.text); r.clr.split(',').filter(Boolean).forEach(f=>delete s.flags[f]); return out }
    else if(r.act==='give'){ say(r.text); const [k,q]=r.arg.split(':'); addItem(s,k,+q) }
    else if(r.act==='heal'){ say(r.text); healAll(s); s.stats.heals++ }
    else if(r.act==='shop'){ say(r.text); io&&io.shop&&io.shop(r.arg.split(',')) ; return out }
    else if(r.act==='gift'){ say(r.text); const [sp,lv]=r.arg.split(':').map(Number); const m=mkMon(sp,lv,'gift'); const w=addMon(s,m); if(w==='full'){ out.push('(보관함이 가득 차서 받을 수 없다)'); return out } dexSee(s,sp,true) }
    else if(r.act==='static'){ say(r.text); const [sp,lv]=r.arg.split(':').map(Number); const res=io.static&&io.static(sp,lv); if(res!=='caught'&&res!=='win'&&res!=='fled') return out }
    else if(r.act==='battle'){ say(r.text); const res=io.battle(r.arg); if(res!=='win'){ out.push('(패배했다)'); if(r.lose) s.flags[r.lose]=1; return out }
      const T=TR[r.arg]; if(T.badge){ s.badges|=1<<(T.badge-1); } }
    if(r.set){ s.flags[r.set]=1; checkHooks(s,r.set) }
    return out }
  return out }
function checkHooks(s,f){ if(f==='c12_end') s.cleared=true }
function catchHook(s,area){ if(TRACE.on) TRACE.on.push(['h',area,s.map]); // flag-setting captures
  if(area==='R01'&&!s.flags.c1_catch) s.flags.c1_catch=1;
  if(area==='D07'&&!s.flags.c7_rare&&s.map==='D07_3') s.flags.c7_rare=1 }
// ---- save code ----
const FL=G.flags, B36=n=>n.toString(36);
function checksum(str){ let a=1,b=0; for(let i=0;i<str.length;i++){a=(a+str.charCodeAt(i))%65521;b=(b+a)%65521} return (b*65536+a)>>>0 }
function monStr(m){ return [m.sp,m.lv,m.exp,m.hp,{'':0,sleep:1,poison:2,paralysis:3,burn:4}[m.st],m.moves.map(x=>Object.keys(MOVES).indexOf(x.k)+':'+x.pp).join('/'),m.where||'-'].join(',') }
const MK=Object.keys(MOVES), IK=Object.keys(ITEMS), MAPS=Object.keys(WORLD.maps);
function encode(s){
  const fl=FL.map(f=>s.flags[f]?1:0); let bits=''; for(let i=0;i<fl.length;i+=24){ bits+=B36(parseInt(fl.slice(i,i+24).join('').padEnd(24,'0'),2))+'.' }
  const dex=Array.from({length:G.species.length},(_,i)=>s.dex[i+1]||0).join('');
  const bag=IK.map(k=>s.bag[k]||0).join('.');
  const mon=m=>[m.sp,m.lv,m.exp,m.hp,{'':0,sleep:1,poison:2,paralysis:3,burn:4}[m.st],m.moves.map(x=>MK.indexOf(x.k)+'_'+x.pp).join('-'),(m.where||'x')].join(':');
  const body=['KP1',MAPS.indexOf(s.map),s.x,s.y,s.money,s.badges,s.cleared?1:0,s.pika.aff,s.seed,s.rngn,bits,dex,bag,s.party.map(mon).join('~'),s.box.map(mon).join('~')].join('|');
  return body+'|'+B36(checksum(body)) }
function decode(code){
  try{ const i=code.lastIndexOf('|'); if(i<0) return {err:'형식 오류'}; const body=code.slice(0,i), ck=code.slice(i+1);
    if(B36(checksum(body))!==ck) return {err:'검사값 불일치'}; const p=body.split('|'); if(p[0]!=='KP1') return {err:'버전 불일치'};
    const s=newState(+p[8]); const map=MAPS[+p[1]]; if(!map) return {err:'알 수 없는 맵'}; s.map=map; s.x=+p[2]; s.y=+p[3]; s.money=+p[4]; s.badges=+p[5]; s.cleared=p[6]==='1'; s.pika.aff=+p[7]; s.seed=+p[8]; s.rngn=+p[9];
    if(![s.x,s.y,s.money,s.badges,s.pika.aff,s.rngn].every(Number.isInteger)||s.money<0) return {err:'수치 오류'};
    if(!'.gD'.includes(tile(map,s.x,s.y))) return {err:'좌표 오류'};
    s.flags={}; const chunks=p[10].split('.').filter(x=>x!==''); let idx=0; for(const c of chunks){ const b=parseInt(c,36).toString(2).padStart(24,'0'); for(const ch of b){ if(idx<FL.length&&ch==='1') s.flags[FL[idx]]=1; idx++ } }
    if(p[11].length!==G.species.length) return {err:'도감 오류'}; s.dex={}; [...p[11]].forEach((c,i)=>{ if(+c>0) s.dex[i+1]=+c });
    s.bag={}; p[12].split('.').forEach((q,i)=>{ const n=+q; if(!(n>=0)) throw new Error('수량'); if(n>0) s.bag[IK[i]]=n });
    const mon=t=>{ const f=t.split(':'); const sp=+f[0]; if(!SPECIES[sp]) throw new Error('종'); const m={uid:UID++,sp,nick:'',lv:+f[1],exp:+f[2],hp:+f[3],st:['','sleep','poison','paralysis','burn'][+f[4]],moves:f[5].split('-').filter(Boolean).map(x=>{const[a,b]=x.split('_'); if(!MK[+a]) throw new Error('기술'); return{k:MK[+a],pp:+b}}),where:f[6]==='x'?'':f[6]};
      if(!(m.lv>=1&&m.lv<=100&&m.hp>=0&&m.hp<=maxHp(sp,m.lv))) throw new Error('개체'); if(!m.moves.length) throw new Error('기술없음'); return m };
    s.party=p[13]?p[13].split('~').map(mon):[]; s.box=p[14]?p[14].split('~').map(mon):[];
    if(s.party.length<1||s.party.length>6) return {err:'파티 오류'}; return {s}
  }catch(e){ return {err:'복원 오류: '+e.message} } }
function openHidden(s,aff){ if(aff<10) return false; for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ if(tile(s.map,s.x+dx,s.y+dy)==='h'&&!s.flags['open_'+s.map]){ s.flags['open_'+s.map]=1; return true } } return false }
const SID={}; G.species.forEach(x=>{SID[x.slug]=x.id}); G.species.forEach(x=>{if(SID[x.species]===undefined) SID[x.species]=x.id});
module.exports={SID,openHidden,dmgCalc,weatherOfMap,sight,BOX_MAX,stat,TRACE,WORLD_IDX,G,WORLD,RULES,TR,WILD,SPECIES,MOVES,ITEMS,NPC,RULES_BY,newState,mkMon,mkFoe,maxHp,newBattle,turn,active,foe,newCatch,throwBall,move,interact,rollWild,healAll,useItem,
  addItem,addMon,dexSee,giveExp,evolve,encode,decode,catchHook,tile,exitAt,npcAt,rnd,name,expFor,eff,FL};
