const E=require('../engine/engine.js'); const {run}=require('../engine/sim.js'); const fs=require('fs');
const [mode,seed,out,shuffle]=[process.argv[2],+process.argv[3],process.argv[4],process.argv[5]==='shuffle'];
E.TRACE.on=[]; const r=run({mode,seed,shuffleClues:shuffle}); const tr=E.TRACE.on; E.TRACE.on=null;
fs.writeFileSync(out,JSON.stringify({trace:tr,flags:Object.keys(r.s.flags).sort(),map:E.WORLD_IDX[r.s.map],x:r.s.x,y:r.s.y,badges:r.s.badges,cleared:r.s.cleared,hours:r.total/3600}));
console.log(out,tr.length,'events',r.s.cleared);
