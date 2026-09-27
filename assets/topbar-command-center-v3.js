(()=>{if(window.__sqTopbarTools)return;window.__sqTopbarTools=true;
const icon=n=>({home:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-7h6v7"/>',guides:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/>',forum:'<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>',support:'<path d="M4 13a8 8 0 0 1 16 0"/><path d="M4 13v4a2 2 0 0 0 2 2h2v-6H4ZM20 13v4a2 2 0 0 1-2 2h-2v-6h4Z"/><path d="M16 19c0 1.1-.9 2-2 2h-2"/>',status:'<path d="M4 19V9M10 19V5M16 19v-7M22 19V2"/>',bookmark:'<path d="M6 3h12v18l-6-4-6 4z"/>'})[n]||'';
const tool=(href,label,name)=>'<a class="sq-top-tool" href="'+href+'" title="'+label+'" aria-label="'+label+'"><svg viewBox="0 0 24 24" aria-hidden="true">'+icon(name)+'</svg><span class="sq-top-tool-label">'+label+'</span></a>';
const mount=()=>{const actions=document.querySelector('.topbar .top-actions');if(!actions||actions.querySelector('.sq-top-tools'))return;
 const tools=document.createElement('div');tools.className='sq-top-tools';tools.innerHTML=
 '<a class="sq-top-status" href="status.html" title="État des services"><span class="sq-top-status-dot"></span><span>Services opérationnels</span></a><span class="sq-top-divider"></span>'+
 tool('index.html','Accueil','home')+tool('guides.html','Guides','guides')+tool('forum.html','Forum','forum')+tool('bookmarks.html','Favoris','bookmark')+tool('support.html','Support','support');
 const account=actions.querySelector('#forumAccount');actions.insertBefore(tools,account||actions.firstChild);
};
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',mount,{once:true}):mount();
})();