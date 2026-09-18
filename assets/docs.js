const $=(s,c=document)=>c.querySelector(s), $$=(s,c=document)=>[...c.querySelectorAll(s)];
const root=document.documentElement;
function getStore(k){try{return localStorage.getItem(k)}catch{return null}}
function setStore(k,v){try{localStorage.setItem(k,v)}catch{}}
const saved=getStore('sq-docs-theme'); root.dataset.theme=saved||'light';
function syncThemeButton(){const b=$('#themeBtn');if(b){b.textContent=root.dataset.theme==='light'?'◐':'☀';b.setAttribute('aria-label',root.dataset.theme==='light'?'Activer le thème sombre':'Activer le thème clair')}const m=$('meta[name="theme-color"]');if(m)m.setAttribute('content',root.dataset.theme==='light'?'#F7F7F4':'#0D0D0E')}
function toggleTheme(){root.dataset.theme=root.dataset.theme==='light'?'dark':'light';setStore('sq-docs-theme',root.dataset.theme);syncThemeButton()}
syncThemeButton();$('#themeBtn')?.addEventListener('click',toggleTheme);
$('#menuBtn')?.addEventListener('click',()=>$('#sidebar')?.classList.toggle('open'));$('.hc-nav-link').forEach(a=>a.addEventListener('click',()=>$('#sidebar')?.classList.remove('open')));
const p=$('#progress');function progress(){if(!p)return;const d=document.documentElement,max=d.scrollHeight-d.clientHeight;p.style.width=(max>0?d.scrollTop/max*100:0)+'%'}addEventListener('scroll',progress,{passive:true});progress();
const SEARCH=[
{title:'Accueil du Help Center',desc:'Recherche, base de connaissances, communauté et support.',href:'index.html',type:'Accueil',icon:'⌂',tags:'help center aide support docs accueil'},
{title:'Obtenir de l’aide',desc:'Choisir entre communauté, ticket public ou canal confidentiel.',href:'support.html',type:'Support',icon:'SUP',tags:'support aide contact ticket assistance'},
{title:'Wix Studio',desc:'Responsive, CMS, SEO, Velo, publication, maintenance et checklists.',href:'wix-studio.html',type:'Guide',icon:'WX',tags:'wix studio cms velo seo responsive publication'},
{title:'Squared Workspace',desc:'Principes produit, rôles, navigation et opérations du Workspace.',href:'workspace.html',type:'Produit',icon:'WS',tags:'workspace erp client collaborateur produit'},
{title:'Design System',desc:'Fondations UI, composants, tokens, motion et accessibilité.',href:'design-system.html',type:'Design',icon:'DS',tags:'design ui ux composants tokens motion'},
{title:'Process & Ops',desc:'Workflow de modification, contrôle qualité, publication et incident.',href:'process.html',type:'Ops',icon:'OP',tags:'process operations qa publication incident workflow'},
{title:'Développement',desc:'Conventions, architecture, Git, revue, environnements et tests.',href:'development.html',type:'Dev',icon:'</>',tags:'code dev github git test architecture'},
{title:'Sécurité',desc:'Accès, secrets, données, permissions, incidents et documentation publique.',href:'security.html',type:'Sécurité',icon:'SEC',tags:'security securite acces secrets permissions donnees'},
{title:'Changelog',desc:'Historique versionné des évolutions de Squared Docs.',href:'changelog.html',type:'Mises à jour',icon:'↺',tags:'changelog updates versions nouveautés'},
{title:'Communauté Squared',desc:'Forum public : questions, réponses, idées, annonces et échanges.',href:'community.html',type:'Communauté',icon:'COM',tags:'forum discussion question réponse idée communauté github discussions'},
{title:'Checklist avant publication',desc:'Contrôles finaux avant de publier une modification Wix Studio.',href:'wix-studio.html#chapitre-27',type:'Checklist',icon:'✓',tags:'checklist publication wix'},
{title:'CMS Wix Studio',desc:'Collections, champs, datasets et pages dynamiques.',href:'wix-studio.html#chapitre-09',type:'Wix',icon:'CMS',tags:'cms collection dataset page dynamique'},
{title:'Responsive Wix Studio',desc:'Breakpoints, overrides et procédure de contrôle responsive.',href:'wix-studio.html#chapitre-06',type:'Wix',icon:'RWD',tags:'responsive breakpoint mobile tablette'},
{title:'SEO Wix Studio',desc:'URL, title, meta, headings, indexation et alt text.',href:'wix-studio.html#chapitre-16',type:'Wix',icon:'SEO',tags:'seo meta title url h1 alt'},
{title:'Dépannage Wix Studio',desc:'Diagnostic systématique avant toute correction.',href:'wix-studio.html#chapitre-23',type:'Wix',icon:'FIX',tags:'bug depannage diagnostic erreur'}
];
const modal=$('#searchModal'),input=$('#searchInput'),results=$('#searchResults');let filter='Tout';
function norm(s){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function render(q=''){if(!results)return;const nq=norm(q.trim());let list=SEARCH.filter(x=>(filter==='Tout'||x.type===filter)&&(!nq||norm(x.title+' '+x.desc+' '+x.tags+' '+x.type).includes(nq)));results.innerHTML=list.length?list.slice(0,18).map(x=>'<a class="search-result" href="'+x.href+'"><span class="result-ico">'+x.icon+'</span><span><strong>'+x.title+'</strong><p>'+x.desc+'</p></span><em>'+x.type+'</em></a>').join(''):'<div class="search-empty">Aucun résultat.</div>'}
function openSearch(){if(!modal)return;modal.classList.add('open');if(input){input.value='';setTimeout(()=>input.focus(),20)}render('')}
function closeSearch(){modal?.classList.remove('open')}
$$('[data-search-open],#searchTrigger').forEach(b=>b.addEventListener('click',openSearch));$('#searchClose')?.addEventListener('click',closeSearch);modal?.addEventListener('click',e=>{if(e.target===modal)closeSearch()});input?.addEventListener('input',()=>render(input.value));
$$('.filter-chip').forEach(b=>b.addEventListener('click',()=>{$$('.filter-chip').forEach(x=>x.classList.remove('active'));b.classList.add('active');filter=b.dataset.filter;render(input?.value||'')}));
addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch()}else if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();openSearch()}else if(e.key==='Escape')closeSearch()});
$$('[data-copy]').forEach(b=>b.addEventListener('click',async()=>{const target=b.dataset.copy;let text=target.startsWith('#')?$(target)?.textContent:target;try{await navigator.clipboard.writeText(text||'');toast('Copié')}catch{toast('Copie impossible')}}));
function toast(t){const el=$('#toast');if(!el)return;el.textContent=t;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1400)}
const blocks=$$('.doc-block[id]'),toc=$('#articleToc');if(toc&&blocks.length){toc.innerHTML='<strong>Sur cette page</strong>'+blocks.map(b=>'<a href="#'+b.id+'">'+b.querySelector('h2')?.textContent+'</a>').join('');const links=$$('a',toc);const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting)links.forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+e.target.id))})},{rootMargin:'-20% 0px -70%'});blocks.forEach(b=>io.observe(b))}
if(location.hash.startsWith('#chapitre-')&&location.pathname.endsWith('/'))location.href='wix-studio.html'+location.hash;
