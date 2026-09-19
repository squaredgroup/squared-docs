import {db,base,profile,currentUser,session} from './search-client.js';
import {rankDocuments,mergeResults,safeRoute} from './hc-state.js';
let indexPromise;
async function index(){if(!indexPromise)indexPromise=fetch(new URL('assets/knowledge-index.json',base)).then(r=>{if(!r.ok)throw new Error('Index indisponible');return r.json();}).then(x=>x.documents||[]).catch(()=>[]);return indexPromise;}
export async function search(query,limit=30){
 const q=String(query||'').trim().slice(0,200),cap=Math.max(1,Math.min(80,Number(limit)||30));if(q.length<2)return [];
 const local=rankDocuments(q,await index(),cap);let remote=[],degraded=false;
 try{const result=await db.rpc('search_help_center',{p_query:q,p_limit:cap});if(result.error)throw result.error;remote=result.data||[];}catch{degraded=true;}
 const rows=mergeResults(local,remote,cap).filter(x=>safeRoute(x.href,base.href));Object.defineProperty(rows,'degraded',{value:degraded});return rows;
}
export async function event(event_type,payload={}){
 let consent=false;try{consent=localStorage.getItem('sq-help-usage-consent')==='yes';}catch{}
 if(!consent||navigator.doNotTrack==='1')return;
 const privateContext=/support|account|login|password|profile|admin|moderation/.test(location.pathname);
 const query=privateContext?null:String(payload.query||'').slice(0,100);
 const safeQuery=query&&/@|eyJ[A-Za-z0-9_-]{20}|sb_[a-z_]+_|\d{6}/i.test(query)?null:query;
 const meta=payload.metadata||{};const {error}=await db.from('help_events').insert({user_id:null,event_type,path:location.pathname,query:safeQuery,target_href:String(payload.target_href||'').split('?')[0],metadata:{results:Number.isFinite(meta.results)?meta.results:undefined,source:meta.source,filter:meta.filter}});if(error)throw error;
}
window.SQSearchBackend={search,event,currentSession:session,currentProfile:profile,client:db};
window.dispatchEvent(new CustomEvent('sq:backend-ready'));
