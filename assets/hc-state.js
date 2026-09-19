export const labels = {operational:'Opérationnel',degraded:'Dégradé',partial_outage:'Incident partiel',major_outage:'Incident majeur',maintenance:'Maintenance',unknown:'Non confirmé',stale:'Mesure ancienne',development:'En développement',beta:'Bêta'};
export const normalise = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function safeRoute(value,base){
 try { if(typeof value !== 'string' || !value.trim() || /[\u0000-\u001f\\]/.test(value)) return null; const b=new URL(base); const u=new URL(value,b); if(u.origin!==b.origin || !['http:','https:'].includes(u.protocol) || !u.pathname.startsWith(b.pathname) || u.username || u.password)return null; return u.href; } catch{return null;}
}
export function componentState(c,now=Date.now()){
 if(c.lifecycle==='development')return 'development';
 if(c.lifecycle==='beta' && (!c.last_checked_at || c.monitor_type==='manual'))return 'beta';
 if(!c.last_checked_at)return 'unknown';
 const age=now-new Date(c.last_checked_at).getTime();
 if(!Number.isFinite(age)||age< -60000)return 'unknown';
 if(age>15*60*1000)return 'stale';
 return Object.hasOwn(labels,c.current_status)?c.current_status:'unknown';
}
export function aggregateState(components,now=Date.now()){
 const live=components.filter(c=>c.enabled!==false && c.aggregate_status!==false && c.lifecycle!=='development');
 if(!live.length)return 'unknown';
 const states=live.map(c=>componentState(c,now));
 for(const s of ['major_outage','partial_outage','stale','unknown','maintenance','degraded','beta'])if(states.includes(s))return s;
 return 'operational';
}
export function sampleRatio(success,total){ return Number(total)>0?Math.round(Number(success)/Number(total)*10000)/100:null; }
export function rankDocuments(query,items,limit=30){
 const terms=normalise(query).trim().split(/\s+/).filter(Boolean).slice(0,12);if(!terms.length)return [];
 return items.map(d=>{const title=normalise(d.title),description=normalise(d.description),body=normalise(d.text||d.body_excerpt||'');let hits=0,score=0;for(const t of terms){if(title.includes(t)){hits++;score+=8;}else if(description.includes(t)){hits++;score+=3;}else if(body.includes(t)){hits++;score++;}}return {...d,kind:'knowledge',score:score+hits/terms.length};}).filter(d=>d.score>0 && terms.every(t=>normalise(d.title+' '+d.description+' '+(d.text||d.body_excerpt||'')).includes(t))).sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title,'fr')).slice(0,limit);
}
export function mergeResults(local,remote,limit=30){const map=new Map();for(const r of [...local,...remote]){const previous=map.get(r.href);if(!previous||Number(r.score)>Number(previous.score))map.set(r.href,r);}return [...map.values()].sort((a,b)=>Number(b.score)-Number(a.score)).slice(0,limit);}
export function markdown(text,base){
 const esc=escapeHTML;const inline=s=>esc(s).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
 const lines=String(text||'').slice(0,100000).split(/\r?\n/);let out='',list='',code=false,buffer=[];
 const closeList=()=>{if(list){out+='</'+list+'>';list='';}};
 for(const line of lines){if(/^```/.test(line)){closeList();if(code){out+='<pre><code>'+esc(buffer.join('\n'))+'</code></pre>';buffer=[];}code=!code;continue;}if(code){buffer.push(line);continue;}const heading=line.match(/^(#{1,4})\s+(.+)/);if(heading){closeList();const n=Math.min(heading[1].length+1,4);out+='<h'+n+'>'+inline(heading[2])+'</h'+n+'>';continue;}const item=line.match(/^\s*(?:[-*]|\d+\.)\s+(.+)/);if(item){const type=/^\s*\d/.test(line)?'ol':'ul';if(list!==type){closeList();list=type;out+='<'+list+'>';}out+='<li>'+inline(item[1])+'</li>';continue;}closeList();if(line.trim())out+='<p>'+inline(line)+'</p>';}
 closeList();if(code)out+='<pre><code>'+esc(buffer.join('\n'))+'</code></pre>';return out;
}
