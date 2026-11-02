from lxml import html
import json,re,unicodedata,pathlib,collections,sys
p=pathlib.Path(__file__).resolve().parent.parent;data=json.loads((p/'almanaque-dados.json').read_text())
def norm(s):return ''.join(c for c in unicodedata.normalize('NFKD',s) if not unicodedata.combining(c)).lower().strip()
alias={'atletico paranaense':'Athletico-PR','athletico paranaense':'Athletico-PR','atletico mineiro':'Atlético-MG','america mineiro':'América-MG','america de natal':'América-RN','america':'América-MG','atletico goianiense':'Atlético-GO','gremio barueri':'Barueri','gremio prudente':'Grêmio Prudente','red bull bragantino':'RB Bragantino','bragantino':'RB Bragantino','vasco da gama':'Vasco','gremio':'Grêmio'}
lookup={norm(c):c for c in data['clubs']};lookup.update(alias)
out={}
for y in range(2003,2026):
 tree=html.parse(str(pathlib.Path(sys.argv[1])/f'{y}.html'))
 for e in tree.xpath('//sup|//style|//script'):e.getparent().remove(e)
 candidates=[]
 for t in tree.xpath('//table'):
  rows=[[' '.join(c.text_content().split()) for c in tr.xpath('./th|./td')] for tr in t.xpath('./tr|./tbody/tr|./thead/tr')]
  if len(rows)>15 and rows and 'J' in rows[0] and any(c in ['P','Pts','PG'] for c in rows[0]):candidates.append(rows)
 assert len(candidates)==1,(y,len(candidates))
 rows=candidates[0];header=rows[0];pts=next(header.index(c) for c in ['P','Pts','PG'] if c in header)
 teams=[]
 for r in rows[1:]:
  if not r[0].isdigit():continue
  name=re.sub(r'\s*\([^)]*\)|\[[^]]*\]','',r[1]).strip();name=lookup.get(norm(name),name)
  assert name in data['clubs'],(y,name)
  teams.append({'club':data['clubs'].index(name),'position':int(r[0]),'points':int(r[pts]),'played':int(r[header.index('J')]),'outcome':'champion' if int(r[0])==1 else 'relegated' if int(r[0])>(22 if y==2003 else 20 if y==2004 else 18 if y==2005 else 16) else 'survived'})
 n=24 if y<2005 else 22 if y==2005 else 20
 assert len(teams)==n and len({t['club'] for t in teams})==n,(y,len(teams))
 assert {t['club'] for t in teams}=={m[i] for m in data['matches'] if m[0]==y for i in [3,4]},y
 out[y]={'complete':True,'sourceUrl':f'https://pt.wikipedia.org/wiki/Campeonato_Brasileiro_de_Futebol_de_{y}_-_S%C3%A9rie_A','license':'CC BY-SA 4.0','teams':teams}
 print(y,[(data['clubs'][t['club']],t['position'],t['points']) for t in teams if t['outcome'] in ['champion','relegated']])
(p/'almanaque-classificacoes.json').write_text(json.dumps({'license':'CC BY-SA 4.0','seasons':out},ensure_ascii=False,separators=(',',':')))
