import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const SQIconly=window.SQIconly;
const $=(s,c=document)=>c.querySelector(s), $$=(s,c=document)=>[...c.querySelectorAll(s)];
let session=null, me=null;

const esc=(v="")=>String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const nl=(v="")=>esc(v).replace(/\n/g,"<br>");
const initials=p=>((p?.display_name||p?.username||"?").trim().split(/\s+/).slice(0,2).map(x=>x[0]||"").join("").toUpperCase()||"?");
const avatar=p=>p?.avatar_url?'<span class="avatar"><img src="'+esc(p.avatar_url)+'" alt=""></span>':'<span class="avatar">'+esc(initials(p))+'</span>';
const staff=p=>p&&["moderator","admin"].includes(p.role);
const dt=v=>v?new Intl.DateTimeFormat("fr-FR",{dateStyle:"medium",timeStyle:"short"}).format(new Date(v)):"";
const ago=v=>{
  if(!v)return"";
  const sec=Math.round((new Date(v)-Date.now())/1000),abs=Math.abs(sec);
  const rtf=new Intl.RelativeTimeFormat("fr",{numeric:"auto"});
  if(abs<60)return rtf.format(sec,"second");
  if(abs<3600)return rtf.format(Math.round(sec/60),"minute");
  if(abs<86400)return rtf.format(Math.round(sec/3600),"hour");
  if(abs<2592000)return rtf.format(Math.round(sec/86400),"day");
  return dt(v);
};
const alertBox=(id,msg,type="error")=>{const el=$("#"+id);if(!el)return;el.textContent=msg;el.className="forum-alert show "+type};
const clearAlert=id=>{const el=$("#"+id);if(el)el.className="forum-alert"};
const currentUrl=()=>location.pathname.split("/").pop()+location.search+location.hash;
const loginUrl=()=> "login.html?next="+encodeURIComponent(currentUrl());
const requireAuth=()=>{if(session)return true;location.href=loginUrl();return false};

async function initAuth(){
  const {data:{session:s}}=await supabase.auth.getSession();
  session=s;
  if(session){
    const {data}=await supabase.from("profiles").select("*").eq("id",session.user.id).maybeSingle();
    me=data||null;
  }
  renderAccount();
  if(session){
    supabase.channel("my-notifications")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"notifications",filter:"user_id=eq."+session.user.id},()=>renderAccount())
      .subscribe();
  }
}
async function unreadCount(){
  if(!session)return 0;
  const {count}=await supabase.from("notifications").select("*",{count:"exact",head:true}).eq("user_id",session.user.id).eq("is_read",false);
  return count||0;
}
async function renderAccount(){
  const host=$("#forumAccount");
  if(!host)return;
  if(!session){
    host.innerHTML='<a class="btn" href="'+loginUrl()+'">'+(window.SQIconly?SQIconly.icon('account','outline','sm'):'')+'<span>Se connecter</span></a>';
    return;
  }
  const n=await unreadCount();
  host.innerHTML='<a class="account-chip" href="profile.html">'+avatar(me)+'<span>'+esc(me?.display_name||"Mon compte")+'</span></a><a class="icon-btn" href="notifications.html" title="Notifications">'+(window.SQIconly?SQIconly.icon('notifications',n?'fill':'outline','md'):'')+(n?'<span class="notification-dot">'+n+'</span>':'')+'</a>'+(staff(me)?'<a class="icon-btn" href="moderation.html" title="Modération">'+(window.SQIconly?SQIconly.icon('security','fill','md'):'')+'</a>':'')+'<button class="icon-btn" id="forumLogout" title="Se déconnecter">'+(window.SQIconly?SQIconly.icon('arrowRight','outline','md'):'')+'</button>';
  $("#forumLogout")?.addEventListener("click",async()=>{await supabase.auth.signOut();location.href="index.html"});
}
async function getCategories(){
  const {data,error}=await supabase.from("forum_categories").select("*").order("sort_order");
  if(error)throw error; return data||[];
}
async function getTopics(){
  const {data,error}=await supabase.from("forum_topics").select(`
    id,title,body,status,is_pinned,is_featured,view_count,reply_count,vote_score,last_activity_at,created_at,author_id,category_id,
    category:forum_categories!forum_topics_category_id_fkey(id,slug,name,icon,kind),
    author:profiles!forum_topics_author_id_fkey(id,username,display_name,avatar_url,role,reputation)
  `).order("is_pinned",{ascending:false}).order("last_activity_at",{ascending:false}).limit(150);
  if(error)throw error; return data||[];
}
function topicRow(t){
  const badges=[
    t.is_pinned?'<span class="badge orange">Épinglé</span>':"",
    t.status==="resolved"?'<span class="badge green">Résolu</span>':"",
    t.status==="locked"?'<span class="badge red">Fermé</span>':"",
    t.is_featured?'<span class="badge blue">À la une</span>':""
  ].join("");
  return '<a class="topic-row" href="forum-topic.html?id='+encodeURIComponent(t.id)+'">'+avatar(t.author)+'<span><span class="topic-title"><strong>'+esc(t.title)+'</strong>'+badges+'</span><span class="topic-body-preview">'+esc(t.body)+'</span><span class="topic-meta"><span>'+esc(t.category?.name||"Discussion")+'</span><span>·</span><span>'+esc(t.author?.display_name||t.author?.username||"Membre")+'</span><span>·</span><span>'+ago(t.last_activity_at)+'</span></span></span><span class="topic-stats"><span class="topic-stat"><strong>'+t.reply_count+'</strong><span>rép.</span></span><span class="topic-stat"><strong>'+t.vote_score+'</strong><span>votes</span></span><span class="topic-stat"><strong>'+t.view_count+'</strong><span>vues</span></span></span></a>';
}

async function initHome(){
  const host=$("#homeForumTopics");if(!host)return;
  try{
    const topics=await getTopics();
    const list=topics.slice(0,4);
    host.innerHTML=list.length?list.map(t=>'<a class="home-discussion-row" href="forum-topic.html?id='+encodeURIComponent(t.id)+'">'+avatar(t.author)+'<span><strong>'+esc(t.title)+'</strong><span>'+esc(t.category?.name||"Discussion")+' · '+esc(t.author?.display_name||"Membre")+' · '+ago(t.last_activity_at)+'</span></span><em>'+t.reply_count+' rép.</em></a>').join(""):'<div class="forum-empty"><strong>Le forum est prêt</strong>Soyez le premier à ouvrir une discussion.</div>';
  }catch(e){
    host.innerHTML='<div class="forum-empty"><strong>Activité indisponible</strong>Le reste du Help Center reste accessible.</div>';
  }
}

async function initForum(){
  const catsHost=$("#forumCategories"),topicsHost=$("#forumTopics");
  if(!catsHost||!topicsHost)return;
  topicsHost.innerHTML='<div class="loading">Chargement des discussions…</div>';
  try{
    const [cats,topics]=await Promise.all([getCategories(),getTopics()]);
    let currentCat="all",query="",sort="recent";
    const counts={};topics.forEach(t=>counts[t.category_id]=(counts[t.category_id]||0)+1);
    const catKey=c=>c.slug==="questions"?"forum":c.slug==="general"?"general":c.slug==="ideas"?"ideas":c.slug==="bugs"?"bugs":c.slug==="announcements"?"announcements":"forum";
    catsHost.innerHTML='<button class="forum-cat active" data-cat="all"><span class="forum-cat-icon">'+(window.SQIconly?SQIconly.icon('all','fill','md'):'')+'</span><span><strong>Toutes les discussions</strong><span>Activité récente</span></span><em>'+topics.length+'</em></button>'+cats.map(c=>'<button class="forum-cat" data-cat="'+c.id+'"><span class="forum-cat-icon">'+(window.SQIconly?SQIconly.icon(catKey(c),'outline','md'):esc(c.icon))+'</span><span><strong>'+esc(c.name)+'</strong><span>'+esc(c.description)+'</span></span><em>'+(counts[c.id]||0)+'</em></button>').join("");
    const render=()=>{
      let list=topics.filter(t=>(currentCat==="all"||t.category_id===currentCat)&&(!query||(t.title+" "+t.body+" "+(t.category?.name||"")).toLowerCase().includes(query)));
      if(sort==="popular")list.sort((a,b)=>(b.vote_score+b.reply_count*2+b.view_count*.05)-(a.vote_score+a.reply_count*2+a.view_count*.05));
      else if(sort==="unanswered")list=list.filter(t=>t.reply_count===0&&t.status!=="resolved");
      else if(sort==="resolved")list=list.filter(t=>t.status==="resolved");
      else list.sort((a,b)=>Number(b.is_pinned)-Number(a.is_pinned)||new Date(b.last_activity_at)-new Date(a.last_activity_at));
      topicsHost.innerHTML=list.length?list.map(topicRow).join(""):'<div class="forum-empty"><strong>Aucune discussion</strong>Essayez une autre catégorie ou créez un nouveau sujet.</div>';
      $("#forumCount").textContent=list.length+" discussion"+(list.length>1?"s":"");
    };
    $$(".forum-cat",catsHost).forEach(b=>b.addEventListener("click",()=>{$$(".forum-cat",catsHost).forEach(x=>x.classList.remove("active"));b.classList.add("active");currentCat=b.dataset.cat;render()}));
    $("#forumSearch")?.addEventListener("input",e=>{query=e.target.value.trim().toLowerCase();render()});
    $("#forumSort")?.addEventListener("change",e=>{sort=e.target.value;render()});
    if($("#newTopicBtn")&&window.SQIconly)$("#newTopicBtn").innerHTML=SQIconly.icon('plus','outline','sm')+'<span>Nouvelle discussion</span>';
    $("#newTopicBtn")?.addEventListener("click",()=>{location.href=session?"forum-new.html":loginUrl()});
    render();
    supabase.channel("forum-index").on("postgres_changes",{event:"*",schema:"public",table:"forum_topics"},()=>location.reload()).subscribe();
  }catch(e){topicsHost.innerHTML='<div class="forum-empty"><strong>Impossible de charger le forum</strong>'+esc(e.message)+'</div>'}
}
async function getTopic(id){
  const {data,error}=await supabase.from("forum_topics").select(`
    id,title,body,status,is_pinned,is_featured,view_count,reply_count,vote_score,last_activity_at,created_at,updated_at,author_id,accepted_reply_id,category_id,
    category:forum_categories!forum_topics_category_id_fkey(id,slug,name,icon,kind),
    author:profiles!forum_topics_author_id_fkey(id,username,display_name,avatar_url,role,reputation)
  `).eq("id",id).maybeSingle();
  if(error)throw error; return data;
}
async function getReplies(topicId){
  const {data,error}=await supabase.from("forum_replies").select(`
    id,topic_id,author_id,parent_id,body,is_solution,vote_score,created_at,edited_at,
    author:profiles!forum_replies_author_id_fkey(id,username,display_name,avatar_url,role,reputation)
  `).eq("topic_id",topicId).order("created_at");
  if(error)throw error; return data||[];
}
async function myVote(kind,id){
  if(!session)return null;
  let q=supabase.from("forum_votes").select("id,value").eq("user_id",session.user.id);
  q=kind==="topic"?q.eq("topic_id",id):q.eq("reply_id",id);
  const {data}=await q.maybeSingle();return data||null;
}
async function vote(kind,id,value){
  if(!requireAuth())return;
  const existing=await myVote(kind,id);
  if(existing&&existing.value===value)await supabase.from("forum_votes").delete().eq("id",existing.id);
  else if(existing)await supabase.from("forum_votes").update({value}).eq("id",existing.id);
  else await supabase.from("forum_votes").insert({user_id:session.user.id,[kind+"_id"]:id,value});
  location.reload();
}
async function reactionsFor(topicId,replyIds){
  const all=[];
  const a=await supabase.from("forum_reactions").select("*").eq("topic_id",topicId);if(a.data)all.push(...a.data);
  if(replyIds.length){const b=await supabase.from("forum_reactions").select("*").in("reply_id",replyIds);if(b.data)all.push(...b.data)}
  return all;
}
function reactionCounts(list,kind,id){
  const m={};list.filter(r=>r[kind+"_id"]===id).forEach(r=>m[r.emoji]=(m[r.emoji]||0)+1);return m;
}
async function toggleReaction(kind,id,emoji){
  if(!requireAuth())return;
  let q=supabase.from("forum_reactions").select("id").eq("user_id",session.user.id).eq("emoji",emoji);
  q=kind==="topic"?q.eq("topic_id",id):q.eq("reply_id",id);
  const {data}=await q.maybeSingle();
  if(data)await supabase.from("forum_reactions").delete().eq("id",data.id);
  else await supabase.from("forum_reactions").insert({user_id:session.user.id,[kind+"_id"]:id,emoji});
  location.reload();
}
async function bookmarked(topicId){
  if(!session)return false;
  const {data}=await supabase.from("forum_bookmarks").select("topic_id").eq("user_id",session.user.id).eq("topic_id",topicId).maybeSingle();
  return !!data;
}
async function toggleBookmark(topicId){
  if(!requireAuth())return;
  if(await bookmarked(topicId))await supabase.from("forum_bookmarks").delete().eq("user_id",session.user.id).eq("topic_id",topicId);
  else await supabase.from("forum_bookmarks").insert({user_id:session.user.id,topic_id:topicId});
  location.reload();
}

function closeForumDialog(){
  document.querySelector('.forum-dialog-backdrop')?.remove();
}
function openForumDialog({title,description="",content="",showTitle=false,confirmLabel="Enregistrer"}){
  return new Promise(resolve=>{
    closeForumDialog();
    const wrap=document.createElement('div');
    wrap.className='forum-dialog-backdrop';
    wrap.innerHTML='<div class="forum-dialog" role="dialog" aria-modal="true"><div class="forum-dialog-head"><div><h2>'+esc(title)+'</h2><p>'+esc(description)+'</p></div><button class="forum-dialog-close" type="button">'+(window.SQIconly?SQIconly.icon('plus','outline','sm','sq-icon-close'):'×')+'</button></div><form id="forumDialogForm">'+(showTitle?'<div class="form-group"><label>Titre</label><input class="forum-input" id="forumDialogTitle" maxlength="180" style="width:100%"></div>':'')+'<div class="form-group"><label>Contenu</label><textarea class="forum-textarea" id="forumDialogBody" maxlength="20000"></textarea><div class="char-count" id="forumDialogCount">0</div></div><div class="form-actions"><button class="btn" type="button" data-cancel>Annuler</button><button class="btn green" type="submit">'+esc(confirmLabel)+'</button></div></form></div>';
    document.body.appendChild(wrap);
    const body=$('#forumDialogBody',wrap),titleInput=$('#forumDialogTitle',wrap),count=$('#forumDialogCount',wrap);
    if(showTitle&&titleInput)titleInput.value=content.title||'';
    body.value=showTitle?(content.body||''):(typeof content==='string'?content:(content.body||''));
    const update=()=>count.textContent=body.value.length+' caractère'+(body.value.length>1?'s':'');
    body.addEventListener('input',update);update();
    const done=value=>{wrap.remove();resolve(value)};
    $('.forum-dialog-close',wrap).addEventListener('click',()=>done(null));
    $('[data-cancel]',wrap).addEventListener('click',()=>done(null));
    wrap.addEventListener('click',e=>{if(e.target===wrap)done(null)});
    $('#forumDialogForm',wrap).addEventListener('submit',e=>{e.preventDefault();done(showTitle?{title:titleInput.value.trim(),body:body.value.trim()}:{body:body.value.trim()})});
    setTimeout(()=>showTitle?titleInput?.focus():body.focus(),20);
  });
}
async function editTopic(topic){
  if(!requireAuth())return;
  const value=await openForumDialog({title:"Modifier la discussion",description:"Mettez à jour le titre ou le contenu.",content:{title:topic.title,body:topic.body},showTitle:true,confirmLabel:"Enregistrer"});
  if(!value)return;
  if(value.title.length<5||value.body.length<10){alert("Le titre ou le contenu est trop court.");return}
  const {error}=await supabase.from("forum_topics").update({title:value.title,body:value.body}).eq("id",topic.id);
  if(error)alert(error.message);else location.reload();
}
async function editReply(reply){
  if(!requireAuth())return;
  const value=await openForumDialog({title:"Modifier la réponse",description:"Corrigez ou complétez votre réponse.",content:reply.body,confirmLabel:"Enregistrer"});
  if(!value)return;
  if(value.body.length<2){alert("La réponse est trop courte.");return}
  const {error}=await supabase.from("forum_replies").update({body:value.body}).eq("id",reply.id);
  if(error)alert(error.message);else location.reload();
}

async function reportContent(kind,id){
  if(!requireAuth())return;
  closeForumDialog();
  const wrap=document.createElement('div');
  wrap.className='forum-dialog-backdrop';
  wrap.innerHTML='<div class="forum-dialog"><div class="forum-dialog-head"><div><h2>Signaler ce contenu</h2><p>Utilisez le signalement uniquement pour un problème réel.</p></div><button class="forum-dialog-close" type="button">×</button></div><form id="reportForm"><div class="form-group"><label>Motif</label><select class="forum-select" id="reportReason" style="width:100%"><option value="spam">Spam</option><option value="contenu inapproprié">Contenu inapproprié</option><option value="information sensible">Information sensible</option><option value="hors sujet">Hors sujet</option><option value="autre">Autre</option></select></div><div class="form-group"><label>Détails</label><textarea class="forum-textarea" id="reportDetails" maxlength="2000" placeholder="Ajoutez du contexte si nécessaire…"></textarea></div><div class="form-actions"><button class="btn" type="button" data-cancel>Annuler</button><button class="btn green" type="submit">Envoyer le signalement</button></div></form></div>';
  document.body.appendChild(wrap);
  const close=()=>wrap.remove();
  $('.forum-dialog-close',wrap).addEventListener('click',close);
  $('[data-cancel]',wrap).addEventListener('click',close);
  wrap.addEventListener('click',e=>{if(e.target===wrap)close()});
  $('#reportForm',wrap).addEventListener('submit',async e=>{
    e.preventDefault();
    const reason=$('#reportReason',wrap).value,details=$('#reportDetails',wrap).value.trim()||null;
    const {error}=await supabase.from("forum_reports").insert({reporter_id:session.user.id,[kind+"_id"]:id,reason,details});
    if(error)alert(error.message);else{close();alert("Signalement envoyé.")}
  });
}
async function initTopic(){
  const host=$("#topicMount");if(!host)return;
  const id=new URLSearchParams(location.search).get("id");if(!id){host.innerHTML='<div class="forum-empty">Sujet introuvable.</div>';return}
  try{
    const [topic,replies]=await Promise.all([getTopic(id),getReplies(id)]);
    if(!topic){host.innerHTML='<div class="forum-empty">Sujet introuvable.</div>';return}
    supabase.rpc("increment_forum_topic_view",{p_topic:id});
    const reacts=await reactionsFor(id,replies.map(r=>r.id));
    const bmark=await bookmarked(id);
    const owner=session?.user.id===topic.author_id,canStaff=staff(me);
    const rc=reactionCounts(reacts,"topic",id);
    host.innerHTML='<div class="topic-page"><div class="topic-head-card"><div class="topic-author-line">'+avatar(topic.author)+'<span><strong>'+esc(topic.author?.display_name||topic.author?.username||"Membre")+'</strong><span>'+esc(topic.category?.name||"Discussion")+' · '+dt(topic.created_at)+'</span></span></div><h1 class="topic-head-title">'+esc(topic.title)+'</h1><div class="topic-content">'+nl(topic.body)+'</div><div class="reaction-row">'+["👍","❤️","🎉"].map(x=>'<button class="reaction" data-react-kind="topic" data-react-id="'+id+'" data-emoji="'+x+'">'+x+' '+(rc[x]||0)+'</button>').join("")+'</div><div class="topic-actions sticky-topic-actions"><button class="mini-action" data-vote-kind="topic" data-vote-id="'+id+'" data-vote="1">'+(window.SQIconly?SQIconly.icon('arrowUp','outline','sm'):'')+'<span>'+topic.vote_score+'</span></button><button class="mini-action" data-bookmark="'+id+'">'+(window.SQIconly?SQIconly.icon('favorite',bmark?'fill':'outline','sm'):'')+'<span>'+(bmark?"Enregistré":"Enregistrer")+'</span></button>'+(owner?'<button class="mini-action" data-edit-topic="'+id+'">'+(window.SQIconly?SQIconly.icon('clipboard','outline','sm'):'')+'<span>Modifier</span></button><button class="mini-action" data-resolve="'+id+'">'+(window.SQIconly?SQIconly.icon('shield-check',topic.status==="resolved"?'fill':'outline','sm'):'')+'<span>'+(topic.status==="resolved"?"Rouvrir":"Marquer résolu")+'</span></button>':"")+(canStaff?'<button class="mini-action" data-pin="'+id+'">'+(window.SQIconly?SQIconly.icon('bookmark',topic.is_pinned?'fill':'outline','sm'):'')+'<span>'+(topic.is_pinned?"Désépingler":"Épingler")+'</span></button><button class="mini-action" data-lock="'+id+'">'+(window.SQIconly?SQIconly.icon('security',topic.status==="locked"?'fill':'outline','sm'):'')+'<span>'+(topic.status==="locked"?"Déverrouiller":"Verrouiller")+'</span></button>':"")+'<button class="mini-action danger" data-report-kind="topic" data-report-id="'+id+'">'+(window.SQIconly?SQIconly.icon('faq','outline','sm'):'')+'<span>Signaler</span></button></div></div><div class="forum-panel"><div class="forum-panel-head"><h2>Réponses</h2><span>'+replies.length+'</span></div><div class="reply-list" id="replyList"></div></div><div id="replyBox"></div></div>';
    const list=$("#replyList");list.innerHTML=replies.length?replies.map(r=>{const counts=reactionCounts(reacts,"reply",r.id);return '<article class="reply-card'+(r.is_solution?" solution":"")+'"><div class="reply-head"><div class="reply-user">'+avatar(r.author)+'<span><strong>'+esc(r.author?.display_name||r.author?.username||"Membre")+'</strong><span>'+dt(r.created_at)+(r.edited_at?" · modifié":"")+'</span></span></div>'+(r.is_solution?'<span class="badge green">Solution</span>':"")+'</div><div class="reply-body">'+nl(r.body)+'</div><div class="reaction-row">'+["👍","❤️","🎉"].map(x=>'<button class="reaction" data-react-kind="reply" data-react-id="'+r.id+'" data-emoji="'+x+'">'+x+' '+(counts[x]||0)+'</button>').join("")+'</div><div class="reply-actions"><button class="mini-action" data-vote-kind="reply" data-vote-id="'+r.id+'" data-vote="1">'+(window.SQIconly?SQIconly.icon('arrowUp','outline','sm'):'')+'<span>'+r.vote_score+'</span></button>'+((owner||canStaff)&&!r.is_solution?'<button class="mini-action" data-solution="'+r.id+'">'+(window.SQIconly?SQIconly.icon('shield-check','outline','sm'):'')+'<span>Accepter comme solution</span></button>':"")+'<button class="mini-action danger" data-report-kind="reply" data-report-id="'+r.id+'">'+(window.SQIconly?SQIconly.icon('faq','outline','sm'):'')+'<span>Signaler</span></button></div></article>'}).join(""):'<div class="forum-empty">Aucune réponse pour le moment.</div>';
    const box=$("#replyBox");
    if(topic.status==="locked"||topic.status==="archived")box.innerHTML='<div class="forum-alert show error">Cette discussion est fermée.</div>';
    else if(session)box.innerHTML='<form class="reply-form" id="replyForm"><label for="replyBody" style="font-size:9px;font-weight:700">Votre réponse</label><textarea class="forum-textarea" id="replyBody" required minlength="2" maxlength="15000" placeholder="Écrivez une réponse utile et précise…"></textarea><div class="form-actions"><button class="btn green" type="submit">'+(window.SQIconly?SQIconly.icon('arrowRight','regular','sm'):'')+'<span>Publier la réponse</span></button></div><div class="forum-alert" id="replyAlert"></div></form>';
    else box.innerHTML='<div class="forum-auth-card"><strong>Vous souhaitez répondre ?</strong><p>Connectez-vous pour participer à la discussion.</p><a class="btn green" href="'+loginUrl()+'">Se connecter</a></div>';
    $("#replyForm")?.addEventListener("submit",async e=>{e.preventDefault();clearAlert("replyAlert");const body=$("#replyBody").value.trim();const {error}=await supabase.from("forum_replies").insert({topic_id:id,author_id:session.user.id,body});if(error)alertBox("replyAlert",error.message);else location.reload()});
    $$("[data-vote-kind]").forEach(b=>b.addEventListener("click",()=>vote(b.dataset.voteKind,b.dataset.voteId,Number(b.dataset.vote))));
    $$("[data-react-kind]").forEach(b=>b.addEventListener("click",()=>toggleReaction(b.dataset.reactKind,b.dataset.reactId,b.dataset.emoji)));
    $("[data-bookmark]")?.addEventListener("click",e=>toggleBookmark(e.currentTarget.dataset.bookmark));
    $$("[data-report-kind]").forEach(b=>b.addEventListener("click",()=>reportContent(b.dataset.reportKind,b.dataset.reportId)));
    $("[data-edit-topic]")?.addEventListener("click",()=>editTopic(topic));
    $$("[data-edit-reply]").forEach(b=>b.addEventListener("click",()=>{const r=replies.find(x=>x.id===b.dataset.editReply);if(r)editReply(r)}));
    $$("[data-solution]").forEach(b=>b.addEventListener("click",async()=>{const {error}=await supabase.rpc("accept_forum_reply",{p_reply:b.dataset.solution});if(error)alert(error.message);else location.reload()}));
    $("[data-resolve]")?.addEventListener("click",async()=>{const {error}=await supabase.from("forum_topics").update({status:topic.status==="resolved"?"open":"resolved"}).eq("id",id);if(error)alert(error.message);else location.reload()});
    $("[data-pin]")?.addEventListener("click",async()=>{await supabase.from("forum_topics").update({is_pinned:!topic.is_pinned}).eq("id",id);location.reload()});
    $("[data-lock]")?.addEventListener("click",async()=>{await supabase.from("forum_topics").update({status:topic.status==="locked"?"open":"locked"}).eq("id",id);location.reload()});
    supabase.channel("topic-"+id).on("postgres_changes",{event:"INSERT",schema:"public",table:"forum_replies",filter:"topic_id=eq."+id},()=>location.reload()).subscribe();
  }catch(e){host.innerHTML='<div class="forum-empty"><strong>Erreur</strong>'+esc(e.message)+'</div>'}
}
async function initNewTopic(){
  const form=$("#newTopicForm");if(!form)return;
  if(!session){location.href=loginUrl();return}
  try{
    const cats=await getCategories();
    const usable=cats.filter(c=>staff(me)||(!c.is_locked&&c.kind!=="announcement"));
    $("#newTopicCategory").innerHTML=usable.map(c=>'<option value="'+c.id+'">'+esc(c.name)+'</option>').join("");
    const preview=$("#topicPreview"),counter=$("#topicChars"),bodyInput=$("#newTopicBody"),titleInput=$("#newTopicTitle");
    const refreshPreview=()=>{if(preview)preview.innerHTML='<strong>'+esc(titleInput?.value||"Aperçu du titre")+'</strong><br><br>'+nl(bodyInput?.value||"Votre contenu apparaîtra ici.");if(counter)counter.textContent=(bodyInput?.value.length||0)+" / 20 000";};
    bodyInput?.addEventListener("input",refreshPreview);titleInput?.addEventListener("input",refreshPreview);refreshPreview();
    form.addEventListener("submit",async e=>{e.preventDefault();clearAlert("newTopicAlert");const title=$("#newTopicTitle").value.trim(),body=$("#newTopicBody").value.trim(),category_id=$("#newTopicCategory").value;const {data,error}=await supabase.from("forum_topics").insert({author_id:session.user.id,category_id,title,body}).select("id").single();if(error)alertBox("newTopicAlert",error.message);else location.href="forum-topic.html?id="+data.id});
  }catch(e){alertBox("newTopicAlert",e.message)}
}
function safeNext(){const n=new URLSearchParams(location.search).get("next");return n&&/^[a-z0-9_\-./?=#%]+$/i.test(n)&&!n.startsWith("//")?n:"forum.html"}
async function initLogin(){
  const signIn=$("#signInForm"),signUp=$("#signUpForm");if(!signIn||!signUp)return;
  if(session){$("#authAlready").innerHTML='<div class="forum-alert show success">Vous êtes déjà connecté. <a href="'+safeNext()+'">Continuer →</a></div>'}
  $$(".auth-tab").forEach(b=>b.addEventListener("click",()=>{$$(".auth-tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");signIn.hidden=b.dataset.authTab!=="signin";signUp.hidden=b.dataset.authTab!=="signup"}));
  signIn.addEventListener("submit",async e=>{e.preventDefault();clearAlert("authAlert");const email=$("#loginEmail").value.trim(),password=$("#loginPassword").value;const {error}=await supabase.auth.signInWithPassword({email,password});if(error)alertBox("authAlert",error.message);else location.href=safeNext()});
  signUp.addEventListener("submit",async e=>{e.preventDefault();clearAlert("authAlert");const display_name=$("#signupName").value.trim(),email=$("#signupEmail").value.trim(),password=$("#signupPassword").value;if(password.length<8){alertBox("authAlert","Le mot de passe doit contenir au moins 8 caractères.");return}const {data,error}=await supabase.auth.signUp({email,password,options:{data:{display_name},emailRedirectTo:location.origin+"/login.html?confirmed=1"}});if(error)alertBox("authAlert",error.message);else if(data.session)location.href=safeNext();else alertBox("authAlert","Compte créé. Vérifiez votre e-mail pour confirmer votre adresse, puis revenez vous connecter.","success")});
}

async function initForgotPassword(){
  const form=$("#forgotPasswordForm");if(!form)return;
  form.addEventListener("submit",async e=>{e.preventDefault();clearAlert("forgotAlert");const email=$("#forgotEmail").value.trim();const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:location.origin+"/reset-password.html"});if(error)alertBox("forgotAlert",error.message);else alertBox("forgotAlert","Un e-mail de réinitialisation a été envoyé.","success")});
}
async function initResetPassword(){
  const form=$("#resetPasswordForm");if(!form)return;
  form.addEventListener("submit",async e=>{e.preventDefault();clearAlert("resetAlert");const password=$("#resetPassword").value;if(password.length<8){alertBox("resetAlert","Le mot de passe doit contenir au moins 8 caractères.");return}const {error}=await supabase.auth.updateUser({password});if(error)alertBox("resetAlert",error.message);else{alertBox("resetAlert","Mot de passe mis à jour.","success");setTimeout(()=>location.href="profile.html",700)}})
}

async function initProfile(){
  const mount=$("#profileMount");if(!mount)return;
  const requested=new URLSearchParams(location.search).get("id")||session?.user.id;
  if(!requested){location.href=loginUrl();return}
  const {data:p,error}=await supabase.from("profiles").select("*").eq("id",requested).maybeSingle();if(error||!p){mount.innerHTML='<div class="forum-empty">Profil introuvable.</div>';return}
  const [{count:topics},{count:replies}]=await Promise.all([
    supabase.from("forum_topics").select("*",{count:"exact",head:true}).eq("author_id",p.id),
    supabase.from("forum_replies").select("*",{count:"exact",head:true}).eq("author_id",p.id)
  ]);
  const own=session?.user.id===p.id;
  mount.innerHTML='<div class="profile-grid"><aside class="profile-card">'+avatar(p)+'<h2>'+esc(p.display_name)+'</h2><p>@'+esc(p.username)+'</p><p>'+esc(p.bio||"Aucune bio.")+'</p>'+(p.role!=="member"?'<span class="badge green">'+esc(p.role)+'</span>':"")+'<div class="profile-stats"><div class="profile-stat"><strong>'+(topics||0)+'</strong><span>Sujets</span></div><div class="profile-stat"><strong>'+(replies||0)+'</strong><span>Réponses</span></div><div class="profile-stat"><strong>'+p.reputation+'</strong><span>Réputation</span></div></div></aside><section>'+(own?'<form class="form-card" id="profileForm"><div class="form-group"><label>Nom affiché</label><input class="forum-input" id="profileName" value="'+esc(p.display_name)+'" maxlength="80"></div><div class="form-group"><label>Nom d’utilisateur</label><input class="forum-input" id="profileUsername" value="'+esc(p.username)+'" maxlength="40"></div><div class="form-group"><label>Bio</label><textarea class="forum-textarea" id="profileBio" maxlength="500">'+esc(p.bio||"")+'</textarea></div><div class="form-group"><label>Avatar</label><input type="file" id="profileAvatar" accept="image/png,image/jpeg,image/webp"><div class="form-help">PNG, JPG ou WebP · 2 Mo max.</div></div><div class="form-actions"><button class="btn green" type="submit">Enregistrer</button></div><div class="forum-alert" id="profileAlert"></div></form>':'<div class="forum-panel"><div class="forum-panel-head"><h2>Profil public</h2></div><div style="padding:15px;font-size:10px;color:var(--muted)">Ce membre participe à la communauté Squared.</div></div>')+'</section></div>';
  const activityHost=$("#profileActivity");
  if(activityHost){
    const [pt,pr]=await Promise.all([
      supabase.from("forum_topics").select("id,title,last_activity_at").eq("author_id",p.id).order("last_activity_at",{ascending:false}).limit(5),
      supabase.from("forum_replies").select("id,topic_id,body,created_at").eq("author_id",p.id).order("created_at",{ascending:false}).limit(5)
    ]);
    const items=[...(pt.data||[]).map(x=>({kind:"Sujet",title:x.title,href:"forum-topic.html?id="+x.id,date:x.last_activity_at})),...(pr.data||[]).map(x=>({kind:"Réponse",title:x.body.slice(0,70),href:"forum-topic.html?id="+x.topic_id,date:x.created_at}))].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,7);
    activityHost.innerHTML=items.length?items.map(x=>'<a class="quick-row" href="'+x.href+'"><span class="quick-num">'+esc(x.kind.slice(0,3).toUpperCase())+'</span><span><strong>'+esc(x.title)+'</strong><span>'+ago(x.date)+'</span></span><em>Ouvrir →</em></a>').join(""):'<div class="forum-empty">Aucune activité publique.</div>';
  }
  $("#profileForm")?.addEventListener("submit",async e=>{e.preventDefault();clearAlert("profileAlert");let avatar_url=p.avatar_url;const file=$("#profileAvatar").files[0];if(file){if(file.size>2097152){alertBox("profileAlert","Fichier trop volumineux.");return}const ext=(file.name.split(".").pop()||"png").toLowerCase();const path=session.user.id+"/"+Date.now()+"."+ext;const up=await supabase.storage.from("forum-avatars").upload(path,file,{upsert:true});if(up.error){alertBox("profileAlert",up.error.message);return}avatar_url=supabase.storage.from("forum-avatars").getPublicUrl(path).data.publicUrl}const payload={display_name:$("#profileName").value.trim(),username:$("#profileUsername").value.trim(),bio:$("#profileBio").value.trim()||null,avatar_url};const {error}=await supabase.from("profiles").update(payload).eq("id",session.user.id);if(error)alertBox("profileAlert",error.message);else{alertBox("profileAlert","Profil enregistré.","success");setTimeout(()=>location.reload(),500)}});
}
async function initNotifications(){
  const host=$("#notificationsList");if(!host)return;
  if(!session){location.href=loginUrl();return}
  const {data,error}=await supabase.from("notifications").select(`id,type,title,body,is_read,created_at,topic_id,reply_id,support_ticket_id,actor:profiles!notifications_actor_id_fkey(id,display_name,username,avatar_url)`).order("created_at",{ascending:false}).limit(100);
  if(error){host.innerHTML='<div class="forum-empty">'+esc(error.message)+'</div>';return}
  let filter="all";
  const render=()=>{
    const list=(data||[]).filter(n=>filter==="all"||(filter==="forum"&&["reply","mention","solution","moderation"].includes(n.type))||(filter==="support"&&n.type==="support")||(filter==="unread"&&!n.is_read));
    host.innerHTML=list.length?list.map(n=>{const href=n.support_ticket_id?"support-ticket.html?id="+n.support_ticket_id:n.topic_id?"forum-topic.html?id="+n.topic_id:"#";return '<a class="notification-row'+(n.is_read?"":" unread")+'" href="'+href+'"><span><strong>'+esc(n.title)+'</strong><span>'+esc(n.body||"")+' · '+ago(n.created_at)+'</span></span><span>'+avatar(n.actor)+'</span></a>'}).join(""):'<div class="forum-empty"><strong>Aucune notification</strong>Aucun élément dans ce filtre.</div>';
  };
  $(".forum-filter-tab[data-notif-filter]").forEach(b=>b.addEventListener("click",()=>{$(".forum-filter-tab[data-notif-filter]").forEach(x=>x.classList.remove("active"));b.classList.add("active");filter=b.dataset.notifFilter;render()}));
  $("#markReadBtn")?.addEventListener("click",async()=>{await supabase.rpc("mark_notifications_read");location.reload()});
  render();
}
async function initSupport(){
  const list=$("#ticketList"),form=$("#ticketForm");if(!list||!form)return;
  if(!session){$("#supportGuest").hidden=false;form.hidden=true;list.innerHTML='<div class="forum-empty"><strong>Connectez-vous pour suivre vos demandes</strong>Vos tickets restent privés entre vous et le support.</div>';return}
  $("#supportGuest").hidden=true;form.hidden=false;
  const {data,error}=await supabase.from("support_tickets").select(`id,subject,category,priority,status,created_at,last_activity_at,requester_id,assigned_to,requester:profiles!support_tickets_requester_id_fkey(id,display_name,username,avatar_url)`).order("last_activity_at",{ascending:false});
  if(!error){
    const all=data||[],open=all.filter(t=>!["resolved","closed"].includes(t.status)).length,waiting=all.filter(t=>t.status==="waiting_user").length,resolved=all.filter(t=>["resolved","closed"].includes(t.status)).length;
    if($("#supportOpenCount"))$("#supportOpenCount").textContent=open;
    if($("#supportWaitingCount"))$("#supportWaitingCount").textContent=waiting;
    if($("#supportResolvedCount"))$("#supportResolvedCount").textContent=resolved;
  }
  if(error)list.innerHTML='<div class="forum-empty">'+esc(error.message)+'</div>';
  else list.innerHTML=data?.length?data.map(t=>'<a class="ticket-row" href="support-ticket.html?id='+t.id+'"><span><strong>'+esc(t.subject)+'</strong><span>'+esc(t.category)+' · '+ago(t.last_activity_at)+(staff(me)?" · "+esc(t.requester?.display_name||"Membre"):"")+'</span></span><span class="ticket-status">'+esc(t.status)+'</span></a>').join(""):'<div class="forum-empty"><strong>Aucune demande</strong>Créez un ticket si votre problème nécessite une réponse privée.</div>';
  form.addEventListener("submit",async e=>{e.preventDefault();clearAlert("ticketAlert");const payload={requester_id:session.user.id,subject:$("#ticketSubject").value.trim(),description:$("#ticketDescription").value.trim(),category:$("#ticketCategory").value};const {data,error}=await supabase.from("support_tickets").insert(payload).select("id").single();if(error)alertBox("ticketAlert",error.message);else location.href="support-ticket.html?id="+data.id});
}
async function initSupportTicket(){
  const mount=$("#supportTicketMount");if(!mount)return;
  if(!session){location.href=loginUrl();return}
  const id=new URLSearchParams(location.search).get("id");if(!id){mount.innerHTML='<div class="forum-empty">Demande introuvable.</div>';return}
  const {data:t,error}=await supabase.from("support_tickets").select(`*,requester:profiles!support_tickets_requester_id_fkey(id,display_name,username,avatar_url),assigned:profiles!support_tickets_assigned_to_fkey(id,display_name,username,avatar_url)`).eq("id",id).maybeSingle();
  if(error||!t){mount.innerHTML='<div class="forum-empty">Demande introuvable ou accès refusé.</div>';return}
  const {data:msgs}=await supabase.from("support_ticket_messages").select(`id,body,is_internal,created_at,edited_at,author_id,author:profiles!support_ticket_messages_author_id_fkey(id,display_name,username,avatar_url,role)`).eq("ticket_id",id).order("created_at");
  const canStaff=staff(me);
  mount.innerHTML='<div class="topic-page"><div class="topic-head-card"><div class="topic-author-line">'+avatar(t.requester)+'<span><strong>'+esc(t.requester?.display_name||"Membre")+'</strong><span>'+dt(t.created_at)+' · '+esc(t.category)+'</span></span></div><h1 class="topic-head-title">'+esc(t.subject)+'</h1><div class="topic-content">'+nl(t.description)+'</div><div class="topic-actions sticky-topic-actions"><span class="badge '+(t.status==="resolved"?"green":"blue")+'">'+esc(t.status)+'</span><span class="badge">'+esc(t.priority)+'</span>'+(canStaff?'<button class="mini-action" id="assignSelf">M’assigner</button><select class="forum-select" id="ticketStatus"><option value="open">open</option><option value="in_progress">in_progress</option><option value="waiting_user">waiting_user</option><option value="resolved">resolved</option><option value="closed">closed</option></select>':'<button class="mini-action" id="closeTicket">'+(t.status==="closed"?"Rouvrir":"Fermer la demande")+'</button>')+'</div></div><div class="forum-panel"><div class="forum-panel-head"><h2>Échanges</h2><span>'+(msgs?.length||0)+'</span></div><div class="ticket-thread" id="ticketThread" style="padding:12px"></div></div>'+(t.status!=="closed"||canStaff?'<form class="reply-form" id="ticketReplyForm"><label style="font-size:9px;font-weight:700">Répondre</label><textarea class="forum-textarea" id="ticketReplyBody" required></textarea>'+(canStaff?'<label style="font-size:8px;color:var(--muted)"><input type="checkbox" id="ticketInternal"> Note interne</label>':"")+'<div class="form-actions"><button class="btn green" type="submit">'+(window.SQIconly?SQIconly.icon('arrowRight','regular','sm'):'')+'<span>Envoyer</span></button></div><div class="forum-alert" id="ticketReplyAlert"></div></form>':'<div class="forum-alert show">Cette demande est fermée.</div>')+'</div>';
  $("#ticketThread").innerHTML=msgs?.length?msgs.map(m=>'<article class="ticket-message'+(staff(m.author)?" staff":"")+(m.is_internal?" internal":"")+'"><div class="reply-user">'+avatar(m.author)+'<span><strong>'+esc(m.author?.display_name||"Membre")+'</strong><span>'+dt(m.created_at)+(m.is_internal?" · note interne":"")+'</span></span></div><div class="reply-body">'+nl(m.body)+'</div></article>').join(""):'<div class="forum-empty">Aucun échange pour le moment.</div>';
  $("#ticketReplyForm")?.addEventListener("submit",async e=>{e.preventDefault();const {error}=await supabase.from("support_ticket_messages").insert({ticket_id:id,author_id:session.user.id,body:$("#ticketReplyBody").value.trim(),is_internal:canStaff&&$("#ticketInternal")?.checked});if(error)alertBox("ticketReplyAlert",error.message);else location.reload()});
  $("#assignSelf")?.addEventListener("click",async()=>{await supabase.from("support_tickets").update({assigned_to:session.user.id,status:"in_progress"}).eq("id",id);location.reload()});
  if(canStaff){$("#ticketStatus").value=t.status;$("#ticketStatus").addEventListener("change",async e=>{await supabase.from("support_tickets").update({status:e.target.value}).eq("id",id);location.reload()})}
  $("#closeTicket")?.addEventListener("click",async()=>{await supabase.from("support_tickets").update({status:t.status==="closed"?"open":"closed"}).eq("id",id);location.reload()});
  supabase.channel("support-"+id).on("postgres_changes",{event:"INSERT",schema:"public",table:"support_ticket_messages",filter:"ticket_id=eq."+id},()=>location.reload()).subscribe();
}


async function initBookmarks(){
  const host=$("#bookmarksList");if(!host)return;
  if(!session){location.href=loginUrl();return}
  const {data,error}=await supabase.from("forum_bookmarks").select(`
    topic_id,created_at,
    topic:forum_topics!forum_bookmarks_topic_id_fkey(
      id,title,body,status,is_pinned,is_featured,view_count,reply_count,vote_score,last_activity_at,created_at,author_id,category_id,
      category:forum_categories!forum_topics_category_id_fkey(id,slug,name,icon,kind),
      author:profiles!forum_topics_author_id_fkey(id,username,display_name,avatar_url,role,reputation)
    )
  `).eq("user_id",session.user.id).order("created_at",{ascending:false});
  if(error){host.innerHTML='<div class="forum-empty"><strong>Erreur</strong>'+esc(error.message)+'</div>';return}
  const topics=(data||[]).map(x=>x.topic).filter(Boolean);
  let query="";
  const render=()=>{const list=topics.filter(t=>!query||(t.title+" "+t.body+" "+(t.category?.name||"")).toLowerCase().includes(query));host.innerHTML=list.length?list.map(topicRow).join(""):'<div class="forum-empty"><strong>Aucun favori</strong>'+(query?"Aucun favori ne correspond à votre recherche.":"Enregistrez une discussion depuis sa page pour la retrouver ici.")+'</div>'};
  $("#bookmarkSearch")?.addEventListener("input",e=>{query=e.target.value.trim().toLowerCase();render()});
  render();
}

async function initModeration(){
  const mount=$("#moderationMount");if(!mount)return;
  if(!session){location.href=loginUrl();return}
  if(!staff(me)){mount.innerHTML='<div class="forum-empty"><strong>Accès refusé</strong>Cette page est réservée à l’équipe de modération.</div>';return}

  const [{data:reports,error:rErr},{data:users,error:uErr},{data:cats,error:cErr},{data:tickets,error:tErr}]=await Promise.all([
    supabase.from("forum_reports").select(`id,reason,details,status,created_at,topic_id,reply_id,reporter:profiles!forum_reports_reporter_id_fkey(id,display_name,username),topic:forum_topics!forum_reports_topic_id_fkey(id,title),reply:forum_replies!forum_reports_reply_id_fkey(id,body)`).order("created_at",{ascending:false}).limit(100),
    supabase.from("profiles").select("id,username,display_name,avatar_url,role,is_banned,reputation,created_at").order("created_at",{ascending:false}).limit(200),
    supabase.from("forum_categories").select("*").order("sort_order"),
    supabase.from("support_tickets").select(`id,subject,status,priority,last_activity_at,requester:profiles!support_tickets_requester_id_fkey(id,display_name,username)`).neq("status","closed").order("last_activity_at",{ascending:false}).limit(50)
  ]);
  if(rErr||uErr||cErr||tErr){mount.innerHTML='<div class="forum-empty"><strong>Erreur</strong>'+esc((rErr||uErr||cErr||tErr).message)+'</div>';return}

  mount.innerHTML='<div class="grid cols-2"><section class="forum-panel"><div class="forum-panel-head"><h2>Signalements</h2><span>'+(reports?.length||0)+'</span></div><div id="moderationReports"></div></section><section class="forum-panel"><div class="forum-panel-head"><h2>Tickets support ouverts</h2><span>'+(tickets?.length||0)+'</span></div><div id="moderationTickets"></div></section></div><section class="forum-panel" style="margin-top:16px"><div class="forum-panel-head"><h2>Catégories</h2></div><div id="moderationCategories"></div></section><section class="forum-panel" style="margin-top:16px"><div class="forum-panel-head"><h2>Membres</h2><span>'+(users?.length||0)+'</span></div><div id="moderationUsers"></div></section>';

  $("#moderationReports").innerHTML=reports?.length?reports.map(r=>'<div class="ticket-row"><span><strong>'+esc(r.reason)+'</strong><span>'+esc(r.topic?.title||r.reply?.body?.slice(0,80)||"Contenu")+' · '+dt(r.created_at)+'</span></span><select class="forum-select" data-report-status="'+r.id+'"><option value="open">open</option><option value="reviewing">reviewing</option><option value="resolved">resolved</option><option value="dismissed">dismissed</option></select></div>').join(""):'<div class="forum-empty">Aucun signalement.</div>';
  $$("[data-report-status]").forEach(s=>{const r=reports.find(x=>x.id===s.dataset.reportStatus);s.value=r.status;s.addEventListener("change",async()=>{await supabase.from("forum_reports").update({status:s.value,reviewed_by:session.user.id,reviewed_at:new Date().toISOString()}).eq("id",r.id)})});

  $("#moderationTickets").innerHTML=tickets?.length?tickets.map(t=>'<a class="ticket-row" href="support-ticket.html?id='+t.id+'"><span><strong>'+esc(t.subject)+'</strong><span>'+esc(t.requester?.display_name||"Membre")+' · '+ago(t.last_activity_at)+'</span></span><span class="ticket-status">'+esc(t.status)+'</span></a>').join(""):'<div class="forum-empty">Aucun ticket ouvert.</div>';

  $("#moderationCategories").innerHTML=cats.map(cat=>'<div class="ticket-row"><span><strong>'+esc(cat.name)+'</strong><span>'+esc(cat.kind)+' · '+esc(cat.slug)+'</span></span><button class="mini-action" data-cat-lock="'+cat.id+'">'+(window.SQIconly?SQIconly.icon('security',cat.is_locked?'fill':'outline','sm'):'')+'<span>'+(cat.is_locked?"Déverrouiller":"Verrouiller")+'</span></button></div>').join("");
  $$("[data-cat-lock]").forEach(b=>b.addEventListener("click",async()=>{const cat=cats.find(x=>x.id===b.dataset.catLock);await supabase.from("forum_categories").update({is_locked:!cat.is_locked}).eq("id",cat.id);location.reload()}));

  $("#moderationUsers").innerHTML=users.map(u=>'<div class="ticket-row"><span style="display:flex;gap:9px;align-items:center">'+avatar(u)+'<span><strong>'+esc(u.display_name)+'</strong><span>@'+esc(u.username)+' · '+esc(u.role)+' · '+u.reputation+' pts</span></span></span><span style="display:flex;gap:6px;align-items:center"><button class="mini-action'+(u.is_banned?" active":"")+'" data-ban="'+u.id+'">'+(window.SQIconly?SQIconly.icon('faq',u.is_banned?'fill':'outline','sm'):'')+'<span>'+(u.is_banned?"Réactiver":"Suspendre")+'</span></button>'+(me.role==="admin"?'<select class="forum-select" data-role="'+u.id+'"><option value="member">member</option><option value="moderator">moderator</option><option value="admin">admin</option></select>':'')+'</span></div>').join("");
  $$("[data-ban]").forEach(b=>b.addEventListener("click",async()=>{const u=users.find(x=>x.id===b.dataset.ban);await supabase.from("profiles").update({is_banned:!u.is_banned}).eq("id",u.id);location.reload()}));
  $$("[data-role]").forEach(s=>{const u=users.find(x=>x.id===s.dataset.role);s.value=u.role;s.addEventListener("change",async()=>{const {error}=await supabase.from("profiles").update({role:s.value}).eq("id",u.id);if(error)alert(error.message)})});
}

async function init(){
  await initAuth();
  const page=document.body.dataset.forumPage||"";
  if(page==="home")await initHome();
  else if(page==="forum")await initForum();
  else if(page==="topic")await initTopic();
  else if(page==="new-topic")await initNewTopic();
  else if(page==="login")await initLogin();
  else if(page==="profile")await initProfile();
  else if(page==="forgot-password")await initForgotPassword();
  else if(page==="reset-password")await initResetPassword();
  else if(page==="notifications")await initNotifications();
  else if(page==="support")await initSupport();
  else if(page==="support-ticket")await initSupportTicket();
  else if(page==="moderation")await initModeration();
  else if(page==="bookmarks")await initBookmarks();
}
init();
