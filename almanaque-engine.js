(function(root){'use strict';
function campaigns(matches,venue='all'){
 const groups=new Map();
 for(const m of matches)for(const [club,opponent,gf,ga,side] of [[m[3],m[4],m[5],m[6],'home'],[m[4],m[3],m[6],m[5],'away']]){
  if(venue!=='all'&&venue!==side)continue;
  const key=m[0]+'-'+club;if(!groups.has(key))groups.set(key,{club,season:m[0],games:[],points:0,wins:0,draws:0,losses:0,gf:0,ga:0});
  const c=groups.get(key),result=gf>ga?'W':gf<ga?'L':'D';c.games.push({date:m[1],round:m[2],home:m[3],away:m[4],hg:m[5],ag:m[6],opponent,result});c.points+=result==='W'?3:result==='D'?1:0;c.wins+=+(result==='W');c.draws+=+(result==='D');c.losses+=+(result==='L');c.gf+=gf;c.ga+=ga;
 }
 return [...groups.values()].map(c=>({...c,games:c.games.sort((a,b)=>a.date.localeCompare(b.date)||a.round-b.round)}));
}
function streaks(campaigns,kind){
 const test={wins:r=>r==='W',losses:r=>r==='L',draws:r=>r==='D',unbeaten:r=>r!=='L',winless:r=>r!=='W'}[kind];if(!test)throw Error('Tipo inválido');const runs=[];
 for(const c of campaigns){let run=[];const flush=()=>{if(run.length)runs.push({club:c.club,season:c.season,games:run,length:run.length});run=[];};for(const g of c.games){if(test(g.result))run.push(g);else flush();}flush();}
 return runs.sort((a,b)=>b.length-a.length||a.season-b.season||a.club-b.club||a.games[0].date.localeCompare(b.games[0].date));
}
const api={campaigns,streaks};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.AlmanaqueEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this);
(function(root){
 const api=typeof module!=='undefined'&&module.exports?module.exports:root.AlmanaqueEngine;
 api.withOutcomes=function(campaigns,seasons,filter='all'){
  return campaigns.map(c=>{const season=seasons[c.season],standing=season?.teams.find(t=>t.club===c.club);return {...c,standing:standing||null,complete:!!season?.complete};}).filter(c=>filter==='all'||filter==='survived'&&c.complete&&c.standing&&c.standing.outcome!=='relegated'||c.complete&&c.standing?.outcome===filter);
 };
 api.activeStreaks=function(c){const out={};for(const [kind,test] of Object.entries({wins:r=>r==='W',losses:r=>r==='L',draws:r=>r==='D',unbeaten:r=>r!=='L',winless:r=>r!=='W'})){let n=0;for(let i=c.games.length-1;i>=0&&test(c.games[i].result);i--)n++;out[kind]=n;}return out;};
})(typeof globalThis!=='undefined'?globalThis:this);
