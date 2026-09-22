/* Progressive mobile navigation. No requests, account writes or dependencies. */
(() => {
  'use strict';
  if (window.SQMobileNavigation) return;
  const init = () => {
    const sidebar = document.getElementById('sidebar');
    const main = document.querySelector('.app > .main');
    if (!sidebar || !main) return;
    const mobile = matchMedia('(max-width: 860px)');
    let toggle = document.getElementById('menuBtn');
    if (!toggle) {
      const header = document.createElement('header');
      header.className = 'topbar';
      toggle = document.createElement('button');
      toggle.type = 'button'; toggle.id = 'menuBtn'; toggle.className = 'icon-btn mobile-menu';
      toggle.setAttribute('aria-label', 'Ouvrir le menu');
      toggle.innerHTML = window.SQIconly?.icon('menu', 'outline', 'md') || 'Menu';
      header.appendChild(toggle); main.prepend(header);
    }
    const backdrop = document.createElement('button');
    backdrop.type = 'button'; backdrop.className = 'sq-mobile-backdrop';
    backdrop.id = 'sqMobileBackdrop'; backdrop.hidden = true; backdrop.tabIndex = -1;
    backdrop.setAttribute('aria-label', 'Fermer la navigation');
    document.body.appendChild(backdrop);
    const closeButton = document.createElement('button');
    closeButton.type = 'button'; closeButton.className = 'icon-btn sq-mobile-close';
    closeButton.id = 'sqMobileClose'; closeButton.setAttribute('aria-label', 'Fermer la navigation');
    closeButton.innerHTML = window.SQIconly?.icon('close', 'outline', 'md') || 'Fermer';
    sidebar.prepend(closeButton);
    const accountLinks = document.createElement('div');
    accountLinks.className = 'sq-mobile-account-links';
    sidebar.appendChild(accountLinks);
    toggle.setAttribute('aria-controls', 'sidebar');
    let opened = false;
    const setOpen = (value, restoreFocus = true) => {
      opened = Boolean(value && mobile.matches);
      sidebar.classList.toggle('open', opened);
      document.body.classList.toggle('sq-mobile-menu-open', opened);
      backdrop.hidden = !opened;
      toggle.setAttribute('aria-expanded', String(opened));
      main.inert = opened;
      sidebar.inert = mobile.matches && !opened;
      if (mobile.matches) {
        sidebar.setAttribute('aria-hidden', String(!opened));
        sidebar.setAttribute('role', 'dialog');
        sidebar.setAttribute('aria-label', 'Navigation du centre d’aide');
        if (opened) sidebar.setAttribute('aria-modal', 'true');
        else sidebar.removeAttribute('aria-modal');
      } else {
        sidebar.removeAttribute('aria-hidden'); sidebar.removeAttribute('role');
        sidebar.removeAttribute('aria-modal');
      }
      if (opened) requestAnimationFrame(() => closeButton.focus());
      else if (restoreFocus && mobile.matches) toggle.focus({preventScroll:true});
    };
    // The original docs.js handler still serves desktop. On mobile there is
    // exactly one owner of menu state; capture avoids a second .open toggle.
    document.addEventListener('click', event => {
      if (!mobile.matches) return;
      if (event.target.closest?.('#menuBtn')) {
        event.preventDefault(); event.stopImmediatePropagation(); setOpen(!opened); return;
      }
      if (opened && sidebar.contains(event.target) && event.target.closest?.('a[href], [data-search-open]')) {
        setOpen(false, false);
      }
    }, true);
    closeButton.addEventListener('click', () => setOpen(false));
    backdrop.addEventListener('click', () => setOpen(false));
    document.addEventListener('keydown', event => {
      if (!opened) return;
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); return; }
      if (event.key !== 'Tab') return;
      const controls = [...sidebar.querySelectorAll('a[href], button, input, select, textarea, [tabindex]')]
        .filter(el => el.tabIndex >= 0 && !el.disabled && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
      const first = controls[0], last = controls[controls.length - 1];
      if (!first) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    mobile.addEventListener('change', () => setOpen(false, false));
    addEventListener('pageshow', () => setOpen(false, false));
    setOpen(false, false);

    const labelControls = () => {
      document.querySelectorAll('.topbar [data-search-open]').forEach(button => {
        button.setAttribute('aria-label', 'Rechercher dans le centre d’aide');
        button.title = 'Rechercher';
      });
      const account = document.getElementById('forumAccount');
      if (!account) return;
      account.querySelectorAll('a,button').forEach(control => {
        const label = control.getAttribute('aria-label') || control.title || control.textContent.trim() || 'Mon compte';
        control.setAttribute('aria-label', label); control.title = label;
      });
      accountLinks.replaceChildren();
      account.querySelectorAll('a.icon-btn, #forumLogout').forEach(source => {
        const copy = source.cloneNode(true);
        copy.removeAttribute('id'); copy.className = 'btn' + (source.id === 'forumLogout' ? ' danger' : '');
        copy.querySelectorAll('.notification-dot').forEach(node => node.remove());
        const label = document.createElement('span'); label.textContent = source.title;
        copy.appendChild(label);
        if (source.id === 'forumLogout') {
          copy.type = 'button'; copy.id = 'sqMobileLogout';
          copy.addEventListener('click', () => { setOpen(false, false); source.click(); });
        }
        accountLinks.appendChild(copy);
      });
    };
    labelControls();
    const account = document.getElementById('forumAccount');
    if (account) new MutationObserver(labelControls).observe(account, {childList:true});
    window.SQMobileNavigation = {close: () => setOpen(false)};
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();

/* The versioned layer also reaches pages that still reference the older loader. */
(() => {
  const src = document.currentScript.src;
  if (!document.querySelector('[data-sq-mobile-experience-style]')) {
    const css = document.createElement('link');css.rel='stylesheet';
    css.href=new URL('mobile-experience.css?v=20260922.1',src).href;
    css.dataset.sqMobileExperienceStyle='1';document.head.append(css);
  }
  if (!document.querySelector('[data-sq-mobile-experience-script]')) {
    const js = document.createElement('script');js.defer=true;
    js.src=new URL('mobile-experience.js?v=20260922.1',src).href;
    js.dataset.sqMobileExperienceScript='1';document.head.append(js);
  }
})();
