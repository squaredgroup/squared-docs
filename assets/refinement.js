/* Squared visual enhancements. Presentation only: no remote calls or account mutations. */
(() => {
  'use strict';
  const init = () => {
    if (window.SQRefinement) return;
    const icon = name => window.SQIconly?.icon(name, 'outline', 'md') || '';
    const main = document.querySelector('.app > .main');
    if (main) {
      if (!main.id) main.id = 'mainContent';
      main.tabIndex = -1;
      const skip = document.createElement('a');
      skip.className = 'sq-skip-link'; skip.href = '#' + main.id;
      skip.textContent = 'Aller au contenu';
      document.body.prepend(skip);
    }
    const hydrate = root => {
      root.querySelectorAll('[data-icon-key]').forEach(node => {
        if (node.querySelector('.sq-iconly')) return;
        const markup = icon(node.dataset.iconKey);
        if (markup) node.innerHTML = markup;
      });
    };
    hydrate(document);
    // Keep existing event owners. Only reflect their state for assistive technology.
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      const sync = () => {
        sidebar.querySelectorAll('.hc-sub-toggle').forEach((button, i) => {
          const item = button.closest('.hc-item');
          const panel = item?.querySelector('.hc-sub-links');
          if (!panel) return;
          if (!panel.id) panel.id = 'sqSubPages' + i;
          button.setAttribute('aria-controls', panel.id);
          button.setAttribute('aria-expanded', String(item.classList.contains('child-open')));
          const label = item.querySelector('.hc-nav-link')?.textContent.trim();
          if (label) button.setAttribute('aria-label', 'Sous-pages : ' + label);
        });
        sidebar.querySelectorAll('.hc-nav-group-trigger').forEach((button, i) => {
          const group = button.closest('.hc-nav-group');
          const panel = group?.querySelector('.hc-nav-group-body');
          if (!panel) return;
          if (!panel.id) panel.id = 'sqNavGroup' + i;
          button.setAttribute('aria-controls', panel.id);
          button.setAttribute('aria-expanded', String(group.classList.contains('open')));
        });
      };
      sync();
      new MutationObserver(sync).observe(sidebar, {attributes:true,attributeFilter:['class'],subtree:true});
    }
    const trigger = document.getElementById('quickActionsBtn');
    const menu = document.getElementById('quickActionsMenu');
    if (trigger && menu) {
      const sync = () => trigger.setAttribute('aria-expanded', String(menu.classList.contains('open')));
      trigger.setAttribute('aria-controls', menu.id);sync();
      new MutationObserver(sync).observe(menu, {attributes:true,attributeFilter:['class']});
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && menu.classList.contains('open')) {
          menu.classList.remove('open');trigger.focus({preventScroll:true});
        }
      });
    }
    document.querySelectorAll('.form-group').forEach((group, i) => {
      const label = group.querySelector('label');
      const input = group.querySelector('input,select,textarea');
      if (!label || !input || label.htmlFor) return;
      if (!input.id) input.id = 'sqField' + i;
      label.htmlFor = input.id;
    });
    window.SQRefinement = {version:'20260919.1'};
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
