import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";

const db=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const $=(s,c=document)=>c.querySelector(s), $$=(s,c=document)=>[...c.querySelectorAll(s)];
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const fmt=d=>d?new Intl.DateTimeFormat("fr-FR",{dateStyle:"medium",timeStyle:"short"}).format(new Date(d)):"—";
const metric=(value,label,detail="")=>'<div class="admin-metric"><strong>'+esc(value)+'</strong><span>'+esc(label)+'</span>'+(detail?'<em>'+esc(detail)+'</em>':'')+'</div>';
const empty=(title,body)=>'<div class="forum-empty"><strong>'+esc(title)+'</strong>'+esc(body)+'</div>';

let me=null,components=[];

async function gate(){
  const {data:{session}}=await db.auth.getSession();
  if(!session){location.href="login.html?next=admin.html";return false}
  const {data}=await db.from("profiles").select("*").eq("id",session.user.id).maybeSingle();
  me=data;
  if(!me||!["admin","moderator"].includes(me.role)){
    $("#adminGate").innerHTML=empty("Accès refusé","Cette console est réservée à l’équipe Squared.");
    return false;
  }
  $("#adminGate").hidden=true;$("#adminApp").hidden=false;return true;
}

function setupTabs(){
  $$("[data-admin-tab]").forEach(b=>b.addEventListener("click",()=>{
    $$("[data-admin-tab]").forEach(x=>x.classList.remove("active"));
    $$("[data-admin-panel]").forEach(x=>x.classList.remove("active"));
    b.classList.add("active");
    $('[data-admin-panel="'+b.dataset.adminTab+'"]').classList.add("active");
  }));
}

async function counts(table,filter){
  let q=db.from(table).select("*",{count:"exact",head:true});
  if(filter)q=filter(q);
  const {count}=await q;return count||0;
}

async function loadOverview(){
  const [docs,topics,tickets,reports,incidents,feedback]=await Promise.all([
    counts("knowledge_documents",q=>q.eq("status","published")),
    counts("forum_topics",q=>q.is("deleted_at",null)),
    counts("support_tickets",q=>q.not("status","in","(resolved,closed)")),
    counts("forum_reports",q=>q.eq("status","open")),
    counts("incidents",q=>q.neq("status","resolved")),
    counts("doc_feedback",q=>q.eq("helpful",false))
  ]);
  $("#adminMetrics").innerHTML=[
    metric(docs,"Articles publiés"),
    metric(topics,"Discussions"),
    metric(tickets,"Tickets actifs"),
    metric(incidents,"Incidents actifs"),
    metric(reports,"Signalements"),
    metric(feedback,"Feedbacks négatifs")
  ].join("");

  const alerts=[];
  if(tickets)alerts.push(["Tickets actifs",tickets+" demande(s) à suivre","support"]);
  if(reports)alerts.push(["Signalements",reports+" signalement(s) ouvert(s)","community"]);
  if(incidents)alerts.push(["Incidents",incidents+" incident(s) en cours","status"]);
  if(feedback)alerts.push(["Knowledge",feedback+" retour(s) négatif(s)","knowledge"]);
  $("#adminAttention").innerHTML=alerts.length?alerts.map(x=>'<button class="admin-attention-row" data-jump="'+x[2]+'"><span><strong>'+esc(x[0])+'</strong><small>'+esc(x[1])+'</small></span><span>→</span></button>').join(""):empty("Tout est calme","Aucun élément prioritaire.");

  $$("[data-jump]").forEach(b=>b.addEventListener("click",()=>document.querySelector('[data-admin-tab="'+b.dataset.jump+'"]')?.click()));

  const {data:status}=await db.from("service_components").select("product,current_status").eq("enabled",true);
  const groups={};
  (status||[]).forEach(x=>(groups[x.product]??=[]).push(x.current_status));
  $("#adminStatusSummary").innerHTML=Object.entries(groups).map(([name,states])=>{
    const bad=states.some(x=>["major_outage","partial_outage"].includes(x)),warn=states.some(x=>x==="degraded");
    return '<div class="admin-list-row"><span><strong>'+esc(name)+'</strong><small>'+states.length+' composants</small></span><span class="server-badge '+(bad?"down":warn?"warn":"ok")+'">'+(bad?"Incident":warn?"Dégradé":"Opérationnel")+'</span></div>';
  }).join("");
}

async function loadKnowledge(){
  const [{data:docs},{data:feedback}]=await Promise.all([
    db.from("knowledge_documents").select("*").order("product").order("title"),
    db.from("doc_feedback").select("*").eq("helpful",false).order("created_at",{ascending:false}).limit(30)
  ]);
  $("#knowledgeCount").textContent=(docs||[]).length+" documents";
  $("#knowledgeList").innerHTML=(docs||[]).map(d=>'<div class="admin-list-row"><span><strong>'+esc(d.title)+'</strong><small>'+esc(d.product||d.kind)+' · '+esc(d.difficulty)+(d.next_review_at?' · prochaine revue '+fmt(d.next_review_at):'')+'</small></span><span style="display:flex;gap:5px;align-items:center"><a class="mini-action" href="'+esc(d.href)+'">Ouvrir</a><button class="mini-action" data-review-doc="'+d.id+'">Revu</button><span class="badge '+(d.next_review_at&&new Date(d.next_review_at)<new Date()?"red":"")+'">'+esc(d.status)+'</span></span></div>').join("");
  $("[data-review-doc]").forEach(b=>b.addEventListener("click",async()=>{const now=new Date(),next=new Date(now.getTime()+120*86400000);const {error}=await db.from("knowledge_documents").update({last_reviewed_at:now.toISOString(),next_review_at:next.toISOString()}).eq("id",b.dataset.reviewDoc);if(error)alert(error.message);else loadKnowledge()}));
  $("#knowledgeFeedback").innerHTML=(feedback||[]).length?(feedback||[]).map(f=>'<div class="admin-list-row"><span><strong>'+esc(f.page_path)+'</strong><small>'+esc(f.comment||"Sans commentaire")+'</small></span><span>'+fmt(f.created_at)+'</span></div>').join(""):empty("Aucun retour négatif","Les articles n’ont pas reçu de feedback négatif.");
}

async function loadCommunity(){
  const [{data:reports},{data:topics}]=await Promise.all([
    db.from("forum_reports").select("*,reporter:profiles!forum_reports_reporter_id_fkey(display_name),topic:forum_topics!forum_reports_topic_id_fkey(title)").order("created_at",{ascending:false}).limit(30),
    db.from("forum_topics").select("id,title,status,reply_count,view_count,last_activity_at").order("last_activity_at",{ascending:false}).limit(20)
  ]);
  $("#communityReports").innerHTML=(reports||[]).length?(reports||[]).map(r=>'<div class="admin-list-row"><span><strong>'+esc(r.reason)+'</strong><small>'+esc(r.topic?.title||"Réponse signalée")+' · '+esc(r.reporter?.display_name||"Membre")+'</small></span><span class="badge">'+esc(r.status)+'</span></div>').join(""):empty("Aucun signalement","La file de modération est vide.");
  $("#communityTopics").innerHTML=(topics||[]).map(t=>'<a class="admin-list-row" href="forum-topic.html?id='+t.id+'"><span><strong>'+esc(t.title)+'</strong><small>'+t.reply_count+' réponses · '+t.view_count+' vues</small></span><span>'+fmt(t.last_activity_at)+'</span></a>').join("");
}

async function loadSupport(){
  const {data:tickets}=await db.from("support_tickets").select("*,requester:profiles!support_tickets_requester_id_fkey(display_name)").order("last_activity_at",{ascending:false}).limit(50);
  const rows=tickets||[];
  const active=rows.filter(x=>!["resolved","closed"].includes(x.status));
  const overdueFirst=active.filter(x=>!x.first_response_at&&x.sla_first_response_due_at&&new Date(x.sla_first_response_due_at)<new Date()).length;
  const overdueResolve=active.filter(x=>x.sla_resolution_due_at&&new Date(x.sla_resolution_due_at)<new Date()).length;
  $("#supportMetrics").innerHTML=[metric(active.length,"Tickets actifs"),metric(overdueFirst,"SLA première réponse"),metric(overdueResolve,"SLA résolution"),metric(rows.filter(x=>x.status==="waiting_user").length,"En attente utilisateur")].join("");
  $("#supportInbox").innerHTML=rows.length?rows.map(t=>'<a class="admin-list-row" href="support-ticket.html?id='+t.id+'"><span><strong>#SQ-'+String(t.ticket_number).padStart(5,"0")+' · '+esc(t.subject)+'</strong><small>'+esc(t.product)+' · '+esc(t.requester?.display_name||"Membre")+' · '+esc(t.priority)+'</small></span><span class="badge">'+esc(t.status)+'</span></a>').join(""):empty("Inbox vide","Aucun ticket support.");

  const {data:macros}=await db.from("support_macros").select("*").order("name");
  $("#supportMacros").innerHTML=(macros||[]).map(m=>'<div class="admin-list-row"><span><strong>'+esc(m.name)+'</strong><small>'+esc(m.body.slice(0,90))+'</small></span><span style="display:flex;gap:5px;align-items:center"><button class="mini-action" data-toggle-macro="'+m.id+'" data-active="'+(m.is_active?"1":"0")+'">'+(m.is_active?"Désactiver":"Activer")+'</button><span class="badge">'+(m.is_active?"active":"off")+'</span></span></div>').join("");
  $("[data-toggle-macro]").forEach(b=>b.addEventListener("click",async()=>{await db.from("support_macros").update({is_active:b.dataset.active!=="1"}).eq("id",b.dataset.toggleMacro);loadSupport()}));
}

async function loadStatus(){
  const [{data:comps},{data:incidents},{data:maintenance}]=await Promise.all([
    db.from("service_components").select("*").eq("enabled",true).order("sort_order"),
    db.from("incidents").select("*").order("started_at",{ascending:false}).limit(30),
    db.from("maintenance_windows").select("*").order("starts_at",{ascending:false}).limit(30)
  ]);
  components=comps||[];
  $("#statusComponents").innerHTML=components.map(c=>{const pre=c.lifecycle==="development"||c.lifecycle==="beta";const label=c.lifecycle==="development"?"development":c.lifecycle==="beta"&&c.current_status==="unknown"?"beta · manuel":c.current_status;const cls=pre?(c.lifecycle==="beta"?"warn":"checking"):c.current_status==="operational"?"ok":c.current_status==="degraded"?"warn":c.current_status==="unknown"?"checking":"down";return '<div class="admin-list-row"><span><strong>'+esc(c.name)+'</strong><small>'+esc(c.product)+' · '+esc(c.lifecycle||"live")+(c.aggregate_status===false?' · hors agrégat':'')+' · '+(c.response_ms??"—")+' ms</small></span><span class="server-badge '+cls+'">'+esc(label)+'</span></div>'}).join("");
  $("#incidentComponents").innerHTML=components.map(c=>'<option value="'+c.id+'">'+esc(c.product+" — "+c.name)+'</option>').join("");
  $("#maintenanceComponents").innerHTML=components.map(c=>'<option value="'+c.id+'">'+esc(c.product+" — "+c.name)+'</option>').join("");
  $("#incidentUpdateIncident").innerHTML=(incidents||[]).filter(i=>i.status!=="resolved").map(i=>'<option value="'+i.id+'">'+esc(i.title)+'</option>').join("");
  $("#incidentList").innerHTML=(incidents||[]).length?(incidents||[]).map(i=>'<a class="admin-list-row" href="incident.html?id='+i.id+'"><span><strong>'+esc(i.title)+'</strong><small>'+esc(i.severity)+' · '+fmt(i.started_at)+'</small></span><span class="badge">'+esc(i.status)+'</span></a>').join(""):empty("Aucun incident","Aucun incident enregistré.");
  $("#maintenanceList").innerHTML=(maintenance||[]).length?(maintenance||[]).map(m=>'<div class="admin-list-row"><span><strong>'+esc(m.title)+'</strong><small>'+fmt(m.starts_at)+' → '+fmt(m.ends_at)+'</small></span><span class="badge">'+esc(m.status)+'</span></div>').join(""):empty("Aucune maintenance","Aucune maintenance planifiée.");
}

async function loadAnalytics(){
  const since=new Date(Date.now()-30*86400000).toISOString();
  const [{data:events},{data:feedback},{data:tickets}]=await Promise.all([
    db.from("help_events").select("*").gte("created_at",since).order("created_at",{ascending:false}).limit(5000),
    db.from("doc_feedback").select("*").gte("created_at",since),
    db.from("support_tickets").select("created_at,first_response_at,resolved_at,satisfaction_score").gte("created_at",since)
  ]);
  const ev=events||[],fb=feedback||[],ts=tickets||[];
  const searches=ev.filter(x=>x.event_type==="search"),views=ev.filter(x=>x.event_type==="page_view");
  const helpfulPct=fb.length?Math.round(fb.filter(x=>x.helpful).length/fb.length*100):100;
  $("#analyticsMetrics").innerHTML=[metric(views.length,"Pages vues · 30j"),metric(searches.length,"Recherches · 30j"),metric(helpfulPct+"%","Articles utiles"),metric(ts.length,"Tickets créés · 30j")].join("");

  const qCounts={};searches.forEach(x=>{const q=(x.query||"").toLowerCase().trim();if(q)qCounts[q]=(qCounts[q]||0)+1});
  $("#searchAnalytics").innerHTML=Object.entries(qCounts).sort((a,b)=>b[1]-a[1]).slice(0,20).map(([q,n])=>'<div class="admin-list-row"><span><strong>'+esc(q)+'</strong></span><span>'+n+'</span></div>').join("")||empty("Pas encore de recherche","Les requêtes apparaîtront ici.");

  const pCounts={};views.forEach(x=>{const p=x.path||"/";pCounts[p]=(pCounts[p]||0)+1});
  $("#pageAnalytics").innerHTML=Object.entries(pCounts).sort((a,b)=>b[1]-a[1]).slice(0,20).map(([p,n])=>'<div class="admin-list-row"><span><strong>'+esc(p)+'</strong></span><span>'+n+'</span></div>').join("")||empty("Pas encore de trafic","Les pages populaires apparaîtront ici.");
}

$("#macroCreateForm")?.addEventListener("submit",async e=>{
  e.preventDefault();
  const {error}=await db.from("support_macros").insert({name:$("#macroName").value.trim(),category:$("#macroCategory").value.trim()||null,body:$("#macroBody").value.trim(),created_by:me.id});
  $("#macroAlert").className="forum-alert show "+(error?"error":"success");
  $("#macroAlert").textContent=error?error.message:"Macro créée.";
  if(!error){e.currentTarget.reset();loadSupport()}
});

$("#incidentCreateForm")?.addEventListener("submit",async e=>{
  e.preventDefault();
  const selected=[...$("#incidentComponents").selectedOptions].map(x=>x.value);
  const {data:incident,error}=await db.from("incidents").insert({
    title:$("#incidentTitle").value.trim(),
    severity:$("#incidentSeverity").value,
    summary:$("#incidentSummary").value.trim(),
    created_by:me.id
  }).select("id").single();
  if(error){$("#incidentAlert").className="forum-alert show error";$("#incidentAlert").textContent=error.message;return}
  if(selected.length)await db.from("incident_components").insert(selected.map(component_id=>({incident_id:incident.id,component_id})));
  await db.from("incident_updates").insert({incident_id:incident.id,status:"investigating",message:$("#incidentSummary").value.trim(),author_id:me.id});
  location.reload();
});

$("#incidentUpdateForm")?.addEventListener("submit",async e=>{
  e.preventDefault();
  const id=$("#incidentUpdateIncident").value,status=$("#incidentUpdateStatus").value,message=$("#incidentUpdateMessage").value.trim();
  if(!id)return;
  const patch={status};
  if(status==="resolved")patch.resolved_at=new Date().toISOString();else patch.resolved_at=null;
  const {error}=await db.from("incidents").update(patch).eq("id",id);
  if(!error)await db.from("incident_updates").insert({incident_id:id,status,message,author_id:me.id});
  $("#incidentUpdateAlert").className="forum-alert show "+(error?"error":"success");
  $("#incidentUpdateAlert").textContent=error?error.message:"Mise à jour publiée.";
  if(!error){e.currentTarget.reset();loadStatus()}
});

$("#maintenanceCreateForm")?.addEventListener("submit",async e=>{
  e.preventDefault();
  const selected=[...$("#maintenanceComponents").selectedOptions].map(x=>x.value);
  const {data:maintenance,error}=await db.from("maintenance_windows").insert({
    title:$("#maintenanceTitle").value.trim(),
    description:"",
    starts_at:new Date($("#maintenanceStart").value).toISOString(),
    ends_at:new Date($("#maintenanceEnd").value).toISOString(),
    created_by:me.id
  }).select("id").single();
  if(error){$("#maintenanceAlert").className="forum-alert show error";$("#maintenanceAlert").textContent=error.message;return}
  if(selected.length)await db.from("maintenance_components").insert(selected.map(component_id=>({maintenance_id:maintenance.id,component_id})));
  location.reload();
});

async function init(){
  if(!await gate())return;
  setupTabs();
  await Promise.all([loadOverview(),loadKnowledge(),loadCommunity(),loadSupport(),loadStatus(),loadAnalytics()]);
}
init();
