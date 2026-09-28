(()=>{if(window.__sqMobileContextTopbar)return;window.__sqMobileContextTopbar=true;
const clean=s=>(s||'').replace(/\s+/g,' ').trim();
const current=()=>{
 const active=document.querySelector('.hc-nav-link.active,.hc-sub-link.active');
 if(active)return clean(active.textContent);
 const strong=document.querySelector('.topbar .crumbs strong');
 if(strong)return clean(strong.textContent);
 const crumb=document.querySelector('.topbar .crumbs');
 if(crumb)return clean(crumb.textContent.replace(/›/g,' '));
 return 'Centre d’aide';
};
const mount=()=>{const bar=document.querySelector('.topbar');if(!bar||bar.querySelector('.sq-mobile-location'))return;
 const loc=document.createElement('div');loc.className='sq-mobile-location';loc.setAttribute('aria-label','Emplacement actuel');
 loc.innerHTML='<img class="sq-mobile-location-logo" src="assets/logo-squared.png" alt=""><span class="sq-mobile-location-copy"><span class="sq-mobile-location-brand">Squared Help Center</span><span class="sq-mobile-location-page"></span></span>';
 loc.querySelector('.sq-mobile-location-page').textContent=current();
 const actions=bar.querySelector('.top-actions');bar.insertBefore(loc,actions||null);
};
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>requestAnimationFrame(mount),{once:true}):requestAnimationFrame(mount);
})();