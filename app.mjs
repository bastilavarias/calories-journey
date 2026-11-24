// A small read-only viewer for the Markdown source of truth.
const clean = value => value.replace(/\*\*/g,'').trim();
const number = value => { const match=clean(value || '').match(/-?[\d,]+(?:\.\d+)?/); return match ? Number(match[0].replace(/,/g,'')) : null; };
const cells = line => line.trim().slice(1,-1).split('|').map(clean);
const isRow = line => line.trim().startsWith('|') && line.trim().endsWith('|');
export function parseJournal(md) {
  const goals={}, days=[], weighIns=[];
  let day=null, section='', mode='';
  for (const line of md.split(/\r?\n/)) {
    const heading=line.match(/^## Log: .*?(\d{4}-\d{2}-\d{2})\s*$/);
    if(heading){ day={date:heading[1],status:'Open / unconfirmed',rows:[],notes:[]}; days.push(day); mode='';section='';continue; }
    if(line.startsWith('## ')){day=null;section=line.slice(3).trim();mode='';continue;}
    if(!day && section==='Current goals and baseline' && isRow(line)){
      const row=cells(line); if(row.length>=2 && row[0]!=='Metric' && !/^[-:]+$/.test(row[0]))goals[row[0]]=row[1]; continue;
    }
    if(!day && section==='Morning weigh-ins' && isRow(line)){
      const [date,weight]=cells(line); const kg=number(weight);
      if(/^\d{4}-\d{2}-\d{2}$/.test(date)&&kg!==null&&kg>0)weighIns.push({date,kg});
      continue;
    }
    if(!day)continue;
    if(line.startsWith('**Status:**'))day.status=clean(line.replace('**Status:**','')).split(' — ')[0].split(' for food')[0];
    if(line.startsWith('### ')){section=line.slice(4).trim(); mode=/^Eaten/i.test(section)?'eaten':/planned|not yet confirmed/i.test(section)&&!/^Projected/i.test(section)?'planned':'';continue;}
    if(!mode || !isRow(line))continue;
    const row=cells(line);const [name,portion,kcal,p,c,f,note]=row;
    if(!name || /^[-:]+$/.test(name)||/^Meal \/ item$|^Item$|subtotal|total$/i.test(name)||number(kcal)===null)continue;
    const excluded=/NOT CONSUMED|NOT EATEN/i.test(note||'') || /0 counted/i.test(kcal);
    const status=excluded?'excluded':mode;
    const fullNote=row.length===4? p:note;
    day.rows.push({name,portion,kcal:number(kcal),protein:row.length>=7?number(p):null,carbs:row.length>=7?number(c):null,fat:row.length>=7?number(f):null,status,note:fullNote||''});
  }
  for(const day of days){
    const eaten=day.rows.filter(row=>row.status==='eaten'),planned=day.rows.filter(row=>row.status==='planned');
    const sum=(items,key)=>items.reduce((total,item)=>total+(item[key]??0),0);
    day.total={kcal:sum(eaten,'kcal'),protein:sum(eaten,'protein'),carbs:sum(eaten,'carbs'),fat:sum(eaten,'fat')};
    day.planned={kcal:sum(planned,'kcal'),protein:sum(planned,'protein'),unknownProtein:planned.some(row=>row.protein===null)};
  }
  return {goals,weighIns:weighIns.sort((a,b)=>b.date.localeCompare(a.date)),days:days.sort((a,b)=>b.date.localeCompare(a.date)),calorieGoal:number(goals['Daily calorie goal']),proteinGoal:number(goals['Daily protein goal'])};
}
const $=id=>document.getElementById(id);
const fmt=value=>value==null?'—':value.toLocaleString('en-US');
function element(tag,text,cls){const el=document.createElement(tag);if(text!=null)el.textContent=text;if(cls)el.className=cls;return el;}
function set(id,value){const el=$(id);if(el)el.textContent=value;}
function progress(id,value,goal){
  const track=$(id+'-track'),fill=$(id+'-fill');if(!track||!fill)return;
  if(!goal){track.hidden=true;return;}track.hidden=false;
  track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax',String(goal));track.setAttribute('aria-valuenow',String(Math.min(goal,value)));track.setAttribute('aria-valuetext',value+' of '+goal);track.classList.toggle('over',value>goal);fill.style.width=Math.min(100,Math.max(0,value/goal*100))+'%';
}
function displayDate(date){return new Intl.DateTimeFormat('en-PH',{dateStyle:'long',timeZone:'Asia/Manila'}).format(new Date(date+'T12:00:00+08:00'));}
function shortDate(date){return new Intl.DateTimeFormat('en-PH',{month:'short',day:'numeric',timeZone:'Asia/Manila'}).format(new Date(date+'T12:00:00+08:00'));}
function renderDay(model,day){
  const {total,planned}=day,cg=model.calorieGoal,pg=model.proteinGoal;
  const eaten=day.rows.filter(row=>row.status==='eaten');
  set('day-status',day.status==='CLOSED'?'Day complete':day.status);
  set('kcal',fmt(total.kcal));set('protein',fmt(total.protein)+' g');set('carbs',fmt(total.carbs)+' g');set('fat',fmt(total.fat)+' g');
  set('kcal-goal',cg?'of '+fmt(cg)+' kcal goal':'Goal not recorded');set('protein-goal',pg?'of '+pg+' g goal':'Goal not recorded');
  progress('kcal',total.kcal,cg);progress('protein',total.protein,pg);
  const delta=cg==null?null:cg-total.kcal;
  set('remaining',delta===null?'':delta===0?'At target (estimated)':fmt(Math.abs(delta))+' kcal '+(delta<0?'above':'below')+' target (estimated)');
  set('remaining-number',delta===null?'—':fmt(Math.abs(delta)));set('remaining-label',delta===null?'Goal not set':delta<0?'kcal over':'kcal remaining');
  $('ring-value')?.setAttribute('stroke-dasharray',Math.min(100,Math.max(0,cg?total.kcal/cg*100:0))+' 100');
  $('energy-ring')?.classList.toggle('over',delta!==null&&delta<0);
  const missing=eaten.some(row=>row.protein===null||row.carbs===null||row.fat===null);
  set('macro-note',missing?'Estimated macros exclude items with unknown values.':'Macros are estimated.');
  set('projection',planned.kcal?'Unconfirmed: '+fmt(planned.kcal)+' kcal. If consumed: '+fmt(total.kcal+planned.kcal)+' kcal total.':'');
  set('food-count',eaten.length+' logged '+(eaten.length===1?'item':'items'));
  const body=$('meals');body.replaceChildren();
  const legacyTable=body.closest('table').querySelectorAll('thead th').length===4;
  for(const item of day.rows){
    const tr=element('tr',null,item.status),name=element('td');
    name.append(element('span',item.name,'food-name'),element('small',item.portion));
    if(item.status!=='eaten'&&!legacyTable)name.append(element('small',item.status==='planned'?'Unconfirmed':'Not consumed','status-note'));
    const protein=element('td',item.protein==null?'—':fmt(item.protein)+' g','num'),calories=element('td',fmt(item.kcal),'num');
    if(legacyTable)tr.append(name,element('td',({eaten:'Logged',planned:'Unconfirmed',excluded:'Not consumed'})[item.status],'status '+item.status),calories,protein);
    else tr.append(name,protein,calories);
    body.append(tr);
  }
  if(!day.rows.length){const tr=element('tr'),td=element('td','No items recorded for this date.');td.colSpan=legacyTable?4:3;tr.append(td);body.append(tr);}
  $('notes').replaceChildren(...day.rows.filter(row=>row.note).map(row=>element('p',row.name+': '+row.note)));
  document.querySelectorAll('#history a').forEach(a=>{if(a.dataset.date===day.date)a.setAttribute('aria-current','date');else a.removeAttribute('aria-current');});
}
function drawWeightChart(weighIns){
  const host=$('weight-chart');if(!host)return;
  host.replaceChildren();host.hidden=weighIns.length<2;if(host.hidden)return;
  const rows=weighIns.slice(0,30).reverse(),vals=rows.map(r=>r.kg);
  const min=Math.floor((Math.min(...vals)-.2)*2)/2,max=Math.ceil((Math.max(...vals)+.2)*2)/2;
  const times=rows.map(r=>Date.parse(r.date)),start=times[0],end=times[times.length-1];
  const x=i=>12+((times[i]-start)/(end-start||1))*252,y=v=>12+(max-v)/(max-min||1)*92;
  const svgEl=(tag,attrs,text)=>{const node=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))node.setAttribute(k,String(v));if(text!=null)node.textContent=text;return node;};
  const svg=svgEl('svg',{viewBox:'0 0 300 132',role:'img','aria-label':'Weight trend from '+fmt(vals[0])+' to '+fmt(vals[vals.length-1])+' kilograms'});
  for(const v of [max,(max+min)/2,min]){svg.append(svgEl('line',{x1:12,x2:264,y1:y(v),y2:y(v),class:'chart-grid'}),svgEl('text',{x:270,y:y(v)+3,class:'chart-label'},fmt(v)));}
  svg.append(svgEl('polyline',{points:vals.map((v,i)=>x(i)+','+y(v)).join(' '),class:'chart-line'}));
  vals.forEach((v,i)=>svg.append(svgEl('circle',{cx:x(i),cy:y(v),r:3,class:'chart-dot'})));
  svg.append(svgEl('text',{x:12,y:126,class:'chart-label'},shortDate(rows[0].date)),svgEl('text',{x:264,y:126,'text-anchor':'end',class:'chart-label'},shortDate(rows[rows.length-1].date)));
  host.append(svg);
}
function renderHistory(model){
  const g=model.goals,latest=model.weighIns[0];
  set('weight',latest?fmt(latest.kg)+' kg':'Not recorded');set('weight-goal',g['Long-term goal']?'Goal: '+g['Long-term goal']:'No goal recorded');
  set('weight-note',latest?'Latest weigh-in: '+displayDate(latest.date):'No morning weigh-ins yet.');
  set('weight-baseline',!latest&&g['Current weight']?'Reported baseline: '+g['Current weight']:'');
  $('milestones').replaceChildren(...model.weighIns.slice(0,7).map(({date,kg})=>{const li=element('li');li.append(element('span',displayDate(date),'small muted'),element('strong',fmt(kg)+' kg'));return li;}));
  drawWeightChart(model.weighIns);
  $('history').replaceChildren(...model.days.slice(0,14).map(day=>{const row=element('div',null,'history-row'),a=element('a',displayDate(day.date));a.href='?day='+encodeURIComponent(day.date);a.dataset.date=day.date;const track=element('div',null,'track'),fill=element('span');fill.style.width=Math.min(100,(day.total.kcal/(model.calorieGoal||Math.max(1,day.total.kcal)))*100)+'%';track.append(fill);row.append(a,element('strong',fmt(day.total.kcal)),track);return row;}));
}
async function main(){
  const state=$('state'),retry=$('retry');
  const message=text=>{if($('state-message'))set('state-message',text);else if(state)state.textContent=text;};
  try{
    message('Loading the journal…');if(retry)retry.hidden=true;state.hidden=false;
    const response=await fetch('./FOOD_TRACKER.md',{cache:'no-store'});if(!response.ok)throw Error('Journal request failed: '+response.status);
    const model=parseJournal(await response.text());if(!model.days.length){message('No dated entries yet. Add a log to the source journal.');return;}
    const select=$('day');select.replaceChildren(...model.days.map(day=>{const option=element('option',displayDate(day.date));option.value=day.date;return option;}));select.disabled=false;
    const query=new URL(location.href).searchParams.get('day');
    select.value=model.days.some(day=>day.date===query)?query:model.days[0].date;
    const show=()=>{const index=model.days.findIndex(day=>day.date===select.value);if(index<0)return;renderDay(model,model.days[index]);if($('prev-day'))$('prev-day').disabled=index>=model.days.length-1;if($('next-day'))$('next-day').disabled=index===0;};
    const navigate=date=>{select.value=date;const url=new URL(location.href);url.searchParams.set('day',date);history.replaceState(null,'',url);show();};
    select.onchange=()=>navigate(select.value);
    if($('prev-day'))$('prev-day').onclick=()=>{const index=select.selectedIndex;if(index<model.days.length-1)navigate(model.days[index+1].date);};
    if($('next-day'))$('next-day').onclick=()=>{const index=select.selectedIndex;if(index>0)navigate(model.days[index-1].date);};
    renderHistory(model);$('history').onclick=event=>{const a=event.target.closest('a[data-date]');if(a){event.preventDefault();navigate(a.dataset.date);}};
    show();state.hidden=true;$('dashboard').hidden=false;
  }catch(error){message('Could not load the journal. Retry or open the source journal.');if(retry){retry.hidden=false;retry.onclick=main;}console.error(error);}
}
if(typeof document!=='undefined')main();
