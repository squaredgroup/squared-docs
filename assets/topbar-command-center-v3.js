(()=>{if(window.__sqTopbarTools)return;window.__sqTopbarTools=true;
const icons={home:'home',guides:'book',forum:'forum',support:'support',status:'status',bookmark:'favorite'};
const tool=(href,label,name)=>'<a class="sq-top-tool" href="'+href+'" title="'+label+'" aria-label="'+label+'">'+window.SQIconly.icon(icons[name]||name,'outline','md')+'<span class="sq-top-tool-label">'+label+'</span></a>';
const mount=()=>{const actions=document.querySelector('.topbar .top-actions');if(!actions||actions.querySelector('.sq-top-tools'))return;
 const tools=document.createElement('div');tools.className='sq-top-tools';tools.innerHTML=
 '<a class="sq-top-status" href="status.html" title="État des services"><span class="sq-top-status-dot"></span><span>État des services</span></a><span class="sq-top-divider"></span>'+
 tool('index.html','Accueil','home')+tool('guides.html','Guides','guides')+tool('forum.html','Forum','forum')+tool('bookmarks.html','Favoris','bookmark')+tool('support.html','Support','support');
 const account=actions.querySelector('#forumAccount');actions.insertBefore(tools,account||actions.firstChild);
};
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',mount,{once:true}):mount();
})();