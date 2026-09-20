/* Task-oriented assistance. No inferred role grants, no automatic submissions. */
(() => {
  'use strict';
  const H=window.SQHelp;if(!H)return;
  const $=(s,c=document)=>c.querySelector(s);
  const node=(tag,text='',cls='')=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
  const link=(label,path,cls='btn')=>{const a=node('a',label,cls);a.href=H.safe(path);return a;};
  const icon=name=>{const n=node('span','','sq-task-icon');n.innerHTML=window.SQIconly?.icon(name,'outline','md')||'';return n;};
  function commandLabels(){
    const b=$('#quickActionsBtn');if(b&&!b.querySelector('.sq-command-label'))b.append(node('span','Créer','sq-command-label'));
    const menu=$('#quickActionsMenu');menu?.querySelectorAll('a').forEach(a=>{if(a.href.endsWith('support.html'))a.href=H.local('support.html#nouvelle-demande');});
  }
  const profiles={
    client:{title:'Utiliser mon espace client',desc:'Activer votre accès, retrouver un document et demander de l’aide.',steps:[['Activer mon accès','workspace/workspace-activation.html'],['Me connecter','workspace/workspace-login.html'],['Retrouver un livrable','workspace/workspace-documents.html']],product:'workspace'},
    applications:{title:'Utiliser une application Squared',desc:'Choisissez le bon accès et suivez le guide adapté à votre appareil.',steps:[['Installer ou ouvrir Workspace','workspace/workspace-installation.html'],['Comprendre mon compte','workspace/workspace-account.html'],['Résoudre un problème','diagnostic.html']],product:'workspace'},
    equipe:{title:'Travailler avec Squared',desc:'Retrouvez les méthodes et les outils utiles à vos missions.',steps:[['Comprendre mon rôle','workspace/workspace-roles.html'],['Organiser mon travail','workspace/workspace-projects.html'],['Modifier un site Wix','wix-studio.html']],product:'workspace'}
  };
  function renderPath(){
    const host=$('#journeyMount');if(!host)return;
    const selected=new URLSearchParams(location.search).get('profil');
    const picks=Object.hasOwn(profiles,selected)?[[selected,profiles[selected]]]:Object.entries(profiles);
    host.replaceChildren();
    for(const [key,p] of picks){
      const section=node('section','','sq-journey-panel');section.append(node('h2',p.title),node('p',p.desc));
      const steps=node('ol','','sq-guide-steps');
      p.steps.forEach(([name,path])=>{const item=node('li');item.append(link(name,path,'sq-guide-link'));steps.append(item);});
      section.append(steps,link('Me guider pour un problème','diagnostic.html?product='+p.product),link('Autres parcours','parcours.html','sq-text-link'));host.append(section);
    }
  }
  function initDiagnostic(){
    const host=$('#diagnosticMount');if(!host)return;
    const c=H.context(),initial=new URLSearchParams(location.search);let step=initial.get('diagnostic')==='1'?3:0;
    const statusBox=node('div','','sq-diagnostic-status');let request=0;
    function render(){
      host.replaceChildren();const progress=node('p','Étape '+Math.min(step+1,3)+' sur 3','sq-step-caption');host.append(progress);
      if(step<3){
        const entries=[H.PRODUCTS,H.ISSUES,H.DEVICES][step],field=['product','issue','device'][step],titles=['Quel produit est concerné ?','Quel problème rencontrez-vous ?','Sur quel appareil ?'];
        const f=node('form'),fieldset=node('fieldset'),legend=node('legend',titles[step]);legend.tabIndex=-1;fieldset.append(legend);
        for(const [value,text] of Object.entries(entries)){
          const label=node('label','','sq-choice'),input=node('input');input.type='radio';input.name='diagnostic-choice';input.value=value;input.required=true;input.checked=c[field]===value;label.append(input,node('span',text));fieldset.append(label);
        }
        const actions=node('div','','form-actions');if(step){const back=node('button','Retour','btn');back.type='button';back.addEventListener('click',()=>{step--;render();});actions.append(back);}
        const next=node('button',step===2?'Voir les vérifications':'Continuer','btn green');next.type='submit';actions.append(next);f.append(fieldset,actions);host.append(f);
        f.addEventListener('submit',e=>{e.preventDefault();c[field]=f.querySelector('input:checked').value;c.checks=[];step++;render();});
        if(step>0)legend.focus({preventScroll:true});return;
      }
      const p=H.plan(c),heading=node('h2','Vérifions ensemble');heading.tabIndex=-1;host.append(heading,node('p',H.PRODUCTS[c.product]+' · '+H.ISSUES[c.issue]+' · '+H.DEVICES[c.device]));
      host.append(node('p','Cochez uniquement les vérifications réellement effectuées. Ce parcours ne modifie ni votre compte ni vos données.','sq-note'));
      const steps=node('div','','sq-checklist');p.steps.forEach((text,i)=>{const row=node('label','','sq-choice'),input=node('input');input.type='checkbox';input.checked=c.checks.includes(String(i));input.addEventListener('change',()=>{c.checks=[...steps.querySelectorAll('input')].flatMap((x,n)=>x.checked?[String(n)]:[]);updateLink();});row.append(input,node('span',text));steps.append(row);});
      host.append(steps,link('Ouvrir le guide détaillé',p.guide),statusBox);
      const decision=node('section','','sq-diagnostic-decision'),decisionTitle=node('h3','Le problème est-il résolu ?'),result=node('div','','sq-diagnostic-actions'),done=node('button','Oui, c’est résolu','btn green'),support=link('Non, contacter le support',H.contextLink('support.html',c),'btn'),copy=node('button','Copier le récapitulatif','btn sq-secondary-copy');decision.append(decisionTitle,result);
      const updateLink=()=>{support.href=H.contextLink('support.html',c);};
      const message=node('p','','sq-note');message.setAttribute('role','status');
      done.type=copy.type='button';done.addEventListener('click',()=>{decision.classList.add('is-resolved');decision.replaceChildren(node('div','','sq-success-mark'),node('h3','Vous pouvez reprendre votre travail.'),node('p','Aucun ticket n’a été créé.','sq-note'),link('Retour à Workspace','workspace.html','btn green'));message.textContent='';});
      copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(H.summary(c));message.textContent='Récapitulatif copié. Vérifiez-le avant de le partager.';}catch{message.textContent='La copie est indisponible. Le bouton « Préparer ma demande privée » reprend ce contexte.';}});
      result.append(done,support,copy);host.append(decision);const reset=node('button','Modifier mes réponses','btn');reset.type='button';reset.addEventListener('click',()=>{request++;step=0;render();});host.append(message,reset);heading.focus({preventScroll:true});
      const current=++request;statusBox.textContent='Consultation des incidents déclarés…';
      checkIncidents(c.product).then(data=>{if(current!==request)return;statusBox.replaceChildren();statusBox.append(node('strong','Incidents déclarés'));
        if(data===null)statusBox.append(node('p','L’état des incidents ne peut pas être confirmé actuellement. Cela ne prouve ni une panne ni un fonctionnement normal.'));
        else if(!data.length)statusBox.append(node('p','Aucun incident déclaré correspondant n’a été trouvé. Cela ne vérifie pas votre appareil ou toutes les fonctions du produit.'));
        else data.forEach(i=>statusBox.append(link(i.title,'incident.html?id='+encodeURIComponent(i.id),'sq-guide-link')));
        statusBox.append(link('Consulter les états des services','status.html','sq-text-link'));
      });
    }
    render();
  }
  async function checkIncidents(product){
    const b=await H.backend();if(!b)return null;
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);
    try{
      const [services,incidents]=await Promise.all([
        b.client.from('service_components').select('id,product').eq('public',true).eq('enabled',true).abortSignal(controller.signal),
        b.client.from('incidents').select('id,title,incident_components(component_id)').neq('status','resolved').limit(40).abortSignal(controller.signal)
      ]);
      if(services.error||incidents.error)throw Error('status');
      const targets=new Set((services.data||[]).filter(s=>H.norm(s.product).includes(product==='workspace'?'workspace':product==='site'?'squared group':'help')).map(s=>s.id));
      return (incidents.data||[]).filter(i=>(i.incident_components||[]).some(x=>targets.has(x.component_id)));
    }catch{return null;}finally{clearTimeout(timer);}
  }
  function supportContext(){
    if(!$('#ticketForm')||new URLSearchParams(location.search).get('diagnostic')!=='1')return;
    const c=H.context(),form=$('#ticketForm');
    if(!$('#ticketSubject').value)$('#ticketSubject').value=H.PRODUCTS[c.product]+' — '+H.ISSUES[c.issue];
    if(!$('#ticketDescription').value)$('#ticketDescription').value=H.summary(c);
    if($('#ticketProduct'))$('#ticketProduct').value=H.PRODUCTS[c.product];
    $('#ticketCategory').value=c.issue==='access'?'account':'technical';
    const notice=node('p','Contexte préparé depuis le dépannage guidé. Relisez et complétez votre demande ; rien n’est envoyé avant votre validation.','sq-note');form.prepend(notice);
  }
  async function continuation(){
    const host=$('#helpResume');if(!host)return;let epoch=0;
    const b=await H.backend();if(!b)return;
    async function load(){const current=++epoch;host.replaceChildren();host.hidden=true;
      const session=await b.currentSession();if(!session)return;
      const result=await b.client.from('support_tickets').select('id,subject').eq('requester_id',session.user.id).eq('status','waiting_user').order('last_activity_at',{ascending:false}).limit(3);
      if(current!==epoch||result.error||!(result.data||[]).length)return;
      host.append(node('h2','À reprendre'));result.data.forEach(t=>host.append(link(t.subject,'support-ticket.html?id='+encodeURIComponent(t.id),'sq-guide-link')));host.hidden=false;
    }
    b.client.auth.onAuthStateChange(event=>{if(['SIGNED_OUT','SIGNED_IN','USER_UPDATED'].includes(event)){++epoch;host.replaceChildren();host.hidden=true;if(event!=='SIGNED_OUT')setTimeout(()=>load().catch(()=>{}),0);}});
    load().catch(()=>{});
  }
  async function articleContinuity(){
    const article=$('.article'),head=$('.article-head',article||document);if(!article||!head)return;
    const filename=location.pathname.split('/').pop();
    if(!location.pathname.includes('/workspace/')||!H.GUIDE||!Object.values(H.GUIDE).some(x=>x.endsWith('/'+filename)))return;
    const issue=filename.includes('documents')?'documents':filename.includes('installation')?'installation':'access';
    const box=node('section','','sq-journey-panel');box.append(node('h2','La suite de votre parcours'),link('J’ai encore besoin d’aide',H.contextLink('diagnostic.html',{product:'workspace',issue,device:'web'}),'btn green'));
    const community=node('div');community.append(node('p','Questions liées à ce guide','sq-note'));box.append(community);const previous=article.querySelector('.article-tools');if(previous)previous.replaceWith(box);else article.append(box);
    const b=await H.backend();if(!b)return;
    try{const rows=(await b.search('Workspace '+(issue==='access'?'connexion':issue==='documents'?'document':'installation'),10)).filter(x=>x.kind==='forum').slice(0,3);
      if(rows.length)rows.forEach(r=>community.append(link(r.title,r.href,'sq-guide-link')));
      else community.append(link('Poser une question sur ce sujet',H.contextLink('forum-new.html',{product:'workspace',issue,device:'web'}),'sq-text-link'));
    }catch{community.append(link('Ouvrir la communauté','forum.html','sq-text-link'));}
  }
  function forumContext(){
    const title=$('#newTopicTitle');if(!title||title.value||new URLSearchParams(location.search).get('diagnostic')!=='1')return;
    const c=H.context();title.value=H.PRODUCTS[c.product]+' — '+H.ISSUES[c.issue];title.dispatchEvent(new Event('input'));
    $('#newTopicBody')?.insertAdjacentElement('beforebegin',node('p','Cette discussion sera publique. Ne recopiez aucun ticket privé, mot de passe ou document client.','sq-note'));
  }
  async function reading(){
    const key='sq-help-reading',home=$('#readingResume'),guide=document.querySelector('.article');
    const rows=await H.catalog();
    const clear=()=>{try{localStorage.removeItem(key);}catch{}home?.replaceChildren();if(home)home.hidden=true;};
    if(home){let item;try{item=JSON.parse(localStorage.getItem(key)||'null');}catch{}if(item&&Date.now()-Number(item.at)<30*86400000){const found=rows.find(r=>H.safe(r.href)===H.safe(item.href));if(found){home.hidden=false;home.append(node('h2','Reprendre ma lecture'),link(found.title,found.href,'sq-guide-link'));const remove=node('button','Retirer ce guide','btn');remove.type='button';remove.addEventListener('click',clear);home.append(remove);}}}
    const current=rows.find(r=>new URL(H.safe(r.href)).pathname===location.pathname);
    if(guide&&current){const box=node('div','','sq-guide-outcomes'),save=node('button','Garder ce guide pour plus tard','btn'),note=node('span','','sq-note');save.type='button';note.setAttribute('role','status');save.addEventListener('click',()=>{try{localStorage.setItem(key,JSON.stringify({href:current.href,at:Date.now()}));note.textContent='Guide public enregistré uniquement sur cet appareil.';}catch{note.textContent='Le stockage local est indisponible.';}});box.append(save,note);guide.append(box);}
    const b=await H.backend();b?.client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')clear();});
  }
  async function editorialSource(){
    const p=new URLSearchParams(location.search),source=p.get('source');if(p.has('id')||!source||!/^[0-9a-f-]{36}$/i.test(source)||!$('#knowledgeEditorMount'))return;
    const b=await H.backend();if(!b)return;const me=await b.currentProfile();if(!me||me.is_banned||!['admin','moderator'].includes(me.role))return;
    const wait=()=>new Promise(resolve=>{if($('#edBody'))return resolve(true);const obs=new MutationObserver(()=>{if($('#edBody')){obs.disconnect();clearTimeout(timer);resolve(true);}}),timer=setTimeout(()=>{obs.disconnect();resolve(false);},5000);obs.observe($('#knowledgeEditorMount'),{childList:true,subtree:true});});
    if(!await wait())return;
    const {data:t,error}=await b.client.from('forum_topics').select('id,title,body,accepted_reply_id').eq('id',source).maybeSingle();if(error||!t)return;
    let body=t.body;if(t.accepted_reply_id){const {data:r}=await b.client.from('forum_replies').select('body').eq('id',t.accepted_reply_id).maybeSingle();if(r)body=r.body;}
    if($('#edTitle').value||$('#edBody').value)return;
    $('#edTitle').value=t.title;$('#edState').value='draft';$('#edBody').value='# Contexte\n\nÀ vérifier et reformuler avant publication.\n\n# Réponse source\n\n'+body+'\n\n# Source communautaire\n\n[Discussion d’origine]('+H.local('forum-topic.html?id='+t.id)+')';$('#edBody').dispatchEvent(new Event('input'));
    $('#managedForm').prepend(node('p','Préparation non enregistrée depuis une discussion publique. Retirez les données personnelles et vérifiez la procédure. Rien n’est publié automatiquement.','sq-note'));
  }
  commandLabels();renderPath();initDiagnostic();supportContext();continuation().catch(()=>{});articleContinuity().catch(()=>{});forumContext();editorialSource().catch(()=>{});reading().catch(()=>{});
})();
