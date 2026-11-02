const assert=require('node:assert/strict');const {campaigns,streaks}=require('../almanaque-engine.js');
const m=[[2020,'2020-12-01',1,0,1,1,0],[2020,'2021-01-01',2,1,0,1,0],[2020,'2021-02-01',3,0,1,2,0],[2021,'2021-05-01',1,0,1,3,0]];
const c=campaigns(m).filter(c=>c.club===0);assert.equal(streaks(c,'wins')[0].length,1,'Séries não atravessam derrota nem edição');assert.equal(streaks(c,'unbeaten')[0].length,1);assert.equal(streaks(campaigns(m,'home').filter(c=>c.club===0),'wins')[0].length,2,'Outro mando não encerra série por mando');assert.equal(c[0].games.length,3,'2020 inclui partidas em 2021');
const d=require('../almanaque-dados.json');assert.equal(d.matches.length,9165);for(let y=2003;y<=2025;y++){const a=d.matches.filter(m=>m[0]===y);const n=y<2005?24:y===2005?22:20;assert.equal(a.length,y<2005?552:y===2005?462:y===2016?379:380);const cs=campaigns(a);assert.equal(cs.length,n);assert.equal(cs.reduce((s,c)=>s+c.gf,0),cs.reduce((s,c)=>s+c.ga,0));for(const c of cs)assert.equal(c.games.length,y===2016&&['Chapecoense','Atlético-MG'].includes(d.clubs[c.club])?37:2*(n-1),`${y} ${d.clubs[c.club]}`);}
const all=campaigns(d.matches);const top=streaks(all,'wins');console.log('Recorde vitórias:',top[0].length,d.clubs[top[0].club],top[0].season);console.log('Todos os testes do Almanaque passaram.');
const finals=require('../almanaque-classificacoes.json');
for(let year=2003;year<=2025;year++){
 const f=finals.seasons[year],n=year<2005?24:year===2005?22:20;
 assert.equal(f.teams.length,n);assert.equal(new Set(f.teams.map(t=>t.club)).size,n);
 assert.equal(f.teams.filter(t=>t.outcome==='champion').length,1);
 assert.equal(f.teams.filter(t=>t.outcome==='relegated').length,year===2003?2:4);
 assert.deepEqual(f.teams.map(t=>t.position),Array.from({length:n},(_,i)=>i+1));
}
const portuguesa=d.clubs.indexOf('Portuguesa');assert.equal(finals.seasons[2013].teams.find(t=>t.club===portuguesa).points,44);assert.equal(finals.seasons[2013].teams.find(t=>t.club===portuguesa).outcome,'relegated');
const e=require('../almanaque-engine.js');const champ=e.withOutcomes(all,finals.seasons,'champion');assert.equal(champ.length,23);assert(champ.every(c=>c.standing.position===1));assert.equal(e.withOutcomes(all,finals.seasons,'relegated').length,90);
const zeroAway=e.withOutcomes(campaigns(d.matches,'away'),finals.seasons).filter(c=>!c.wins);assert(zeroAway.every(c=>c.standing.outcome==='relegated'));
const active=e.activeStreaks({games:[{result:'L'},{result:'D'},{result:'W'},{result:'W'}]});assert.deepEqual(active,{wins:2,losses:0,draws:0,unbeaten:3,winless:0});console.log('PASS: desfechos, punição de 2013, rebaixados por formato e sequências ativas.');
const crossFixture=[
 [2022,'2022-11-01',37,0,1,1,0],[2022,'2022-11-08',38,1,0,0,1],
 [2023,'2023-04-01',1,0,1,2,0],[2023,'2023-04-08',2,1,0,0,1],[2023,'2023-04-15',3,0,1,0,0],
 [2024,'2024-04-01',1,0,1,1,0]];
let cr=e.crossStreaks(campaigns(crossFixture),'wins').filter(r=>r.club===0);assert.equal(cr[0].length,4);assert.equal(cr[0].startSeason,2022);assert.equal(cr[0].endSeason,2023);assert.equal(cr.length,1,'Empate interrompe a sequência; não junta a vitória de 2024');
const skip=[crossFixture[0],[2024,'2024-04-01',1,0,1,1,0]];assert.equal(e.crossStreaks(campaigns(skip),'wins').length,0,'Ausência na Série A interrompe a sequência');
const losses=crossFixture.map(m=>[...m.slice(0,5),m[6],m[5]]);assert.equal(e.crossStreaks(campaigns(losses),'losses').find(r=>r.club===0).length,4);
assert.equal(e.crossStreaks(campaigns(crossFixture,'home'),'wins').find(r=>r.club===0).length,2,'Filtro de mando preserva a virada de edição');
assert.equal(e.crossStreaks(campaigns(crossFixture),'unbeaten').find(r=>r.club===0).endSeason,2024,'Permite continuidade em mais de duas edições');
console.log('PASS: continuidade entre edições, interrupções por resultado/ausência e filtro por mando.');
for(const k of ['wins','losses','unbeaten','winless']){const r=e.crossStreaks(all,k)[0];console.log('Entre temporadas:',k,r.length,d.clubs[r.club],r.startSeason,r.endSeason);}
