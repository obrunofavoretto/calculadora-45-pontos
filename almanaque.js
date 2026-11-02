(async function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=s=>s.split('-').reverse().join('/');
const fmt=n=>n.toLocaleString('pt-BR',{maximumFractionDigits:2});
const stamp=s=>new Date(s).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'});
const outcomeName={champion:'Campeão',relegated:'Rebaixado',survived:'Permaneceu na Série A'};
const filterName={all:'todos os clubes',champion:'campeões',relegated:'rebaixados',survived:'clubes que permaneceram (inclui campeões)'};
async function read(path){const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw Error('Arquivo indisponível: '+path);return r.json();}
try{
 const [data,finals]=await Promise.all([read('./almanaque-dados.json'),read('./almanaque-classificacoes.json')]);
 if(!Array.isArray(data.matches)||!data.matches.length)throw Error('Base vazia');
 let live=null,liveMessage='';
 try{
  const [clock,table]=await Promise.all([read('./relogio-gols.json'),read('./classificacao.json')]);
  if(clock.season!==2026||table.season!==2026||clock.teams.length!==20||clock.matches.length!==clock.completedMatches)throw Error('Cobertura de 2026 incompleta');
  const aliases={'Athletico Paranaense':'Athletico-PR','Atlético Mineiro':'Atlético-MG','Red Bull Bragantino':'RB Bragantino','Vasco da Gama':'Vasco'};
  const clubById=new Map();
  for(const t of table.teams){const name=aliases[t.name]||t.name;let club=data.clubs.indexOf(name);if(club<0){club=data.clubs.length;data.clubs.push(name);}clubById.set(t.id,club);}
  if(clubById.size!==20)throw Error('Cadastro incompatível');
  const ids=new Set();const records=new Map(table.teams.map(t=>[t.id,{played:0,points:0}]));
  const matches=clock.matches.map(m=>{
   if(ids.has(m.id)||!clubById.has(m.home)||!clubById.has(m.away)||m.home===m.away||![m.hg,m.ag].every(n=>Number.isInteger(n)&&n>=0)||!Number.isFinite(Date.parse(m.date)))throw Error('Partida inválida');ids.add(m.id);
   const h=records.get(m.home),a=records.get(m.away);h.played++;a.played++;h.points+=m.hg>m.ag?3:m.hg===m.ag?1:0;a.points+=m.ag>m.hg?3:m.hg===m.ag?1:0;
   const day=new Date(m.date).toLocaleString('sv-SE',{timeZone:'America/Sao_Paulo'}).slice(0,10);
   return [2026,day,'—',clubById.get(m.home),clubById.get(m.away),m.hg,m.ag];
  });
  // A mesma cobertura de pontos e jogos impede publicar uma amostra parcial como temporada atual.
  if(table.teams.some(t=>records.get(t.id).played!==t.played||records.get(t.id).points!==t.points))throw Error('Resultados e tabela em momentos diferentes');
  data.matches.push(...matches);live={complete:false,sourceUrl:table.sourceUrl,fetchedAt:clock.fetchedAt,tableFetchedAt:table.fetchedAt,teams:table.teams.map((t,i)=>({club:clubById.get(t.id),position:i+1,points:t.points,played:t.played,outcome:'pending'})),count:matches.length};finals.seasons[2026]=live;
  liveMessage=`2026 em andamento: ${matches.length} jogos · consulta ${stamp(clock.fetchedAt)} (Brasília).`;
 }catch(e){liveMessage='2026 temporariamente indisponível: resultados e tabela precisam ter a mesma cobertura. As edições encerradas continuam disponíveis.';}
 $('live-status').textContent=liveMessage;
 const seasons=Object.keys(finals.seasons).map(Number).sort((a,b)=>b-a);
 $('season').innerHTML='<option value="all">Todas encerradas — 2003–2025</option>'+seasons.map(y=>`<option value="${y}">${y}${y===2026?' — em andamento':''}</option>`).join('');$('season').disabled=false;
 $('coverage').textContent=`2003–${live?'2026':'2025'} · ${fmt(data.matches.length)} partidas · ${live?'2026 parcial':'23 temporadas encerradas'}`;
 let views={};
 function standing(c){return finals.seasons[c.season]?.teams.find(t=>t.club===c.club);}
 function fate(c){const t=standing(c);return t?`${t.position}º · ${t.points} pontos · ${outcomeName[t.outcome]||'Em disputa'}`:'Desfecho indisponível';}
 function matchTable(games){return '<div class="scroll"><table><thead><tr><th>Data</th><th>Rodada</th><th>Mandante</th><th>Placar</th><th>Visitante</th></tr></thead><tbody>'+games.map(g=>`<tr><td>${date(g.date)}</td><td>${g.round}</td><td>${esc(data.clubs[g.home])}</td><td class="score">${g.hg} × ${g.ag}</td><td>${esc(data.clubs[g.away])}</td></tr>`).join('')+'</tbody></table></div>';}
 function campaignTable(rows){return rows.length?'<div class="scroll"><table><thead><tr><th>Clube</th><th>Temporada</th><th>Jogos no recorte</th><th>V</th><th>E</th><th>D</th><th>Pontos no recorte</th><th>P/jogo</th><th>Gols</th><th>Desfecho na edição</th></tr></thead><tbody>'+rows.map(c=>`<tr><td>${esc(data.clubs[c.club])}</td><td>${c.season}</td><td>${c.games.length}</td><td>${c.wins}</td><td>${c.draws}</td><td>${c.losses}</td><td>${c.points}</td><td>${fmt(c.points/c.games.length)}</td><td>${c.gf}–${c.ga}</td><td>${esc(fate(c))}</td></tr>`).join('')+'</tbody></table></div>':'<p>Nenhuma equipe neste recorte.</p>';}
 function open(key){const v=views[key];$('detail').hidden=false;$('detail-title').textContent=v.title;$('detail-intro').textContent=v.intro;
  if(v.type==='streak')$('detail-body').innerHTML=v.rows.map((r,i)=>`<details${i===0?' open':''}><summary>${esc(data.clubs[r.club])} · ${r.season} · ${r.length} jogos · ${date(r.games[0].date)} a ${date(r.games.at(-1).date)}</summary><p class="outcome">${esc(fate(r))}</p>${matchTable(r.games)}</details>`).join('')||'<p>Nenhuma sequência neste recorte.</p>';
  else $('detail-body').innerHTML=campaignTable(v.rows);
  $('detail-title').focus();$('detail').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  if(typeof gtag==='function')gtag('event','almanaque_detalhes',{record:key,season:$('season').value,venue:$('venue').value,outcome:$('outcome').value});
 }
 function card(key,title,value,unit,leader,meta,type=''){return `<button type="button" class="record ${type}" data-record="${key}" aria-expanded="false"><span class="label">${title}</span><span class="number">${value} <small>${unit}</small></span><strong>${esc(leader)}</strong><span class="meta">${esc(meta)}</span><span class="more">Ver detalhes →</span></button>`;}
 function renderStandings(season,filter){
  const all=season==='all';const years=all?Object.keys(finals.seasons).filter(y=>finals.seasons[y].complete).sort((a,b)=>b-a):[season];
  const rows=years.flatMap(y=>finals.seasons[y].teams.filter(t=>(all&&filter==='all'?t.outcome==='champion':filter==='all'||filter==='survived'&&t.outcome!=='relegated'&&t.outcome!=='pending'||t.outcome===filter)).map(t=>({...t,season:y})));
  $('standings-title').textContent=all&&filter==='all'?'Campeões por temporada':season==='2026'?'Classificação atual — 2026':all?'Desfechos nas temporadas':'Classificação final — '+season;
  $('standings-intro').textContent=season==='2026'?`Situação parcial, sem desfecho atribuído. Consulta ${stamp(live.tableFetchedAt)} (Brasília).`:all?'Tabelas finais publicadas, com pontos ajustados por punições. Escolha uma temporada para ver sua classificação completa.':'Tabela final publicada, preservando ordem e pontos ajustados por punições. O filtro de mando não modifica a classificação geral.';
  $('standings-body').innerHTML=rows.length?'<div class="scroll"><table><thead><tr><th>Temporada</th><th>Posição</th><th>Clube</th><th>Pontos na tabela</th><th>Jogos</th><th>Desfecho</th></tr></thead><tbody>'+rows.map(t=>`<tr><td>${t.season}</td><td>${t.position}º</td><td>${esc(data.clubs[t.club])}</td><td>${t.points}</td><td>${t.played}</td><td>${outcomeName[t.outcome]||'Em disputa'}</td></tr>`).join('')+'</tbody></table></div>':'<p>O desfecho selecionado ainda não está definido para esta edição.</p>';
  $('standings-source').innerHTML=all?'Fonte: <a href="https://pt.wikipedia.org/wiki/Campeonato_Brasileiro_de_Futebol">Wikipédia — colaboradores dos artigos de cada temporada</a> · CC BY-SA 4.0.':`Fonte: <a href="${esc(finals.seasons[season].sourceUrl)}">Wikipédia — classificação de ${season}</a> · CC BY-SA 4.0 · <a href="${esc(finals.seasons[season].sourceUrl)}?action=history">Histórico e autoria</a>.`;
 }
 function render(){
  const season=$('season').value,venue=$('venue').value,filter=$('outcome').value;
  const partial=season==='2026';const matches=data.matches.filter(m=>season==='all'?!!finals.seasons[m[0]]?.complete:m[0]===Number(season));
  const scope=season==='all'?'Edições encerradas (2003–2025)':`Temporada ${season}${partial?' — em andamento':''}`;
  const mando={all:'geral',home:'somente em casa',away:'somente fora de casa'}[venue];
  $('scope').textContent=`${scope} · ${mando} · ${filterName[filter]} · ${fmt(matches.length)} partidas na edição/intervalo. Séries separadas por temporada.`;
  $('detail').hidden=true;views={};
  const allCampaigns=AlmanaqueEngine.campaigns(matches,venue);
  const campaigns=AlmanaqueEngine.withOutcomes(allCampaigns,finals.seasons,filter);
  renderStandings(season,filter);
  $('active-section').hidden=!partial||filter!=='all';
  if(partial&&filter==='all')$('active-body').innerHTML='<div class="scroll"><table><thead><tr><th>Clube</th><th>Vitórias</th><th>Derrotas</th><th>Sem perder</th><th>Sem vencer</th><th>Empates</th></tr></thead><tbody>'+allCampaigns.sort((a,b)=>data.clubs[a.club].localeCompare(data.clubs[b.club],'pt-BR')).map(c=>{const a=AlmanaqueEngine.activeStreaks(c);return `<tr><td>${esc(data.clubs[c.club])}</td>${['wins','losses','unbeaten','winless','draws'].map(k=>`<td>${a[k]}</td>`).join('')}</tr>`;}).join('')+'</tbody></table></div>';
  if(!campaigns.length){$('cards').innerHTML='<p>Nenhuma campanha com esse desfecho. Em 2026, campeão e rebaixados ainda não foram atribuídos.</p>';$('campaigns').innerHTML='';return;}
  const types=[['wins','Vitórias seguidas'],['losses','Derrotas seguidas'],['unbeaten','Jogos sem perder'],['winless','Jogos sem vencer'],['draws','Empates seguidos']];
  $('cards').innerHTML=types.map(([key,title])=>{const runs=AlmanaqueEngine.streaks(campaigns,key),best=runs[0]?.length||0,rows=runs.filter(r=>r.length===best);views[key]={type:'streak',title,intro:`${scope} · ${mando} · ${filterName[filter]}. Todas as ${rows.length} sequência(s) empatada(s) no recorde do recorte.${partial?' Maior série da edição até a última coleta; pode já ter terminado.':''}`,rows};const first=rows[0];return card(key,title,best,'jogos',first?data.clubs[first.club]:'Sem sequência',first?`${first.season} · ${date(first.games[0].date)} a ${date(first.games.at(-1).date)}${rows.length>1?' · +'+(rows.length-1)+' sequência(s) empatada(s)':''}`:'Nenhuma partida atende ao critério.',key);}).join('');
  const bestAttack=Math.max(...campaigns.map(c=>c.gf/c.games.length)),attacks=campaigns.filter(c=>Math.abs(c.gf/c.games.length-bestAttack)<1e-9);
  views.attack={type:'campaign',title:'Melhor média de gols marcados',intro:`${scope} · ${mando} · ${filterName[filter]}. Comparação por gols por jogo.`,rows:attacks};$('cards').innerHTML+=card('attack','Melhor média de gols',fmt(bestAttack),'gols/jogo',data.clubs[attacks[0].club],`${attacks[0].season} · ${attacks[0].gf} gols em ${attacks[0].games.length} jogos${attacks.length>1?' · '+attacks.length+' campanhas empatadas':''}`);
  const rank=[...campaigns].sort((a,b)=>b.points/b.games.length-a.points/a.games.length);
  $('campaigns').innerHTML=[['best','Melhor campanha',rank[0]],['worst','Pior campanha',rank.at(-1)]].map(([key,title,first])=>{const avg=first.points/first.games.length,rows=rank.filter(c=>Math.abs(c.points/c.games.length-avg)<1e-9);views[key]={type:'campaign',title,intro:`${scope} · ${mando} · ${filterName[filter]}. Pontos por jogo pelos resultados, sem punições. Todos os empates no indicador são exibidos.${partial?' Campanhas parciais.':''}`,rows};return card(key,title,fmt(avg),'pontos/jogo',data.clubs[first.club],`${first.season} · ${first.points} pontos em ${first.games.length} jogos${rows.length>1?' · '+rows.length+' campanhas empatadas':''}`);}).join('');
  const noWins=AlmanaqueEngine.withOutcomes(AlmanaqueEngine.campaigns(matches,'away'),finals.seasons,filter).filter(c=>c.wins===0);
  const zeroTitle=partial?'Ainda sem vencer fora de casa':'Temporadas sem vencer fora de casa';views.zeroAway={type:'campaign',title:zeroTitle,intro:`${scope} · ${filterName[filter]}. Este card considera sempre jogos como visitante.${partial?' Situação parcial: pode mudar até o fim da edição.':' Veja o desfecho de cada equipe na tabela.'}`,rows:noWins};$('campaigns').innerHTML+=card('zeroAway',partial?'Ainda sem vencer fora':'Sem vencer fora de casa',noWins.length,partial?'clubes':'campanhas',noWins.length?'Veja todos os clubes':'Nenhum clube',partial?'Sempre como visitante · 2026 parcial':'Sempre como visitante · temporadas encerradas');
  document.querySelectorAll('[data-record]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-record]').forEach(x=>x.setAttribute('aria-expanded',String(x===b)));open(b.dataset.record);}));
 }
 for(const id of ['season','venue','outcome'])$(id).addEventListener('change',()=>{render();if(typeof gtag==='function')gtag('event','almanaque_filtro',{season:$('season').value,venue:$('venue').value,outcome:$('outcome').value});});
 $('close-detail').addEventListener('click',()=>{$('detail').hidden=true;const b=document.querySelector('[data-record][aria-expanded="true"]');if(b){b.setAttribute('aria-expanded','false');b.focus();}});
 render();
}catch(e){$('coverage').textContent='Não foi possível carregar o acervo.';$('cards').innerHTML='<p class="empty">Recarregue a página para tentar novamente. Nenhum recorde foi calculado sem os dados.</p>';}
})();
