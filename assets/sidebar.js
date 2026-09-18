(()=>{
const host=document.getElementById('sidebar');if(!host)return;
const subdirs=new Set(['wix','workspace','design-system','development','security']);
const parts=location.pathname.split('/').filter(Boolean);
let currentKey='index.html';
if(parts.length){
  const file=(parts[parts.length-1]||'index.html').toLowerCase();
  const folder=parts.length>1?parts[parts.length-2].toLowerCase():'';
  currentKey=subdirs.has(folder)?folder+'/'+file:file;
}
const nested=[...subdirs].some(d=>location.pathname.toLowerCase().includes('/'+d+'/'));
const prefix=nested?'../':'';
const localHref=(href)=>prefix+href;
const groups=[
{id:'help',title:'Centre d’aide',open:true,items:[
 {href:'index.html',icon:'⌂',label:'Accueil'},
 {href:'support.html',icon:'SUP',label:'Support'},
 {href:'community.html',icon:'COM',label:'Communauté'},
 {href:'changelog.html',icon:'NEW',label:'Nouveautés'}]},
{id:'docs',title:'Documentation',open:true,items:[
 {href:'getting-started.html',icon:'GO',label:'Bien démarrer'},
 {href:'faq.html',icon:'FAQ',label:'FAQ'},
 {href:'quick-guides.html',icon:'QG',label:'Guides rapides'}]},
{id:'products',title:'Produits',open:true,items:[
 {href:'wix-studio.html',icon:'WX',label:'Wix Studio',children:[
   {href:'wix/wix-overview.html',label:'Vue d’ensemble'},
   {href:'wix/wix-responsive.html',label:'Responsive'},
   {href:'wix/wix-cms.html',label:'CMS & données'},
   {href:'wix/wix-seo.html',label:'SEO'},
   {href:'wix/wix-velo.html',label:'Velo & code'},
   {href:'wix/wix-publishing.html',label:'Publication'},
   {href:'wix/wix-troubleshooting.html',label:'Dépannage'}]},
 {href:'workspace.html',icon:'WS',label:'Squared Workspace',children:[
   {href:'workspace/workspace-overview.html',label:'Vue d’ensemble'},
   {href:'workspace/workspace-roles.html',label:'Rôles & accès'},
   {href:'workspace/workspace-navigation.html',label:'Navigation'},
   {href:'workspace/workspace-projects.html',label:'Projets & tâches'},
   {href:'workspace/workspace-documents.html',label:'Documents & livrables'},
   {href:'workspace/workspace-troubleshooting.html',label:'Dépannage'}]},
 {href:'design-system.html',icon:'DS',label:'Design System',children:[
   {href:'design-system/ds-foundations.html',label:'Fondations'},
   {href:'design-system/ds-typography.html',label:'Typographie'},
   {href:'design-system/ds-colors.html',label:'Couleurs'},
   {href:'design-system/ds-components.html',label:'Composants'},
   {href:'design-system/ds-motion.html',label:'Motion'},
   {href:'design-system/ds-accessibility.html',label:'Accessibilité'}]}]},
{id:'ops',title:'Engineering & Ops',open:false,items:[
 {href:'process.html',icon:'OP',label:'Process & Ops'},
 {href:'development.html',icon:'</>',label:'Développement',children:[
   {href:'development/dev-overview.html',label:'Vue d’ensemble'},
   {href:'development/dev-git.html',label:'Git & branches'},
   {href:'development/dev-architecture.html',label:'Architecture'},
   {href:'development/dev-testing.html',label:'Tests & QA'},
   {href:'development/dev-release.html',label:'Release'}]},
 {href:'security.html',icon:'SEC',label:'Sécurité',children:[
   {href:'security/security-overview.html',label:'Vue d’ensemble'},
   {href:'security/security-access.html',label:'Accès & permissions'},
   {href:'security/security-secrets.html',label:'Secrets'},
   {href:'security/security-public-docs.html',label:'Documentation publique'},
   {href:'security/security-incidents.html',label:'Incidents'}]}]},
{id:'resources',title:'Ressources',open:false,items:[
 {href:'status.html',icon:'STS',label:'Statut'},
 {href:'https://github.com/squaredgroup/squared-docs/discussions',icon:'Q&A',label:'Forum',external:true},
 {href:'https://github.com/squaredgroup/squared-docs/issues',icon:'ISS',label:'Tickets publics',external:true},
 {href:'https://www.squaredgroup.studio/',icon:'SG',label:'Squared Group',external:true}]}
];
const activeFor=(href)=>currentKey===href.toLowerCase();
const groupHasActive=g=>g.items.some(i=>activeFor(i.href)||(i.children||[]).some(c=>activeFor(c.href)));
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const children=i=>(i.children||[]).map(c=>'<a class="hc-sub-link'+(activeFor(c.href)?' active':'')+'" href="'+esc(localHref(c.href))+'"'+(activeFor(c.href)?' aria-current="page"':'')+'>'+esc(c.label)+'</a>').join('');
const items=g=>g.items.map(i=>{
 const has=Array.isArray(i.children)&&i.children.length>0;
 const childActive=has&&i.children.some(c=>activeFor(c.href));
 const active=activeFor(i.href);
 const href=i.external?i.href:localHref(i.href);
 return '<div class="hc-item'+(has?' has-children':'')+(childActive?' child-open':'')+'">'+
 '<a class="hc-nav-link'+(active?' active':'')+(childActive?' active-parent':'')+'" href="'+esc(href)+'"'+(i.external?' target="_blank" rel="noreferrer"':'')+(active?' aria-current="page"':'')+'><span class="hc-nav-ico">'+esc(i.icon)+'</span><span>'+esc(i.label)+'</span></a>'+
 (has?'<button class="hc-sub-toggle" type="button" aria-label="Afficher ou masquer les sous-pages">▾</button><div class="hc-sub-links">'+children(i)+'</div>':'')+
 '</div>';
}).join('');
host.innerHTML='<a class="hc-brand" href="'+localHref('index.html')+'"><img class="hc-brand-logo" src="'+localHref('assets/logo-squared.png')+'" alt="Squared Group"><span class="hc-brand-copy"><strong>SQUARED HELP</strong><span>Support · Docs · Community</span></span></a>'+
'<button class="hc-search" id="searchTrigger" data-search-open type="button"><span>⌕</span><span>Rechercher de l’aide</span><kbd>⌘K</kbd></button>'+
'<nav class="hc-nav">'+groups.map(g=>{const open=g.open||groupHasActive(g);return '<section class="hc-nav-group'+(open?' open':'')+'" data-group="'+g.id+'"><button class="hc-nav-group-trigger" type="button" aria-expanded="'+(open?'true':'false')+'"><span class="hc-nav-title">'+g.title+'</span><span class="hc-nav-chevron">▾</span></button><div class="hc-nav-group-body">'+items(g)+'</div></section>';}).join('')+'</nav>'+
'<div class="hc-sidebar-foot"><strong>Squared Help Center · v3.2</strong>Navigation centralisée · sections repliables<br><a href="'+localHref('changelog.html')+'">Voir les nouveautés →</a></div>';
host.classList.add('hc-sidebar');
host.querySelectorAll('.hc-nav-group-trigger').forEach(btn=>btn.addEventListener('click',()=>{const g=btn.closest('.hc-nav-group');g.classList.toggle('open');btn.setAttribute('aria-expanded',g.classList.contains('open')?'true':'false');}));
host.querySelectorAll('.hc-sub-toggle').forEach(btn=>btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();btn.closest('.hc-item').classList.toggle('child-open');}));
host.querySelectorAll('.hc-nav-link,.hc-sub-link').forEach(a=>a.addEventListener('click',()=>{if(innerWidth<=860)host.classList.remove('open');}));
})();