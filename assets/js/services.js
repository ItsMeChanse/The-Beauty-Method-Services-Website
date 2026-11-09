// Services page: built from the same catalog the booking system uses,
// so prices and times only ever change in Code.gs.
(function () {
  const menu = document.getElementById('menu');
  const index = document.getElementById('menuIndex');
  const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const NOTES = {
    'Add-Ons': 'Added to any service. Final price depends on the design.',
    'Waxing Services': 'Book on its own or alongside a nail service.'
  };

  window.TBMApi.init().then(({ catalog }) => {
    menu.replaceChildren();
    index.replaceChildren();
    catalog.forEach(group => {
      const id = slug(group.section);
      const li = document.createElement('li');
      const a = document.createElement('a'); a.href = '#' + id; a.textContent = group.section.replace(' Services', '');
      li.append(a); index.append(li);

      const sec = document.createElement('section');
      sec.className = 'menu-section'; sec.id = id;
      const h = document.createElement('h2'); h.textContent = group.section; sec.append(h);
      if (NOTES[group.section]) { const n = document.createElement('p'); n.className = 'note'; n.textContent = NOTES[group.section]; sec.append(n); }

      const ul = document.createElement('ul'); ul.className = 'menu-list';
      group.items.forEach(item => {
        const row = document.createElement('li'); row.className = 'menu-item';
        row.innerHTML =
          '<div><div class="row"><span class="name"></span><span class="leader" aria-hidden="true"></span><span class="price"></span></div>' +
          '<div class="dur"></div></div><a class="book-link"></a>';
        row.querySelector('.name').textContent = item.name || item.label.split(' — ')[0];
        row.querySelector('.price').textContent = item.price;
        row.querySelector('.dur').textContent = item.durationText || 'Adds to your service';
        const link = row.querySelector('.book-link');
        link.href = 'book.html?s=' + encodeURIComponent(item.id);
        link.textContent = 'Book';
        link.setAttribute('aria-label', 'Book ' + (item.name || item.label));
        ul.append(row);
      });
      sec.append(ul);
      menu.append(sec);
    });
    if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
  }).catch(() => {
    menu.innerHTML = '<p class="error-note">The service menu couldn’t load. Refresh the page, or email <a href="mailto:book@beautymethodservices.com">book@beautymethodservices.com</a> for prices.</p>';
  });
})();
