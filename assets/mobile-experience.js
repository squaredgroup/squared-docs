/* Squared Help Center · mobile experience 2026-09-22.
 * Progressive enhancement only: no account writes, no service worker, no query,
 * support message or authentication data persisted. Iconly stays the source.
 */
(() => {
  'use strict';
  const source = document.currentScript;
  const base = new URL('../', source.src);
  const local = path => new URL(path, base).href;
  const init = () => {
    if (window.SQMobileExperience) return;
    const root = document.documentElement, body = document.body;
    const main = document.querySelector('.app > .main');
    if (!main) return;
    root.classList.add('sq-mobile-v2');
    const media = matchMedia('(max-width: 860px)');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) viewport.content = 'width=device-width, initial-scale=1, viewport-fit=cover';
    const icon = key => window.SQIconly?.icon(key, 'outline', 'lg') || '';
    const make = (tag, className, text) => {
      const el = document.createElement(tag);
      if (className) el.className = className;
      if (text !== undefined) el.textContent = text;
      return el;
    };
    const button = (text, key, className = 'sq-mobile-control') => {
      const el = make('button', className);
      el.type = 'button'; el.innerHTML = icon(key);
      el.append(make('span', '', text));
      return el;
    };
    const focusables = scope => [...scope.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')]
      .filter(el => el.tabIndex >= 0 && !el.disabled && !el.closest('[inert]') && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
    const restoreFocus = el => {
      if (el?.isConnected && !el.closest('[inert]') && el.getClientRects().length) el.focus({preventScroll:true});
    };
    const announce = make('div', 'sq-mobile-announcement');
    announce.setAttribute('role', 'status'); announce.setAttribute('aria-live', 'polite');
    body.append(announce);
    let announcementTimer;
    const notify = text => {
      clearTimeout(announcementTimer); announce.textContent = text; announce.classList.add('show');
      announcementTimer = setTimeout(() => announce.classList.remove('show'), 3500);
    };

    // One navigation owner: the existing drawer, not a second cloned sidebar.
    const dock = make('nav', 'sq-mobile-dock'); dock.id = 'sqMobileDock';
    dock.setAttribute('aria-label', 'Navigation mobile');
    const path = location.pathname.replace(base.pathname, '').replace(/^\//, '') || 'index.html';
    for (const [label, key, destination] of [['Accueil','home','index.html'],['Rechercher','search',null],['Forum','forum','forum.html'],['Support','support','support.html'],['Menu','menu',null]]) {
      const control = destination ? make('a', 'sq-mobile-dock-item') : button(label, key, 'sq-mobile-dock-item');
      if (destination) {
        control.href = local(destination); control.innerHTML = icon(key); control.append(make('span','',label));
        if (path === destination || (destination === 'forum.html' && path.startsWith('forum-'))) control.setAttribute('aria-current','page');
      }
      if (label === 'Menu') {
        control.id = 'sqDockMenu'; control.setAttribute('aria-controls','sidebar'); control.setAttribute('aria-expanded','false');
        control.addEventListener('click', () => document.getElementById('menuBtn')?.click());
      }
      if (label === 'Rechercher') {
        control.id = 'sqDockSearch';
        control.addEventListener('click', () => {
          searchReturn = control;
          const trigger = document.querySelector('.help-search[data-search-open],.topbar [data-search-open],.hc-search[data-search-open],[data-search-open],#searchTrigger');
          if (searchModal && trigger) trigger.click(); else location.assign(local('search.html'));
        });
      }
      dock.append(control);
    }
    body.append(dock);
    const authPage = /^(login|register|signup|forgot-password|reset-password|auth-callback)\.html$/.test(path);
    root.classList.toggle('sq-mobile-auth', authPage);

    // Preserve the scroll position when iOS opens a drawer or search overlay.
    const locks = new Set(); let savedScroll = null;
    const scrollPosition = () => savedScroll ? savedScroll.y : scrollY;
    const setLock = (key, enabled) => {
      if (enabled && media.matches) locks.add(key); else locks.delete(key);
      if (locks.size && !savedScroll) {
        savedScroll = {x:scrollX,y:scrollY,styles:{},rootOverflow:root.style.overflow};
        for (const prop of ['position','top','left','width','overflow']) savedScroll.styles[prop] = body.style[prop];
        Object.assign(body.style,{position:'fixed',top:`-${savedScroll.y}px`,left:`-${savedScroll.x}px`,width:'100%',overflow:'hidden'});
        root.style.overflow = 'hidden';
      } else if (!locks.size && savedScroll) {
        const previous = savedScroll; savedScroll = null;
        Object.assign(body.style, previous.styles); root.style.overflow = previous.rootOverflow;
        const behavior = root.style.scrollBehavior; root.style.scrollBehavior = 'auto';
        scrollTo(previous.x,previous.y); root.style.scrollBehavior = behavior;
      }
    };
    const sidebar = document.getElementById('sidebar');
    const syncDrawer = () => {
      const opened = media.matches && body.classList.contains('sq-mobile-menu-open');
      document.getElementById('sqDockMenu').setAttribute('aria-expanded', String(opened));
      dock.inert = opened || searchActive || Boolean(sheet?.open);
      setLock('drawer', opened);
    };
    new MutationObserver(syncDrawer).observe(body,{attributes:true,attributeFilter:['class']});

    // Adapt to the *visual* viewport, including the software keyboard and rotation.
    let viewportFrame = 0;
    const updateViewport = () => {
      viewportFrame = 0;
      const vv = window.visualViewport;
      const height = vv?.height || innerHeight, width = vv?.width || innerWidth;
      root.style.setProperty('--sq-vv-height',`${height}px`);
      root.style.setProperty('--sq-vv-width',`${width}px`);
      root.style.setProperty('--sq-vv-top',`${vv?.offsetTop || 0}px`);
      root.style.setProperty('--sq-vv-left',`${vv?.offsetLeft || 0}px`);
      const editable = document.activeElement?.matches('input,textarea,select,[contenteditable="true"]');
      root.classList.toggle('sq-keyboard-open', Boolean(media.matches && editable && innerHeight-height > 120));
      updateScrollableTables();
    };
    const scheduleViewport = () => { if (!viewportFrame) viewportFrame = requestAnimationFrame(updateViewport); };
    window.visualViewport?.addEventListener('resize', scheduleViewport, {passive:true});
    window.visualViewport?.addEventListener('scroll', scheduleViewport, {passive:true});
    addEventListener('resize',scheduleViewport,{passive:true});
    document.addEventListener('focusin',scheduleViewport); document.addEventListener('focusout',scheduleViewport);

    // Enhance the existing search engine without issuing duplicate requests.
    const searchModal = document.getElementById('searchModal');
    const searchInput = document.getElementById('searchInput');
    let searchReturn = null, searchActive = false, searchInert = [];
    document.addEventListener('click', event => {
      if (event.isTrusted && event.target.closest?.('[data-search-open],#searchTrigger')) searchReturn = event.target.closest('[data-search-open],#searchTrigger');
    },true);
    const syncSearch = () => {
      const opened = Boolean(searchModal?.classList.contains('open'));
      if (opened === searchActive) return;
      searchActive = opened;
      root.classList.toggle('sq-search-active', opened);
      if (opened) {
        if (!searchReturn) searchReturn = document.activeElement;
        if (body.classList.contains('sq-mobile-menu-open')) window.SQMobileNavigation?.close();
        searchInert = [...body.children].filter(el => el !== searchModal && !['SCRIPT','LINK','STYLE'].includes(el.tagName) && el !== announce && !el.contains(searchModal)).map(el => [el, el.inert]);
        searchInert.forEach(([el]) => {el.inert = true;});
        searchModal.setAttribute('aria-hidden','false');
      } else {
        searchInert.forEach(([el, wasInert]) => {el.inert = wasInert;}); searchInert = [];
        searchModal?.setAttribute('aria-hidden','true');
      }
      setLock('search',opened); syncDrawer();
      if (!opened) {restoreFocus(searchReturn); searchReturn = null;}
    };
    if (searchModal && searchInput) {
      searchModal.setAttribute('aria-hidden','true');
      searchInput.setAttribute('aria-label','Rechercher dans le centre d’aide');
      searchInput.setAttribute('enterkeyhint','search');
      const close = document.getElementById('searchClose');
      if (close) {close.type = 'button'; close.textContent = 'Fermer'; close.setAttribute('aria-label','Fermer la recherche');}
      const clear = button('Effacer','close','sq-search-clear'); clear.id = 'sqSearchClear';
      clear.setAttribute('aria-label','Effacer la recherche'); clear.hidden = !searchInput.value;
      searchInput.after(clear);
      clear.addEventListener('click', () => {searchInput.value='';searchInput.dispatchEvent(new Event('input',{bubbles:true}));searchInput.focus();});
      searchInput.addEventListener('input',()=>{clear.hidden=!searchInput.value;});
      new MutationObserver(()=>{clear.hidden=!searchInput.value;syncSearch();}).observe(searchModal,{attributes:true,attributeFilter:['class']});
      const filters = searchModal.querySelector('.search-filters');
      if (filters) {
        filters.setAttribute('role','group');filters.setAttribute('aria-label','Filtrer les résultats');
        const pressed = () => filters.querySelectorAll('button').forEach(el=>el.setAttribute('aria-pressed',String(el.classList.contains('active'))));
        pressed();new MutationObserver(pressed).observe(filters,{subtree:true,attributes:true,attributeFilter:['class']});
      }
    }

    // A reusable native dialog for the article outline and share fallback.
    let sheet = null, sheetReturn = null;
    const closeSheet = () => {
      if (!sheet?.open) return;
      if (typeof sheet.close === 'function') sheet.close(); else {sheet.removeAttribute('open');finishSheet();}
    };
    const finishSheet = () => {setLock('sheet',false);dock.inert=searchActive||body.classList.contains('sq-mobile-menu-open');restoreFocus(sheetReturn);};
    const openSheet = (title, content, opener) => {
      if (!sheet) {
        sheet = make('dialog','sq-mobile-sheet');sheet.id='sqMobileSheet';sheet.setAttribute('aria-labelledby','sqMobileSheetTitle');
        sheet.addEventListener('close',finishSheet);
        sheet.addEventListener('click',event=>{if(event.target===sheet){const r=sheet.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeSheet();}});
        body.append(sheet);
      }
      sheetReturn=opener;sheet.replaceChildren();
      const head=make('div','sq-mobile-sheet-head'),heading=make('h2','',title);heading.id='sqMobileSheetTitle';
      const close=button('Fermer','close','sq-mobile-control');close.setAttribute('aria-label',`Fermer : ${title}`);close.addEventListener('click',closeSheet);
      head.append(heading,close);sheet.append(head,content);
      if(typeof sheet.showModal==='function')sheet.showModal();else sheet.setAttribute('open','');
      dock.inert=true;setLock('sheet',true);close.focus();
    };
    document.addEventListener('keydown',event=>{
      const scope=sheet?.open?sheet:searchActive?searchModal:null;
      if(!scope)return;
      if(event.key==='Escape'&&scope===searchModal){event.preventDefault();document.getElementById('searchClose')?.click();return;}
      if(event.key==='Escape'&&scope===sheet&&typeof sheet.close!=='function'){event.preventDefault();closeSheet();return;}
      if(event.key!=='Tab')return;
      const controls=focusables(scope),first=controls[0],last=controls[controls.length-1];
      if(!first)return;
      if(scope===searchModal){
        const index=controls.indexOf(document.activeElement);
        const next=event.shiftKey?(index<=0?last:controls[index-1]):(index<0||index===controls.length-1?first:controls[index+1]);
        event.preventDefault();next.focus({preventScroll:true});return;
      }
      if(event.shiftKey&&(document.activeElement===first||!scope.contains(document.activeElement))){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&(document.activeElement===last||!scope.contains(document.activeElement))){event.preventDefault();first.focus();}
    },true);

    // No private URLs, token-bearing queries or support content in native sharing.
    const publicURL = () => {
      const url=new URL(location.href);url.search='';
      // Only a published managed article receives this canonical from the editor.
      // Preserve its public identifier, never arbitrary query parameters.
      if (path === 'article.html') {
        try {
          const href=document.querySelector('link[rel="canonical"]')?.href;
          const canonical=href?new URL(href):null;
          const id=canonical?.searchParams.get('id');
          if(canonical?.origin===url.origin&&canonical.pathname===url.pathname&&/^[A-Za-z0-9_-]{1,128}$/.test(id||''))url.searchParams.set('id',id);
        } catch {}
      }
      try {if(!url.hash||!document.getElementById(decodeURIComponent(url.hash.slice(1))))url.hash='';} catch {url.hash='';}
      return url.href;
    };
    const sharePage = async opener => {
      const url=publicURL(),title=main.querySelector('h1')?.textContent?.trim()||document.title;
      if(typeof navigator.share==='function'){
        try {await navigator.share({title,url});return;} catch(error) {if(error.name==='AbortError')return;}
      }
      try {if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(url);notify('Lien de l’article copié.');}
      catch {
        const content=make('div','sq-mobile-sheet-content');const label=make('label','','Lien public de cet article');
        const input=make('input','sq-share-url');input.id='sqShareURL';input.readOnly=true;input.value=url;label.htmlFor=input.id;
        const select=button('Sélectionner le lien','share');select.addEventListener('click',()=>{input.focus();input.select();});
        content.append(label,input,make('p','','Sélectionnez le lien, puis utilisez la commande Copier de votre appareil.'),select);openSheet('Partager l’article',content,opener);
      }
    };

    let article=null,progressLabel=null,outlineButton=null,readingReady=false;
    const privatePage=/(?:^|\/)(?:login|register|signup|forgot-password|reset-password|auth-callback|support|support-ticket|ticket|forum(?:-[a-z-]+)?|profile|account-settings|admin|editor|editorial|moderation|bookmarks|my-activity|my-tickets|notification-settings|notifications|favorites)\.html$/.test(path);
    const sections = () => article ? [...article.querySelectorAll('h2')].filter(h=>!h.closest('.article-tools,.article-feedback-v5,.sq-mobile-reading,.article-tool-card')).map((heading,index)=>{
      const target=heading.closest('.doc-block[id]')||heading;
      if(!target.id){let id=`sq-section-${index+1}`;while(document.getElementById(id))id+='-a';target.id=id;}
      return {target,label:heading.textContent.trim()};
    }).filter(item=>item.label) : [];
    const setupReading = () => {
      if(readingReady||privatePage)return;
      article=main.querySelector('.article');if(!article)return;
      readingReady=true;article.classList.add('sq-mobile-article');
      const tools=make('div','sq-mobile-reading');tools.setAttribute('role','group');tools.setAttribute('aria-label','Outils de lecture');
      outlineButton=button('Sommaire','documents');outlineButton.id='sqArticleOutline';outlineButton.setAttribute('aria-haspopup','dialog');
      outlineButton.addEventListener('click',()=>{
        const list=make('nav','sq-mobile-outline');list.setAttribute('aria-label','Sections de cet article');
        for(const {target,label} of sections()){
          const link=make('a','',label);link.href=`#${encodeURIComponent(target.id)}`;
          link.addEventListener('click',event=>{event.preventDefault();closeSheet();requestAnimationFrame(()=>{target.setAttribute('tabindex','-1');target.focus({preventScroll:true});target.scrollIntoView({behavior:reducedMotion.matches?'auto':'smooth',block:'start'});const url=new URL(location.href);url.hash=target.id;history.replaceState(history.state,'',url);});});
          list.append(link);
        }
        if(!list.children.length)list.append(make('p','','Cet article ne comporte pas de sous-sections.'));
        openSheet('Sur cette page',list,outlineButton);
      });
      const size=button('Texte','typography');size.id='sqReadingSize';size.setAttribute('aria-label','Agrandir le texte de l’article');
      let large=false;try{large=localStorage.getItem('sq-help-reading-size')==='large';}catch{}
      const applySize=()=>{article.classList.toggle('sq-reading-large',large);size.setAttribute('aria-pressed',String(large));size.setAttribute('aria-label',large?'Rétablir la taille du texte':'Agrandir le texte de l’article');};
      applySize();size.addEventListener('click',()=>{large=!large;applySize();try{localStorage.setItem('sq-help-reading-size',large?'large':'normal');}catch{}scheduleReading();});
      const share=button('Partager','share');share.id='sqShareArticle';share.addEventListener('click',()=>sharePage(share));
      progressLabel=make('span','sq-reading-progress','0 %');progressLabel.setAttribute('aria-label','Progression dans l’article');
      tools.append(outlineButton,size,share,progressLabel);article.before(tools);article.parentElement.classList.add('sq-has-mobile-reading');
      // Keep the existing desktop outline; replace only the duplicate mobile control.
      main.querySelectorAll('.v6-mobile-toc').forEach(el=>el.classList.add('sq-replaced-mobile-toc'));
    };
    const topButton=button('Haut','arrowUp','sq-mobile-top');topButton.setAttribute('aria-label','Revenir en haut de la page');topButton.hidden=true;
    topButton.addEventListener('click',()=>{window.scrollTo({top:0,behavior:reducedMotion.matches?'auto':'smooth'});const heading=main.querySelector('h1');if(heading){heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});}});body.append(topButton);
    let readingFrame=0,lastProgress=-1;
    const updateReading=()=>{
      readingFrame=0;const y=scrollPosition();topButton.hidden=!media.matches||y<600;
      if(!article||!progressLabel)return;
      const top=article.getBoundingClientRect().top+y;
      const range=Math.max(1,article.scrollHeight-(innerHeight-170));
      const percent=Math.round(Math.max(0,Math.min(100,(y-top+80)/range*100)));
      if(percent!==lastProgress){progressLabel.textContent=`${percent} %`;progressLabel.setAttribute('aria-label',`${percent} % de l’article parcouru`);lastProgress=percent;}
    };
    function scheduleReading(){if(!readingFrame)readingFrame=requestAnimationFrame(updateReading);}
    addEventListener('scroll',scheduleReading,{passive:true});

    // Local horizontal scrolling, rather than hiding overflowing page content.
    function updateScrollableTables(){
      main.querySelectorAll('.sq-mobile-table-scroll').forEach(wrap=>{
        const overflowing=wrap.scrollWidth>wrap.clientWidth+2;
        wrap.tabIndex=overflowing?0:-1;wrap.classList.toggle('is-scrollable',overflowing);
        if(wrap.previousElementSibling?.classList.contains('sq-table-hint'))wrap.previousElementSibling.hidden=!overflowing;
      });
    }
    const hydrate=()=>{
      setupReading();
      main.querySelectorAll('table:not([data-sq-mobile-table])').forEach(table=>{
        table.dataset.sqMobileTable='1';
        let wrap=table.parentElement;
        if(!wrap.matches('.table-wrap,.table-scroll,.sq-table-wrap,.sq-mobile-table-scroll')){wrap=make('div','sq-mobile-table-scroll');table.before(wrap);wrap.append(table);}else wrap.classList.add('sq-mobile-table-scroll');
        wrap.setAttribute('role','region');wrap.setAttribute('aria-label',table.caption?.textContent?.trim()||'Tableau défilant horizontalement');
        const hint=make('p','sq-table-hint','Faites glisser le tableau pour voir toutes les colonnes.');hint.hidden=true;wrap.before(hint);
        if(table.rows[0]?.cells.length>=3)table.classList.add('sq-wide-table');
      });
      updateScrollableTables();scheduleReading();
    };
    let hydrationFrame=0;
    new MutationObserver(()=>{if(!hydrationFrame)hydrationFrame=requestAnimationFrame(()=>{hydrationFrame=0;hydrate();});}).observe(main,{childList:true,subtree:true});

    const offline=make('div','sq-mobile-network');offline.setAttribute('role','status');offline.hidden=true;
    offline.textContent='Connexion interrompue. La page déjà ouverte reste lisible ; la recherche en ligne, le forum et le support nécessitent une connexion.';
    (main.querySelector('.shell,.forum-shell')||main).prepend(offline);
    const updateNetwork=()=>{offline.hidden=navigator.onLine!==false;};
    addEventListener('offline',updateNetwork);addEventListener('online',updateNetwork);updateNetwork();
    media.addEventListener('change',()=>{
      if(!media.matches){for(const key of [...locks])setLock(key,false);closeSheet();}
      else {setLock('search',searchActive);}
      syncDrawer();scheduleViewport();scheduleReading();
    });
    addEventListener('pageshow',()=>{syncSearch();syncDrawer();scheduleViewport();scheduleReading();});
    hydrate();syncDrawer();syncSearch();updateViewport();scheduleReading();
    window.SQMobileExperience={version:'20260924.2',refresh:hydrate};
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
