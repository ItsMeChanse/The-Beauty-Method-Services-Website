// Talks to the Apps Script backend. Without an API_URL it serves demo data
// shaped exactly like the real responses, so every page can be previewed.
(function () {
  const cfg = window.TBM_CONFIG || {};
  const DEMO = !cfg.API_URL;
  const CACHE_KEY = 'tbm-init-v1';
  const CACHE_MS = 5 * 60 * 1000;

  async function get(params) {
    const res = await fetch(cfg.API_URL + '?' + new URLSearchParams(params));
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const body = await res.json();
    if (!body.ok) throw new Error(body.error || 'Request failed');
    return body.data;
  }

  async function post(payload) {
    // text/plain keeps this a "simple" request: no CORS preflight for Apps Script to fail.
    const res = await fetch(cfg.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const body = await res.json();
    if (!body.ok) throw new Error(body.error || 'Request failed');
    return body.data;
  }

  let initPromise = null;
  function init() {
    if (initPromise) return initPromise;
    try {
      const hit = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
      if (hit && Date.now() - hit.t < CACHE_MS) return (initPromise = Promise.resolve(hit.data));
    } catch (e) { /* storage unavailable */ }
    initPromise = (DEMO ? demo.init() : get({ action: 'init' })).then(data => {
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data })); } catch (e) {}
      return data;
    }).catch(err => { initPromise = null; throw err; });
    return initPromise;
  }

  function times(date, serviceIds) {
    return DEMO ? demo.times(date, serviceIds) : get({ action: 'times', date, services: serviceIds.join(',') });
  }

  function book(payload) {
    return DEMO ? demo.book(payload) : post({ action: 'book', payload });
  }

  // ---------------- DEMO DATA (mirrors Code.gs) ----------------
  const demo = (function () {
    const CATALOG = [
      ['Basic Services', [['Classic Manicure','$35',45],['Signature Gel Manicure','$50+',60],['Polish Change','$22',25],['Gel Polish Change','$30+',35]]],
      ['Enhancement Services', [['Dip Powder Manicure','$60',75],['Dip Powder Extension','$75+',90],['Gel on Gel','$70+',105],['Builder Gel Overlay','$60+',90],['Soft Gel Extensions','$60+',105],['Refill/Fill','$55+',105]]],
      ['Foot Services', [['Classic Pedicure','$45+',45],['Polish Change','$30+',30],['Gel Polish Change','$45+',45]]],
      ['Luxury Services', [['Paraffin Wax Treatment','$30+',35],['Hand Massage','$25+',20],['Deluxe Manicure','$65+',90],['Deluxe Pedicure','$65+',105]]],
      ['Add-Ons', [['Chrome/Cat Eye','$5+',0],['French Finish','$10+',0],['Custom Nail Art','$10+',0],['Charms & Embellishments (per nail)','$5+',0],['Nail Repair (per nail)','$5+',0],['Soak Off Removal','$15+',0]]],
      ['Waxing Services', [['Brow Wax','$25',25],['Lip Wax','$15',10],['Chin Wax','$15',10],['Arm Wax','$20',20],['Leg Wax','$30',25],['Hands/Finger Knuckle Wax (per hand)','$3',10],['Feet/Toe Knuckle Wax (per foot)','$5',10]]]
    ];
    const HOURS = { Monday: ['10:00','16:00'], Saturday: ['10:00','16:00'], Sunday: ['14:00','16:00'] };
    const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const toMin = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
    const toTime = mins => { const h = Math.floor(mins / 60), m = mins % 60; return ((h % 12) || 12) + ':' + String(m).padStart(2, '0') + ' ' + (h >= 12 ? 'PM' : 'AM'); };
    const fmtDur = mins => { const h = Math.floor(mins / 60), m = mins % 60; return !h ? m + ' min' : h + ' hr' + (m ? ' ' + m + ' min' : ''); };

    const catalog = CATALOG.map(([section, items], si) => ({
      section,
      items: items.map(([name, price, minutes], ii) => ({
        id: si + '-' + ii, name, label: name + ' — ' + price, price, minutes,
        durationText: minutes ? fmtDur(minutes) : ''
      }))
    }));
    const byId = {};
    catalog.forEach(s => s.items.forEach(i => { byId[i.id] = i; }));

    function dates() {
      const out = [], d = new Date();
      for (let i = 0; i < 30; i++) {
        const x = new Date(d); x.setDate(d.getDate() + i);
        const day = DAYS[(x.getDay() + 6) % 7];
        if (HOURS[day]) out.push(day + ', ' + MONTHS[x.getMonth()] + ' ' + x.getDate());
      }
      return out;
    }

    return {
      async init() {
        await wait(400);
        return {
          catalog, dates: dates(),
          hours: DAYS.map(day => ({ day, open: HOURS[day] ? toTime(toMin(HOURS[day][0])) : null, close: HOURS[day] ? toTime(toMin(HOURS[day][1])) : null }))
        };
      },
      async times(date, ids) {
        await wait(350);
        const h = HOURS[date.split(',')[0]];
        if (!h || !ids.length) return [];
        const dur = Math.max(ids.reduce((a, id) => a + (byId[id] ? byId[id].minutes : 0), 0), 30);
        const busy = [{ s: 12 * 60, e: 13 * 60 }]; // pretend someone is booked noon–1
        const slots = [];
        for (let s = toMin(h[0]); s + dur <= toMin(h[1]); s += 30) {
          slots.push({ time: toTime(s), booked: busy.some(b => s < b.e + 10 && b.s < s + dur + 10) });
        }
        return slots;
      },
      async book(p) {
        await wait(900);
        const dur = Math.max(p.services.reduce((a, id) => a + (byId[id] ? byId[id].minutes : 0), 0), 30);
        const m = p.time.match(/(\d+):(\d+) (AM|PM)/);
        const start = (Number(m[1]) % 12 + (m[3] === 'PM' ? 12 : 0)) * 60 + Number(m[2]);
        return { success: true, endTime: toTime(start + dur), duration: dur };
      }
    };
  })();

  window.TBMApi = { init, times, book, demo: DEMO };
})();
