import csv,json,collections,datetime,pathlib,sys
out=pathlib.Path(__file__).resolve().parent.parent
rows=list(csv.DictReader(open(sys.argv[1], encoding='utf-8')))
names={'America-MG':'América-MG','America-RN':'América-RN','Atletico-GO':'Atlético-GO','Atletico-MG':'Atlético-MG','Avai':'Avaí','Botafogo-RJ':'Botafogo','Ceara':'Ceará','Criciuma':'Criciúma','Cuiaba':'Cuiabá','Goias':'Goiás','Gremio':'Grêmio','Gremio Prudente':'Grêmio Prudente','Nautico':'Náutico','Parana':'Paraná','Santo Andre':'Santo André','Sao Caetano':'São Caetano','Sao Paulo':'São Paulo','Vitoria':'Vitória','Bragantino':'RB Bragantino'}
clubs=sorted({names.get(r[k],r[k]) for r in rows for k in ['mandante','visitante']})
data=[];counts=collections.Counter();pairs=set()
for r in rows:
 
 if r['data']=='19/07/2009' and r['mandante']=='Botafogo-RJ' and r['visitante']=='Flamengo':
  r={**r,'mandante':'Flamengo','visitante':'Botafogo-RJ','mandante_Placar':'2','visitante_Placar':'2'}
 d=datetime.datetime.strptime(r['data'],'%d/%m/%Y');y=2020 if d.year==2021 and d.month<3 else d.year
 h=clubs.index(names.get(r['mandante'],r['mandante']));a=clubs.index(names.get(r['visitante'],r['visitante']))
 key=(y,h,a);assert key not in pairs,key;pairs.add(key)
 data.append([y,d.strftime('%Y-%m-%d'),int(r['rodata']),h,a,int(r['mandante_Placar']),int(r['visitante_Placar'])]);counts[y]+=1
for y in range(2003,2026):assert counts[y]==(552 if y<2005 else 462 if y==2005 else 379 if y==2016 else 380),(y,counts[y])
data.sort(key=lambda x:(x[1],x[2],x[3]))
obj={'source':'https://github.com/leo-amaral/Brasileirao-2003-a-2025','upstream':'https://github.com/adaoduque/Brasileirao_Dataset','through':2025,'clubs':clubs,'matches':data,'counts':dict(counts)}
(out/'almanaque-dados.json').write_text(json.dumps(obj,ensure_ascii=False,separators=(',',':')))
print('Validado:',len(data),'partidas;',len(clubs),'clubes;',dict(sorted(counts.items())))
