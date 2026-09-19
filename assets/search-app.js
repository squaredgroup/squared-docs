/* Shared universal search: cancellation, honest fallback, no query persistence. */
const H=window.SQHelp,$=s=>document.querySelector(s),input=$('#universalSearchInput'),host=$('#universalSearchResults');
let rows=[],active='all',version=0,timer,controller,partial=false;
function paint(){const list=active==='all'?rows:rows.filter(r=>r.kind===active);H.paint(host,list,input.value,{partial});$('#universalResultCount').textContent=list.length+' résultat'+(list.length>1?'s':'');}
async function run(q){const seq=++version;controller?.abort();controller=new AbortController();const c=controller,t=setTimeout(()=>c.abort(),7000);host.setAttribute('aria-busy','true');host.textContent='Recherche dans les guides et la communauté…';
 try{const data=await H.lookup(q,{signal:c.signal,limit:80});if(seq!==version)return;rows=data.rows;partial=data.partial;paint();}
 catch{if(seq!==version)return;const data=await H.lookup(q,{remote:false});if(seq!==version)return;rows=data.rows;partial=true;paint();}
 finally{clearTimeout(t);}
}
if(input&&host){input.maxLength=200;host.setAttribute('aria-live','polite');input.setAttribute('aria-label','Rechercher dans le centre d’aide');
 input.addEventListener('input',()=>{++version;controller?.abort();clearTimeout(timer);timer=setTimeout(()=>run(input.value),160);});
 input.addEventListener('keydown',e=>{if(e.key==='Enter'){clearTimeout(timer);run(input.value);}else H.keyboard(input,host,e);});host.addEventListener('keydown',e=>H.keyboard(input,host,e));
 const labels={all:'Tout',knowledge:'Guides officiels',forum:'Communauté',ticket:'Mes demandes privées',incident:'Incidents',service:'Services',maintenance:'Maintenances'};
 const filters=[...document.querySelectorAll('[data-kind]')],parent=filters[0]?.parentElement;
 for(const [kind,label] of Object.entries(labels)){if(filters.some(b=>b.dataset.kind===kind))continue;if(!parent)continue;const b=document.createElement('button');b.className='forum-filter-tab';b.type='button';b.dataset.kind=kind;b.textContent=label;parent.append(b);filters.push(b);}
 filters.forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.kind===active));b.addEventListener('click',()=>{active=b.dataset.kind;filters.forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});paint();});});
 const history=$('#searchHistory');if(history)history.textContent='Vos termes de recherche ne sont pas conservés dans ce navigateur.';try{localStorage.removeItem('sq-help-search-history');}catch{}
 H.backend().then(b=>b?.client.auth.onAuthStateChange(event=>{if(['SIGNED_OUT','SIGNED_IN','USER_UPDATED'].includes(event)){++version;controller?.abort();clearTimeout(timer);rows=[];partial=false;host.replaceChildren();$('#universalResultCount').textContent='0 résultat';}}));
 const q=new URLSearchParams(location.search).get('q')||'';input.value=q;run(q);
}
