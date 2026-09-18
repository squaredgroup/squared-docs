import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";

const db=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const $=s=>document.querySelector(s);
const services={};

const MAP={
  "squared-site":"squared-group",
  "site-services":"sg-services",
  "site-projects":"sg-projects",
  "site-products":"sg-products",
  "site-contact":"sg-contact",
  "site-resources":"sg-resources",
  "site-agency":"sg-agency",
  "site-build":"sg-build",
  "site-pricing":"sg-pricing",
  "site-about":"sg-about",
  "site-faq":"sg-faq",
  "site-start-project":"sg-start-project",
  "site-solutions":"sg-solutions",
  "site-process":"sg-process",
  "site-team":"sg-team",
  "site-clients":"sg-clients",
  "site-partners":"sg-partners",
  "site-roadmap":"sg-roadmap",
  "site-jobs":"sg-jobs",
  "site-press":"sg-press",
  "site-newsletter":"sg-newsletter",
  "site-book":"sg-book",
  "site-security":"sg-security",
  "site-accessibility":"sg-accessibility",
  "site-testimonials":"sg-testimonials",
  "workspace-app":"workspace-app",
  "workspace-landing":"workspace-public",
  "frontend":"help-center",
  "domain":"help-domain",
  "forum":"help-forum",
  "support":"help-support",
  "auth":"help-auth",
  "database":"help-database",
  "realtime":"help-realtime"
};

const GROUPS={
  "squared-group":["squared-site","site-services","site-projects","site-products","site-contact","site-resources","site-agency","site-build","site-pricing","site-about","site-faq","site-start-project","site-solutions","site-process","site-team","site-clients","site-partners","site-roadmap","site-jobs","site-press","site-newsletter","site-book","site-security","site-accessibility","site-testimonials"],
  workspace:["workspace-app","workspace-landing"],
  "help-center":["frontend","domain","forum","support"],
  backend:["auth","database","realtime"]
};

const EXTRA=[
  ["site-pricing","Tarifs & prestations","/pricing"],
  ["site-about","À propos","/about"],
  ["site-faq","FAQ","/faqs"],
  ["site-start-project","Démarrer un projet","/start-a-project"],
  ["site-solutions","Solutions","/solutions"],
  ["site-process","Notre méthode","/process"],
  ["site-team","Équipe","/team-members"],
  ["site-clients","Clients","/clients"],
  ["site-partners","Partenaires","/partners"],
  ["site-roadmap","Roadmap","/roadmap-items"],
  ["site-jobs","Carrières","/jobs"],
  ["site-press","Presse & médias","/press-items"],
  ["site-newsletter","Newsletter","/newsletter"],
  ["site-book","Réserver un appel","/book"],
  ["site-security","Sécurité","/security"],
  ["site-accessibility","Accessibilité","/accessibility"],
  ["site-testimonials","Témoignages clients","/testimonials"]
];

const stateClass=s=>s==="operational"?"ok":s==="degraded"||s==="maintenance"?"warn":s==="unknown"?"checking":"down";
const stateLabel=s=>({operational:"Opérationnel",degraded:"Dégradé",partial_outage:"Incident partiel",major_outage:"Incident majeur",maintenance:"Maintenance",unknown:"Inconnu"}[s]||"Inconnu");

function renderExtras(){
  const host=$("#serverExtraModules");if(!host)return;
  host.innerHTML=EXTRA.map(([key,label,path])=>'<div class="server-row" data-service="'+key+'"><div><strong>'+label+'</strong><p>Module public Squared Group.</p></div><span class="server-badge checking" data-state>Chargement…</span><span class="server-meta" data-latency>—</span><span class="server-meta">'+path+'</span></div>').join("");
  $("#serverExtraCount").textContent=EXTRA.length+" modules";
}

function worst(keys){
  const states=keys.map(k=>services[k]?.current_status).filter(Boolean);
  if(!states.length)return "unknown";
  if(states.some(s=>s==="major_outage"))return "major_outage";
  if(states.some(s=>s==="partial_outage"))return "partial_outage";
  if(states.some(s=>s==="degraded"))return "degraded";
  if(states.some(s=>s==="maintenance"))return "maintenance";
  if(states.every(s=>s==="operational"))return "operational";
  return "unknown";
}

function renderGroups(){
  Object.entries(GROUPS).forEach(([group,keys])=>{
    const s=worst(keys),el=document.querySelector('[data-group-state="'+group+'"]');
    if(el){el.className="server-badge "+stateClass(s);el.textContent=stateLabel(s)}
  });
  const summary=(id,group,okText)=>{
    const el=$(id);if(!el)return;
    const s=worst(GROUPS[group]);el.textContent=s==="operational"?okText:stateLabel(s);
  };
  summary("#summarySquaredGroup","squared-group","Site & modules opérationnels");
  summary("#summaryWorkspace","workspace","App & portail opérationnels");
  summary("#summaryHelpCenter","help-center","Docs, forum & support opérationnels");
  summary("#summaryBackend","backend","Backend opérationnel");
}

async function load(){
  renderExtras();
  const [{data:components,error},{data:uptime},{data:incidents}]=await Promise.all([
    db.from("service_components").select("*").eq("enabled",true).order("sort_order"),
    db.rpc("component_uptime",{p_days:30}),
    db.from("incidents").select("*").neq("status","resolved").order("started_at",{ascending:false})
  ]);
  if(error)throw error;

  const bySlug={};(components||[]).forEach(x=>bySlug[x.slug]=x);
  const up={};(uptime||[]).forEach(x=>up[x.component_id]=x);

  Object.entries(MAP).forEach(([key,slug])=>{
    const row=document.querySelector('[data-service="'+key+'"]'),comp=bySlug[slug];
    if(!row||!comp)return;
    services[key]=comp;
    const state=row.querySelector("[data-state]"),lat=row.querySelector("[data-latency]");
    if(state){state.className="server-badge "+stateClass(comp.current_status);state.textContent=stateLabel(comp.current_status)}
    const u=up[comp.id];
    if(lat)lat.textContent=(comp.response_ms!=null?comp.response_ms+" ms":"—")+(u?.uptime_percent!=null?" · "+Number(u.uptime_percent).toFixed(2)+"%":"");
  });
  renderGroups();

  const checked=(components||[]).map(x=>x.last_checked_at).filter(Boolean).sort().at(-1);
  $("#serverCheckedAt").textContent=checked?"Dernier check · "+new Intl.DateTimeFormat("fr-FR",{dateStyle:"short",timeStyle:"medium"}).format(new Date(checked)):"Aucun check";
  const allStates=Object.values(services).map(x=>x.current_status);
  const bad=allStates.filter(x=>["major_outage","partial_outage"].includes(x)).length,warn=allStates.filter(x=>x==="degraded").length;
  $("#serverOverallBadge").className="pill "+(!bad&&!warn?"live":"");
  $("#serverOverallBadge").textContent=bad?bad+" incident"+(bad>1?"s":""):warn?warn+" service"+(warn>1?"s":"")+" dégradé"+(warn>1?"s":""):"Tous les services opérationnels";

  if((incidents||[]).length){
    const banner=document.createElement("div");banner.className="banner server-active-incident";
    banner.innerHTML='<div><h3>'+incidents.length+' incident'+(incidents.length>1?"s":"")+' actif'+(incidents.length>1?"s":"")+'</h3><p>'+incidents.map(i=>i.title).join(" · ")+'</p></div><div class="banner-actions"><a class="btn" href="incidents.html">Voir les incidents</a></div>';
    document.querySelector(".server-summary")?.before(banner);
  }
}

$("#refreshServerStatus")?.addEventListener("click",async()=>{
  const btn=$("#refreshServerStatus");btn.disabled=true;btn.textContent="Vérification…";
  try{
    await fetch(SUPABASE_URL+"/functions/v1/status-monitor-v2",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
    await new Promise(r=>setTimeout(r,1200));
    location.reload();
  }catch{
    btn.disabled=false;btn.textContent="Relancer les vérifications";
  }
});

load().catch(err=>{
  $("#serverOverallBadge").textContent="Statut indisponible";
  console.error(err);
});
