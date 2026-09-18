const $=(s,c=document)=>c.querySelector(s), $$=(s,c=document)=>[...c.querySelectorAll(s)];
const root=document.documentElement;
function getStore(k){try{return localStorage.getItem(k)}catch{return null}}
function setStore(k,v){try{localStorage.setItem(k,v)}catch{}}
const saved=getStore('sq-docs-theme');root.dataset.theme=saved||'light';
function syncThemeButton(){const b=$('#themeBtn');if(b){b.textContent=root.dataset.theme==='light'?'◐':'☀';b.setAttribute('aria-label',root.dataset.theme==='light'?'Activer le thème sombre':'Activer le thème clair')}const m=$('meta[name="theme-color"]');if(m)m.setAttribute('content',root.dataset.theme==='light'?'#F7F7F4':'#0D0D0E')}
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
function render(q=''){if(!results)return;const nq=norm(q.trim());let list=SEARCH.filter(x=>(filter==='Tout'||x.type===filter)&&(!nq||norm(x.title+' '+x.desc+' '+x.tags+' '+x.type).includes(nq)));results.innerHTML=list.length?list.slice(0,24).map(x=>{const href=hrefFor(x.href),external=/^https?:\/\//.test(x.href);return '<a class="search-result" href="'+href+'"'+(external?' target="_blank" rel="noreferrer"':'')+'><span class="result-ico">'+x.icon+'</span><span><strong>'+x.title+'</strong><p>'+x.desc+'</p></span><em>'+x.type+'</em></a>'}).join(''):'<div class="search-empty">Aucun résultat.</div>'}
function openSearch(){if(!modal)return;modal.classList.add('open');if(input){input.value='';setTimeout(()=>input.focus(),20)}render('')}
function closeSearch(){modal?.classList.remove('open')}
$$('[data-search-open],#searchTrigger').forEach(b=>b.addEventListener('click',openSearch));$('#searchClose')?.addEventListener('click',closeSearch);modal?.addEventListener('click',e=>{if(e.target===modal)closeSearch()});input?.addEventListener('input',()=>render(input.value));
$$('.filter-chip').forEach(b=>b.addEventListener('click',()=>{$$('.filter-chip').forEach(x=>x.classList.remove('active'));b.classList.add('active');filter=b.dataset.filter;render(input?.value||'')}));
addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch()}else if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();openSearch()}else if(e.key==='Escape')closeSearch()});
$$('[data-copy]').forEach(b=>b.addEventListener('click',async()=>{const target=b.dataset.copy;let text=target.startsWith('#')?$(target)?.textContent:target;try{await navigator.clipboard.writeText(text||'');toast('Copié')}catch{toast('Copie impossible')}}));
function toast(t){const el=$('#toast');if(!el)return;el.textContent=t;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1400)}
const blocks=$$('.doc-block[id]'),toc=$('#articleToc');if(toc&&blocks.length){toc.innerHTML='<strong>Sur cette page</strong>'+blocks.map(b=>'<a href="#'+b.id+'">'+b.querySelector('h2')?.textContent+'</a>').join('');const links=$$('a',toc);const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting)links.forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+e.target.id))})},{rootMargin:'-20% 0px -70%'});blocks.forEach(b=>io.observe(b))}
if(location.hash.startsWith('#chapitre-')&&location.pathname.endsWith('/'))location.href=hrefFor('wix-studio.html')+location.hash;
