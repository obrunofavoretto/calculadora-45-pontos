(async function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const period=r=>r.startSeason?`${r.startSeason}–${r.endSeason}`:String(r.season);
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
 $('club').innerHTML='<option value="all">Todos os clubes</option>'+data.clubs.map((name,id)=>({name,id})).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')).map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');
 let views={};
 function standing(c){return finals.seasons[c.season]?.teams.find(t=>t.club===c.club);}
 function fate(c){const t=standing(c);return t?`${t.position}º · ${t.points} pontos · ${outcomeName[t.outcome]||'Em disputa'}`:'Desfecho indisponível';}
 function matchTable(games){return '<div class="scroll"><table><thead><tr><th>Temporada</th><th>Data</th><th>Rodada</th><th>Mandante</th><th>Placar</th><th>Visitante</th></tr></thead><tbody>'+games.map(g=>`<tr><td>${g.season||g.date.slice(0,4)}</td><td>${date(g.date)}</td><td>${g.round}</td><td>${esc(data.clubs[g.home])}</td><td class="score">${g.hg} × ${g.ag}</td><td>${esc(data.clubs[g.away])}</td></tr>`).join('')+'</tbody></table></div>';}
 function campaignTable(rows){return rows.length?'<div class="scroll"><table><thead><tr><th>Clube</th><th>Temporada</th><th>Jogos no recorte</th><th>V</th><th>E</th><th>D</th><th>Pontos no recorte</th><th>P/jogo</th><th>Gols</th><th>Desfecho na edição</th></tr></thead><tbody>'+rows.map(c=>`<tr><td>${esc(data.clubs[c.club])}</td><td>${c.season}</td><td>${c.games.length}</td><td>${c.wins}</td><td>${c.draws}</td><td>${c.losses}</td><td>${c.points}</td><td>${fmt(c.points/c.games.length)}</td><td>${c.gf}–${c.ga}</td><td>${esc(fate(c))}</td></tr>`).join('')+'</tbody></table></div>':'<p>Nenhuma equipe neste recorte.</p>';}
 function open(key){const v=views[key];$('detail').hidden=false;$('detail-title').textContent=v.title;$('detail-intro').textContent=v.intro;
  if(v.type==='streak')$('detail-body').innerHTML=v.rows.map((r,i)=>`<details${i===0?' open':''}><summary>${esc(data.clubs[r.club])} · ${period(r)} · ${r.length} jogos · ${date(r.games[0].date)} a ${date(r.games.at(-1).date)}</summary><p class="outcome">${r.startSeason?`Desfecho em ${r.endSeason}: `:""}${esc(fate(r))}</p>${matchTable(r.games)}</details>`).join('')||'<p>Nenhuma sequência neste recorte.</p>';
  else $('detail-body').innerHTML=(v.type==='record'?recordTable(v.rows,v.definition):campaignTable(v.rows));
  $('detail-title').focus();$('detail').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  if(typeof gtag==='function')gtag('event','almanaque_detalhes',{record:key,season:$('season').value,venue:$('venue').value,outcome:$('outcome').value,sequence_mode:$('sequence-mode').value});
 }
 function card(key,title,value,unit,leader,meta,type=''){return `<button type="button" class="record ${type}" data-record="${key}" aria-expanded="false"><span class="label">${title}</span><span class="number">${value} <small>${unit}</small></span><strong>${esc(leader)}</strong><span class="meta">${esc(meta)}</span><span class="more">Ver detalhes →</span></button>`;}
 function renderStandings(season,filter){
  const all=season==='all';const years=all?Object.keys(finals.seasons).filter(y=>finals.seasons[y].complete).sort((a,b)=>b-a):[season];
  const rows=years.flatMap(y=>finals.seasons[y].teams.filter(t=>($('club').value==='all'||!$('club').value||t.club===Number($('club').value))).filter(t=>(all&&filter==='all'?t.outcome==='champion':filter==='all'||filter==='survived'&&t.outcome!=='relegated'&&t.outcome!=='pending'||t.outcome===filter)).map(t=>({...t,season:y})));
  $('standings-title').textContent=all&&filter==='all'?'Campeões por temporada':season==='2026'?'Classificação atual — 2026':all?'Desfechos nas temporadas':'Classificação final — '+season;
  $('standings-intro').textContent=season==='2026'?`Situação parcial, sem desfecho atribuído. Consulta ${stamp(live.tableFetchedAt)} (Brasília).`:all?'Tabelas finais publicadas, com pontos ajustados por punições. Escolha uma temporada para ver sua classificação completa.':'Tabela final publicada, preservando ordem e pontos ajustados por punições. O filtro de mando não modifica a classificação geral.';
  $('standings-body').innerHTML=rows.length?'<div class="scroll"><table><thead><tr><th>Temporada</th><th>Posição</th><th>Clube</th><th>Pontos na tabela</th><th>Jogos</th><th>Desfecho</th></tr></thead><tbody>'+rows.map(t=>`<tr><td>${t.season}</td><td>${t.position}º</td><td>${esc(data.clubs[t.club])}</td><td>${t.points}</td><td>${t.played}</td><td>${outcomeName[t.outcome]||'Em disputa'}</td></tr>`).join('')+'</tbody></table></div>':'<p>O desfecho selecionado ainda não está definido para esta edição.</p>';
  $('standings-source').innerHTML=all?'Fonte: <a href="https://pt.wikipedia.org/wiki/Campeonato_Brasileiro_de_Futebol">Wikipédia — colaboradores dos artigos de cada temporada</a> · CC BY-SA 4.0.':`Fonte: <a href="${esc(finals.seasons[season].sourceUrl)}">Wikipédia — classificação de ${season}</a> · CC BY-SA 4.0 · <a href="${esc(finals.seasons[season].sourceUrl)}?action=history">Histórico e autoria</a>.`;
 }
 function recordTable(rows,d){return '<div class="scroll"><table><thead><tr><th>Posição</th><th>Clube</th><th>Edição</th><th>'+esc(d[4])+'</th><th>Jogos</th><th>Gols pró / contra</th><th>Desfecho</th></tr></thead><tbody>'+rows.map((c,i)=>`<tr><td>${1+rows.findIndex(x=>Math.abs(x[d[2]]-c[d[2]])<1e-9)}º</td><td>${esc(data.clubs[c.club])}</td><td>${c.season}</td><td>${fmt(c[d[2]])}</td><td>${c.played}</td><td>${c.gf} / ${c.ga}</td><td>${esc(fate(c))}</td></tr>`).join('')+'</tbody></table></div>';}
 function renderExtras(matches,season,filter,club,selected){
  const rows=selected(AlmanaqueEngine.withOutcomes(AlmanaqueEngine.campaigns(matches),finals.seasons,filter)).map(AlmanaqueEngine.metrics);
  $('club-history').hidden=club==='all';$('club-history-body').innerHTML=club==='all'?'':campaignTable(rows);
  $('records-scope').textContent=`${season==='all'?'Edições encerradas — 2003–2025':season+(season==='2026'?' — parcial':'')} · ${club==='all'?'Todos os clubes':data.clubs[Number(club)]} · ${filterName[filter]} · campanha geral (casa + fora).`;
  $('history-records').innerHTML=AlmanaqueEngine.recordDefinitions.map(d=>{const ranked=AlmanaqueEngine.rankRecord(rows,d),first=ranked[0];if(!first)return '';const ties=ranked.filter(c=>Math.abs(c[d[2]]-first[d[2]])<1e-9).length;const key='record-'+d[0];views[key]={type:'record',definition:d,rows:ranked,title:d[1],intro:$('records-scope').textContent+' Ranking completo, com todos os empates. Pontos oficiais incluem punições. Totais dependem do número de jogos da edição.'};return card(key,d[1],fmt(first[d[2]]),d[4],data.clubs[first.club],`${first.season} · ${first.played} jogos${ties>1?' · '+ties+' empatados':''}${season==='2026'?' · parcial':''}`);}).join('')||'<p>Nenhuma campanha com esse filtro.</p>';
  const away=selected(AlmanaqueEngine.withOutcomes(AlmanaqueEngine.campaigns(matches,'away'),finals.seasons,filter)).filter(c=>c.wins===0);
  const survived=away.filter(c=>c.complete&&c.standing&&c.standing.outcome!=='relegated');
  $('curiosities').innerHTML=`<p><strong>${away.length}</strong> ${season==='2026'?'clubes ainda não venceram':'campanhas sem vitória'} fora de casa neste recorte. Entre as campanhas encerradas, <strong>${survived.length}</strong> escaparam do rebaixamento.</p>`+campaignTable(away)+AlmanaqueEngine.recordDefinitions.filter(d=>['gfAvgMax','gaAvgMax','championMin','homeWins','awayWins'].includes(d[0])).map(d=>{const ranked=AlmanaqueEngine.rankRecord(rows,d),first=ranked[0];return first?`<p><strong>${esc(d[1])}:</strong> ${ranked.filter(c=>Math.abs(c[d[2]]-first[d[2]])<1e-9).map(c=>esc(data.clubs[c.club])+' ('+c.season+')').join(', ')} — ${fmt(first[d[2]])} ${d[4]}, em ${first.played} jogos${season==='2026'?' — parcial':''}.</p>`:'';}).join('');
  if(!live){$('comparisons').textContent='Aguardando resultados e classificação de 2026 com a mesma cobertura.';return;}
  const history=selected(AlmanaqueEngine.withOutcomes(AlmanaqueEngine.campaigns(data.matches.filter(m=>finals.seasons[m[0]]?.complete),$('venue').value),finals.seasons,filter));
  const current=selected(AlmanaqueEngine.campaigns(data.matches.filter(m=>m[0]===2026),$('venue').value));
  const kinds=[['wins','vitórias'],['losses','derrotas'],['unbeaten','sem perder'],['winless','sem vencer'],['draws','empates']];
  const comparisons=current.map(c=>{const active=AlmanaqueEngine.activeStreaks(c);return `<tr><td>${esc(data.clubs[c.club])}</td><td>${c.games.length}</td><td>${fmt(c.gf/c.games.length)} / ${fmt(c.ga/c.games.length)}</td><td>${kinds.map(([k,label])=>{const pool=club==='all'?history:history.filter(h=>h.club===c.club);const best=AlmanaqueEngine.streaks(pool,k)[0]?.length||0;return `${label}: ${active[k]} / ${best}${active[k]>0&&active[k]>=best?' (igualou ou superou)':active[k]>0&&best-active[k]<=3?' (a '+(best-active[k])+' do recorde)':''}`;}).join('<br>')}</td></tr>`;});
  const historical=history.length?`Médias históricas: melhor ataque ${fmt(Math.max(...history.map(c=>c.gf/c.games.length)))}; melhor defesa ${fmt(Math.min(...history.map(c=>c.ga/c.games.length)))} gols/jogo.`:'';
  $('comparisons').innerHTML=`<p>${historical} Mando: ${{all:'geral',home:'casa',away:'fora'}[$('venue').value]}. Séries ativas em 2026 / maior série em uma edição encerrada desde 2003${club==='all'?' (todos os clubes)':' (do clube escolhido)'}. Desfecho histórico: ${filterName[filter]}; 2026 ainda sem desfecho.</p><div class="scroll"><table><thead><tr><th>Clube</th><th>Jogos</th><th>Média gols pró / contra</th><th>Sequências: atual / recorde histórico</th></tr></thead><tbody>${comparisons.join('')}</tbody></table></div>`;
 }
 function render(){
  const season=$('season').value,venue=$('venue').value,filter=$('outcome').value,mode=$('sequence-mode').value||'single';
  const partial=season==='2026';const matches=data.matches.filter(m=>season==='all'?!!finals.seasons[m[0]]?.complete:m[0]===Number(season));
  const club=$('club').value||'all', selected=rows=>rows.filter(c=>club==='all'||c.club===Number(club));
  const scope=season==='all'?'Edições encerradas (2003–2025)':`Temporada ${season}${partial?' — em andamento':''}`;
  const mando={all:'geral',home:'somente em casa',away:'somente fora de casa'}[venue];
  $('scope').textContent=`${scope} · ${mando} · ${filterName[filter]} · ${fmt(matches.length)} partidas na edição/intervalo. ${mode==='cross'?'Séries que atravessam edições consecutivas; desfecho da última edição da série.':'Séries dentro de uma única edição.'}`;
  $('detail').hidden=true;views={};
  const allCampaigns=AlmanaqueEngine.campaigns(matches,venue);
  const campaigns=selected(AlmanaqueEngine.withOutcomes(allCampaigns,finals.seasons,filter));
  renderStandings(season,filter);
  renderExtras(matches,season,filter,club,selected);
  $('sequences-title').textContent=mode==='cross'?'Sequências entre temporadas':'Sequências em uma temporada';
  $('sequence-help').textContent=mode==='cross'?'Somente séries que atravessam pelo menos duas edições consecutivas. Ao escolher um ano, mostramos as que chegaram àquela edição, contando apenas até o fim dela ou a última coleta. O desfecho se refere à última edição da série. Cards de campanhas e a tabela mantêm o recorte de uma edição.':'Cada série começa e termina na mesma edição. Clique nos cards para abrir os jogos e os desfechos.';
  $('active-section').hidden=!partial||filter!=='all';
  if(partial&&filter==='all')$('active-body').innerHTML='<div class="scroll"><table><thead><tr><th>Clube</th><th>Vitórias</th><th>Derrotas</th><th>Sem perder</th><th>Sem vencer</th><th>Empates</th></tr></thead><tbody>'+selected(allCampaigns).sort((a,b)=>data.clubs[a.club].localeCompare(data.clubs[b.club],'pt-BR')).map(c=>{const a=AlmanaqueEngine.activeStreaks(c);return `<tr><td>${esc(data.clubs[c.club])}</td>${['wins','losses','unbeaten','winless','draws'].map(k=>`<td>${a[k]}</td>`).join('')}</tr>`;}).join('')+'</tbody></table></div>';
  if(!campaigns.length){$('cards').innerHTML='<p>Nenhuma campanha com esse desfecho. Em 2026, campeão e rebaixados ainda não foram atribuídos.</p>';$('campaigns').innerHTML='';return;}
  const types=[['wins','Vitórias seguidas'],['losses','Derrotas seguidas'],['unbeaten','Jogos sem perder'],['winless','Jogos sem vencer'],['draws','Empates seguidos']];
  const history=data.matches.filter(m=>season==='all'?!!finals.seasons[m[0]]?.complete:m[0]<=Number(season));
  const historyCampaigns=mode==='cross'?AlmanaqueEngine.campaigns(history,venue):[];
  $('cards').innerHTML=types.map(([key,title])=>{const runs=selected(mode==='cross'?AlmanaqueEngine.withOutcomes(AlmanaqueEngine.crossStreaks(historyCampaigns,key).filter(r=>season==='all'||r.endSeason===Number(season)),finals.seasons,filter):AlmanaqueEngine.streaks(campaigns,key)),best=runs[0]?.length||0,rows=runs.filter(r=>r.length===best);views[key]={type:'streak',title,intro:`${scope} · ${mando} · ${filterName[filter]}. Todas as ${rows.length} sequência(s) empatada(s) no recorde do recorte. ${mode==='cross'?'Contagem entre edições consecutivas. Desfecho na última edição da série.':'Contagem em uma única edição.'}${partial?' Maior série da edição até a última coleta; pode já ter terminado.':''}`,rows};const first=rows[0];return card(key,title,best,'jogos',first?data.clubs[first.club]:'Sem sequência',first?`${period(first)} · ${date(first.games[0].date)} a ${date(first.games.at(-1).date)}${rows.length>1?' · +'+(rows.length-1)+' sequência(s) empatada(s)':''}`:mode==='cross'?'Nenhuma série atravessou edições neste recorte.':'Nenhuma partida atende ao critério.',key);}).join('');
  const bestAttack=Math.max(...campaigns.map(c=>c.gf/c.games.length)),attacks=campaigns.filter(c=>Math.abs(c.gf/c.games.length-bestAttack)<1e-9);
  views.attack={type:'campaign',title:'Melhor média de gols marcados',intro:`${scope} · ${mando} · ${filterName[filter]}. Comparação por gols por jogo.`,rows:attacks};$('cards').innerHTML+=card('attack','Melhor média de gols',fmt(bestAttack),'gols/jogo',data.clubs[attacks[0].club],`${attacks[0].season} · ${attacks[0].gf} gols em ${attacks[0].games.length} jogos${attacks.length>1?' · '+attacks.length+' campanhas empatadas':''}`);
  const rank=[...campaigns].sort((a,b)=>b.points/b.games.length-a.points/a.games.length);
  $('campaigns').innerHTML=[['best','Melhor campanha',rank[0]],['worst','Pior campanha',rank.at(-1)]].map(([key,title,first])=>{const avg=first.points/first.games.length,rows=rank.filter(c=>Math.abs(c.points/c.games.length-avg)<1e-9);views[key]={type:'campaign',title,intro:`${scope} · ${mando} · ${filterName[filter]}. Pontos por jogo pelos resultados, sem punições. Todos os empates no indicador são exibidos.${partial?' Campanhas parciais.':''}`,rows};return card(key,title,fmt(avg),'pontos/jogo',data.clubs[first.club],`${first.season} · ${first.points} pontos em ${first.games.length} jogos${rows.length>1?' · '+rows.length+' campanhas empatadas':''}`);}).join('');
  const noWins=selected(AlmanaqueEngine.withOutcomes(AlmanaqueEngine.campaigns(matches,'away'),finals.seasons,filter)).filter(c=>c.wins===0);
  const zeroTitle=partial?'Ainda sem vencer fora de casa':'Temporadas sem vencer fora de casa';views.zeroAway={type:'campaign',title:zeroTitle,intro:`${scope} · ${filterName[filter]}. Este card considera sempre jogos como visitante.${partial?' Situação parcial: pode mudar até o fim da edição.':' Veja o desfecho de cada equipe na tabela.'}`,rows:noWins};$('campaigns').innerHTML+=card('zeroAway',partial?'Ainda sem vencer fora':'Sem vencer fora de casa',noWins.length,partial?'clubes':'campanhas',noWins.length?'Veja todos os clubes':'Nenhum clube',partial?'Sempre como visitante · 2026 parcial':'Sempre como visitante · temporadas encerradas');
  document.querySelectorAll('[data-record]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-record]').forEach(x=>x.setAttribute('aria-expanded',String(x===b)));open(b.dataset.record);}));
 }
 for(const id of ['season','venue','outcome','sequence-mode','club'])$(id).addEventListener('change',()=>{render();if(typeof gtag==='function')gtag('event','almanaque_filtro',{season:$('season').value,venue:$('venue').value,outcome:$('outcome').value,sequence_mode:$('sequence-mode').value});});
 $('close-detail').addEventListener('click',()=>{$('detail').hidden=true;const b=document.querySelector('[data-record][aria-expanded="true"]');if(b){b.setAttribute('aria-expanded','false');b.focus();}});
 render();
}catch(e){$('coverage').textContent='Não foi possível carregar o acervo.';$('cards').innerHTML='<p class="empty">Recarregue a página para tentar novamente. Nenhum recorde foi calculado sem os dados.</p>';}
})();
