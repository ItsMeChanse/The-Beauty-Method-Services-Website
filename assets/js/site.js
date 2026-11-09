// Shared behaviour for every page: mobile nav, contact details, hours.
(function () {
  const cfg = window.TBM_CONFIG || {};

  // Mobile nav
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? 'Close' : 'Menu';
    });
  }

  // Contact details from config.js
  const digits = (cfg.phone || '').replace(/[^\d+]/g, '');
  const links = {
    phone: ['tel:' + digits, cfg.phone],
    email: ['mailto:' + cfg.email, cfg.email],
    instagram: ['https://instagram.com/' + cfg.instagram, '@' + cfg.instagram],
    address: [cfg.mapsLink, cfg.address]
  };
  document.querySelectorAll('[data-cfg]').forEach(el => {
    const v = links[el.dataset.cfg];
    if (!v || !v[1]) return;
    if (el.tagName === 'A') el.href = v[0];
    if (!el.hasAttribute('data-keep-text')) el.textContent = v[1];
  });

  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  // Hours table, pulled from the booking rules so they never disagree
  const hoursEls = document.querySelectorAll('[data-hours]');
  if (hoursEls.length && window.TBMApi) {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    window.TBMApi.init().then(({ hours }) => {
      hoursEls.forEach(table => {
        const tbody = document.createElement('tbody');
        hours.forEach(h => {
          const tr = document.createElement('tr');
          if (!h.open) tr.className = 'closed';
          if (h.day === today) tr.classList.add('today');
          const th = document.createElement('th'); th.scope = 'row'; th.textContent = h.day;
          const td = document.createElement('td'); td.textContent = h.open ? h.open + ' – ' + h.close : 'Closed';
          tr.append(th, td); tbody.append(tr);
        });
        table.replaceChildren(tbody);
      });
    }).catch(() => {
      hoursEls.forEach(t => { t.outerHTML = '<p class="hint">Hours are shown on the <a href="book.html">booking page</a>.</p>'; });
    });
  }
})();
