// Booking page. Same rules as the original Apps Script page; the server
// re-checks everything (duration, slot, conflicts) inside its lock on submit.
(function () {
  const api = window.TBMApi;
  const $ = id => document.getElementById(id);
  const byId = {};
  let timesReq = 0;

  if (api.demo) $('demoBanner').hidden = false;

  const fmtDur = mins => { const h = Math.floor(mins / 60), m = mins % 60; return !h ? m + ' min' : h + ' hr' + (m ? ' ' + m + ' min' : ''); };
  const priceNum = p => parseFloat(String(p).replace(/[^0-9.]/g, '')) || 0;
  const selected = () => Array.from(document.querySelectorAll('input[name=service]:checked')).map(cb => cb.value);
  const radioVal = name => { const r = document.querySelector('input[name=' + name + ']:checked'); return r ? r.value : ''; };

  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => { if (k === 'class') n.className = v; else n.setAttribute(k, v); });
    kids.forEach(k => n.append(k));
    return n;
  }

  // ---------- Load ----------
  api.init().then(({ catalog, dates }) => {
    renderServices(catalog);
    renderDates(dates);
    const pre = new URLSearchParams(location.search).get('s');
    if (pre && byId[pre]) {
      const cb = document.querySelector('input[name=service][value="' + CSS.escape(pre) + '"]');
      if (cb) cb.checked = true;
    }
    onChange();
  }).catch(() => {
    $('services').innerHTML = '<p class="error-note">Services couldn’t load. Refresh the page, or email <a href="mailto:book@beautymethodservices.com">book@beautymethodservices.com</a> to book.</p>';
  });

  function renderServices(catalog) {
    const box = $('services');
    box.replaceChildren();
    catalog.forEach(group => {
      const g = el('div', { class: 'svc-group' }, el('h3', {}, group.section));
      group.items.forEach(item => {
        byId[item.id] = item;
        const cb = el('input', { type: 'checkbox', name: 'service', value: item.id });
        cb.addEventListener('change', onChange);
        const meta = item.durationText ? el('span', { class: 'meta' }, item.durationText) : '';
        const name = el('span', {}, item.name || item.label.split(' — ')[0], ' ', meta);
        g.append(el('label', { class: 'svc' }, cb, name, el('span', { class: 'price' }, item.price)));
      });
      box.append(g);
    });
  }

  function renderDates(dates) {
    const box = $('dates');
    box.replaceChildren();
    if (!dates.length) { box.append(el('p', { class: 'hint' }, 'No open days in the next few weeks. Email us and we’ll find a time.')); return; }
    dates.forEach(d => {
      const [day, md] = d.split(',').map(s => s.trim());
      const [month, num] = md.split(' ');
      const r = el('input', { type: 'radio', name: 'date', value: d, 'aria-label': d });
      r.addEventListener('change', updateTimes);
      box.append(el('label', { class: 'chip chip--date' }, r, el('span', {}, day.slice(0, 3), el('small', {}, month.slice(0, 3) + ' ' + num))));
    });
  }

  function onChange() { updateSummary(); updateTimes(); }

  // ---------- Summary (display only; the server computes the real duration) ----------
  function updateSummary() {
    const ids = selected();
    const list = $('sumList');
    list.replaceChildren();
    if (!ids.length) {
      list.append(el('li', {}, el('span', { class: 'hint' }, 'No services selected yet')));
      $('sumTime').textContent = '—';
      $('sumPrice').textContent = '—';
      $('sumPriceLabel').textContent = 'Total';
    } else {
      let mins = 0, price = 0, plus = false;
      ids.forEach(id => {
        const it = byId[id];
        mins += it.minutes || 0;
        price += priceNum(it.price);
        if (it.price.indexOf('+') !== -1) plus = true;
        list.append(el('li', {}, el('span', {}, it.name || it.label), el('span', {}, it.price)));
      });
      $('sumTime').textContent = fmtDur(Math.max(mins, 30));
      $('sumPrice').textContent = '$' + price;
      $('sumPriceLabel').textContent = plus ? 'Starting at' : 'Total';
    }
    const date = radioVal('date'), time = radioVal('time');
    $('sumWhen').textContent = date && time ? date + ' at ' + time : date || 'Pick a day and time';
  }

  // ---------- Times depend on BOTH the date and total service length ----------
  function updateTimes() {
    const date = radioVal('date');
    const ids = selected();
    const box = $('times');
    const hint = $('timeHint');
    const previous = radioVal('time');
    updateSummary();

    if (!ids.length || !date) {
      box.replaceChildren();
      hint.textContent = !ids.length ? 'Choose at least one service to see open times.' : 'Pick a day to see open times.';
      hint.hidden = false;
      return;
    }
    hint.textContent = 'Checking open times…';
    hint.hidden = false;
    box.replaceChildren();
    const req = ++timesReq;

    api.times(date, ids).then(slots => {
      if (req !== timesReq) return;
      const open = slots.filter(s => !s.booked);
      if (!open.length) {
        hint.textContent = 'Nothing on this day fits ' + $('sumTime').textContent + ' of services. Try another day.';
        return;
      }
      hint.hidden = true;
      slots.forEach(s => {
        const r = el('input', { type: 'radio', name: 'time', value: s.time, 'aria-label': s.time + (s.booked ? ', unavailable' : '') });
        r.disabled = s.booked;
        if (!s.booked && s.time === previous) r.checked = true; // keep their pick if it still fits
        r.addEventListener('change', updateSummary);
        box.append(el('label', { class: 'chip' }, r, el('span', {}, s.time)));
      });
      updateSummary();
    }).catch(() => {
      if (req !== timesReq) return;
      hint.textContent = 'Times couldn’t load. Pick the day again to retry.';
    });
  }

  // ---------- Submit ----------
  $('bookForm').addEventListener('submit', e => {
    e.preventDefault();
    const msg = $('message');
    msg.className = ''; msg.textContent = '';
    const payload = {
      name: $('name').value.trim(),
      phone: $('phone').value.trim(),
      email: $('email').value.trim(),
      notes: $('notes').value.trim(),
      date: radioVal('date'),
      time: radioVal('time'),
      services: selected(),
      website: $('website').value
    };
    const fail = (text, focus) => { msg.className = 'error'; msg.textContent = text; if (focus) focus.focus(); };
    if (!payload.services.length) return fail('Choose at least one service.', document.querySelector('input[name=service]'));
    if (!payload.date) return fail('Pick a day.', document.querySelector('input[name=date]'));
    if (!payload.time) return fail('Pick a time.', document.querySelector('input[name=time]:not(:disabled)'));
    if (!payload.name) return fail('Enter your name.', $('name'));
    if (!payload.phone) return fail('Enter your phone number.', $('phone'));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) return fail('Enter a valid email so we can send your confirmation.', $('email'));

    const btn = $('submitBtn');
    btn.disabled = true; btn.textContent = 'Booking…';
    const reset = () => { btn.disabled = false; btn.textContent = 'Book appointment'; };

    api.book(payload).then(res => {
      reset();
      if (res.success) return showConfirmed(payload, res);
      fail(res.message || 'That didn’t go through. Try again.');
      if (res.reason === 'conflict') updateTimes();
    }).catch(() => {
      reset();
      fail('We couldn’t reach the booking system. Check your connection and try again, or email book@beautymethodservices.com.');
    });
  });

  function showConfirmed(p, res) {
    const names = p.services.map(id => byId[id].name || byId[id].label);
    const panel = el('section', { class: 'confirmed', tabindex: '-1' },
      el('h2', {}, 'You’re booked'),
      el('p', { class: 'when' }, p.date + ', ' + p.time + (res.endTime ? ' – ' + res.endTime : '')),
      el('p', {}, names.join(', ')),
      el('p', {}, 'A confirmation is on its way to ' + p.email + '. Need to change something? Email ',
        el('a', { href: 'mailto:book@beautymethodservices.com' }, 'book@beautymethodservices.com'), '.'),
      el('div', { class: 'actions' },
        el('a', { class: 'btn', href: 'book.html' }, 'Book another appointment'),
        el('a', { class: 'btn btn--ghost', href: 'policies.html' }, 'Read aftercare tips'))
    );
    $('bookForm').replaceWith(panel);
    window.scrollTo({ top: 0 });
    panel.focus();
  }
})();
