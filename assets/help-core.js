/* Assistance shared contract. Public navigation is not an access-control mechanism.
   No query, ticket body or credential is stored by this module. */
(() => {
  'use strict';
  if (window.SQHelp) return;
  const base = new URL('../', document.currentScript.src);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const local = path => new URL(path, base).href;
  const safe = value => {
    try {
      const u = new URL(value, base);
      if (u.origin === base.origin && u.pathname.startsWith(base.pathname) && /\.html$/.test(u.pathname) && !u.username && !u.password && !String(value).includes('\\')) return u.href;
    } catch {}
    return local('index.html');
  };
  const norm = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const PRODUCTS = {workspace:'Squared Workspace',help:'Help Center',site:'Squared Group'};
  const ISSUES = {access:'Connexion ou activation',documents:'Document ou livrable introuvable',installation:'Installation ou mise à jour'};
  const DEVICES = {web:'Navigateur web',ios:'iPhone',ipados:'iPad',macos:'Mac'};
  function context(search = location.search) {
    const p = new URLSearchParams(search);
    const product = Object.hasOwn(PRODUCTS,p.get('product')) ? p.get('product') : 'workspace';
    const issue = Object.hasOwn(ISSUES,p.get('issue')) ? p.get('issue') : 'access';
    const device = Object.hasOwn(DEVICES,p.get('device')) ? p.get('device') : 'web';
    const checks = (p.get('checks')||'').split(',').filter(x=>/^[0-3]$/.test(x)).slice(0,4);
    return {product, issue, device, checks:[...new Set(checks)]};
  }
  function contextLink(path, values) {
    const u = new URL(path,base), c=context(new URLSearchParams(values).toString());
    u.search=new URLSearchParams({product:c.product,issue:c.issue,device:c.device,checks:c.checks.join(','),diagnostic:'1'}).toString();
    return u.href;
  }
  const GUIDE = {
    access:'workspace/workspace-activation.html',login:'workspace/workspace-login.html',
    documents:'workspace/workspace-documents.html',installation:'workspace/workspace-installation.html',
    roles:'workspace/workspace-roles.html',troubleshooting:'workspace/workspace-troubleshooting.html'
  };
  function plan(c) {
    if(c.product==='help')return {guide:'access-help.html',steps:c.issue==='access'?[
      'Vérifiez que vous êtes dans le centre d’aide, et non dans votre espace Workspace.',
      'Utilisez l’adresse du compte créé pour le centre d’aide.',
      'Utilisez « Mot de passe oublié ? » et vérifiez votre messagerie, sans partager le lien reçu.',
      'Si le lien a expiré, demandez-en un nouveau. En cas de perte d’accès à votre messagerie, contactez Squared.'
    ]:c.issue==='documents'?[
      'Recherchez le titre ou l’action, plutôt que le nom du fichier uniquement.',
      'Distinguez les guides publics, les favoris et vos demandes privées.',
      'Les livrables client se trouvent dans Workspace, pas dans les articles publics.',
      'En cas de page indisponible, conservez son titre pour le support, sans lien contenant de secret.'
    ]:[
      'Le centre d’aide est accessible dans un navigateur : aucune installation n’est obligatoire.',
      'Actualisez la page et vérifiez que votre connexion fonctionne.',
      'Les choix d’apparence n’affectent pas votre compte ni vos permissions.',
      'Si le problème persiste, notez le navigateur et la version de votre appareil.'
    ]};
    if(c.product==='site')return {guide:'asking-for-help.html',steps:[
      'Vérifiez l’adresse du site officiel et le nom de la page concernée.',
      'Actualisez la page puis ouvrez une autre page du même site.',
      'Consultez les incidents déclarés, sans interpréter l’absence de mesure comme une garantie.',
      'Notez l’action attendue et le résultat observé. Ne changez pas de mot de passe pour corriger une page publique.'
    ]};
    const steps={
      access:[
        'Ouvrez Workspace depuis votre invitation ou le lien officiel du portail, pas depuis le formulaire du Help Center.',
        'Premier accès : choisissez « Activer un accès ». Un code d’invitation est nécessaire.',
        'Compte déjà activé : utilisez « Se connecter » ou « Mot de passe oublié ». Ne recréez pas un compte pour retrouver les données.',
        c.device==='web'?'En cas d’erreur réseau, utilisez « Vérifier la connexion au serveur ». Une erreur de serveur ne se corrige pas en changeant vos identifiants.':'Si une vérification renforcée est demandée, utilisez votre passkey ou un code de récupération. Ne transmettez pas ces codes au support.'
      ],
      documents:[
        'Vérifiez le compte et le contexte client ou projet utilisés dans Workspace.',
        'Consultez « Documents » puis « Livrables » : ces rubriques ne désignent pas le même type d’élément.',
        'Effacez la recherche locale du module et vérifiez le titre ou le statut de l’élément.',
        'Si l’élément reste absent, demandez au responsable du projet de vérifier son partage. Ne recréez ni ne remplacez le document.'
      ],
      installation:c.device==='web'?[
        'Ouvrez le portail officiel : aucune installation native n’est requise pour utiliser le navigateur.',
        'Vérifiez que vous avez choisi le portail Workspace et non une page du Help Center.',
        'Si vous avez ajouté un raccourci, ouvrez aussi la même adresse dans le navigateur pour comparer.',
        'Une page affichée ne garantit pas la connexion au serveur. En cas d’erreur, notez le message exact.'
      ]:[
        'Choisissez entre le portail web et l’application native : ce sont deux accès distincts.',
        'Pour une bêta, ouvrez l’invitation TestFlight sur l’appareil qui doit recevoir l’application.',
        'Dans TestFlight, installez ou mettez à jour uniquement la version rendue disponible pour votre appareil.',
        'Installation réussie ne signifie pas espace activé : utilisez ensuite votre invitation Workspace. Si la bêta a expiré, demandez une version disponible.'
      ]
    };
    return {guide:GUIDE[c.issue],steps:steps[c.issue]};
  }
  function summary(c) {
    const p=plan(c), checked=c.checks.map(i=>p.steps[Number(i)]).filter(Boolean);
    return ['Produit : '+PRODUCTS[c.product], 'Besoin : '+ISSUES[c.issue], 'Appareil : '+DEVICES[c.device], '', 'Vérifications que je confirme avoir effectuées :', ...(checked.length?checked.map(t=>'• '+t):['Aucune vérification confirmée.']), '', 'Résultat observé : ', 'Résultat attendu : '].join('\n');
  }
  let catalogPromise;
  async function catalog() {
    if(!catalogPromise)catalogPromise=fetch(local('assets/knowledge-index.json'),{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('index');return r.json();}).catch(()=>[]);
    return catalogPromise;
  }
  function rank(rows,q) {
    const stop=new Set(['je','ne','n','pas','le','la','les','de','du','des','un','une','mon','ma','mes','me','a','au','aux','et','ou','dans','sur','pour','comment','vous','nous']);
    const terms=norm(q).replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(t=>t&&!stop.has(t));
    if(!terms.length)return [];
    return rows.map(r=>{
      const title=norm(r.title),desc=norm(r.description),body=norm(r.content);
      const hits=terms.filter(t=>(title+' '+desc+' '+body).includes(t)).length;
      const score=hits*3+terms.filter(t=>title.includes(t)).length*5+terms.filter(t=>desc.includes(t)).length*2+(title.includes(norm(q))?10:0);
      return {...r,score:hits>=Math.max(1,Math.ceil(terms.length*.65))?score:0};
    }).filter(r=>r.score>0).sort((a,b)=>b.score-a.score);
  }
  async function backend(timeout=3500) {
    if(window.SQSearchBackend)return window.SQSearchBackend;
    return new Promise(resolve=>{
      const finish=()=>{clearTimeout(timer);removeEventListener('sq:backend-ready',ready);resolve(window.SQSearchBackend||null);};
      const ready=()=>finish(),timer=setTimeout(finish,timeout);
      addEventListener('sq:backend-ready',ready,{once:true});
    });
  }
  async function lookup(q,{signal,limit=30,remote=true}={}) {
    q=String(q||'').trim().slice(0,200);
    const docs=await catalog();
    const localRows=q.length>=2?rank(docs,q):docs.filter(r=>r.featured).slice(0,6);
    if(q.length<2||!remote)return {rows:localRows.slice(0,limit),partial:false};
    if(signal?.aborted)throw new DOMException('Aborted','AbortError');
    const b=await backend();
    if(!b)return {rows:localRows.slice(0,limit),partial:true};
    try {
      const session=await b.currentSession();
      const remoteRows=await b.search(q,limit,signal);
      if(signal?.aborted)throw new DOMException('Aborted','AbortError');
      const seen=new Set(),merged=[];
      // Local versioned guides are the source of truth for their own URLs.
      for(const r of [...localRows.slice(0,Math.max(12,limit-20)),...(remoteRows||[])]){
        if(r.kind==='ticket'&&!session)continue;
        const href=safe(r.href),key=r.kind+':'+href;
        if(seen.has(key))continue;seen.add(key);merged.push({...r,href});
      }
      return {rows:merged.slice(0,limit),partial:false};
    }catch(e){if(signal?.aborted)throw e;return {rows:localRows.slice(0,limit),partial:true};}
  }
  const kinds={knowledge:'Guide officiel',forum:'Communauté',ticket:'Ma demande privée',incident:'Incident déclaré',service:'Mesure de service',maintenance:'Maintenance annoncée'};
  const icons={knowledge:'quick',forum:'forum',ticket:'support',incident:'incidents',service:'status',maintenance:'calendar'};
  function excerpt(row,query){
    let text=String(row.description||row.desc||row.content||''),tokens=norm(query).split(/\s+/).filter(t=>t.length>2);
    const full=String(row.content||text),at=tokens.map(t=>norm(full).indexOf(t)).filter(n=>n>=0).sort((a,b)=>a-b)[0];
    if(at!==undefined&&tokens.some(t=>!norm(text).includes(t)))text=(at>60?'…':'')+full.slice(Math.max(0,at-60),at+190);
    return text.length>230?text.slice(0,227)+'…':text;
  }
  function paint(host,rows,query='',{modal=false,partial=false}={}){
    host.replaceChildren();host.setAttribute('aria-busy','false');
    if(partial){const note=document.createElement('p');note.className='sq-search-notice';note.setAttribute('role','status');note.textContent='Recherche limitée aux guides disponibles. Les discussions et demandes sont momentanément indisponibles.';host.append(note);}
    if(!rows.length){const box=document.createElement('div');box.className='search-empty';box.textContent=query.length<2?'Recherchez une action, un produit ou un message d’erreur.':'Aucun résultat pour cette recherche. Essayez le nom du produit, une rubrique ou le message d’erreur rencontré.';const a=document.createElement('a');a.href=local('diagnostic.html');a.className='btn';a.textContent='Me guider';box.append(document.createElement('br'),a);host.append(box);return;}
    for(const row of rows){
      const a=document.createElement('a');a.className=modal?'search-result':'universal-result';a.href=safe(row.href);a.dataset.searchKind=row.kind||'knowledge';
      const glyph=document.createElement('span');glyph.className=modal?'result-ico':'universal-result-icon';glyph.innerHTML=window.SQIconly?.icon(icons[row.kind]||'quick','outline','md')||'';
      const copy=document.createElement('span'),title=document.createElement('strong'),desc=document.createElement('p'),badge=document.createElement('em');
      title.textContent=row.title;desc.textContent=excerpt(row,query);badge.textContent=(kinds[row.kind]||'Guide officiel')+(row.category?' · '+row.category:'');
      copy.append(title,desc,badge);a.append(glyph,copy);host.append(a);
    }
  }
  function keyboard(input,host,e){
    if(!['ArrowDown','ArrowUp','Escape'].includes(e.key))return;
    const links=[...host.querySelectorAll('a')];if(e.key==='Escape'){input.focus();return;}
    if(!links.length)return;e.preventDefault();const i=links.indexOf(document.activeElement);links[(i+(e.key==='ArrowDown'?1:-1)+links.length)%links.length].focus();
  }
  let appearance='light', media=matchMedia('(prefers-color-scheme:dark)');
  try{const s=localStorage.getItem('sq-docs-theme');if(['light','dark','system'].includes(s))appearance=s;}catch{}
  function applyTheme(value=appearance,save=false){
    appearance=['light','dark','system'].includes(value)?value:'light';
    document.documentElement.dataset.theme=appearance==='system'?(media.matches?'dark':'light'):appearance;
    if(save)try{localStorage.setItem('sq-docs-theme',appearance);}catch{}
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',document.documentElement.dataset.theme==='dark'?'#0D0D0E':'#F7F7F4');
    document.querySelectorAll('[name="sq-appearance"]').forEach(r=>r.checked=r.value===appearance);
  }
  applyTheme();media.addEventListener('change',()=>{if(appearance==='system')applyTheme();});
  addEventListener('storage',e=>{if(e.key==='sq-docs-theme')applyTheme(e.newValue||'light');});
  function setupAppearance(button){
    if(!button||button.dataset.appearanceReady)return;
    button.dataset.appearanceReady='1';button.title='Apparence';button.setAttribute('aria-label','Apparence');button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');
    button.innerHTML=(window.SQIconly?.icon('Setting','outline','md')||'')+'<span class="sq-command-label">Apparence</span>';
    const box=document.createElement('div');box.className='sq-appearance';box.id='sqAppearance';box.hidden=true;box.setAttribute('role','dialog');box.setAttribute('aria-label','Apparence');button.parentElement.append(box);button.setAttribute('aria-controls',box.id);
    const title=document.createElement('strong');title.textContent='Apparence';box.append(title);
    for(const [value,label] of [['light','Clair'],['dark','Sombre'],['system','Système']]){
      const wrap=document.createElement('label'),r=document.createElement('input');r.type='radio';r.name='sq-appearance';r.value=value;r.checked=value===appearance;r.addEventListener('change',()=>applyTheme(value,true));wrap.append(r,document.createTextNode(label));box.append(wrap);
    }
    const close=focus=>{box.hidden=true;button.setAttribute('aria-expanded','false');if(focus)button.focus();};
    button.addEventListener('click',()=>{if(!box.hidden){close(false);return;}box.hidden=false;button.setAttribute('aria-expanded','true');box.querySelector('input:checked')?.focus();});
    document.addEventListener('click',e=>{if(!box.contains(e.target)&&!button.contains(e.target))close(false);});
    box.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(true);}if(e.key==='Tab'){const r=[...box.querySelectorAll('input')],idx=r.indexOf(document.activeElement);if((!e.shiftKey&&idx===r.length-1)||(e.shiftKey&&idx===0))close(false);}});
  }
  window.SQHelp={base,local,safe,esc,norm,PRODUCTS,ISSUES,DEVICES,GUIDE,context,contextLink,plan,summary,backend,catalog,lookup,paint,keyboard,applyTheme,setupAppearance};
})();
