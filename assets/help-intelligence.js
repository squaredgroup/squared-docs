/* Squared Help Center v13 — contextual intelligence. Public context only. */
(() => {
  'use strict';
  if (window.SQHelpIntelligence) return;
  const script=document.currentScript, base=new URL('../',script.src);
  const local=p=>new URL(p,base).href;
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let graph=null;
  const graphLoad=()=>graph?Promise.resolve(graph):fetch(local('assets/knowledge-graph.json'),{cache:'no-cache'}).then(r=>r.json()).then(x=>graph=x).catch(()=>({nodes:[],synonyms:{}}));

  function rememberSearch(q){
    q=String(q||'').trim(); if(q.length<2)return;
    try{
      const rows=JSON.parse(localStorage.getItem('sq-help-recent-searches')||'[]').filter(x=>x!==q);
      rows.unshift(q);localStorage.setItem('sq-help-recent-searches',JSON.stringify(rows.slice(0,5)));
    }catch{}
  }
  function recentSearches(){
    try{return JSON.parse(localStorage.getItem('sq-help-recent-searches')||'[]').slice(0,5)}catch{return[]}
  }
  async function suggestions(q){
    const g=await graphLoad(),raw=norm(q),expanded=new Set(raw.split(/[^a-z0-9]+/).filter(Boolean));
    Object.entries(g.synonyms||{}).forEach(([k,vals])=>{if(raw.includes(norm(k)))vals.forEach(v=>norm(v).split(/\s+/).forEach(t=>expanded.add(t)))});
    return (g.nodes||[]).map(n=>{
      const hay=norm([n.title,n.product,n.intent,...(n.keywords||[])].join(' '));let score=0;
      expanded.forEach(t=>{if(t.length>1&&hay.includes(t))score+=n.title&&norm(n.title).includes(t)?5:2});
      return {...n,score};
    }).filter(n=>n.score>0).sort((a,b)=>b.score-a.score).slice(0,4);
  }

  function enhanceSearch(){
    const input=document.getElementById('searchInput'),results=document.getElementById('searchResults');
    if(!input||!results)return;
    input.addEventListener('keydown',e=>{if(e.key==='Enter')rememberSearch(input.value)});
    input.addEventListener('input',()=>{if(input.value.trim().length>1)clearTimeout(input._sqSuggestTimer);input._sqSuggestTimer=setTimeout(async()=>{
      const q=input.value.trim();if(q.length<2)return;
      const cards=await suggestions(q);if(!cards.length||!document.getElementById('searchModal')?.classList.contains('open'))return;
      let host=results.querySelector('.sq-smart-actions');
      if(!host){host=document.createElement('section');host.className='sq-smart-actions';results.prepend(host);}
      host.innerHTML='<div class="sq-smart-actions-head"><strong>Actions suggérées</strong><span>Selon votre recherche</span></div><div class="sq-smart-actions-grid">'+cards.map(n=>'<a href="'+esc(local(n.href))+'"><span>'+esc(n.product)+'</span><strong>'+esc(n.title)+'</strong><em>Ouvrir →</em></a>').join('')+'</div>';
    },220)});
    const modal=document.getElementById('searchModal');
    document.querySelectorAll('[data-search-open],#searchTrigger').forEach(b=>b.addEventListener('click',()=>{
      setTimeout(()=>{if(input.value)return;const recent=recentSearches();if(!recent.length)return;let host=results.querySelector('.sq-search-recents');if(!host){host=document.createElement('section');host.className='sq-search-recents';results.prepend(host)}host.innerHTML='<strong>Recherches récentes</strong><div>'+recent.map(q=>'<button type="button">'+esc(q)+'</button>').join('')+'</div>';host.querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>{input.value=btn.textContent;input.dispatchEvent(new Event('input',{bubbles:true}));input.focus()}));},80);
    }));
  }

  async function contextualHelp(){
    if(document.querySelector('.sq-context-help'))return;
    const g=await graphLoad(),path=location.pathname.replace(base.pathname,'').replace(/^\//,'')||'index.html';
    const current=(g.nodes||[]).find(n=>n.href===path);
    const candidates=current?(current.next||[]).map(id=>g.nodes.find(n=>n.id===id)).filter(Boolean):[];
    const btn=document.createElement('button');btn.type='button';btn.className='sq-context-help-trigger';btn.setAttribute('aria-label','Aide contextuelle');btn.textContent='?';
    const panel=document.createElement('aside');panel.className='sq-context-help';panel.hidden=true;
    const generic=[{title:'Rechercher une réponse',href:'search.html',product:'Help Center'},{title:'Dépannage guidé',href:'diagnostic.html',product:'Help Center'},{title:'Support privé',href:'support.html',product:'Help Center'}];
    const rows=(candidates.length?candidates:generic).slice(0,4);
    panel.innerHTML='<div class="sq-context-help-head"><div><small>Aide contextuelle</small><strong>'+(current?esc(current.product):'Squared Help')+'</strong></div><button type="button" aria-label="Fermer">×</button></div><p>'+(current?'Continuez depuis « '+esc(current.title)+' ».':'Choisissez la prochaine étape adaptée à votre besoin.')+'</p><nav>'+rows.map(n=>'<a href="'+esc(local(n.href))+'"><span>'+esc(n.product||'Help Center')+'</span><strong>'+esc(n.title)+'</strong><em>→</em></a>').join('')+'</nav><a class="btn green" href="'+esc(local('diagnostic.html'))+'">Me guider</a>';
    document.body.append(btn,panel);
    const close=()=>{panel.hidden=true;btn.setAttribute('aria-expanded','false')};
    btn.addEventListener('click',()=>{panel.hidden=!panel.hidden;btn.setAttribute('aria-expanded',String(!panel.hidden))});
    panel.querySelector('button').addEventListener('click',close);
    document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  }

  async function personalizeHome(){
    if(!document.body.classList.contains('sq-home-v10'))return;
    const hero=document.querySelector('.sq-hero-main');if(!hero)return;
    const backend=await window.SQHelp?.backend?.(1200);if(!backend)return;
    const profile=await backend.currentProfile().catch(()=>null);if(!profile)return;
    const box=document.createElement('div');box.className='sq-personal-home';
    const staff=['admin','moderator'].includes(profile.role);
    box.innerHTML='<span>Votre espace</span><strong>Bonjour '+esc(profile.display_name||profile.username||'')+'</strong><p>'+(staff?'Accédez rapidement à la connaissance, la communauté et aux outils d’équipe.':'Reprenez vos demandes, vos favoris et les guides utiles à votre compte.')+'</p><div><a href="'+local('my-tickets.html')+'">Mes demandes</a><a href="'+local('profile.html')+'">Mon activité</a>'+(staff?'<a href="'+local(profile.role==='admin'?'admin.html':'moderation.html')+'">Console équipe</a>':'')+'</div>';
    hero.append(box);
  }

  async function articleGraph(){
    const article=document.querySelector('.article');if(!article)return;
    const g=await graphLoad(),path=location.pathname.replace(base.pathname,'').replace(/^\//,'');
    const current=(g.nodes||[]).find(n=>n.href===path);if(!current||!current.next?.length)return;
    const rows=current.next.map(id=>g.nodes.find(n=>n.id===id)).filter(Boolean).slice(0,3);if(!rows.length)return;
    const section=document.createElement('section');section.className='sq-knowledge-path';
    section.innerHTML='<div><small>Parcours recommandé</small><h2>Votre prochaine étape</h2></div><div class="sq-knowledge-path-grid">'+rows.map((n,i)=>'<a href="'+local(n.href)+'"><span>0'+(i+1)+'</span><div><small>'+esc(n.product)+'</small><strong>'+esc(n.title)+'</strong></div><em>→</em></a>').join('')+'</div>';
    article.append(section);
  }

  enhanceSearch();contextualHelp();personalizeHome();articleGraph();
  window.SQHelpIntelligence={version:'2026.09.26',suggestions,recentSearches};
})();