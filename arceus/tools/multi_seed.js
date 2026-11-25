const {run}=require('../engine/sim.js'); const E=require('../engine/engine.js');
const res=[]; for(const mode of ['fast','normal']) for(const sh of [false,true]) for(let seed=1;seed<=12;seed++){
  try{ const r=run({mode,shuffleClues:sh,seed}); res.push({mode,sh,seed,ok:r.s.cleared&&r.s.badges===255,h:r.total/3600,gh:r.grindSecs/3600,wipes:r.s.stats.wipes,steps:r.s.stats.steps,battles:r.s.stats.battles}) }catch(e){ res.push({mode,sh,seed,ok:false,err:e.message.slice(0,90)}) } }
const fail=res.filter(r=>!r.ok); console.log('runs',res.length,'failed',fail.length); fail.forEach(f=>console.log(JSON.stringify(f)));
const ok=res.filter(r=>r.ok); const avg=k=>ok.length?(ok.reduce((a,r)=>a+r[k],0)/ok.length):0; 
for(const mode of ['fast','normal']){ const g=ok.filter(r=>r.mode===mode); const a=k=>(g.reduce((s,r)=>s+r[k],0)/g.length).toFixed(2); console.log(mode,'n',g.length,'total h',a('h'),'grind h',a('gh'),'wipes',a('wipes'),'steps',a('steps'),'battles',a('battles')) }
