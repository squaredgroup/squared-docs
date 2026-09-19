import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './supabase-config.js';
const db=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const $=(s,r=document)=>r.querySelector(s);
const esc=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isStaff=p=>p&&!p.is_banned&&['moderator','admin'].includes(p.role);
const date=v=>v?new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium'}).format(new Date(v)):'Non revue';
async function read(q){const {data,error}=await q;if(error)throw error;return data;}
function safeLink(v){try{const u=new URL(v,location.href);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'#';}catch{return '#';}}
function inline(text){return esc(text).replace(/\[([^\]]+)\]\(([^\s)]+)\)/g,(_,label,url)=>'<a href="'+esc(safeLink(url.replaceAll('&amp;','&')))+'" rel="noreferrer">'+label+'</a>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/`([^`]+)`/g,'<code>$1</code>');}
function markdown(text){
 const out=[];let list=false,code=false,buffer=[];
 const closeList=()=>{if(list){out.push('</ul>');list=false;}};
 for(const line of String(text||'').split('\n')){
  if(line.startsWith('```')){closeList();if(code){out.push('<pre><code>'+esc(buffer.join('\n'))+'</code></pre>');buffer=[];}code=!code;continue;}
  if(code){buffer.push(line);continue;}
  const heading=line.match(/^(#{1,3})\s+(.+)$/);
  if(heading){closeList();const level=heading[1].length+1;out.push('<h'+level+'>'+inline(heading[2])+'</h'+level+'>');continue;}
  const item=line.match(/^\s*[-*]\s+(.+)$/);
  if(item){if(!list){out.push('<ul>');list=true;}out.push('<li>'+inline(item[1])+'</li>');continue;}
  closeList();if(line.trim())out.push('<p>'+inline(line)+'</p>');
 }
 closeList();if(code)out.push('<pre><code>'+esc(buffer.join('\n'))+'</code></pre>');return out.join('');
}
function message(text,ok=false){const el=$('#editorMessage');if(el){el.textContent=text;el.className='forum-alert show '+(ok?'success':'error');el.setAttribute('role',ok?'status':'alert');}}
async function article(){const mount=$('#managedArticle'),id=new URLSearchParams(location.search).get('id');if(!id){mount.innerHTML='<h1>Article introuvable</h1><p>Le lien ne comporte pas de référence.</p>';return;}
 try{const d=await read(db.from('knowledge_documents').select('id,title,description,content_markdown,source_kind,href,status,revision,last_reviewed_at,product').eq('id',id).maybeSingle());if(!d||d.status!=='published'){mount.innerHTML='<h1>Article indisponible</h1><p>Ce contenu n’est pas publié. Consultez la recherche ou le support.</p>';return;}
 document.title=d.title+' — Squared Help Center';const canonical=document.createElement('link');canonical.rel='canonical';canonical.href=location.origin+location.pathname+'?id='+encodeURIComponent(d.id);document.head.append(canonical);
 if(d.source_kind!=='managed'){mount.innerHTML='<h1>'+esc(d.title)+'</h1><p>'+esc(d.description)+'</p><a class="btn" href="'+esc(safeLink(d.href))+'">Ouvrir le guide versionné</a>';return;}
 mount.innerHTML='<header class="article-head"><div class="eyebrow">'+esc(d.product||'Documentation')+'</div><h1>'+esc(d.title)+'</h1><p>'+esc(d.description)+'</p><div class="article-meta"><span class="pill">Révision '+d.revision+'</span><span class="pill">Relu : '+date(d.last_reviewed_at)+'</span></div></header><div class="managed-content">'+markdown(d.content_markdown)+'</div><section class="article-tools"><div class="article-tool-card"><strong>Besoin d’aide ?</strong><p>Une question générale va au forum. Un contexte confidentiel va au support privé.</p><a class="btn" href="forum.html">Forum</a> <a class="btn" href="support.html">Support privé</a></div></section>';
 const toc=$('#managedToc');toc.innerHTML='<strong>Sur cette page</strong>';mount.querySelectorAll('h2,h3').forEach((h,i)=>{h.id='section-'+i;const a=document.createElement('a');a.href='#'+h.id;a.textContent=h.textContent;toc.append(a);});
 }catch{mount.innerHTML='<h1>Lecture momentanément indisponible</h1><p>Le service ne répond pas. La documentation statique reste accessible.</p><a class="btn" href="index.html">Accueil</a>';}}
async function editor(){const mount=$('#knowledgeEditorMount');const {data:{session}}=await db.auth.getSession();if(!session){location.href='login.html?next=editorial.html';return;}
 const me=await read(db.from('profiles').select('id,role,is_banned').eq('id',session.user.id).maybeSingle());if(!isStaff(me)){mount.innerHTML='<div role="alert">Accès réservé à l’équipe.</div>';return;}
 const id=new URLSearchParams(location.search).get('id');let doc=id?await read(db.from('knowledge_documents').select('*').eq('id',id).maybeSingle()):null;
 if(id&&!doc)throw new Error('Article introuvable.');
 if(doc&&doc.source_kind!=='managed'){mount.innerHTML='<h2>'+esc(doc.title)+'</h2><p>Ce guide est conservé en HTML dans GitHub. Pour éviter deux versions contradictoires, son contenu n’est pas réécrit par cet éditeur.</p><a class="btn" href="'+esc(safeLink(doc.href))+'">Lire le guide</a> <a class="btn" href="admin.html#knowledge">Revenir à la revue éditoriale</a>';return;}
 mount.innerHTML='<div class="editor-layout"><form id="managedForm" class="form-card"><div class="form-group"><label for="edTitle">Titre</label><input class="forum-input" id="edTitle" required minlength="3" maxlength="180"></div><div class="form-group"><label for="edProduct">Produit</label><input class="forum-input" id="edProduct" maxlength="100"></div><div class="form-group"><label for="edDescription">Résumé</label><textarea class="forum-textarea" id="edDescription" maxlength="800"></textarea></div><div class="form-group"><label for="edBody">Contenu</label><textarea class="forum-textarea" id="edBody" maxlength="100000" rows="16"></textarea><p class="form-help">Titres #, listes -, gras **texte**, liens [texte](https://…). Le HTML brut est affiché comme texte, pas exécuté.</p></div><div class="form-group"><label for="edState">État éditorial</label><select class="forum-select" id="edState"><option value="draft">Brouillon</option><option value="review">À relire</option><option value="published">Publié</option><option value="deprecated">Obsolète</option><option value="archived">Archivé</option></select></div><div class="form-group"><label for="edDays">Prochaine revue (jours)</label><input class="forum-input" id="edDays" type="number" min="7" max="365" value="90"></div><div class="form-actions"><button class="btn green" type="submit">Enregistrer</button><a class="btn" href="admin.html#knowledge">Retour</a></div><div id="editorMessage" class="forum-alert"></div></form><aside><h2>Aperçu non publié</h2><div class="managed-content form-card" id="managedPreview"></div><h2>Révisions précédentes</h2><div id="revisionList"></div></aside></div>';
 $('#edTitle').value=doc?.title||'';$('#edProduct').value=doc?.product||'Help Center';$('#edDescription').value=doc?.description||'';$('#edBody').value=doc?.content_markdown||'';$('#edState').value=doc?.status||'draft';
 const preview=()=>$('#managedPreview').innerHTML='<h2>'+esc($('#edTitle').value)+'</h2>'+markdown($('#edBody').value);$('#edTitle').addEventListener('input',preview);$('#edBody').addEventListener('input',preview);preview();
 async function revisions(){if(!doc){$('#revisionList').textContent='La première sauvegarde créera le document.';return;}const history=await read(db.from('document_revisions').select('revision,created_at').eq('document_id',doc.id).order('revision',{ascending:false}).limit(20));$('#revisionList').innerHTML=history.length?history.map(r=>'<p>Révision '+r.revision+' · '+date(r.created_at)+'</p>').join(''):'Aucune ancienne révision.';}
 await revisions();
 $('#managedForm').addEventListener('submit',async e=>{e.preventDefault();const button=e.submitter;if(button.disabled)return;button.disabled=true;try{if($('#edState').value==='published'&&!confirm('Publier cette version dans le centre d’aide public ?'))return;const saved=await read(db.rpc('save_help_document',{p_id:doc?.id||null,p_expected_revision:doc?.revision||null,p_title:$('#edTitle').value.trim(),p_product:$('#edProduct').value.trim(),p_description:$('#edDescription').value.trim(),p_content:$('#edBody').value,p_status:$('#edState').value,p_review_days:Number($('#edDays').value)}));doc={...doc,...saved};history.replaceState(null,'','editorial.html?id='+saved.id);message(saved.status==='published'?'Article publié. Il est disponible dans la recherche.':'Brouillon enregistré. Il n’est pas public.',true);await revisions();}catch(e){message(e.message||'Enregistrement impossible.');}finally{button.disabled=false;}});
}
if(document.body.dataset.knowledgePage==='article')article();else editor().catch(e=>{const m=$('#knowledgeEditorMount');m.textContent=e.message||'Impossible de charger l’éditeur';m.setAttribute('role','alert');});
