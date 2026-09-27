(()=>{if(window.__sqBootLoader)return;window.__sqBootLoader=true;
const show=()=>{
 if(document.querySelector('.sq-boot-loader'))return;
 const el=document.createElement('div');el.className='sq-boot-loader';el.setAttribute('role','status');el.setAttribute('aria-label','Chargement de Squared Help Center');
 el.innerHTML='<div class="sq-boot-card"><img class="sq-boot-logo" src="assets/logo-squared.png" alt=""><strong class="sq-boot-name">SQUARED HELP CENTER</strong><span class="sq-boot-track" aria-hidden="true"><i class="sq-boot-bar"></i></span></div>';
 document.body.prepend(el);
 const started=performance.now();
 const leave=()=>{const wait=Math.max(0,520-(performance.now()-started));setTimeout(()=>{el.classList.add('is-leaving');setTimeout(()=>el.remove(),360)},wait)};
 if(document.readyState==='complete')leave();else window.addEventListener('load',leave,{once:true});
 setTimeout(leave,2200);
};
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',show,{once:true}):show();
})();