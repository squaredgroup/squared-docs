(()=>{
const host=document.getElementById('sidebar');
if(!host)return;
const file=(()=>{const p=location.pathname.split('/').filter(Boolean);return p.length?p[p.length-1]:'index.html'})().toLowerCase();
const current=file.includes('.')?file:'index.html';
const groups=[
 {title:"Centre d’aide",items:[
  {href:"index.html",icon:"⌂",label:"Accueil"},
  {href:"support.html",icon:"SUP",label:"Support"},
  {href:"community.html",icon:"COM",label:"Communauté"},
  {href:"changelog.html",icon:"NEW",label:"Nouveautés"}
 ]},
 {title:"Base de connaissances",items:[
  {href:"wix-studio.html",icon:"WX",label:"Wix Studio"},
  {href:"workspace.html",icon:"WS",label:"Squared Workspace"},
  {href:"design-system.html",icon:"DS",label:"Design System"},
  {href:"process.html",icon:"OP",label:"Process & Ops"},
  {href:"development.html",icon:"</>",label:"Développement"},
  {href:"security.html",icon:"SEC",label:"Sécurité"}
 ]},
 {title:"Ressources",items:[
  {href:"https://github.com/squaredgroup/squared-docs/discussions",icon:"Q&A",label:"Forum",external:true},
  {href:"https://github.com/squaredgroup/squared-docs/issues",icon:"ISS",label:"Tickets publics",external:true},
  {href:"https://www.squaredgroup.studio/",icon:"SG",label:"Squared Group",external:true}
 ]}
];
const esc=s=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const nav=groups.map(g=>'<div class="hc-nav-group"><div class="hc-nav-title">'+g.title+'</div>'+g.items.map(i=>{
 const active=!i.external&&current===i.href.toLowerCase();
 return '<a class="hc-nav-link'+(active?' active':'')+'" href="'+esc(i.href)+'"'+(i.external?' target="_blank" rel="noreferrer"':'')+(active?' aria-current="page"':'')+'><span class="hc-nav-ico">'+esc(i.icon)+'</span><span>'+esc(i.label)+'</span></a>';
}).join('')+'</div>').join('');
host.classList.add('hc-sidebar');
host.innerHTML='<a class="hc-brand" href="index.html"><span class="hc-brand-mark">S²</span><span class="hc-brand-copy"><strong>SQUARED HELP</strong><span>Support · Docs · Community</span></span></a>'+
'<button class="hc-search" id="searchTrigger" data-search-open type="button"><span>⌕</span><span>Rechercher de l’aide</span><kbd>⌘K</kbd></button>'+
'<nav>'+nav+'</nav>'+
'<div class="hc-sidebar-foot"><strong>Squared Help Center · v3.1</strong>Une seule navigation globale.<br><a href="changelog.html">Voir les nouveautés →</a></div>';
})();