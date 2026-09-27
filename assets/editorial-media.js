(()=>{if(window.__sqEditorialMedia)return;window.__sqEditorialMedia=true;
const media={
 studio:{src:'https://images.unsplash.com/photo-1764588037085-a78240016f8b?auto=format&fit=crop&w=1800&q=82',page:'https://unsplash.com/photos/6xzZ0DvTtK8',credit:'Martin Katler',alt:'Bureau créatif moderne avec ordinateur et plantes'},
 tools:{src:'https://images.unsplash.com/photo-1704298957507-58723920474f?auto=format&fit=crop&w=1800&q=82',page:'https://unsplash.com/photos/ZDIFcwzusck',credit:'Jakub Żerdzicki',alt:'Bureau de designer avec clavier, souris et outils créatifs'},
 dev:{src:'https://images.unsplash.com/photo-1654262609484-76d1a8f3b016?auto=format&fit=crop&w=1800&q=82',page:'https://unsplash.com/photos/0m-6I48ChD8',credit:'Kelum Chathuranga',alt:'Développeur travaillant sur un ordinateur portable'},
 architecture:{src:'https://images.unsplash.com/photo-1660074871330-c30ee68a9b34?auto=format&fit=crop&w=1800&q=82',page:'https://unsplash.com/photos/ss-zWKsGePM',credit:'Emanuel Haas',alt:'Architecture verte aux lignes géométriques'}
};
const key=location.pathname.split('/').pop().toLowerCase();
const pick=()=>{
 if(/development|security|source|status|server|troubleshoot|diagnostic/.test(key))return media.dev;
 if(/design|wix|guide|quick|article|getting/.test(key))return media.tools;
 if(/ecosystem|parcours|workspace|build|community/.test(key))return media.architecture;
 return media.studio;
};
const card=(m,cls='')=>{const f=document.createElement('figure');f.className='sq-editorial-media '+cls;f.innerHTML='<img loading="lazy" decoding="async" src="'+m.src+'" alt="'+m.alt+'"><figcaption>Photo · <a href="'+m.page+'" target="_blank" rel="noreferrer">'+m.credit+' / Unsplash</a></figcaption>';return f};
const mount=()=>{
 const shell=document.querySelector('.main>.shell,.main>.forum-shell');if(!shell||shell.querySelector('.sq-editorial-media'))return;
 if(key===''||key==='index.html'){
   const hero=shell.querySelector('.help-hero');if(!hero)return;
   const gallery=document.createElement('div');gallery.className='sq-editorial-gallery';
   [media.studio,media.tools,media.architecture].forEach((m,i)=>gallery.appendChild(card(m,i===0?'is-primary':'')));
   hero.insertAdjacentElement('afterend',gallery);return;
 }
 const anchor=shell.querySelector('.article-head,.sq-guides-hero,.forum-hero,.hero,.section-head');
 const visual=card(pick(),'is-wide');
 if(anchor)anchor.insertAdjacentElement('afterend',visual);else shell.prepend(visual);
};
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',mount,{once:true}):mount();
})();