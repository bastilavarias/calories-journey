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
function set(id,value){$(id).textContent=value;}
function progress(id,value,goal){
  const track=$(id+'-track'),fill=$(id+'-fill');
  if(!goal){track.hidden=true;return;} track.hidden=false;track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax',String(goal));track.setAttribute('aria-valuenow',String(Math.min(goal,value)));track.setAttribute('aria-valuetext',value+' of '+goal);track.classList.toggle('over',value>goal);fill.style.width=Math.min(100,Math.max(0,value/goal*100))+'%';
}
function displayDate(date){return new Intl.DateTimeFormat('en-PH',{dateStyle:'long',timeZone:'Asia/Manila'}).format(new Date(date+'T12:00:00+08:00'));}
function renderDay(model,day){
  const {total,planned}=day, cg=model.calorieGoal, pg=model.proteinGoal;
  set('day-status',day.status);
  set('kcal',fmt(total.kcal));set('protein',fmt(total.protein)+' g');set('carbs',fmt(total.carbs)+' g');set('fat',fmt(total.fat)+' g');
  set('kcal-goal',cg?'of '+fmt(cg)+' kcal goal':'Goal not recorded');set('protein-goal',pg?'of '+pg+' g goal':'Goal not recorded');
  progress('kcal',total.kcal,cg);progress('protein',total.protein,pg);
  set('remaining',cg?fmt(Math.abs(cg-total.kcal))+' kcal '+(total.kcal>cg?'above':'below')+' target (estimated)':'');
  set('projection',planned.kcal?'Unconfirmed: '+fmt(planned.kcal)+' kcal. If consumed: '+fmt(total.kcal+planned.kcal)+' kcal total.':'No planned items recorded.');
  const body=$('meals');body.replaceChildren();
  for(const item of day.rows){
    const tr=element('tr'),name=element('td',item.name);name.append(element('small',item.portion));tr.append(name,element('td',({eaten:'Logged',planned:'Unconfirmed',excluded:'Not consumed'})[item.status],'status '+item.status),element('td',fmt(item.kcal),'num'),element('td',item.protein==null?'—':fmt(item.protein)+' g','num'));body.append(tr);
  }
  if(!day.rows.length){const tr=element('tr'),td=element('td','No items recorded for this date.');td.colSpan=4;tr.append(td);body.append(tr);}
  $('notes').replaceChildren(...day.rows.filter(row=>row.note).map(row=>element('p',row.name+': '+row.note)));
}
function renderHistory(model){
  const g=model.goals;
  const latest=model.weighIns[0];
  set('weight',latest?fmt(latest.kg)+' kg':'Not recorded');set('weight-goal',g['Long-term goal']?'Goal: '+g['Long-term goal']:'No goal recorded');
  set('weight-note',latest?'Latest morning weigh-in: '+displayDate(latest.date):'No morning weigh-ins recorded yet.');
  const readings=model.weighIns.map(({date,kg})=>{const li=element('li');li.append(element('span',displayDate(date),'small muted'),element('strong',fmt(kg)+' kg'));return li;});
  $('milestones').replaceChildren(...readings);
  $('history').replaceChildren(...model.days.map(day=>{const row=element('div',null,'history-row'),a=element('a',displayDate(day.date));a.href='?day='+encodeURIComponent(day.date);const track=element('div',null,'track'),fill=element('span');fill.style.width=Math.min(100,(day.total.kcal/(model.calorieGoal||Math.max(1,day.total.kcal)))*100)+'%';track.append(fill);row.append(a,track,element('strong',fmt(day.total.kcal)+' kcal'));return row;}));
}
async function main(){
  try{
    const response=await fetch('./FOOD_TRACKER.md',{cache:'no-cache'});if(!response.ok)throw Error('Journal request failed');
    const model=parseJournal(await response.text());if(!model.days.length){set('state','No dated entries yet. Add a log to FOOD_TRACKER.md.');return;}
    const select=$('day');select.replaceChildren(...model.days.map(day=>{const option=element('option',displayDate(day.date));option.value=day.date;return option;}));select.disabled=false;
    const query=new URL(location.href).searchParams.get('day');
    select.value=model.days.some(day=>day.date===query)?query:model.days[0].date;
    const show=()=>{const day=model.days.find(day=>day.date===select.value);renderDay(model,day);};
    select.addEventListener('change',()=>{const url=new URL(location.href);url.searchParams.set('day',select.value);history.replaceState(null,'',url);show();});
    renderHistory(model);show();$('state').hidden=true;$('dashboard').hidden=false;
  }catch(error){set('state','Could not load the journal. Open the source journal or reload the page.');console.error(error);}
}
if(typeof document!=='undefined')main();
