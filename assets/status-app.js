import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";
const db=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const $=(s,c=document)=>c.querySelector(s), $$=(s,c=document)=>[...c.querySelectorAll(s)];
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const fmt=d=>d?new Intl.DateTimeFormat("fr-FR",{dateStyle:"medium",timeStyle:"short"}).format(new Date(d)):"—";
const statusClass=s=>s==="operational"?"ok":s==="degraded"||s==="maintenance"?"warn":s==="unknown"?"checking":"down";
const statusLabel=s=>({operational:"Opérationnel",degraded:"Dégradé",partial_outage:"Incident partiel",major_outage:"Incident majeur",maintenance:"Maintenance",unknown:"Inconnu"}[s]||s);
const empty=(t,b)=>'<div class="forum-empty"><strong>'+esc(t)+'</strong>'+esc(b)+'</div>';

async function overview(){
  const [{data:components},{data:uptime},{data:incidents},{data:maintenance}]=await Promise.all([
    db.from("service_components").select("*").eq("enabled",true).eq("public",true).order("sort_order"),
    db.rpc("component_uptime",{p_days:30}),
    db.from("incidents").select("*,incident_components(component_id)").neq("status","resolved").order("started_at",{ascending:false}),
    db.from("maintenance_windows").select("*").in("status",["scheduled","in_progress"]).order("starts_at")
  ]);
  const up={};(uptime||[]).forEach(x=>up[x.component_id]=x);
  const groups={};(components||[]).forEach(c=>(groups[c.product]??=[]).push(c));
  const host=$("#statusOverview");
  host.innerHTML='<div class="status-product-grid">'+Object.entries(groups).map(([product,items])=>{
    const worst=items.some(x=>["major_outage","partial_outage"].includes(x.current_status))?"major_outage":items.some(x=>x.current_status==="degraded")?"degraded":items.every(x=>x.current_status==="operational")?"operational":"unknown";
    const averages=items.map(x=>up[x.id]?.uptime_percent).filter(x=>x!=null).map(Number);
    const pct=averages.length?(averages.reduce((a,b)=>a+b,0)/averages.length).toFixed(2):"—";
    return '<a class="status-product-card" href="server-status.html#'+esc(product.toLowerCase().replace(/\s+/g,"-"))+'"><div class="home-status-head"><strong>'+esc(product)+'</strong><span class="server-badge '+statusClass(worst)+'">'+statusLabel(worst)+'</span></div><div class="status-product-meta"><span>'+items.length+' composants</span><span>'+pct+'% uptime · 30j</span></div></a>';
  }).join("")+'</div>';

  $("#activeIncidents").innerHTML=(incidents||[]).length?(incidents||[]).map(i=>incidentRow(i)).join(""):empty("Aucun incident actif","Tous les services fonctionnent normalement selon les données disponibles.");
  $("#upcomingMaintenance").innerHTML=(maintenance||[]).length?(maintenance||[]).map(m=>maintenanceRow(m)).join(""):empty("Aucune maintenance planifiée","Aucune intervention n’est actuellement programmée.");
  await subscriptionsUI(components||[]);
}


async function subscriptionsUI(components){
  const host=$("#statusSubscriptions");if(!host)return;
  const {data:{session}}=await db.auth.getSession();
  if(!session){
    host.innerHTML='<div class="forum-auth-card"><strong>Connectez-vous pour suivre les incidents</strong><p>Choisissez les produits à surveiller et recevez les alertes dans le Help Center.</p><a class="btn green" href="login.html?next=status.html">Se connecter</a></div>';
    return;
  }

  const [{data:subs},{data:prefs}]=await Promise.all([
    db.from("status_subscriptions").select("component_id").eq("user_id",session.user.id),
    db.from("notification_preferences").select("*").eq("user_id",session.user.id).maybeSingle()
  ]);
  const selected=new Set((subs||[]).map(x=>x.component_id));
  const groups={};components.forEach(c=>(groups[c.product]??=[]).push(c));
  const allIncidentPref=prefs?.status_incidents===true;

  host.innerHTML='<div class="status-subscription-grid">'+Object.entries(groups).map(([product,items])=>{
    const ids=items.map(x=>x.id),all=ids.length&&ids.every(id=>selected.has(id));
    return '<button class="status-subscription-card'+(all?' active':'')+'" data-sub-product="'+esc(product)+'"><span><strong>'+esc(product)+'</strong><small>'+items.length+' composants</small></span><span class="sq-switch '+(all?'on':'')+'"></span></button>';
  }).join("")+'</div><div class="form-help" style="margin-top:9px">Les notifications incident doivent également être activées dans vos <a href="notification-settings.html">préférences de notifications</a>.</div>';

  $("[data-sub-product]",host).forEach(btn=>btn.addEventListener("click",async()=>{
    const product=btn.dataset.subProduct,items=groups[product]||[],ids=items.map(x=>x.id);
    const enabled=ids.length&&ids.every(id=>selected.has(id));
    if(enabled){
      await db.from("status_subscriptions").delete().eq("user_id",session.user.id).in("component_id",ids);
      ids.forEach(id=>selected.delete(id));
    }else{
      const missing=ids.filter(id=>!selected.has(id));
      if(missing.length)await db.from("status_subscriptions").upsert(missing.map(component_id=>({user_id:session.user.id,component_id})));
      missing.forEach(id=>selected.add(id));
      if(!allIncidentPref)await db.from("notification_preferences").upsert({user_id:session.user.id,status_incidents:true});
    }
    btn.classList.toggle("active",!enabled);
    btn.querySelector(".sq-switch")?.classList.toggle("on",!enabled);
  }));
}

function incidentRow(i){
  return '<a class="incident-row" href="incident.html?id='+i.id+'"><span class="incident-dot '+esc(i.severity)+'"></span><span><strong>'+esc(i.title)+'</strong><small>'+esc(i.summary||"")+'</small><em>'+fmt(i.started_at)+'</em></span><span class="badge">'+esc(i.status)+'</span></a>';
}
function maintenanceRow(m){
  return '<div class="incident-row"><span class="incident-dot maintenance"></span><span><strong>'+esc(m.title)+'</strong><small>'+esc(m.description||"")+'</small><em>'+fmt(m.starts_at)+' → '+fmt(m.ends_at)+'</em></span><span class="badge">'+esc(m.status)+'</span></div>';
}

async function incidentsPage(){
  const {data}=await db.from("incidents").select("*").order("started_at",{ascending:false}).limit(100);
  let filter="all";
  const render=()=>{const rows=(data||[]).filter(i=>filter==="all"||(filter==="active"&&i.status!=="resolved")||(filter==="resolved"&&i.status==="resolved"));$("#incidentArchive").innerHTML=rows.length?'<div class="incident-list">'+rows.map(incidentRow).join("")+'</div>':empty("Aucun incident","Aucun incident dans ce filtre.");};
  $$("[data-incident-filter]").forEach(b=>b.addEventListener("click",()=>{$$("[data-incident-filter]").forEach(x=>x.classList.remove("active"));b.classList.add("active");filter=b.dataset.incidentFilter;render()}));render();
}

async function incidentPage(){
  const id=new URLSearchParams(location.search).get("id");if(!id){$("#incidentDetail").innerHTML=empty("Incident introuvable","Identifiant manquant.");return}
  const [{data:i},{data:updates},{data:links}]=await Promise.all([
    db.from("incidents").select("*").eq("id",id).maybeSingle(),
    db.from("incident_updates").select("*,author:profiles!incident_updates_author_id_fkey(display_name)").eq("incident_id",id).order("created_at",{ascending:false}),
    db.from("incident_components").select("component:service_components!incident_components_component_id_fkey(name,product)").eq("incident_id",id)
  ]);
  if(!i){$("#incidentDetail").innerHTML=empty("Incident introuvable","Cet incident n’existe pas.");return}
  $("#incidentDetail").innerHTML='<section class="forum-hero"><div class="eyebrow">Incident · '+esc(i.severity)+'</div><h1>'+esc(i.title)+'</h1><p>'+esc(i.summary||"")+'</p><div class="article-meta"><span class="pill '+(i.status==="resolved"?"live":"")+'">'+esc(i.status)+'</span><span class="pill">'+fmt(i.started_at)+'</span></div></section><section class="section"><div class="section-head"><div><h2>Composants affectés</h2></div></div><div class="incident-components">'+((links||[]).length?links.map(x=>'<span class="pill">'+esc(x.component?.product+" · "+x.component?.name)+'</span>').join(""):'<span class="pill">Non spécifié</span>')+'</div></section><section class="section"><div class="section-head"><div><h2>Chronologie</h2></div></div><div class="incident-timeline">'+((updates||[]).length?updates.map(u=>'<article><span class="incident-dot '+(u.status==="resolved"?"maintenance":"minor")+'"></span><div><strong>'+esc(u.status)+'</strong><p>'+esc(u.message)+'</p><small>'+fmt(u.created_at)+(u.author?.display_name?" · "+esc(u.author.display_name):"")+'</small></div></article>').join(""):empty("Aucune mise à jour","Aucune note publiée."))+'</div></section>';
}

async function maintenancePage(){
  const {data}=await db.from("maintenance_windows").select("*").order("starts_at",{ascending:false}).limit(100);
  const now=Date.now(),upcoming=(data||[]).filter(x=>new Date(x.ends_at).getTime()>=now&&x.status!=="cancelled"),past=(data||[]).filter(x=>new Date(x.ends_at).getTime()<now||x.status==="completed");
  $("#maintenanceArchive").innerHTML='<section class="section"><div class="section-head"><div><h2>À venir</h2></div></div><div class="incident-list">'+(upcoming.length?upcoming.map(maintenanceRow).join(""):empty("Aucune maintenance","Rien de prévu."))+'</div></section><section class="section"><div class="section-head"><div><h2>Historique</h2></div></div><div class="incident-list">'+(past.length?past.map(maintenanceRow).join(""):empty("Aucun historique","Aucune maintenance passée."))+'</div></section>';
}

const page=document.body.dataset.statusPage;
if(page==="overview")overview();
else if(page==="incidents")incidentsPage();
else if(page==="incident")incidentPage();
else if(page==="maintenance")maintenancePage();

window.SQSearchBackend?.event("status_view",{metadata:{page}}).catch(()=>{});
