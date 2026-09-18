(()=>{
  if(!document.querySelector('script[data-sq-iconly-cdn]')){
    const s=document.createElement('script');
    s.defer=true;
    s.dataset.sqIconlyCdn='1';
    s.src='https://cdn.iconly.ai/iconly/public/iconly.js';
    document.head.appendChild(s);
  }

  const MAP={
    home:'home',search:'search',support:'ticket',forum:'chat',changelog:'archive',
    start:'book',faq:'alert-circle',quick:'clipboard',ask:'chat',guidelines:'list',privacy:'shield-check',
    wix:'monitor',workspace:'blackboard',design:'badge',process:'clipboard',development:'atom',security:'shield-check',
    status:'bar-chart',account:'badge',favorite:'bookmark',notifications:'bell',source:'code',group:'monitor',
    responsive:'monitor',cms:'archive',seo:'search',velo:'code',publish:'arrow-up-right',troubleshooting:'alert-circle',
    access:'badge',navigation:'list',projects:'clipboard',documents:'attachment',
    typography:'bold',colors:'badge',components:'badge',motion:'arrow-right',accessibility:'accessibility',
    git:'archive',architecture:'atom',testing:'beaker',release:'arrow-up-right',secrets:'shield-check',incidents:'alert-triangle',
    menu:'list',collapse:'arrow-left',chevron:'arrow-down',plus:'plus',sun:'sun',moon:'moon',external:'arrow-up-right',
    share:'share',focus:'monitor',arrowRight:'arrow-right',arrowUp:'arrow-up',close:'alert-circle',
    all:'list',general:'chat',ideas:'chat',bugs:'alert-circle',announcements:'bell'
  };

  const LEGACY={
    '⌂':'home','SUP':'support','COM':'forum','NEW':'changelog','GO':'start','FAQ':'faq','QG':'quick','ASK':'ask','RULE':'guidelines','PRV':'privacy',
    'WX':'wix','WS':'workspace','DS':'design','OP':'process','</>':'development','SEC':'security','STS':'status','ME':'account','★':'favorite','NTF':'notifications','SRC':'source','SG':'group',
    'KB':'start','?':'faq','→':'arrowRight','Q&A':'forum','IDEA':'ideas','GEN':'general','BUG':'bugs','ALL':'all',
    'RWD':'responsive','CMS':'cms','SEO':'seo','PUB':'publish','FIX':'troubleshooting','ACL':'access','NAV':'navigation','PRJ':'projects','DOC':'documents',
    'Aa':'typography','CLR':'colors','CMP':'components','MOV':'motion','A11Y':'accessibility','DEV':'development','GIT':'git','ARC':'architecture','TST':'testing','REL':'release','KEY':'secrets'
  };

  const STYLE={regular:'line',line:'line',outline:'outline',fill:'glyph',glyph:'glyph'};
  const resolve=k=>MAP[k]||k||'badge';
  const cls=(key,style='outline',size='md',extra='')=>'sq-iconly ci-'+(STYLE[style]||'outline')+' ci-'+resolve(key)+' ci-'+size+(extra?' '+extra:'');
  const icon=(key,style='outline',size='md',extra='')=>'<i class="'+cls(key,style,size,extra)+'" aria-hidden="true"></i>';
  const legacy=(value,style='outline',size='md',extra='')=>icon(LEGACY[String(value).trim()]||String(value).trim().toLowerCase(),style,size,extra);

  const replaceLegacy=(root=document)=>{
    root.querySelectorAll('.card-icon,.cat-ico,.big-ico,.home-command-icon,.topic-ico,.result-ico,.forum-cat-icon').forEach(el=>{
      if(el.dataset.iconlyReady==='1')return;
      const raw=(el.dataset.iconKey||el.textContent||'').trim();
      const key=LEGACY[raw]||raw.toLowerCase();
      const style=el.classList.contains('big-ico')||el.classList.contains('home-command-icon')?'regular':'outline';
      el.innerHTML=icon(key,style,'md');
      el.dataset.iconlyReady='1';
    });
  };

  window.SQIconly={MAP,LEGACY,icon,legacy,replaceLegacy,resolve};
})();
(()=>{
const host=document.getElementById('sidebar');if(!host)return;
const subdirs=new Set(['wix','workspace','design-system','development','security']);
const parts=location.pathname.split('/').filter(Boolean);
let currentKey='index.html';
if(parts.length){
  const raw=(parts[parts.length-1]||'index.html').toLowerCase();
  const file=raw.includes('.')?raw:'index.html';
  const folder=parts.length>1?parts[parts.length-2].toLowerCase():'';
  currentKey=subdirs.has(folder)?folder+'/'+file:file;
}
const nested=[...subdirs].some(d=>location.pathname.toLowerCase().includes('/'+d+'/'));
const prefix=nested?'../':'';
const localHref=(href)=>prefix+href;
const getNavState=k=>{try{return localStorage.getItem(k)}catch{return null}};
const setNavState=(k,v)=>{try{localStorage.setItem(k,v)}catch{}};
if(!document.querySelector('link[rel="icon"]')){const icon=document.createElement('link');icon.rel='icon';icon.type='image/png';icon.href=localHref('assets/logo-squared.png');document.head.appendChild(icon);}
const groups=[
{id:'help',title:'Centre d’aide',open:true,items:[
 {href:'index.html',icon:'home',label:'Accueil'},
 {href:'support.html',icon:'support',label:'Support'},
 {href:'forum.html',icon:'forum',label:'Forum'},
 {href:'changelog.html',icon:'changelog',label:'Nouveautés'}]},
{id:'docs',title:'Documentation',open:true,items:[
 {href:'getting-started.html',icon:'start',label:'Bien démarrer'},
 {href:'faq.html',icon:'faq',label:'FAQ'},
 {href:'quick-guides.html',icon:'quick',label:'Guides rapides'},
 {href:'asking-for-help.html',icon:'ask',label:'Demander de l’aide'},
 {href:'community-guidelines.html',icon:'guidelines',label:'Règles communauté'},
 {href:'support-privacy.html',icon:'privacy',label:'Confidentialité support'}]},
{id:'products',title:'Produits',open:true,items:[
 {href:'wix-studio.html',icon:'wix',label:'Wix Studio',children:[
   {href:'wix/wix-overview.html',label:'Vue d’ensemble'},
   {href:'wix/wix-responsive.html',label:'Responsive'},
   {href:'wix/wix-cms.html',label:'CMS & données'},
   {href:'wix/wix-seo.html',label:'SEO'},
   {href:'wix/wix-velo.html',label:'Velo & code'},
   {href:'wix/wix-publishing.html',label:'Publication'},
   {href:'wix/wix-troubleshooting.html',label:'Dépannage'}]},
 {href:'workspace.html',icon:'workspace',label:'Squared Workspace',children:[
   {href:'workspace/workspace-overview.html',label:'Vue d’ensemble'},
   {href:'workspace/workspace-roles.html',label:'Rôles & accès'},
   {href:'workspace/workspace-navigation.html',label:'Navigation'},
   {href:'workspace/workspace-projects.html',label:'Projets & tâches'},
   {href:'workspace/workspace-documents.html',label:'Documents & livrables'},
   {href:'workspace/workspace-troubleshooting.html',label:'Dépannage'}]},
 {href:'design-system.html',icon:'design',label:'Design System',children:[
   {href:'design-system/ds-foundations.html',label:'Fondations'},
   {href:'design-system/ds-typography.html',label:'Typographie'},
   {href:'design-system/ds-colors.html',label:'Couleurs'},
   {href:'design-system/ds-components.html',label:'Composants'},
   {href:'design-system/ds-motion.html',label:'Motion'},
   {href:'design-system/ds-accessibility.html',label:'Accessibilité'}]}]},
{id:'ops',title:'Engineering & Ops',open:false,items:[
 {href:'process.html',icon:'process',label:'Process & Ops'},
 {href:'development.html',icon:'development',label:'Développement',children:[
   {href:'development/dev-overview.html',label:'Vue d’ensemble'},
   {href:'development/dev-git.html',label:'Git & branches'},
   {href:'development/dev-architecture.html',label:'Architecture'},
   {href:'development/dev-testing.html',label:'Tests & QA'},
   {href:'development/dev-release.html',label:'Release'}]},
 {href:'security.html',icon:'security',label:'Sécurité',children:[
   {href:'security/security-overview.html',label:'Vue d’ensemble'},
   {href:'security/security-access.html',label:'Accès & permissions'},
   {href:'security/security-secrets.html',label:'Secrets'},
   {href:'security/security-public-docs.html',label:'Documentation publique'},
   {href:'security/security-incidents.html',label:'Incidents'}]}]},
{id:'resources',title:'Ressources',open:false,items:[
 {href:'status.html',icon:'status',label:'Statut'},
 {href:'profile.html',icon:'account',label:'Mon compte'},
 {href:'bookmarks.html',icon:'favorite',label:'Favoris'},
 {href:'notifications.html',icon:'notifications',label:'Notifications'},
 {href:'https://github.com/squaredgroup/squared-docs',icon:'source',label:'Code source',external:true},
 {href:'https://www.squaredgroup.studio/',icon:'group',label:'Squared Group',external:true}]}
];
const activeFor=(href)=>currentKey===href.toLowerCase();
const groupHasActive=g=>g.items.some(i=>activeFor(i.href)||(i.children||[]).some(c=>activeFor(c.href)));
const groupOpen=g=>{if(groupHasActive(g))return true;const s=getNavState('sq-help-group:'+g.id);return s===null?g.open:s==='1';};
const childOpen=i=>{if((i.children||[]).some(c=>activeFor(c.href)))return true;const s=getNavState('sq-help-child:'+i.href);return s==='1';};
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const childKey=c=>{
  const h=c.href;
  if(h.includes('responsive'))return 'responsive'; if(h.includes('cms'))return 'cms'; if(h.includes('seo'))return 'seo'; if(h.includes('velo'))return 'velo'; if(h.includes('publishing'))return 'publish'; if(h.includes('troubleshooting'))return 'troubleshooting';
  if(h.includes('roles')||h.includes('access'))return 'access'; if(h.includes('navigation'))return 'navigation'; if(h.includes('projects'))return 'projects'; if(h.includes('documents'))return 'documents';
  if(h.includes('typography'))return 'typography'; if(h.includes('colors'))return 'colors'; if(h.includes('components'))return 'components'; if(h.includes('motion'))return 'motion'; if(h.includes('accessibility'))return 'accessibility';
  if(h.includes('git'))return 'git'; if(h.includes('architecture'))return 'architecture'; if(h.includes('testing'))return 'testing'; if(h.includes('release'))return 'release';
  if(h.includes('secrets'))return 'secrets'; if(h.includes('incidents'))return 'incidents'; return 'book';
};
const children=i=>(i.children||[]).map(c=>'<a class="hc-sub-link'+(activeFor(c.href)?' active':'')+'" href="'+esc(localHref(c.href))+'"'+(activeFor(c.href)?' aria-current="page"':'')+'><span class="hc-sub-icon">'+SQIconly.icon(childKey(c),activeFor(c.href)?'fill':'regular','sm')+'</span><span>'+esc(c.label)+'</span></a>').join('');
const items=g=>g.items.map(i=>{
 const has=Array.isArray(i.children)&&i.children.length>0;
 const childActive=has&&i.children.some(c=>activeFor(c.href));
 const active=activeFor(i.href);
 const openChild=has&&childOpen(i);
 const href=i.external?i.href:localHref(i.href);
 return '<div class="hc-item'+(has?' has-children':'')+((childActive||openChild)?' child-open':'')+'" data-item-href="'+esc(i.href)+'">'+
 '<a class="hc-nav-link'+(active?' active':'')+(childActive?' active-parent':'')+'" href="'+esc(href)+'"'+(i.external?' target="_blank" rel="noreferrer"':'')+(active?' aria-current="page"':'')+'><span class="hc-nav-ico">'+SQIconly.icon(i.icon,(active||childActive)?'fill':'outline','md')+'</span><span>'+esc(i.label)+'</span>'+(i.external?'<span class="hc-nav-external">'+SQIconly.icon('external','regular','sm')+'</span>':'')+'</a>'+
 (has?'<button class="hc-sub-toggle" type="button" aria-label="Afficher ou masquer les sous-pages">'+SQIconly.icon('chevron','regular','sm')+'</button><div class="hc-sub-links">'+children(i)+'</div>':'')+
 '</div>';
}).join('');
host.innerHTML='<a class="hc-brand" href="'+localHref('index.html')+'"><img class="hc-brand-logo" src="'+localHref('assets/logo-squared.png')+'" alt="Squared Group"><span class="hc-brand-copy"><strong>SQUARED HELP</strong><span>Support · Docs · Community</span></span></a>'+
'<button class="hc-search" id="searchTrigger" data-search-open type="button"><span class="hc-search-icon">'+SQIconly.icon('search','regular','sm')+'</span><span>Rechercher de l’aide</span><kbd>⌘K</kbd></button>'+
'<button class="hc-collapse" id="sidebarCollapse" type="button" aria-label="Réduire la navigation"><span>'+SQIconly.icon('collapse','regular','sm')+'</span><span>Réduire la navigation</span></button>'+
'<nav class="hc-nav">'+groups.map(g=>{const open=groupOpen(g);return '<section class="hc-nav-group'+(open?' open':'')+'" data-group="'+g.id+'"><button class="hc-nav-group-trigger" type="button" aria-expanded="'+(open?'true':'false')+'"><span class="hc-nav-title">'+g.title+'</span><span class="hc-nav-chevron">▾</span></button><div class="hc-nav-group-body">'+items(g)+'</div></section>';}).join('')+'</nav>'+
'<div class="hc-sidebar-foot"><strong>Squared Help Center · v5.0</strong>Navigation centralisée · sections repliables<br><a href="'+localHref('changelog.html')+'">Voir les nouveautés →</a></div>';
host.classList.add('hc-sidebar');
if(innerWidth>860&&getNavState('sq-help-sidebar-mini')==='1')document.body.classList.add('sidebar-mini');
document.getElementById('sidebarCollapse')?.addEventListener('click',()=>{document.body.classList.toggle('sidebar-mini');setNavState('sq-help-sidebar-mini',document.body.classList.contains('sidebar-mini')?'1':'0');});
host.querySelectorAll('.hc-nav-group-trigger').forEach(btn=>btn.addEventListener('click',()=>{const g=btn.closest('.hc-nav-group');g.classList.toggle('open');const open=g.classList.contains('open');btn.setAttribute('aria-expanded',open?'true':'false');setNavState('sq-help-group:'+g.dataset.group,open?'1':'0');}));
host.querySelectorAll('.hc-sub-toggle').forEach(btn=>btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const item=btn.closest('.hc-item');item.classList.toggle('child-open');setNavState('sq-help-child:'+item.dataset.itemHref,item.classList.contains('child-open')?'1':'0');}));
host.querySelectorAll('.hc-nav-link,.hc-sub-link').forEach(a=>a.addEventListener('click',()=>{if(innerWidth<=860)host.classList.remove('open');}));
})();