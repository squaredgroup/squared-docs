import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";

const client=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const $=s=>document.querySelector(s);
const services={};

const GROUPS={
  "squared-group":["squared-site","site-services","site-projects","site-products","site-contact","site-resources","site-agency","site-build"],
  "workspace":["workspace-app","workspace-landing"],
  "help-center":["frontend","domain","forum","support"],
  "backend":["auth","database","realtime"]
};

function setState(name,state,label,latency="—"){
  services[name]=state;
  const row=document.querySelector('[data-service="'+name+'"]');
  if(row){
    const badge=row.querySelector('[data-state]');
    const latencyEl=row.querySelector('[data-latency]');
    if(badge){badge.className="server-badge "+state;badge.textContent=label}
    if(latencyEl)latencyEl.textContent=latency;
  }
  updateGroups();
  updateOverall();
}

function groupState(names){
  const vals=names.map(n=>services[n]).filter(Boolean);
  if(!vals.length)return "checking";
  if(vals.some(v=>v==="down"))return "down";
  if(vals.some(v=>v==="warn")||vals.length<names.length)return "warn";
  return "ok";
}

function updateGroups(){
  Object.entries(GROUPS).forEach(([key,names])=>{
    const state=groupState(names);
    const badge=document.querySelector('[data-group-state="'+key+'"]');
    if(!badge)return;
    badge.className="server-badge "+state;
    badge.textContent=state==="ok"?"Opérationnel":state==="warn"?"Partiel":state==="down"?"Incident":"Vérification…";
  });
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

  const groupLabel=(key,okText)=>{
    const state=groupState(GROUPS[key]);
    return state==="ok"?okText:state==="warn"?"Partiellement disponible":state==="down"?"Incident détecté":"Vérification…";
  };
  $("#summarySquaredGroup").textContent=groupLabel("squared-group","Site & modules accessibles");
  $("#summaryWorkspace").textContent=groupLabel("workspace","App & page publique accessibles");
  $("#summaryHelpCenter").textContent=groupLabel("help-center","Documentation & support accessibles");
  $("#summaryBackend").textContent=groupLabel("backend","Services backend disponibles");
}

async function timed(fn,timeout=7000){
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

async function probeExternal(name,url){
  const result=await timed(signal=>fetch(url+"?sq-status="+Date.now(),{mode:"no-cors",cache:"no-store",signal}));
  setState(name,result.ok?"ok":"down",result.ok?"Accessible":"Indisponible",result.ms+" ms");
  return result;
}

async function checkAll(){
  document.querySelectorAll('[data-service]').forEach(row=>{
    const badge=row.querySelector('[data-state]');
    const latency=row.querySelector('[data-latency]');
    if(badge){badge.className="server-badge checking";badge.textContent="Vérification…"}
    if(latency)latency.textContent="—";
  });
  document.querySelectorAll('[data-group-state]').forEach(b=>{b.className="server-badge checking";b.textContent="Vérification…"});
  Object.keys(services).forEach(k=>delete services[k]);

  // Squared Group — actual Wix public routes.
  await Promise.all([
    probeExternal("squared-site","https://www.squaredgroup.studio/"),
    probeExternal("site-services","https://www.squaredgroup.studio/services"),
    probeExternal("site-projects","https://www.squaredgroup.studio/projects"),
    probeExternal("site-products","https://www.squaredgroup.studio/products"),
    probeExternal("site-contact","https://www.squaredgroup.studio/contact"),
    probeExternal("site-resources","https://www.squaredgroup.studio/resources"),
    probeExternal("site-agency","https://www.squaredgroup.studio/agency"),
    probeExternal("site-build","https://www.squaredgroup.studio/squared-build")
  ]);

  // Squared Workspace — app + public landing page.
  await Promise.all([
    probeExternal("workspace-app","https://workspace.squaredgroup.studio/"),
    probeExternal("workspace-landing","https://www.squaredgroup.studio/workspace")
  ]);

  // Help Center frontend and domain.
  const front=await timed(signal=>fetch("index.html?health="+Date.now(),{cache:"no-store",signal}));
  setState("frontend",front.ok&&front.result.ok?"ok":"down",front.ok&&front.result.ok?"Opérationnel":"Indisponible",front.ms+" ms");

  const domainOk=location.protocol==="https:"&&location.hostname==="docs.squaredgroup.studio";
  setState("domain",domainOk?"ok":"warn",domainOk?"HTTPS actif":"Contexte différent",domainOk?"TLS":"Local / secours");

  // Supabase backend.
  const auth=await timed(signal=>fetch(SUPABASE_URL+"/auth/v1/health",{headers:{apikey:SUPABASE_PUBLISHABLE_KEY},cache:"no-store",signal}));
  setState("auth",auth.ok&&auth.result.ok?"ok":"down",auth.ok&&auth.result.ok?"Opérationnel":"Indisponible",auth.ms+" ms");

  const db=await timed(signal=>fetch(SUPABASE_URL+"/rest/v1/forum_categories?select=id&limit=1",{headers:{apikey:SUPABASE_PUBLISHABLE_KEY},cache:"no-store",signal}));
  setState("database",db.ok&&db.result.ok?"ok":"down",db.ok&&db.result.ok?"Opérationnel":"Indisponible",db.ms+" ms");
  setState("forum",db.ok&&db.result.ok?"ok":"down",db.ok&&db.result.ok?"Opérationnel":"Indisponible",db.ms+" ms");
  setState("support",db.ok&&db.result.ok?"ok":"down",db.ok&&db.result.ok?"Backend disponible":"Backend indisponible",db.ms+" ms");

  const realtimeStart=performance.now();
  let realtimeDone=false;
  await new Promise(resolve=>{
    const ch=client.channel("server-status-"+Date.now());
    const timer=setTimeout(async()=>{
      if(!realtimeDone){
        realtimeDone=true;
        setState("realtime","warn","Temps réel non confirmé",Math.round(performance.now()-realtimeStart)+" ms");
        await client.removeChannel(ch);resolve();
      }
    },4500);
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