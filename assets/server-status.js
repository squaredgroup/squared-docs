import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";

const client=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const $=s=>document.querySelector(s);
const services={};

function setState(name,state,label,latency="—"){
  services[name]=state;
  const row=document.querySelector('[data-service="'+name+'"]');
  if(row){
    const badge=row.querySelector('[data-state]');
    const latencyEl=row.querySelector('[data-latency]');
    if(badge){badge.className="server-badge "+state;badge.textContent=label}
    if(latencyEl)latencyEl.textContent=latency;
  }
  updateOverall();
}
function updateOverall(){
  const vals=Object.values(services);
  if(!vals.length)return;
  const bad=vals.filter(v=>v==="down").length;
  const warn=vals.filter(v=>v==="warn").length;
  const ok=vals.filter(v=>v==="ok").length;
  const badge=$("#serverOverallBadge");
  if(badge){
    badge.className="pill "+(!bad&&!warn?"live":"");
    badge.textContent=bad?bad+" service"+(bad>1?"s":"")+" indisponible"+(bad>1?"s":""):warn?ok+" opérationnels · "+warn+" partiel"+(warn>1?"s":""):ok+" services opérationnels";
  }
  $("#serverCheckedAt").textContent="Vérifié · "+new Intl.DateTimeFormat("fr-FR",{hour:"2-digit",minute:"2-digit",second:"2-digit"}).format(new Date());
  if($("#summaryFrontend"))$("#summaryFrontend").textContent=services.frontend==="ok"?"Accessible":"À vérifier";
  if($("#summaryDomain"))$("#summaryDomain").textContent=services.domain==="ok"?"HTTPS valide":"À vérifier";
  if($("#summarySupabase"))$("#summarySupabase").textContent=(services.auth==="ok"&&services.database==="ok")?"Auth & données disponibles":"Vérification partielle";
  if($("#summaryRealtime"))$("#summaryRealtime").textContent=services.realtime==="ok"?"Canal connecté":services.realtime==="warn"?"Connexion partielle":"À vérifier";
}
async function timed(fn,timeout=6000){
  const start=performance.now();
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeout);
  try{
    const result=await fn(controller.signal);
    return {ok:true,ms:Math.round(performance.now()-start),result};
  }catch(error){
    return {ok:false,ms:Math.round(performance.now()-start),error};
  }finally{clearTimeout(timer)}
}
async function checkAll(){
  document.querySelectorAll('[data-service]').forEach(row=>{
    const badge=row.querySelector('[data-state]');if(badge){badge.className="server-badge checking";badge.textContent="Vérification…"}
    const latency=row.querySelector('[data-latency]');if(latency)latency.textContent="—";
  });
  Object.keys(services).forEach(k=>delete services[k]);

  const front=await timed(signal=>fetch("index.html?health="+Date.now(),{cache:"no-store",signal}));
  setState("frontend",front.ok&&front.result.ok?"ok":"down",front.ok&&front.result.ok?"Opérationnel":"Indisponible",front.ms+" ms");

  const domainOk=location.protocol==="https:"&&location.hostname==="docs.squaredgroup.studio";
  setState("domain",domainOk?"ok":"warn",domainOk?"HTTPS actif":"Contexte différent",domainOk?"TLS":"Local / secours");

  const auth=await timed(signal=>fetch(SUPABASE_URL+"/auth/v1/health",{headers:{apikey:SUPABASE_PUBLISHABLE_KEY},cache:"no-store",signal}));
  setState("auth",auth.ok&&auth.result.ok?"ok":"down",auth.ok&&auth.result.ok?"Opérationnel":"Indisponible",auth.ms+" ms");

  const db=await timed(signal=>fetch(SUPABASE_URL+"/rest/v1/forum_categories?select=id&limit=1",{headers:{apikey:SUPABASE_PUBLISHABLE_KEY},cache:"no-store",signal}));
  setState("database",db.ok&&db.result.ok?"ok":"down",db.ok&&db.result.ok?"Opérationnel":"Indisponible",db.ms+" ms");
  setState("forum",db.ok&&db.result.ok?"ok":"down",db.ok&&db.result.ok?"Opérationnel":"Indisponible",db.ms+" ms");

  const supportState=db.ok&&db.result.ok?"ok":"down";
  setState("support",supportState,supportState==="ok"?"Backend disponible":"Backend indisponible",db.ms+" ms");

  const realtimeStart=performance.now();
  let realtimeDone=false;
  await new Promise(resolve=>{
    const ch=client.channel("server-status-"+Date.now());
    const timer=setTimeout(async()=>{if(!realtimeDone){realtimeDone=true;setState("realtime","warn","Temps réel non confirmé",Math.round(performance.now()-realtimeStart)+" ms");await client.removeChannel(ch);resolve()}},4500);
    ch.subscribe(async status=>{
      if(realtimeDone)return;
      if(status==="SUBSCRIBED"){
        realtimeDone=true;clearTimeout(timer);
        setState("realtime","ok","Opérationnel",Math.round(performance.now()-realtimeStart)+" ms");
        await client.removeChannel(ch);resolve();
      }else if(status==="CHANNEL_ERROR"||status==="TIMED_OUT"){
        realtimeDone=true;clearTimeout(timer);
        setState("realtime","warn","Connexion partielle",Math.round(performance.now()-realtimeStart)+" ms");
        await client.removeChannel(ch);resolve();
      }
    });
  });
}
$("#refreshServerStatus")?.addEventListener("click",checkAll);
checkAll();