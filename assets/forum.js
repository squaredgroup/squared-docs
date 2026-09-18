import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
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
    host.innerHTML='<a class="btn" href="'+loginUrl()+'">Se connecter</a>';
    return;
  }
  const n=await unreadCount();
  host.innerHTML='<a class="account-chip" href="profile.html">'+avatar(me)+'<span>'+esc(me?.display_name||"Mon compte")+'</span>'+(n?'<span class="notification-dot">'+n+'</span>':'')+'</a><button class="icon-btn" id="forumLogout" title="Se déconnecter">↪</button>';
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
async function initForum(){
  const catsHost=$("#forumCategories"),topicsHost=$("#forumTopics");
  if(!catsHost||!topicsHost)return;
  topicsHost.innerHTML='<div class="loading">Chargement des discussions…</div>';
  try{
    const [cats,topics]=await Promise.all([getCategories(),getTopics()]);
    let currentCat="all",query="",sort="recent";
    const counts={};topics.forEach(t=>counts[t.category_id]=(counts[t.category_id]||0)+1);
    catsHost.innerHTML='<button class="forum-cat active" data-cat="all"><span class="forum-cat-icon">ALL</span><span><strong>Toutes les discussions</strong><span>Activité récente</span></span><em>'+topics.length+'</em></button>'+cats.map(c=>'<button class="forum-cat" data-cat="'+c.id+'"><span class="forum-cat-icon">'+esc(c.icon)+'</span><span><strong>'+esc(c.name)+'</strong><span>'+esc(c.description)+'</span></span><em>'+(counts[c.id]||0)+'</em></button>').join("");
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
async function reportContent(kind,id){
  if(!requireAuth())return;
  const reason=prompt("Motif du signalement (spam, contenu inapproprié, information sensible…) :");
  if(!reason)return;
  const details=prompt("Détails complémentaires (optionnel) :")||null;
  const {error}=await supabase.from("forum_reports").insert({reporter_id:session.user.id,[kind+"_id"]:id,reason,details});
  if(error)alert(error.message);else alert("Signalement envoyé.");
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
    host.innerHTML='<div class="topic-page"><div class="topic-head-card"><div class="topic-author-line">'+avatar(topic.author)+'<span><strong>'+esc(topic.author?.display_name||topic.author?.username||"Membre")+'</strong><span>'+esc(topic.category?.name||"Discussion")+' · '+dt(topic.created_at)+'</span></span></div><h1 class="topic-head-title">'+esc(topic.title)+'</h1><div class="topic-content">'+nl(topic.body)+'</div><div class="reaction-row">'+["👍","❤️","🎉"].map(x=>'<button class="reaction" data-react-kind="topic" data-react-id="'+id+'" data-emoji="'+x+'">'+x+' '+(rc[x]||0)+'</button>').join("")+'</div><div class="topic-actions"><button class="mini-action" data-vote-kind="topic" data-vote-id="'+id+'" data-vote="1">▲ '+topic.vote_score+'</button><button class="mini-action" data-bookmark="'+id+'">'+(bmark?"★ Enregistré":"☆ Enregistrer")+'</button>'+(owner?'<button class="mini-action" data-resolve="'+id+'">'+(topic.status==="resolved"?"Rouvrir":"Marquer résolu")+'</button>':"")+(canStaff?'<button class="mini-action" data-pin="'+id+'">'+(topic.is_pinned?"Désépingler":"Épingler")+'</button><button class="mini-action" data-lock="'+id+'">'+(topic.status==="locked"?"Déverrouiller":"Verrouiller")+'</button>':"")+'<button class="mini-action danger" data-report-kind="topic" data-report-id="'+id+'">Signaler</button></div></div><div class="forum-panel"><div class="forum-panel-head"><h2>Réponses</h2><span>'+replies.length+'</span></div><div class="reply-list" id="replyList"></div></div><div id="replyBox"></div></div>';
    const list=$("#replyList");list.innerHTML=replies.length?replies.map(r=>{const counts=reactionCounts(reacts,"reply",r.id);return '<article class="reply-card'+(r.is_solution?" solution":"")+'"><div class="reply-head"><div class="reply-user">'+avatar(r.author)+'<span><strong>'+esc(r.author?.display_name||r.author?.username||"Membre")+'</strong><span>'+dt(r.created_at)+(r.edited_at?" · modifié":"")+'</span></span></div>'+(r.is_solution?'<span class="badge green">Solution</span>':"")+'</div><div class="reply-body">'+nl(r.body)+'</div><div class="reaction-row">'+["👍","❤️","🎉"].map(x=>'<button class="reaction" data-react-kind="reply" data-react-id="'+r.id+'" data-emoji="'+x+'">'+x+' '+(counts[x]||0)+'</button>').join("")+'</div><div class="reply-actions"><button class="mini-action" data-vote-kind="reply" data-vote-id="'+r.id+'" data-vote="1">▲ '+r.vote_score+'</button>'+((owner||canStaff)&&!r.is_solution?'<button class="mini-action" data-solution="'+r.id+'">Accepter comme solution</button>':"")+'<button class="mini-action danger" data-report-kind="reply" data-report-id="'+r.id+'">Signaler</button></div></article>'}).join(""):'<div class="forum-empty">Aucune réponse pour le moment.</div>';
    const box=$("#replyBox");
    if(topic.status==="locked"||topic.status==="archived")box.innerHTML='<div class="forum-alert show error">Cette discussion est fermée.</div>';
    else if(session)box.innerHTML='<form class="reply-form" id="replyForm"><label for="replyBody" style="font-size:9px;font-weight:700">Votre réponse</label><textarea class="forum-textarea" id="replyBody" required minlength="2" maxlength="15000" placeholder="Écrivez une réponse utile et précise…"></textarea><div class="form-actions"><button class="btn green" type="submit">Publier la réponse</button></div><div class="forum-alert" id="replyAlert"></div></form>';
    else box.innerHTML='<div class="forum-auth-card"><strong>Vous souhaitez répondre ?</strong><p>Connectez-vous pour participer à la discussion.</p><a class="btn green" href="'+loginUrl()+'">Se connecter</a></div>';
    $("#replyForm")?.addEventListener("submit",async e=>{e.preventDefault();clearAlert("replyAlert");const body=$("#replyBody").value.trim();const {error}=await supabase.from("forum_replies").insert({topic_id:id,author_id:session.user.id,body});if(error)alertBox("replyAlert",error.message);else location.reload()});
    $$("[data-vote-kind]").forEach(b=>b.addEventListener("click",()=>vote(b.dataset.voteKind,b.dataset.voteId,Number(b.dataset.vote))));
    $$("[data-react-kind]").forEach(b=>b.addEventListener("click",()=>toggleReaction(b.dataset.reactKind,b.dataset.reactId,b.dataset.emoji)));
    $("[data-bookmark]")?.addEventListener("click",e=>toggleBookmark(e.currentTarget.dataset.bookmark));
    $$("[data-report-kind]").forEach(b=>b.addEventListener("click",()=>reportContent(b.dataset.reportKind,b.dataset.reportId)));
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
    form.addEventListener("submit",async e=>{e.preventDefault();clearAlert("newTopicAlert");const title=$("#newTopicTitle").value.trim(),body=$("#newTopicBody").value.trim(),category_id=$("#newTopicCategory").value;const {data,error}=await supabase.from("forum_topics").insert({author_id:session.user.id,category_id,title,body}).select("id").single();if(error)alertBox("newTopicAlert",error.message);else location.href="forum-topic.html?id="+data.id});
  }catch(e){alertBox("newTopicAlert",e.message)}
}
function safeNext(){const n=new URLSearchParams(location.search).get("next");return n&&/^[a-z0-9_\-./?=#%]+$/i.test(n)&&!n.startsWith("//")?n:"forum.html"}
async function initLogin(){
  const signIn=$("#signInForm"),signUp=$("#signUpForm");if(!signIn||!signUp)return;
  if(session){$("#authAlready").innerHTML='<div class="forum-alert show success">Vous êtes déjà connecté. <a href="'+safeNext()+'">Continuer →</a></div>'}
  $$(".auth-tab").forEach(b=>b.addEventListener("click",()=>{$$(".auth-tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");signIn.hidden=b.dataset.authTab!=="signin";signUp.hidden=b.dataset.authTab!=="signup"}));
  signIn.addEventListener("submit",async e=>{e.preventDefault();clearAlert("authAlert");const email=$("#loginEmail").value.trim(),password=$("#loginPassword").value;const {error}=await supabase.auth.signInWithPassword({email,password});if(error)alertBox("authAlert",error.message);else location.href=safeNext()});
  signUp.addEventListener("submit",async e=>{e.preventDefault();clearAlert("authAlert");const display_name=$("#signupName").value.trim(),email=$("#signupEmail").value.trim(),password=$("#signupPassword").value;if(password.length<8){alertBox("authAlert","Le mot de passe doit contenir au moins 8 caractères.");return}const {data,error}=await supabase.auth.signUp({email,password,options:{data:{display_name}}});if(error)alertBox("authAlert",error.message);else if(data.session)location.href=safeNext();else alertBox("authAlert","Compte créé. Vérifiez votre e-mail pour confirmer votre adresse, puis revenez vous connecter.","success")});
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
  $("#profileForm")?.addEventListener("submit",async e=>{e.preventDefault();clearAlert("profileAlert");let avatar_url=p.avatar_url;const file=$("#profileAvatar").files[0];if(file){if(file.size>2097152){alertBox("profileAlert","Fichier trop volumineux.");return}const ext=(file.name.split(".").pop()||"png").toLowerCase();const path=session.user.id+"/"+Date.now()+"."+ext;const up=await supabase.storage.from("forum-avatars").upload(path,file,{upsert:true});if(up.error){alertBox("profileAlert",up.error.message);return}avatar_url=supabase.storage.from("forum-avatars").getPublicUrl(path).data.publicUrl}const payload={display_name:$("#profileName").value.trim(),username:$("#profileUsername").value.trim(),bio:$("#profileBio").value.trim()||null,avatar_url};const {error}=await supabase.from("profiles").update(payload).eq("id",session.user.id);if(error)alertBox("profileAlert",error.message);else{alertBox("profileAlert","Profil enregistré.","success");setTimeout(()=>location.reload(),500)}});
}
async function initNotifications(){
  const host=$("#notificationsList");if(!host)return;
  if(!session){location.href=loginUrl();return}
  const {data,error}=await supabase.from("notifications").select(`id,type,title,body,is_read,created_at,topic_id,reply_id,support_ticket_id,actor:profiles!notifications_actor_id_fkey(id,display_name,username,avatar_url)`).order("created_at",{ascending:false}).limit(100);
  if(error){host.innerHTML='<div class="forum-empty">'+esc(error.message)+'</div>';return}
  host.innerHTML=data?.length?data.map(n=>{const href=n.support_ticket_id?"support-ticket.html?id="+n.support_ticket_id:n.topic_id?"forum-topic.html?id="+n.topic_id:"#";return '<a class="notification-row'+(n.is_read?"":" unread")+'" href="'+href+'"><span><strong>'+esc(n.title)+'</strong><span>'+esc(n.body||"")+' · '+ago(n.created_at)+'</span></span><span>'+avatar(n.actor)+'</span></a>'}).join(""):'<div class="forum-empty"><strong>Aucune notification</strong>Vous êtes à jour.</div>';
  $("#markReadBtn")?.addEventListener("click",async()=>{await supabase.rpc("mark_notifications_read");location.reload()});
}
async function initSupport(){
  const list=$("#ticketList"),form=$("#ticketForm");if(!list||!form)return;
  if(!session){$("#supportGuest").hidden=false;form.hidden=true;list.innerHTML='<div class="forum-empty"><strong>Connectez-vous pour suivre vos demandes</strong>Vos tickets restent privés entre vous et le support.</div>';return}
  $("#supportGuest").hidden=true;form.hidden=false;
  const {data,error}=await supabase.from("support_tickets").select(`id,subject,category,priority,status,created_at,last_activity_at,requester_id,assigned_to,requester:profiles!support_tickets_requester_id_fkey(id,display_name,username,avatar_url)`).order("last_activity_at",{ascending:false});
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
  mount.innerHTML='<div class="topic-page"><div class="topic-head-card"><div class="topic-author-line">'+avatar(t.requester)+'<span><strong>'+esc(t.requester?.display_name||"Membre")+'</strong><span>'+dt(t.created_at)+' · '+esc(t.category)+'</span></span></div><h1 class="topic-head-title">'+esc(t.subject)+'</h1><div class="topic-content">'+nl(t.description)+'</div><div class="topic-actions"><span class="badge '+(t.status==="resolved"?"green":"blue")+'">'+esc(t.status)+'</span><span class="badge">'+esc(t.priority)+'</span>'+(canStaff?'<button class="mini-action" id="assignSelf">M’assigner</button><select class="forum-select" id="ticketStatus"><option value="open">open</option><option value="in_progress">in_progress</option><option value="waiting_user">waiting_user</option><option value="resolved">resolved</option><option value="closed">closed</option></select>':'<button class="mini-action" id="closeTicket">'+(t.status==="closed"?"Rouvrir":"Fermer la demande")+'</button>')+'</div></div><div class="forum-panel"><div class="forum-panel-head"><h2>Échanges</h2><span>'+(msgs?.length||0)+'</span></div><div class="ticket-thread" id="ticketThread" style="padding:12px"></div></div>'+(t.status!=="closed"||canStaff?'<form class="reply-form" id="ticketReplyForm"><label style="font-size:9px;font-weight:700">Répondre</label><textarea class="forum-textarea" id="ticketReplyBody" required></textarea>'+(canStaff?'<label style="font-size:8px;color:var(--muted)"><input type="checkbox" id="ticketInternal"> Note interne</label>':"")+'<div class="form-actions"><button class="btn green" type="submit">Envoyer</button></div><div class="forum-alert" id="ticketReplyAlert"></div></form>':'<div class="forum-alert show">Cette demande est fermée.</div>')+'</div>';
  $("#ticketThread").innerHTML=msgs?.length?msgs.map(m=>'<article class="ticket-message'+(staff(m.author)?" staff":"")+(m.is_internal?" internal":"")+'"><div class="reply-user">'+avatar(m.author)+'<span><strong>'+esc(m.author?.display_name||"Membre")+'</strong><span>'+dt(m.created_at)+(m.is_internal?" · note interne":"")+'</span></span></div><div class="reply-body">'+nl(m.body)+'</div></article>').join(""):'<div class="forum-empty">Aucun échange pour le moment.</div>';
  $("#ticketReplyForm")?.addEventListener("submit",async e=>{e.preventDefault();const {error}=await supabase.from("support_ticket_messages").insert({ticket_id:id,author_id:session.user.id,body:$("#ticketReplyBody").value.trim(),is_internal:canStaff&&$("#ticketInternal")?.checked});if(error)alertBox("ticketReplyAlert",error.message);else location.reload()});
  $("#assignSelf")?.addEventListener("click",async()=>{await supabase.from("support_tickets").update({assigned_to:session.user.id,status:"in_progress"}).eq("id",id);location.reload()});
  if(canStaff){$("#ticketStatus").value=t.status;$("#ticketStatus").addEventListener("change",async e=>{await supabase.from("support_tickets").update({status:e.target.value}).eq("id",id);location.reload()})}
  $("#closeTicket")?.addEventListener("click",async()=>{await supabase.from("support_tickets").update({status:t.status==="closed"?"open":"closed"}).eq("id",id);location.reload()});
  supabase.channel("support-"+id).on("postgres_changes",{event:"INSERT",schema:"public",table:"support_ticket_messages",filter:"ticket_id=eq."+id},()=>location.reload()).subscribe();
}
async function init(){
  await initAuth();
  const page=document.body.dataset.forumPage||"";
  if(page==="forum")await initForum();
  else if(page==="topic")await initTopic();
  else if(page==="new-topic")await initNewTopic();
  else if(page==="login")await initLogin();
  else if(page==="profile")await initProfile();
  else if(page==="notifications")await initNotifications();
  else if(page==="support")await initSupport();
  else if(page==="support-ticket")await initSupportTicket();
}
init();
