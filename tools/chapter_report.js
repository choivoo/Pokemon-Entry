const {run,SEC}=require('../engine/sim.js'); const E=require('../engine/engine.js'); const fs=require('fs');
const out={};
for(const [name,opt] of [['fast',{mode:'fast',seed:7}],['normal',{mode:'normal',seed:9}],['normal_shuffled_clues',{mode:'normal',seed:10,shuffleClues:true}]]){
  const r=run(opt); const rows=[];
  for(let c=1;c<=12;c++){ const pc=r.perChapter[c], k=pc.clk; const tot=r.secs[c]; rows.push({ch:c,total_min:tot/60,grind_min:pc.grind/60,required_min:(tot-pc.grind)/60,walk_min:(k.move+k.load)*0+ (k.move*SEC.move+k.load*SEC.load)/60,battle_min:k.turn*SEC.turn/60,dialog_min:k.line*SEC.line/60,capture_min:(k.throw*SEC.throw+k.catchIntro*SEC.catchIntro)/60,menu_min:k.menu*SEC.menu/60,lead_lv:pc.lvTop}) }
  out[name]={rows,total_h:r.total/3600,grind_h:r.grindSecs/3600,required_h:(r.total-r.grindSecs)/3600,stats:r.s.stats,party:r.s.party.map(m=>E.name(m)+' Lv'+m.lv),cleared:r.s.cleared,dex_seen:Object.keys(r.s.dex).length,dex_caught:Object.values(r.s.dex).filter(v=>v===2).length}
}
fs.writeFileSync('build/chapter_report.json',JSON.stringify(out,null,1)); console.log(Object.entries(out).map(([k,v])=>k+': total '+v.total_h.toFixed(1)+'h grind '+v.grind_h.toFixed(1)+'h required '+v.required_h.toFixed(2)+'h').join('\n'));
