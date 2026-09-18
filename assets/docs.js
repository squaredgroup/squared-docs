const $=(s,c=document)=>c.querySelector(s), $$=(s,c=document)=>[...c.querySelectorAll(s)];
const root=document.documentElement;
function getStore(k){try{return localStorage.getItem(k)}catch{return null}}
function setStore(k,v){try{localStorage.setItem(k,v)}catch{}}
const saved=getStore('sq-docs-theme');root.dataset.theme=saved||'light';
function syncThemeButton(){const b=$('#themeBtn');if(b){const k=root.dataset.theme==='light'?'moon':'sun';b.innerHTML=window.SQIconly?SQIconly.icon(k,'outline','md'):'';b.setAttribute('aria-label',root.dataset.theme==='light'?'Activer le thème sombre':'Activer le thème clair')}const m=$('meta[name="theme-color"]');if(m)m.setAttribute('content',root.dataset.theme==='light'?'#F7F7F4':'#0D0D0E')}
function toggleTheme(){root.dataset.theme=root.dataset.theme==='light'?'dark':'light';setStore('sq-docs-theme',root.dataset.theme);syncThemeButton()}
syncThemeButton();$('#themeBtn')?.addEventListener('click',toggleTheme);
$('#menuBtn')?.addEventListener('click',()=>$('#sidebar')?.classList.toggle('open'));
$$('.hc-nav-link,.hc-sub-link').forEach(a=>a.addEventListener('click',()=>{if(innerWidth<=860)$('#sidebar')?.classList.remove('open')}));
const progressEl=$('#progress');function progress(){if(!progressEl)return;const d=document.documentElement,max=d.scrollHeight-d.clientHeight;progressEl.style.width=(max>0?d.scrollTop/max*100:0)+'%'}addEventListener('scroll',progress,{passive:true});progress();

const subdirs=['wix','workspace','design-system','development','security'];
const nested=subdirs.some(d=>location.pathname.toLowerCase().includes('/'+d+'/'));
const prefix=nested?'../':'';
const hrefFor=href=>/^https?:\/\//.test(href)?href:prefix+href;

const SEARCH=[
{title:'Accueil du Help Center',desc:'Recherche, base de connaissances, communauté et support.',href:'index.html',type:'Accueil',icon:'⌂',tags:'help center aide support docs accueil'},
{title:'Bien démarrer',desc:'Comprendre comment utiliser la documentation, la communauté et le support.',href:'getting-started.html',type:'Guide',icon:'GO',tags:'debut commencer aide recherche canal'},
{title:'FAQ',desc:'Réponses courtes aux questions fréquentes.',href:'faq.html',type:'Guide',icon:'FAQ',tags:'questions reponses aide forum support'},
{title:'Guides rapides',desc:'Procédures courtes pour les actions les plus fréquentes.',href:'quick-guides.html',type:'Guide',icon:'QG',tags:'quick guide procedure publication incident responsive'},
{title:'Demander de l’aide efficacement',desc:'Structurer une question ou un ticket pour obtenir une réponse utile.',href:'asking-for-help.html',type:'Guide',icon:'ASK',tags:'aide question support contexte objectif erreur'},
{title:'Règles de communauté',desc:'Cadre de participation au forum Squared.',href:'community-guidelines.html',type:'Communauté',icon:'RULE',tags:'community règles forum moderation conduite'},
{title:'Confidentialité du support',desc:'Ce qui reste privé et ce qui ne doit jamais être publié.',href:'support-privacy.html',type:'Sécurité',icon:'PRV',tags:'support privacy confidentialité secret donnée client'},
{title:'Support privé',desc:'Créer et suivre une demande de support directement dans le Help Center.',href:'support.html',type:'Support',icon:'SUP',tags:'support aide contact ticket assistance privé'},
{title:'Forum Squared',desc:'Questions, réponses, idées, annonces et échanges directement dans le Help Center.',href:'forum.html',type:'Communauté',icon:'COM',tags:'forum discussion question réponse idée communauté'},
{title:'Statut',desc:'État et dépendances du Squared Help Center.',href:'status.html',type:'Ressource',icon:'STS',tags:'status statut incident disponibilité github pages'},
{title:'Nouveautés',desc:'Historique des versions et changements du Help Center.',href:'changelog.html',type:'Mises à jour',icon:'NEW',tags:'changelog updates versions nouveautés'},

{title:'Wix Studio',desc:'Guide complet : responsive, CMS, SEO, Velo, publication et maintenance.',href:'wix-studio.html',type:'Wix',icon:'WX',tags:'wix studio guide complet'},
{title:'Wix — Vue d’ensemble',desc:'Interface, structure de page et règles avant modification.',href:'wix/wix-overview.html',type:'Wix',icon:'WX',tags:'interface structure calques niveau intervention'},
{title:'Wix — Responsive',desc:'Breakpoints, cascade, overrides et contrôle responsive.',href:'wix/wix-responsive.html',type:'Wix',icon:'RWD',tags:'responsive breakpoint mobile tablette override'},
{title:'Wix — CMS & données',desc:'Collections, champs, datasets et pages dynamiques.',href:'wix/wix-cms.html',type:'Wix',icon:'CMS',tags:'cms collection dataset champ référence page dynamique'},
{title:'Wix — SEO',desc:'URLs, titles, metas, headings et indexation.',href:'wix/wix-seo.html',type:'Wix',icon:'SEO',tags:'seo url slug meta h1 alt indexation'},
{title:'Wix — Velo & code',desc:'IDs, field keys, code et risques structurels.',href:'wix/wix-velo.html',type:'Wix',icon:'</>',tags:'velo code javascript id field key'},
{title:'Wix — Publication',desc:'Preview, checklist, Publish et contrôle live.',href:'wix/wix-publishing.html',type:'Wix',icon:'PUB',tags:'publish preview publication release checklist'},
{title:'Wix — Dépannage',desc:'Diagnostic, symptômes fréquents et restauration.',href:'wix/wix-troubleshooting.html',type:'Wix',icon:'FIX',tags:'bug erreur dépannage restauration diagnostic'},
{title:'Checklist avant publication Wix',desc:'Contrôles finaux avant une mise en production.',href:'wix-studio.html#chapitre-27',type:'Checklist',icon:'✓',tags:'checklist publication wix'},

{title:'Squared Workspace',desc:'Guide produit : rôles, navigation, projets, documents et support.',href:'workspace.html',type:'Produit',icon:'WS',tags:'workspace erp client collaborateur produit'},
{title:'Workspace — Vue d’ensemble',desc:'Rôle du Workspace, modules et expérience contextuelle.',href:'workspace/workspace-overview.html',type:'Produit',icon:'WS',tags:'workspace overview modules dashboard'},
{title:'Workspace — Rôles & accès',desc:'Permissions, moindre privilège et surfaces visibles.',href:'workspace/workspace-roles.html',type:'Produit',icon:'ACL',tags:'roles permissions client collaborateur admin acces'},
{title:'Workspace — Navigation',desc:'Navigation cohérente et adaptée au rôle connecté.',href:'workspace/workspace-navigation.html',type:'Produit',icon:'NAV',tags:'navigation dashboard mobile breadcrumb'},
{title:'Workspace — Projets & tâches',desc:'Projet, mission, tâche, statuts et visibilité.',href:'workspace/workspace-projects.html',type:'Produit',icon:'PRJ',tags:'projet mission tache statut planning'},
{title:'Workspace — Documents & livrables',desc:'Fichiers, versions, livrables et contrats.',href:'workspace/workspace-documents.html',type:'Produit',icon:'DOC',tags:'document livrable contrat version fichier'},
{title:'Workspace — Dépannage',desc:'Accès, données manquantes et diagnostic.',href:'workspace/workspace-troubleshooting.html',type:'Produit',icon:'FIX',tags:'workspace bug accès donnée support'},

{title:'Design System',desc:'Fondations UI, composants, tokens, motion et accessibilité.',href:'design-system.html',type:'Design',icon:'DS',tags:'design ui ux composants tokens motion'},
{title:'Design System — Fondations',desc:'Espacement, rayons, surfaces et élévation.',href:'design-system/ds-foundations.html',type:'Design',icon:'DS',tags:'fondations spacing radius shadow layout'},
{title:'Design System — Typographie',desc:'Space Grotesk, hiérarchie et lisibilité.',href:'design-system/ds-typography.html',type:'Design',icon:'Aa',tags:'typographie font space grotesk texte'},
{title:'Design System — Couleurs',desc:'Accent vert, neutres, sémantique et contraste.',href:'design-system/ds-colors.html',type:'Design',icon:'CLR',tags:'couleur color green 7BE84E contraste'},
{title:'Design System — Composants',desc:'Boutons, cards, inputs, navigation et états.',href:'design-system/ds-components.html',type:'Design',icon:'CMP',tags:'component bouton card input state'},
{title:'Design System — Motion',desc:'Animations, durées et réduction du mouvement.',href:'design-system/ds-motion.html',type:'Design',icon:'MOV',tags:'motion animation transition duration'},
{title:'Design System — Accessibilité',desc:'Clavier, contraste, cibles tactiles et alternatives.',href:'design-system/ds-accessibility.html',type:'Design',icon:'A11Y',tags:'accessibility accessibilité clavier focus contrast'},

{title:'Process & Ops',desc:'Workflow, QA, publication, incidents et rollback.',href:'process.html',type:'Ops',icon:'OP',tags:'process operations qa publication incident workflow'},
{title:'Développement',desc:'Architecture, Git, code review, tests et releases.',href:'development.html',type:'Dev',icon:'</>',tags:'code dev github git test architecture'},
{title:'Dev — Vue d’ensemble',desc:'Principes engineering et définition de terminé.',href:'development/dev-overview.html',type:'Dev',icon:'DEV',tags:'engineering overview quality done'},
{title:'Dev — Git & branches',desc:'Commits, branches et historique lisible.',href:'development/dev-git.html',type:'Dev',icon:'GIT',tags:'git branch commit history'},
{title:'Dev — Architecture',desc:'Frontières, source de vérité et dépendances.',href:'development/dev-architecture.html',type:'Dev',icon:'ARC',tags:'architecture module dependency source truth'},
{title:'Dev — Tests & QA',desc:'Tests, régression, QA manuelle et preuve.',href:'development/dev-testing.html',type:'Dev',icon:'TST',tags:'test qa regression unit integration'},
{title:'Dev — Release',desc:'Préparation, déploiement, vérification et changelog.',href:'development/dev-release.html',type:'Dev',icon:'REL',tags:'release deploy production changelog'},

{title:'Sécurité',desc:'Accès, secrets, données, permissions et incidents.',href:'security.html',type:'Sécurité',icon:'SEC',tags:'security securite acces secrets permissions donnees'},
{title:'Sécurité — Vue d’ensemble',desc:'Principes de protection et signalement.',href:'security/security-overview.html',type:'Sécurité',icon:'SEC',tags:'security overview risk'},
{title:'Sécurité — Accès & permissions',desc:'Moindre privilège, comptes et révocation.',href:'security/security-access.html',type:'Sécurité',icon:'ACL',tags:'access permission least privilege revoke'},
{title:'Sécurité — Secrets',desc:'Tokens, clés API, stockage et rotation.',href:'security/security-secrets.html',type:'Sécurité',icon:'KEY',tags:'secret token api key password rotation'},
{title:'Sécurité — Documentation publique',desc:'Ce qui peut ou ne peut pas être publié.',href:'security/security-public-docs.html',type:'Sécurité',icon:'PUB',tags:'public docs confidential data'},
{title:'Sécurité — Incidents',desc:'Contenir, évaluer, corriger et prévenir.',href:'security/security-incidents.html',type:'Sécurité',icon:'INC',tags:'incident breach exposure contain'}
];

const modal=$('#searchModal'),input=$('#searchInput'),results=$('#searchResults');let filter='Tout';
function norm(s){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function render(q=''){if(!results)return;const nq=norm(q.trim());let list=SEARCH.filter(x=>(filter==='Tout'||x.type===filter)&&(!nq||norm(x.title+' '+x.desc+' '+x.tags+' '+x.type).includes(nq)));results.innerHTML=list.length?list.slice(0,24).map(x=>{const href=hrefFor(x.href),external=/^https?:\/\//.test(x.href);return '<a class="search-result" href="'+href+'"'+(external?' target="_blank" rel="noreferrer"':'')+'><span class="result-ico">'+(window.SQIconly?SQIconly.legacy(x.icon,'outline','md'):x.icon)+'</span><span><strong>'+x.title+'</strong><p>'+x.desc+'</p></span><em>'+x.type+'</em></a>'}).join(''):'<div class="search-empty">Aucun résultat.</div>'}
function openSearch(){if(!modal)return;modal.classList.add('open');if(input){input.value='';setTimeout(()=>input.focus(),20)}render('')}
function closeSearch(){modal?.classList.remove('open')}
$$('[data-search-open],#searchTrigger').forEach(b=>b.addEventListener('click',openSearch));$('#searchClose')?.addEventListener('click',closeSearch);modal?.addEventListener('click',e=>{if(e.target===modal)closeSearch()});input?.addEventListener('input',()=>render(input.value));
$$('.filter-chip').forEach(b=>b.addEventListener('click',()=>{$$('.filter-chip').forEach(x=>x.classList.remove('active'));b.classList.add('active');filter=b.dataset.filter;render(input?.value||'')}));
addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch()}else if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();openSearch()}else if(e.key==='Escape')closeSearch()});
$$('[data-copy]').forEach(b=>b.addEventListener('click',async()=>{const target=b.dataset.copy;let text=target.startsWith('#')?$(target)?.textContent:target;try{await navigator.clipboard.writeText(text||'');toast('Copié')}catch{toast('Copie impossible')}}));
function toast(t){const el=$('#toast');if(!el)return;el.textContent=t;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1400)}
const blocks=$$('.doc-block[id]'),toc=$('#articleToc');if(toc&&blocks.length){toc.innerHTML='<strong>Sur cette page</strong>'+blocks.map(b=>'<a href="#'+b.id+'">'+b.querySelector('h2')?.textContent+'</a>').join('');const links=$$('a',toc);const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting)links.forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+e.target.id))})},{rootMargin:'-20% 0px -70%'});blocks.forEach(b=>io.observe(b))}
if(location.hash.startsWith('#chapitre-')&&location.pathname.endsWith('/'))location.href=hrefFor('wix-studio.html')+location.hash;


/* =========================================================
   Squared Help Center v5.0 — global product interactions
   ========================================================= */
(()=>{
  const rootPathParts=location.pathname.split('/').filter(Boolean);
  const nestedDirs=new Set(['wix','workspace','design-system','development','security']);
  const currentFolder=rootPathParts.length>1?rootPathParts[rootPathParts.length-2]:'';
  const pfx=nestedDirs.has(currentFolder)?'../':'';
  const local=p=>pfx+p;

  // Quick actions
  const actionsHost=document.querySelector('.top-actions');
  if(actionsHost){
    let trigger=document.getElementById('quickActionsBtn');
    if(!trigger){
      trigger=document.createElement('button');
      trigger.className='icon-btn';
      trigger.id='quickActionsBtn';
      trigger.type='button';
      trigger.setAttribute('aria-label','Actions rapides');
      trigger.innerHTML=window.SQIconly?SQIconly.icon('plus','outline','md'):'+';
      const theme=document.getElementById('themeBtn');
      theme?actionsHost.insertBefore(trigger,theme):actionsHost.appendChild(trigger);
    }
    const menu=document.createElement('div');
    menu.className='quick-actions-menu';
    menu.id='quickActionsMenu';
    menu.innerHTML=
      '<a class="quick-action-item" href="'+local('forum-new.html')+'"><span>'+SQIconly.icon('forum','outline','md')+'</span><span><strong>Nouvelle discussion</strong><em>Poser une question à la communauté</em></span></a>'+
      '<a class="quick-action-item" href="'+local('support.html')+'"><span>'+SQIconly.icon('support','outline','md')+'</span><span><strong>Nouvelle demande</strong><em>Ouvrir un ticket support privé</em></span></a>'+
      '<button class="quick-action-item" type="button" data-v5-copy-link><span>'+SQIconly.icon('share','outline','md')+'</span><span><strong>Copier le lien</strong><em>Partager cette page</em></span></button>'+
      '<button class="quick-action-item" type="button" data-v5-focus><span>'+SQIconly.icon('focus','regular','md')+'</span><span><strong>Mode focus</strong><em>Masquer la navigation pour lire</em></span></button>';
    actionsHost.appendChild(menu);
    trigger.addEventListener('click',e=>{e.stopPropagation();menu.classList.toggle('open')});
    document.addEventListener('click',e=>{if(!menu.contains(e.target)&&e.target!==trigger)menu.classList.remove('open')});
    menu.querySelector('[data-v5-copy-link]')?.addEventListener('click',async()=>{
      try{await navigator.clipboard.writeText(location.href);toast('Lien copié')}catch{toast('Copie impossible')}
      menu.classList.remove('open');
    });
    menu.querySelector('[data-v5-focus]')?.addEventListener('click',()=>{document.body.classList.toggle('focus-mode');menu.classList.remove('open')});
  }

  // Focus mode escape control
  if(document.querySelector('.article-layout')&&!document.querySelector('.focus-exit')){
    const b=document.createElement('button');b.className='btn focus-exit';b.type='button';b.textContent='Quitter le mode focus';b.addEventListener('click',()=>document.body.classList.remove('focus-mode'));document.body.appendChild(b);
  }

  // Keyboard navigation: g then key.
  let gTimer=null,gArmed=false;
  document.addEventListener('keydown',e=>{
    if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
    const key=e.key.toLowerCase();
    if(key==='g'){
      gArmed=true;clearTimeout(gTimer);gTimer=setTimeout(()=>gArmed=false,900);return;
    }
    if(gArmed){
      const destinations={h:'index.html',f:'forum.html',s:'support.html',p:'profile.html'};
      if(destinations[key]){e.preventDefault();location.href=local(destinations[key])}
      gArmed=false;clearTimeout(gTimer);
    }
    if(e.shiftKey&&key==='f'&&document.querySelector('.article-layout')){
      e.preventDefault();document.body.classList.toggle('focus-mode');
    }
  });

  // Rich article footer: related content + feedback.
  const article=document.querySelector('.article');
  if(article&&!document.querySelector('.article-feedback-v5')){
    const path=location.pathname.toLowerCase();
    let related=[
      ['Bien démarrer','getting-started.html'],
      ['Guides rapides','quick-guides.html'],
      ['Forum','forum.html']
    ];
    if(path.includes('/wix/')||path.endsWith('/wix-studio.html'))related=[['Responsive','wix/wix-responsive.html'],['CMS & données','wix/wix-cms.html'],['Publication','wix/wix-publishing.html']];
    else if(path.includes('/workspace/')||path.endsWith('/workspace.html'))related=[['Rôles & accès','workspace/workspace-roles.html'],['Projets & tâches','workspace/workspace-projects.html'],['Documents & livrables','workspace/workspace-documents.html']];
    else if(path.includes('/design-system/')||path.endsWith('/design-system.html'))related=[['Composants','design-system/ds-components.html'],['Accessibilité','design-system/ds-accessibility.html'],['Motion','design-system/ds-motion.html']];
    else if(path.includes('/development/')||path.endsWith('/development.html'))related=[['Git & branches','development/dev-git.html'],['Tests & QA','development/dev-testing.html'],['Release','development/dev-release.html']];
    else if(path.includes('/security/')||path.endsWith('/security.html'))related=[['Documentation publique','security/security-public-docs.html'],['Accès & permissions','security/security-access.html'],['Incidents','security/security-incidents.html']];

    const resolveRel=href=>{
      if(pfx&&href.includes('/'))return '../'+href;
      if(pfx&&!href.includes('/'))return '../'+href;
      return href;
    };
    const tools=document.createElement('div');tools.className='article-tools';
    tools.innerHTML='<div class="article-tool-card"><strong>Continuer</strong><p>Guides complémentaires liés à cette page.</p><div class="article-tool-actions">'+related.map(x=>'<a class="btn" href="'+resolveRel(x[1])+'">'+x[0]+'</a>').join('')+'</div></div><div class="article-tool-card"><strong>Besoin de plus d’aide ?</strong><p>Passez de la documentation à la communauté ou au support.</p><div class="article-tool-actions"><a class="btn" href="'+local('forum.html')+'">Forum</a><a class="btn" href="'+local('support.html')+'">Support privé</a></div></div>';
    article.appendChild(tools);

    const feedback=document.createElement('div');feedback.className='article-feedback-v5';
    feedback.innerHTML='<div><strong>Cet article vous a-t-il aidé ?</strong><p>Votre retour améliore directement le Help Center.</p></div><div class="article-feedback-actions"><button class="btn" data-helpful="true">Oui</button><button class="btn" data-helpful="false">Non</button></div>';
    article.appendChild(feedback);

    const sendFeedback=async helpful=>{
      let comment=null;
      if(!helpful)comment=prompt('Qu’est-ce qui manque ou reste difficile à comprendre ? (optionnel)')||null;
      try{
        const res=await fetch('https://rhlkwuxpqvfgfuguzkfm.supabase.co/rest/v1/doc_feedback',{
          method:'POST',
          headers:{'Content-Type':'application/json','apikey':'sb_publishable_8w-ywogKyIToaTTs05Ubfg_Uc2lAF58','Prefer':'return=minimal'},
          body:JSON.stringify({page_path:location.pathname,helpful,comment})
        });
        if(!res.ok)throw new Error('feedback');
        feedback.innerHTML='<div><strong>Merci pour votre retour.</strong><p>Il a bien été enregistré.</p></div>';
      }catch{toast('Retour non enregistré — réessayez plus tard')}
    };
    feedback.querySelectorAll('[data-helpful]').forEach(b=>b.addEventListener('click',()=>sendFeedback(b.dataset.helpful==='true')));
  }
})();

(()=>{
  const top=document.querySelector('.top-actions');if(!top)return;
  if(!document.getElementById('forumAccount')&&!document.querySelector('[data-v5-account]')){
    const parts=location.pathname.split('/').filter(Boolean),folder=parts.length>1?parts[parts.length-2]:'',nested=['wix','workspace','design-system','development','security'].includes(folder),p=nested?'../':'';
    const a=document.createElement('a');a.className='icon-btn';a.href=p+'profile.html';a.dataset.v5Account='1';a.title='Mon compte';a.innerHTML=window.SQIconly?SQIconly.icon('account','outline','md'):'ME';
    const q=document.getElementById('quickActionsBtn'),theme=document.getElementById('themeBtn');top.insertBefore(a,q||theme||null);
  }
  window.v5AccountFallback=true;
})();
(()=>{
  const filters=[...document.querySelectorAll('[data-changelog-filter]')],updates=[...document.querySelectorAll('[data-change-type]')];
  if(!filters.length||!updates.length)return;
  filters.forEach(btn=>btn.addEventListener('click',()=>{
    filters.forEach(x=>x.classList.remove('active'));btn.classList.add('active');
    const type=btn.dataset.changelogFilter;
    updates.forEach(u=>u.hidden=type!=='all'&&u.dataset.changeType!==type);
  }));
})();
function hydrateSquaredIconlyUI(){
  if(!window.SQIconly)return;
  SQIconly.replaceLegacy(document);

  const menuBtn=document.getElementById('menuBtn');
  if(menuBtn)menuBtn.innerHTML=SQIconly.icon('menu','outline','md');

  const quickBtn=document.getElementById('quickActionsBtn');
  if(quickBtn)quickBtn.innerHTML=SQIconly.icon('plus','outline','md');

  document.querySelectorAll('[data-search-open]').forEach(el=>{
    if(el.classList.contains('help-search'))return;
    if(!el.querySelector('.sq-iconly')){
      el.insertAdjacentHTML('afterbegin',SQIconly.icon('search','regular','sm'));
    }
  });

  document.querySelectorAll('a.btn[href$="forum.html"],a.top-link[href$="forum.html"]').forEach(el=>{
    if(!el.querySelector('.sq-iconly'))el.insertAdjacentHTML('afterbegin',SQIconly.icon('forum','outline','sm'));
  });
  document.querySelectorAll('a.btn[href$="support.html"],a.top-link[href$="support.html"]').forEach(el=>{
    if(!el.querySelector('.sq-iconly'))el.insertAdjacentHTML('afterbegin',SQIconly.icon('support','outline','sm'));
  });

  document.querySelectorAll('.help-search .search-icon').forEach(el=>{
    el.innerHTML=SQIconly.icon('search','regular','lg');
  });

  document.querySelectorAll('.focus-exit').forEach(el=>{
    if(!el.querySelector('.sq-iconly'))el.insertAdjacentHTML('afterbegin',SQIconly.icon('collapse','regular','sm'));
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hydrateSquaredIconlyUI,{once:true});else hydrateSquaredIconlyUI();
