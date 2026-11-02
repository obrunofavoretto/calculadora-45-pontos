const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const base=path.join(__dirname,'..');
async function load(valid=true){
 const elements={};function el(id){return elements[id]??={value:id==='sequence-mode'?'single':['season','venue','outcome'].includes(id)?'all':'',textContent:'',innerHTML:'',hidden:false,events:{},addEventListener(k,f){this.events[k]=f;},focus(){},scrollIntoView(){}};}
 const teams=Array.from({length:20},(_,i)=>({id:i+1000,name:'Clube de teste '+i,points:1,played:1}));
 const clock={season:2026,fetchedAt:'2026-11-02T00:00Z',teams,completedMatches:10,matches:Array.from({length:10},(_,i)=>({id:String(i),home:1000+2*i,away:1001+2*i,hg:0,ag:0,date:'2026-11-01T23:30Z'}))};
 const table={season:2026,fetchedAt:clock.fetchedAt,sourceUrl:'https://pt.wikipedia.org/',teams:structuredClone(teams)};if(!valid)table.teams[0].points=4;
 const context={document:{getElementById:el,querySelectorAll:()=>[]},fetch:async u=>({ok:true,json:async()=>u==='./relogio-gols.json'?clock:u==='./classificacao.json'?table:JSON.parse(fs.readFileSync(path.join(base,u)))}),AlmanaqueEngine:require('../almanaque-engine.js'),console};
 await vm.runInNewContext(fs.readFileSync(path.join(base,'almanaque.js'),'utf8'),context);return elements;
}
(async()=>{
 const e=await load();assert(e.season.innerHTML.includes('2026 — em andamento'));assert(e.scope.textContent.includes('Edições encerradas'));assert(!e.standingsBody);assert(e['standings-body'].innerHTML.includes('Campeão'));
 for(const y of ['2003','2013','2024','2025']){e.season.value=y;e.season.events.change();assert(e.scope.textContent.includes(y));assert(!e.cards.innerHTML.includes('undefined'));for(const v of ['home','away','all']){e.venue.value=v;e.venue.events.change();assert(!e.cards.innerHTML.includes('NaN'));}e.outcome.value='champion';e.outcome.events.change();assert(e['standings-body'].innerHTML.includes('Campeão'));assert(!e['standings-body'].innerHTML.includes('Rebaixado'));e.outcome.value='all';}
 e.season.value='2024';e.outcome.value='all';e['sequence-mode'].value='cross';e['sequence-mode'].events.change();assert(e['sequences-title'].textContent.includes('entre temporadas'));assert(e['sequence-help'].textContent.includes('duas edições'));assert(!e.cards.innerHTML.includes('undefined'));e['sequence-mode'].value='single';
 e.season.value='2026';e.outcome.value='all';e.season.events.change();assert(e.scope.textContent.includes('em andamento'));assert.equal(e['active-section'].hidden,false);assert(e['active-body'].innerHTML.includes('Clube de teste'));assert(e.campaigns.innerHTML.includes('2026 parcial'));assert(e['standings-body'].innerHTML.includes('Em disputa'));assert(!e['standings-body'].innerHTML.includes('Rebaixado'));
 e.outcome.value='relegated';e.outcome.events.change();assert(e.cards.innerHTML.includes('Nenhuma campanha'));assert(e['standings-body'].innerHTML.includes('ainda não está definido'));
 const bad=await load(false);assert(!bad.season.innerHTML.includes('2026 — em andamento'));assert(bad['live-status'].textContent.includes('temporariamente indisponível'));assert(bad.cards.innerHTML.includes('Vitórias seguidas'));
 console.log('PASS: filtros globais, desfechos, 2026 parcial, séries ativas e rejeição de fontes divergentes.');
})();
