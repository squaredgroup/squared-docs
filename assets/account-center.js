import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";
const db=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const $=(s,c=document)=>c.querySelector(s), $$=(s,c=document)=>[...c.querySelectorAll(s)];
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const ago=v=>{const sec=Math.round((new Date(v)-Date.now())/1000),a=Math.abs(sec),r=new Intl.RelativeTimeFormat("fr",{numeric:"auto"});if(a<3600)return r.format(Math.round(sec/60),"minute");if(a<86400)return r.format(Math.round(sec/3600),"hour");return r.format(Math.round(sec/86400),"day")};
let session=null,profile=null;

async function auth(){
  const {data:{session:s}}=await db.auth.getSession();session=s;
  if(!session){location.href="login.html?next="+encodeURIComponent(location.pathname.split("/").pop());return false}
  const {data}=await db.from("profiles").select("*").eq("id",session.user.id).single();profile=data;return true;
}
function toggle(el,on){el.classList.toggle("on",!!on);el.dataset.on=on?"1":"0"}
function activeNav(){
  const file=location.pathname.split("/").pop();
  document.querySelectorAll(".account-settings-nav a").forEach(a=>a.classList.toggle("active",a.getAttribute("href")===file));
}

async function settings(){
  const [{data:prefs}]=await Promise.all([db.from("account_preferences").select("*").eq("user_id",session.user.id).maybeSingle()]);
  $("#accountDisplayName").value=profile.display_name||"";
  $("#accountUsername").value=profile.username||"";
  $("#accountEmail").value=session.user.email||"";
  $("#prefTheme").value=prefs?.theme||"system";$("#prefLocale").value=prefs?.locale||"fr";toggle($("#prefCompact"),prefs?.compact_sidebar);toggle($("#prefMotion"),prefs?.reduced_motion);
  $("#prefCompact").onclick=()=>toggle($("#prefCompact"),$("#prefCompact").dataset.on!=="1");$("#prefMotion").onclick=()=>toggle($("#prefMotion"),$("#prefMotion").dataset.on!=="1");

  $("#accountProfileForm").addEventListener("submit",async e=>{e.preventDefault();const name=$("#accountDisplayName").value.trim(),username=$("#accountUsername").value.trim(),email=$("#accountEmail").value.trim();const {error}=await db.from("profiles").update({display_name:name,username}).eq("id",session.user.id);if(error){$("#accountAlert").className="forum-alert show error";$("#accountAlert").textContent=error.message;return}if(email&&email!==session.user.email)await db.auth.updateUser({email});$("#accountAlert").className="forum-alert show success";$("#accountAlert").textContent="Compte mis à jour.";});
  $("#saveInterfacePrefs").onclick=async e=>{e.preventDefault();const payload={user_id:session.user.id,theme:$("#prefTheme").value,locale:$("#prefLocale").value,compact_sidebar:$("#prefCompact").dataset.on==="1",reduced_motion:$("#prefMotion").dataset.on==="1"};const {error}=await db.from("account_preferences").upsert(payload);if(!error){if(payload.theme!=="system"){document.documentElement.dataset.theme=payload.theme;localStorage.setItem("sq-docs-theme",payload.theme)}localStorage.setItem("sq-help-sidebar-mini",payload.compact_sidebar?"1":"0");alert("Préférences enregistrées.")}};
}

async function notifications(){
  let {data:prefs}=await db.from("notification_preferences").select("*").eq("user_id",session.user.id).maybeSingle();
  prefs=prefs||{forum_replies:true,mentions:true,accepted_solutions:true,support_updates:true,status_incidents:false,product_updates:true,email_enabled:true,in_app_enabled:true};
  $$("[data-pref]").forEach(row=>{const key=row.dataset.pref,btn=$(".sq-switch",row);toggle(btn,prefs[key]);btn.onclick=()=>toggle(btn,btn.dataset.on!=="1")});
  $("#saveNotificationPrefs").onclick=async()=>{const payload={user_id:session.user.id};$$("[data-pref]").forEach(row=>payload[row.dataset.pref]=$(".sq-switch",row).dataset.on==="1");const {error}=await db.from("notification_preferences").upsert(payload);$("#notificationsAlert").className="forum-alert show "+(error?"error":"success");$("#notificationsAlert").textContent=error?error.message:"Préférences enregistrées.";};
}

async function activity(){
  const [{data:topics},{data:replies}]=await Promise.all([db.from("forum_topics").select("id,title,status,created_at,last_activity_at").eq("author_id",session.user.id).is("deleted_at",null).order("last_activity_at",{ascending:false}),db.from("forum_replies").select("id,topic_id,body,is_solution,created_at").eq("author_id",session.user.id).is("deleted_at",null).order("created_at",{ascending:false})]);
  $("#activityTopics").textContent=topics?.length||0;$("#activityReplies").textContent=replies?.length||0;$("#activitySolutions").textContent=(replies||[]).filter(x=>x.is_solution).length;
  const items=[...(topics||[]).map(x=>({type:"topics",title:x.title,href:"forum-topic.html?id="+x.id,date:x.last_activity_at,meta:"Discussion · "+x.status})),...(replies||[]).map(x=>({type:"replies",title:x.body.slice(0,100),href:"forum-topic.html?id="+x.topic_id,date:x.created_at,meta:x.is_solution?"Réponse · Solution":"Réponse"}))].sort((a,b)=>new Date(b.date)-new Date(a.date));
  let filter="all";const render=()=>{const list=items.filter(x=>filter==="all"||x.type===filter);$("#activityList").innerHTML=list.length?list.map(x=>'<a class="ticket-row" href="'+x.href+'"><span><strong>'+esc(x.title)+'</strong><span>'+esc(x.meta)+' · '+ago(x.date)+'</span></span><span>→</span></a>').join(""):'<div class="forum-empty">Aucune activité.</div>';};$$("[data-activity-filter]").forEach(b=>b.onclick=()=>{$$("[data-activity-filter]").forEach(x=>x.classList.remove("active"));b.classList.add("active");filter=b.dataset.activityFilter;render()});render();
}

async function tickets(){
  const {data}=await db.from("support_tickets").select("*").eq("requester_id",session.user.id).order("last_activity_at",{ascending:false});const rows=data||[];let filter="all";const render=()=>{const list=rows.filter(x=>filter==="all"||(filter==="active"&&!["resolved","closed"].includes(x.status))||(filter==="resolved"&&["resolved","closed"].includes(x.status)));$("#myTicketsList").innerHTML=list.length?list.map(t=>'<a class="ticket-row" href="support-ticket.html?id='+t.id+'"><span><strong>#SQ-'+String(t.ticket_number).padStart(5,"0")+' · '+esc(t.subject)+'</strong><span>'+esc(t.product)+' · '+esc(t.category)+' · '+ago(t.last_activity_at)+'</span></span><span class="badge">'+esc(t.status)+'</span></a>').join(""):'<div class="forum-empty">Aucun ticket dans ce filtre.</div>';};$$("[data-ticket-filter]").forEach(b=>b.onclick=()=>{$$("[data-ticket-filter]").forEach(x=>x.classList.remove("active"));b.classList.add("active");filter=b.dataset.ticketFilter;render()});render();
}

(async()=>{if(!await auth())return;activeNav();const page=document.body.dataset.accountPage;if(page==="settings")settings();else if(page==="notifications")notifications();else if(page==="activity")activity();else if(page==="tickets")tickets();})();