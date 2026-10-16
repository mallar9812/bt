(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var C = dash.colors;
  var PAIRS = ['var2'];
  var REFL = 'var1'; // display name of the reference arm (internal key stays 'control'); this experiment has no control arm
  function AL(k) { return k === 'control' ? REFL : k; }
  var LAB = { MEANINGFUL: 'Meaningful', NO_MEANINGFUL_MOVEMENT: 'No meaningful movement', INSUFFICIENT_EVIDENCE: 'Insufficient evidence', NOT_CLASSIFIED: 'Not classified', GREY_ZONE: 'Grey zone', COMPUTED: 'Adjusted', NO_PAB_COUNTERPART: 'No PAB cohort †', NOT_SUPPORTED: 'PAB not supported †', NOT_AVAILABLE: 'No PAB †', NOT_IN_TABLE: 'No PAB †' };
  var fS2 = d3.format('+.2f'), fS1 = d3.format('+.1f'), fS3 = d3.format('+.3f'), fSg = d3.format('+.3~g'), fG = d3.format('.4~g'), fP = d3.format('.4f'), fI = d3.format(',');
  var parseDay = d3.utcParse('%Y-%m-%d'), fDay = d3.utcFormat('%b %-d'), fDayL = d3.utcFormat('%b %-d, %Y');
  var COH = ['D00', 'D01', 'D02-D07', 'D08-D14', 'D15-D30', 'D31-D60', 'D61-D120', 'D121-D180', 'D181-D240', 'D241-D360', 'D361-D720', 'D720+'];
  var GROUPS = ['Revenue per DAU', 'Ad impressions per DAU', 'eCPM', 'Engagement: actions per DAU', 'Sessions and time per DAU', 'Economy: cash per DAU', 'Economy: users per DAU', 'Rolling retention', 'Classic retention', 'LTV', 'LTDays', 'Rolling LTV, D7'];
  var MORD = [
    ['Revenue/DAU (all)', 'Ad Revenue/DAU (non-IAP)', 'Iap Rev/DAU', 'W2E Rev/DAU', 'Interstitial Rev/DAU', 'Mid-interstitial Rev/DAU', 'Banner Rev/DAU', 'Ad-on-inactivity Rev/DAU', 'Bright Rev/DAU'],
    ['Impressions/DAU (non-IAP)', 'W2E Impressions/DAU', 'Interstitial Impressions/DAU', 'Mid-interstitial Impressions/DAU', 'Banner Impressions/DAU', 'Ad-on-inactivity Impressions/DAU'],
    ['W2E eCPM', 'Interstitial eCPM', 'Mid-interstitial eCPM', 'Banner eCPM', 'Ad-on-inactivity eCPM', 'Bright eCPM'],
    ['Clear/DAU (overall)', 'W_clear/DAU (overall)', 'View/DAU (overall)', 'Use_hint/DAU (overall)', 'Category_hint/DAU (overall)', 'Row_clear/DAU (overall)', 'Col_clear/DAU (overall)', 'Icon_clear/DAU (overall)'],
    ['Sessions/DAU', 'Session Time/DAU', 'Median Time/DAU', 'P25 Time/DAU', 'P75 Time/DAU'],
    ['Cash earned/DAU', 'Cash spent/DAU', 'Cash purchased/DAU', 'Cash net/DAU'],
    ['Cash earners/DAU', 'Cash spenders/DAU'], [],
    ['Classic D1', 'Classic D3', 'Classic D7', 'Classic D14', 'Classic D30'],
    ['LTV D1', 'LTV D3', 'LTV D7', 'LTV D15', 'LTV D30', 'Ad LTV D1', 'Ad LTV D3', 'Ad LTV D7', 'Ad LTV D15', 'Ad LTV D30', 'IAP LTV D1', 'IAP LTV D3', 'IAP LTV D7', 'IAP LTV D15', 'IAP LTV D30'],
    ['LTDays D1', 'LTDays D3', 'LTDays D7', 'LTDays D15', 'LTDays D30'],
    ['Rolling LTV D7', 'Ad Rolling LTV D7', 'IAP Rolling LTV D7']];
  function mg(cap, metric) {
    var gi;
    if (cap === 'Revenue') gi = /eCPM/.test(metric) ? 2 : (/Impressions/.test(metric) ? 1 : 0);
    else if (cap === 'Engagement') gi = 3;
    else if (cap === 'Sessions') gi = 4;
    else if (cap === 'Economy (in-game)') gi = /earners|spenders/.test(metric) ? 6 : 5;
    else if (cap === 'Rolling retention') gi = 7;
    else if (cap === 'Retention (classic)') gi = 8;
    else if (cap === 'LTV') gi = 9;
    else if (cap === 'LTDays') gi = 10;
    else if (cap === 'Rolling LTV (D7, forward)' || /Rolling LTV/.test(metric)) gi = 11;
    else { gi = GROUPS.indexOf(cap); if (gi < 0) { GROUPS.push(cap); MORD.push([]); gi = GROUPS.length - 1; } }
    var mi = MORD[gi].indexOf(metric);
    return { label: GROUPS[gi], gi: gi, mi: mi < 0 ? 999 : mi };
  }
  var DIMS = { cohort: 'Cohort (days since install)', user_type: 'User type', payer: 'Payer status' };
  var TCRIT = [0, 12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.160, 2.145, 2.131, 2.120, 2.110, 2.101, 2.093, 2.086, 2.080, 2.074, 2.069, 2.064, 2.060, 2.056, 2.052, 2.048, 2.045, 2.042];
  function lgam(x) { var c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5], y = x, t = x + 5.5, s = 1.000000000190015; t -= (x + 0.5) * Math.log(t); for (var j = 0; j < 6; j++) s += c[j] / ++y; return -t + Math.log(2.5066282746310005 * s / x); }
  function betacf(a, b, x) { var qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap, h, m, m2, aa, del; if (Math.abs(d) < 1e-30) d = 1e-30; d = 1 / d; h = d; for (m = 1; m <= 200; m++) { m2 = 2 * m; aa = m * (b - m) * x / ((qam + m2) * (a + m2)); d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30; d = 1 / d; h *= d * c; aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2)); d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30; d = 1 / d; del = d * c; h *= del; if (Math.abs(del - 1) < 3e-12) break; } return h; }
  function ibeta(x, a, b) { if (x <= 0) return 0; if (x >= 1) return 1; var bt = Math.exp(lgam(a + b) - lgam(a) - lgam(b) + a * Math.log(x) + b * Math.log(1 - x)); return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b; }
  // confidence that the effect is not zero: 1 minus the two-sided p of the interval's centre against its standard error
  function confOf(lo, hi, n) {
    if (num(lo) || num(hi) || num(n) || n < 2) return null;
    var df = n - 1, se = (hi - lo) / 2 / tcrit(df);
    if (!(se > 0)) return null;
    var t = Math.abs((lo + hi) / 2) / se;
    return 1 - ibeta(df / (df + t * t), df / 2, 0.5);
  }
  function fConf(c) { return num(c) ? '—' : (c >= 0.9995 ? '>99.9%' : d3.format('.1f')(c * 100) + '%'); }
  function tcrit(df) { return df <= 30 ? TCRIT[df] : 1.96 + 2.4 / df; }

  document.querySelectorAll('.rs .legend i').forEach(function (i) { i.style.background = i.dataset.c === 'ctl' ? 'var(--color-fg-muted)' : C[+i.dataset.c]; });

  // bundle:begin
  // Datasets come either as separate documents (one per id) or, to keep approvals to a minimum, bundled: documents
  // 'bundle', 'bundle2', ... whose rows carry the dataset id in `_ds` (scripts/build_bundle.py).
  var BUN = { key: '', map: null };
  function bundled() {
    var ids = ['bundle', 'bundle2', 'bundle3', 'bundle4'], parts = [], key = [], i, d;
    for (i = 0; i < ids.length; i++) {
      d = dash.data(ids[i]);
      if (d && d.status === 'ok' && d.data) { parts.push(d.data); key.push(d.data.length + ':' + (d.data.length ? d.data[d.data.length - 1]._ds : '')); }
    }
    if (!parts.length) return null;
    var k = key.join('|');
    if (BUN.map && BUN.key === k) return BUN.map;
    var map = {};
    parts.forEach(function (rows) { rows.forEach(function (r) { (map[r._ds] || (map[r._ds] = [])).push(r); }); });
    BUN = { key: k, map: map };
    return map;
  }
  function ok(id) {
    var b = bundled();
    if (b) return b[id] || null;
    var d = dash.data(id); return d && d.status === 'ok' ? d.data : null;
  }
  // bundle:end
  function num(v) { return v === null || v === undefined || isNaN(v); }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; }
  function uniq(a) { return Array.from(new Set(a)); }

  // formatting of an effect by unit
  function fU(unit, v) {
    if (num(v)) return '—';
    return unit === 'pct' ? fS2(v) + '%' : (unit === 'bps' ? fS1(v) + ' bps' : fS3(v));
  }
  function dag(r) { return r.pab_status === 'COMPUTED' ? '' : ' †'; }
  function obsOf(r) { return r.unit === 'pct' ? r.delta_pct : r.delta; }

  // marks always show the PAB-adjusted value (observed where PAB is not available, marked †)
  function fmtResult(r, f) {
    if (f === 'final') return LAB[r.adj_final] || r.adj_final;
    if (f === 'pair') return r.pair + ' vs ' + REFL;
    if (f === 'n') return fI(r.n);
    if (f === 'p') return fP(r.p);
    if (f === 'capability' || f === 'metric') return r[f];
    if (f === 'delta_pct' || f === 'delta') return fU(r.unit, r.adj_val) + dag(r);
    if (f === 'conf') return 'Conf: ' + fConf(r.conf);
    if (f === 'adj_delta') return num(r.adj_delta) ? '—' : fSg(r.adj_delta);
    if (f === 'reference' || f === 'comparator') return num(r[f]) ? '—' : fG(r[f]);
    var v = r[f];
    if (num(v)) return '—';
    return String(v);
  }
  // results table fields
  function fmtRes2(r, f) {
    switch (f) {
      case 'capability': return r.capability;
      case 'metric': return r.metric + ' · ' + r.pair + ' vs ' + REFL;
      case 'pair': return r.pair + ' vs ' + REFL;
      case 'reference': case 'comparator': return num(r[f]) ? '—' : fG(r[f]);
      case 'obs_v': return fU(r.unit, r.obs_v);
      case 'pab_val': return num(r.pab_val) ? '—' : fU(r.unit, r.pab_val);
      case 'adj_val': return fU(r.unit, r.adj_val) + dag(r);
      case 'adj_delta': return num(r.adj_delta) ? '—' : fSg(r.adj_delta);
      case 'conf': return fConf(r.conf);
      case 'adj_rel': return num(r.adj_rel) ? '—' : fS2(r.adj_rel) + '%';
      case 'p': return fP(r.p);
      case 'n': return fI(r.n);
    }
    return String(r[f]);
  }

  function dirCls(final, v) { return final === 'MEANINGFUL' && !num(v) ? (v > 0 ? ' pos' : (v < 0 ? ' neg' : '')) : ''; }
  // Reading labels: Upside / Downside for a meaningful move by its sign, Neutral for everything else; the detailed classification is kept in the tooltip
  function readingLabel(v, sign) {
    if (v === 'MEANINGFUL') return sign > 0 ? 'Upside' : (sign < 0 ? 'Downside' : 'Meaningful');
    if (v === 'NO_MEANINGFUL_MOVEMENT' || v === 'INSUFFICIENT_EVIDENCE' || v === 'GREY_ZONE' || v === 'NOT_CLASSIFIED') return 'Neutral';
    return LAB[v] || v;
  }
  function setPill(el, v, sign) {
    el.className = 'pill pill-' + v + dirCls(v, sign);
    el.textContent = readingLabel(v, sign);
    if (LAB[v] && LAB[v] !== el.textContent) el.title = LAB[v]; else el.removeAttribute('title');
  }

  function prepResults() {
    var rows = ok('results'); if (!rows) return null;
    if (!rows._p) { rows.forEach(function (r) { r.obs_v = obsOf(r); r.adj_rel = r.unit === 'pct' ? r.adj_val : (r.unit === 'bps' && r.reference ? r.adj_val / 1e4 / r.reference * 100 : null); }); rows._p = 1; }
    return rows;
  }

  function fillMarks() {
    var rows = prepResults();
    if (!rows) return;
    var byId = {};
    rows.forEach(function (r) { byId[r.id] = r; });
    document.querySelectorAll('.rs [data-source="results"][data-where]').forEach(function (el) {
      var id = (el.getAttribute('data-where') || '').replace(/^id=/, '');
      var r = byId[id];
      if (!r) return;
      var f = el.dataset.field;
      if (f === 'final') { setPill(el, r.adj_final, r.adj_val); return; }
      el.textContent = fmtResult(r, f);
      if (f === 'delta_pct' || f === 'delta' || f === 'adj_val') { el.classList.remove('pos', 'neg'); var dc = dirCls(r.adj_final, r.adj_val).trim(); if (dc) el.classList.add(dc); }
    });
  }
  function fillPuzzle() {
    var ps = ok('puzzle'); if (!ps) return;
    var idx = {}; ps.forEach(function (r) { idx[r.key] = r; });
    document.querySelectorAll('.rs [data-source="puzzle"][data-where]').forEach(function (el) {
      var r = idx[(el.getAttribute('data-where') || '').replace(/^key=/, '')];
      if (!r || r.status) { el.textContent = '—'; return; }
      var f = el.dataset.field;
      if (f === 'final') { setPill(el, r.final, r.adj_val); return; }
      if (f === 'conf') { el.textContent = 'Conf: ' + fConf(r.conf); return; }
      if (f === 'share') { el.textContent = d3.format('.1f')(r.share) + '%'; return; }
      if (f === 'contrib') { el.textContent = fS2(r.contrib_pp) + ' pp'; return; }
      el.textContent = fU('pct', r.adj_val) + (r.pab_status === 'COMPUTED' ? '' : ' †');
      el.classList.remove('pos', 'neg'); var dc = dirCls(r.final, r.adj_val).trim(); if (dc) el.classList.add(dc);
      el.title = 'Observed ' + fU('pct', r.obs_val) + (r.pab_status === 'COMPUTED' ? ' · PAB ' + fU('pct', r.pab_val) : ' · PAB not available');
    });
    var tb = $('#tbl-puz tbody'); if (!tb) return;
    var types = uniq(ps.filter(function (r) { return !r.status; }).map(function (r) { return r.puzzle_type; }));
    types.sort(function (a, b) { return a === 'overall' ? -1 : b === 'overall' ? 1 : idx['puzzle|' + b + '|' + PAIRS[0]].share - idx['puzzle|' + a + '|' + PAIRS[0]].share; });
    tb.replaceChildren.apply(tb, types.map(function (p) {
      var tr = el('tr'); if (p === 'overall') tr.className = 'tot';
      tr.appendChild(el('td', '', p === 'overall' ? 'All puzzle types' : p));
      tr.appendChild(el('td', 'num', d3.format('.1f')(idx['puzzle|' + p + '|' + PAIRS[0]].share) + '%'));
      PAIRS.forEach(function (v) {
        var r = idx['puzzle|' + p + '|' + v]; var td = el('td'); td.dataset.arm = v;
        var vc = el('div', 'vc'); var b = el('b', '' + dirCls(r.final, r.adj_val).trim(), fU('pct', r.adj_val) + (r.pab_status === 'COMPUTED' ? '' : ' †')); b.title = 'Observed ' + fU('pct', r.obs_val) + ' · PAB ' + (r.pab_val === null ? 'n/a' : fU('pct', r.pab_val)); vc.appendChild(b);
        var pl = el('span'); setPill(pl, r.final, r.adj_val); vc.appendChild(pl); td.appendChild(vc);
        td.appendChild(el('div', 'ci note', 'Conf: ' + fConf(r.conf))); tr.appendChild(td);
        var tc = el('td', 'num', fS2(r.contrib_pp) + ' pp'); tc.dataset.arm = v; tr.appendChild(tc);
      });
      return tr;
    }));
  }
  function fillCellMarks() {
    var cs = cellsData(); if (!cs) return;
    document.querySelectorAll('.rs [data-source="cells"][data-where]').forEach(function (el) {
      var key = (el.getAttribute('data-where') || '').replace(/^key=/, '');
      var c = cellIdx.map[key];
      if (!c) { el.textContent = '—'; return; }
      var f = el.dataset.field;
      if (f === 'final') { setPill(el, c.final, c.adj_val); return; }
      if (f === 'conf') { el.textContent = 'Conf: ' + fConf(c.conf); return; }
      el.textContent = fU(c.unit, c.adj_val) + cdag(c);
      el.title = cellTitle(c);
      el.classList.remove('pos', 'neg'); var dc = dirCls(c.final, c.adj_val).trim(); if (dc) el.classList.add(dc);
    });
  }

  function tipFor(card) {
    if (card._tip) return card._tip;
    var t = document.createElement('div');
    t.className = 'rs-tip';
    t.hidden = true;
    card.appendChild(t);
    card._tip = {
      show: function (lines, ev) {
        t.replaceChildren.apply(t, lines.map(function (l) {
          var d = document.createElement('div');
          if (l.h) d.className = 'rs-th';
          if (l.c) { var s = document.createElement('i'); s.style.background = l.c; d.appendChild(s); }
          d.appendChild(document.createTextNode(l.t));
          return d;
        }));
        t.hidden = false;
        var b = card.getBoundingClientRect();
        var x = ev.clientX - b.left + 12, y = ev.clientY - b.top + 14;
        var w = t.offsetWidth;
        if (x + w > b.width - 4) x = ev.clientX - b.left - w - 12;
        t.style.left = Math.max(4, x) + 'px';
        t.style.top = y + 'px';
      },
      hide: function () { t.hidden = true; }
    };
    return card._tip;
  }


  var TR = { keys: ['control'].concat(PAIRS) };
  var ARMC = { control: 'var(--color-fg-muted)', var1: C[0] };
  PAIRS.forEach(function (p) { var m = /(\d+)$/.exec(p); ARMC[p] = C[((m ? +m[1] : 1) - 1) % C.length]; });

  function smooth(rows, k) {
    var out = rows.map(function (r, i) {
      var o = { d: r.d, date: r.date };
      TR.keys.forEach(function (key) {
        var lo = Math.max(0, i - 6), s = 0;
        for (var j = lo; j <= i; j++) s += rows[j][key];
        o[key] = s / (i - lo + 1);
      });
      return o;
    });
    return out;
  }

  function trendChart(box, rows, meta, diff, offs) {
    box.replaceChildren();
    if (!rows.length) return;
    var W = Math.max(box.clientWidth, 280), H = 230;
    var m = { l: 50, r: 46, t: 8, b: 26 };
    var svg = d3.select(box).append('svg').attr('width', '100%').attr('viewBox', '0 0 ' + W + ' ' + H).attr('height', H);
    var keys = (diff ? PAIRS : TR.keys).filter(armOn);
    var cols = ARMC;
    var data = rows.map(function (r) {
      var o = { d: r.d };
      if (diff) { PAIRS.forEach(function (p) { o[p] = r[p] - r.control - (offs[p] || 0); }); } else keys.forEach(function (k) { o[k] = r[k]; });
      return o;
    });
    var lo = d3.min(data, function (d) { return d3.min(keys, function (k) { return d[k]; }); }), hi = d3.max(data, function (d) { return d3.max(keys, function (k) { return d[k]; }); });
    if (diff) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
    if (hi === lo) { hi += 1; lo -= 1; }
    var pad = (hi - lo) * 0.08;
    var x = d3.scaleUtc(d3.extent(data, function (d) { return d.d; }), [m.l, W - m.r]);
    var y = d3.scaleLinear([lo - pad, hi + pad], [H - m.b, m.t]).nice();
    var yf = d3.format((diff ? '+.' : '.') + meta.dec + 'f'), vf = d3.format('.' + meta.dec + 'f'), df = d3.format('+.' + meta.dec + 'f');
    var tickDec = Math.max(0, meta.dec - (hi - lo > 1 ? 1 : 0));
    var tf = d3.format((diff ? '+.' : '.') + Math.min(meta.dec, Math.max(1, tickDec)) + 'f');
    y.ticks(4).forEach(function (t) {
      svg.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(t)).attr('y2', y(t)).attr('stroke', diff && t === 0 ? 'var(--ink)' : 'var(--line)').attr('stroke-opacity', diff && t === 0 ? .55 : 1).attr('stroke-width', diff && t === 0 ? 1.25 : 1);
      svg.append('text').attr('x', m.l - 6).attr('y', y(t) + 4).attr('text-anchor', 'end').attr('font-size', 12).attr('fill', 'var(--ink)').attr('opacity', .75).text(tf(t));
    });
    x.ticks(W < 420 ? 3 : 5).forEach(function (t) {
      svg.append('text').attr('x', x(t)).attr('y', H - 7).attr('text-anchor', 'middle').attr('font-size', 12).attr('fill', 'var(--ink)').attr('opacity', .75).text(fDay(t));
    });
    var ends = [];
    keys.forEach(function (k) {
      var line = d3.line().x(function (d) { return x(d.d); }).y(function (d) { return y(d[k]); });
      svg.append('path').datum(data).attr('d', line).attr('fill', 'none').attr('stroke', cols[k]).attr('stroke-width', 2).attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round').attr('stroke-dasharray', k === 'control' ? '5 4' : null);
      ends.push({ k: k, y: y(data[data.length - 1][k]) });
    });
    ends.sort(function (a, b) { return a.y - b.y; });
    for (var j = 1; j < ends.length; j++) if (ends[j].y - ends[j - 1].y < 13) ends[j].y = ends[j - 1].y + 13;
    ends.forEach(function (e) { svg.append('text').attr('x', W - m.r + 5).attr('y', e.y + 4).attr('font-size', 12).attr('font-weight', 600).attr('fill', cols[e.k] || 'var(--ink)').text(AL(e.k)); });
    var rule = svg.append('line').attr('y1', m.t).attr('y2', H - m.b).attr('stroke', 'var(--cds-chart-reference)').attr('visibility', 'hidden');
    var dots = keys.map(function (k) { return svg.append('circle').attr('r', 3.5).attr('fill', cols[k]).attr('stroke', 'var(--color-panel)').attr('stroke-width', 1.5).attr('visibility', 'hidden'); });
    var tip = tipFor(box.closest('.card'));
    var bis = d3.bisector(function (d) { return d.d; }).center;
    svg.append('rect').attr('x', m.l).attr('y', m.t).attr('width', W - m.l - m.r).attr('height', H - m.t - m.b).attr('fill', 'transparent')
      .on('mousemove', function (ev) {
        var pt = d3.pointer(ev, this);
        var d = data[bis(data, x.invert(pt[0]))];
        rule.attr('x1', x(d.d)).attr('x2', x(d.d)).attr('visibility', 'visible');
        keys.forEach(function (k, i) { dots[i].attr('cx', x(d.d)).attr('cy', y(d[k])).attr('visibility', 'visible'); });
        tip.show([{ t: fDayL(d.d) + ' · ' + meta.basis.toLowerCase(), h: true }].concat(keys.map(function (k) { return { c: cols[k], t: AL(k) + (diff ? ' vs ' + REFL + (offs.adj ? ' (PAB-adj.): ' : ' (observed †): ') + df(d[k]) : ': ' + vf(d[k])) }; })), ev);
      })
      .on('mouseleave', function () { tip.hide(); rule.attr('visibility', 'hidden'); dots.forEach(function (d) { d.attr('visibility', 'hidden'); }); });
  }


  // ---- trend data: rows carry n_<arm>, d_<arm>, scale; values are n/d*scale ----
  var trCache = null;
  function trData() {
    var all = ok('trends'); if (!all) return null;
    if (trCache && trCache.src === all) return trCache;
    var by = {}, order = [];
    all.forEach(function (r) {
      if (!by[r.metric]) { by[r.metric] = []; order.push(r.metric); }
      by[r.metric].push(r);
    });
    var out = order.map(function (name) {
      var rs = by[name].slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
      return { name: name, meta: rs[0], rows: rs };
    });
    var pab = {}; (ok('trend_pab') || []).forEach(function (p) { pab[p.key] = p; });
    trCache = { src: all, list: out, pab: pab, dates: uniq(all.map(function (r) { return r.date; })).sort() };
    return trCache;
  }
  function val(r, k, meta) { return r['n_' + k] / r['d_' + k] * meta.scale; }

  function pairStat(rows, pair, meta) {
    var diffs = [], nc = 0, dc = 0, np = 0, dp = 0;
    rows.forEach(function (r) {
      if (!(r.d_control > 0) || !(r['d_' + pair] > 0)) return;
      diffs.push(val(r, pair, meta) - val(r, 'control', meta));
      nc += r.n_control; dc += r.d_control; np += r['n_' + pair]; dp += r['d_' + pair];
    });
    var n = diffs.length, o = { n: n };
    if (!n) return o;
    o.ref = nc / dc * meta.scale; o.cmp = np / dp * meta.scale; o.delta = o.cmp - o.ref;
    if (n < 2) return o;
    var m = d3.mean(diffs), sd = d3.deviation(diffs), h = tcrit(n - 1) * sd / Math.sqrt(n);
    o.mlo = m - h; o.mhi = m + h;
    return o;
  }
  // size bands first (whole interval beyond 1% / 10 bps is meaningful; inside 1% is not); in between, Conf above 85% is sufficient evidence and the size of the effect decides
  var CONF_OK = 0.85;
  function classify(kind, lo, hi, val, conf) {
    if (kind === 'bps') {
      if (lo > 10 || hi < -10) return 'MEANINGFUL';
      if (conf !== null && conf > CONF_OK) return Math.abs(val) >= 10 ? 'MEANINGFUL' : 'NO_MEANINGFUL_MOVEMENT';
      return 'INSUFFICIENT_EVIDENCE';
    }
    if (lo > 1 || hi < -1) return 'MEANINGFUL';
    if (lo > -1 && hi < 1) return 'NO_MEANINGFUL_MOVEMENT';
    if (conf !== null && conf > CONF_OK) return Math.abs(val) >= 1 ? 'MEANINGFUL' : 'NO_MEANINGFUL_MOVEMENT';
    return 'INSUFFICIENT_EVIDENCE';
  }
  // the readout computation for one metric and one arm over a set of raw rows
  function readStat(rows, pair, meta, pabInfo) {
    var st = pairStat(rows, pair, meta), k = meta.kind;
    var o = { st: st, kind: k, hasPab: !!(pabInfo && pabInfo.status === 'COMPUTED') };
    if (!(st.n >= 2)) return o;
    var obs, lo, hi;
    if (k === 'pct') { obs = st.delta / st.ref * 100; lo = st.mlo / st.ref * 100; hi = st.mhi / st.ref * 100; }
    else { obs = st.delta * 100; lo = st.mlo * 100; hi = st.mhi * 100; }
    o.obs = obs; o.adj = obs; o.lo = lo; o.hi = hi; o.pab = null;
    if (o.hasPab) {
      var ctr = (lo + hi) / 2 - pabInfo.pab, ho = (hi - lo) / 2, hh = Math.sqrt(ho * ho + pabInfo.half * pabInfo.half);
      o.pab = pabInfo.pab; o.pabHalf = pabInfo.half; o.adj = obs - pabInfo.pab; o.lo = ctr - hh; o.hi = ctr + hh;
    }
    o.adjAbs = k === 'pct' ? st.ref * o.adj / 100 : o.adj / 100;
    o.cls = classify(k, o.lo, o.hi, o.adj, confOf(o.lo, o.hi, st.n));
    return o;
  }

  function readout(c, rows, isFull, resIdx, pabMap) {
    var meta = c.meta, k = meta.kind;
    var wrap = el('div', 'tw ro'); wrap.style.maxHeight = 'none';
    var t = el('table'); wrap.appendChild(t);
    var th = el('thead'); var hr = el('tr');
    [['', REFL + ' (reference)']].concat(PAIRS.map(function (p) { return [p, p + ' vs ' + REFL]; })).forEach(function (h) { var th = el('th', '', h[1]); if (h[0]) th.dataset.arm = h[0]; else th.dataset.ref = '1'; hr.appendChild(th); });
    th.appendChild(hr); t.appendChild(th);
    var tb = el('tbody'); t.appendChild(tb);
    var vf = d3.format('.' + meta.dec + 'f'), suf = k === 'bps' ? '%' : '';
    var ctl = pairStat(rows, PAIRS[0], meta);
    var tr = el('tr'); tb.appendChild(tr);
    var tc = el('td'); var cv = el('div', 'rv');
    cv.appendChild(el('span', 'rv-v', ctl.n ? 'value ' + vf(ctl.ref) + suf : '—'));
    cv.appendChild(el('span', 'note', ctl.n ? 'reference, ' + ctl.n + ' days' : 'no dates in range'));
    tc.appendChild(cv); tr.appendChild(tc);
    PAIRS.forEach(function (p, i) {
      var pi = pabMap[meta.metric + '|' + p], s = readStat(rows, p, meta, pi);
      var td = el('td'); td.dataset.arm = p; var d = el('div', 'rv'); td.appendChild(d); tr.appendChild(td);
      if (!s.st.n) { d.appendChild(el('span', 'note', 'No dates in range')); return; }
      var dot = el('i'); dot.style.background = ARMC[p]; d.appendChild(dot);
      if (!(s.st.n >= 2)) { d.appendChild(el('span', 'rv-v', 'value ' + vf(s.st.cmp) + suf)); d.appendChild(el('span', 'note', 'Pick at least 2 dates for a delta and confidence')); return; }
      var dg = s.hasPab ? '' : ' †';
      var cf = confOf(s.lo, s.hi, s.st.n);
      var adjAbsTxt = (k === 'pct' ? fSg(s.adjAbs) : fS2(s.adjAbs) + ' pp');
      var cls = s.cls;
      if (isFull) { var rr = resIdx[meta.spec + '|' + p]; if (rr) cls = rr.adj_final; }
      var dc = dirCls(cls, s.adj);
      var tx = el('span', 'rv-t');
      tx.appendChild(el('b', 'rv-d rv-p', fU(k, s.adj) + dg));
      tx.appendChild(document.createTextNode(', ')); tx.appendChild(el('span', 'rv-c', 'Conf: ' + fConf(cf)));
      tx.title = 'Observed ' + fU(k, s.obs) + (s.hasPab ? ' · PAB ' + fU(k, s.pab) : ' · PAB not available');
      tx.insertBefore(dot, tx.firstChild); d.appendChild(tx);
      var pl = el('span'); setPill(pl, cls, s.adj); d.appendChild(pl);
      d.appendChild(el('span', 'rv-v', 'value ' + vf(s.st.cmp) + suf + (k === 'pct' ? ' · delta ' + adjAbsTxt : '')));
    });
    return wrap;
  }

  var ARM = '';
  function armOn(k) { return !ARM || k === 'control' || k === ARM; }
  var trFrom = $('#tr-from'), trTo = $('#tr-to'), trView = $('#tr-view'), trGroup = $('#tr-group'), trGrid = $('#tr-grid');
  function drawTrends() {
    var D = trData();
    if (!D) return;
    var res = prepResults() || [], resIdx = {};
    res.forEach(function (r) { resIdx[r.metric + '|' + r.pair] = r; });
    var view = trView.value, sm = view.indexOf('avg') >= 0, diff = view.indexOf('diff') >= 0;
    var from = trFrom.value, to = trTo.value;
    var isFull = (!from || from <= D.dates[0]) && (!to || to >= D.dates[D.dates.length - 1]);
    var cards = [];
    D.list.forEach(function (m) {
      var meta = m.meta;
      if (trGroup.value && meta.group !== trGroup.value) return;
      var pts = m.rows.map(function (r) { var o = { d: parseDay(r.date), date: r.date, control: val(r, 'control', meta) }; PAIRS.forEach(function (p) { o[p] = val(r, p, meta); }); return o; });
      if (sm) pts = smooth(pts);
      pts = pts.filter(function (r) { return (!from || r.date >= from) && (!to || r.date <= to); });
      var raw = m.rows.filter(function (r) { return (!from || r.date >= from) && (!to || r.date <= to); });
      var offs = { adj: false };
      PAIRS.forEach(function (p) {
        var pi = D.pab[meta.metric + '|' + p], st = pairStat(raw, p, meta);
        if (pi && pi.status === 'COMPUTED' && st.n) { offs[p] = meta.kind === 'pct' ? st.ref * pi.pab / 100 : pi.pab / 100; offs.adj = true; }
      });
      cards.push({ name: m.name, meta: meta, rows: pts, raw: raw, offs: offs });
    });
    trGrid.replaceChildren.apply(trGrid, cards.map(function (c) {
      var card = el('div', 'card');
      card.appendChild(el('h3', '', c.name));
      card.appendChild(el('p', 'note', c.meta.basis + ' · ' + c.meta.unit + (diff ? (c.offs.adj ? ', PAB-adjusted difference vs ' + REFL : ', difference vs ' + REFL + ', observed †') : '') + ' · ' + c.meta.desc));
      var box = el('div', 'chart'); box.style.minHeight = '14.5rem'; card.appendChild(box);
      c.box = box;
      card.appendChild(readout(c, c.raw, isFull, resIdx, D.pab));
      return card;
    }));
    cards.forEach(function (c) { trendChart(c.box, c.rows, c.meta, diff, c.offs); });
    $('#tr-note').textContent = cards.length ? (cards[0].rows.length ? cards[0].rows.length + ' dates shown, ' + fDayL(cards[0].rows[0].d) + ' to ' + fDayL(cards[0].rows[cards[0].rows.length - 1].d) : 'No dates in this range.') : '';
  }
  function initTrends() {
    var D = trData(); if (!D) return;
    var ds = D.dates;
    trFrom.min = trTo.min = ds[0]; trFrom.max = trTo.max = ds[ds.length - 1];
    if (!trFrom.value) trFrom.value = ds[0];
    if (!trTo.value) trTo.value = ds[ds.length - 1];
    fillSelect(trGroup, [['', 'All metrics']].concat(uniq(D.list.map(function (m) { return m.meta.group; })).map(function (g) { return [g, g]; })));
    drawTrends();
  }
  [trFrom, trTo, trView, trGroup].forEach(function (el) { el.addEventListener('change', drawTrends); });
  $('#tr-reset').addEventListener('click', function () { var D = trData(); if (!D) return; trFrom.value = D.dates[0]; trTo.value = D.dates[D.dates.length - 1]; drawTrends(); });

  function sortable(tbl, getRows, cols, keyF, grp) {
    var sf = null, dir = 1;
    var ths = Array.prototype.slice.call(tbl.querySelectorAll('th[data-field]'));
    var body = tbl.tBodies[0];
    var api = {
      max: Infinity,
      total: 0,
      on: {},
      vars: null,
      render: function () {
        var rows = getRows().slice();
        var vcols = cols.filter(function (c) { return !c.opt || api.on[c.opt] !== false; });
        ths.forEach(function (th) { var cc = cols.filter(function (c) { return c.f === th.dataset.field; })[0]; th.hidden = !!(cc && cc.opt && api.on[cc.opt] === false); });
        var cmpUser = function (a, b) {
          var p = a[sf], q = b[sf];
          if (num(p) && typeof p !== 'string') return 1;
          if (num(q) && typeof q !== 'string') return -1;
          return (typeof p === 'number' ? p - q : String(p).localeCompare(String(q))) * dir;
        };
        if (grp) rows.sort(function (a, b) { var ga = grp.of(a), gb = grp.of(b); return (ga.gi - gb.gi) || (sf ? cmpUser(a, b) : grp.cmp(a, b)); });
        else if (sf) rows.sort(cmpUser);
        api.total = rows.length;
        rows = rows.slice(0, api.max);
        var nGroups = grp ? uniq(rows.map(function (r) { return grp.of(r).gi; })).length : 0, lastG = null;
        ths.forEach(function (th) { th.setAttribute('aria-sort', th.dataset.field === sf ? (dir > 0 ? 'ascending' : 'descending') : 'none'); });
        var out = [];
        rows.forEach(function (r) {
          if (nGroups > 1) {
            var g = grp.of(r);
            if (g.gi !== lastG) { lastG = g.gi; var gr = document.createElement('tr'); gr.className = 'grp'; var gd = document.createElement('td'); gd.colSpan = vcols.length; gd.textContent = g.label; gr.appendChild(gd); out.push(gr); }
          }
          var tr = document.createElement('tr');
          tr.setAttribute('data-key', r[keyF]);
          vcols.forEach(function (c) {
            var td = document.createElement('td');
            if (c.num) td.className = 'num';
            if (c.rh) td.setAttribute('role', 'rowheader');
            if (c.cell) c.cell(td, r); else if (c.pill) { var s = document.createElement('span'); setPill(s, r[c.f], c.f === 'final' && r.obs_v !== undefined ? r.obs_v : (r.adj_val !== undefined ? r.adj_val : r.delta)); td.appendChild(s); } else td.textContent = c.fmt(r);
            tr.appendChild(td);
          });
          out.push(tr);
        });
        body.replaceChildren.apply(body, out);
      }
    };
    ths.forEach(function (th) {
      th.tabIndex = 0; th.setAttribute('role', 'button');
      var go = function () { var f = th.dataset.field; if (sf === f) dir = -dir; else { sf = f; dir = 1; } api.render(); };
      th.addEventListener('click', go);
      th.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
    return api;
  }

  function fillSelect(sel, opts) {
    var cur = sel.value;
    if (sel.options.length === opts.length && Array.prototype.every.call(sel.options, function (o, i) { return o.value === opts[i][0]; })) return;
    sel.replaceChildren.apply(sel, opts.map(function (o) { return new Option(o[1], o[0]); }));
    if (cur && opts.some(function (o) { return o[0] === cur; })) sel.value = cur;
  }

  // card table
  var cardTbl = $('#card-body').closest('table');
  var cardCtl = sortable(cardTbl, function () { return ok('experiment_card') || []; }, [{ fmt: function (r) { return r.field; } }, { fmt: function (r) { return r.value; } }], 'field');
  cardTbl.querySelectorAll('th').forEach(function (th) { th.removeAttribute('role'); th.removeAttribute('tabindex'); });



  // metric-group dropdown checklist (Matrix); rebuilt only when the group list changes
  function groupPicker(host, ctl, labels, redraw) {
    if (!host) return;
    var sig = labels.join('|');
    if (host.dataset.sig === sig) return;
    host.dataset.sig = sig; host.replaceChildren();
    ctl.groups = (ctl.groups || []).filter(function (g) { return labels.indexOf(g) >= 0; });
    if (!ctl.groups.length && labels.length) ctl.groups = labels.slice();
    var d = document.createElement('details'); d.className = 'dd';
    var s = document.createElement('summary'); d.appendChild(s);
    var m = el('div', 'dd-menu'); d.appendChild(m); host.appendChild(d);
    var gb = [];
    function chk(text, on, fn) {
      var l = document.createElement('label'), i = document.createElement('input');
      i.type = 'checkbox'; i.checked = on; i.addEventListener('change', function () { fn(i.checked); });
      l.appendChild(i); l.appendChild(document.createTextNode(text)); m.appendChild(l); return i;
    }
    function sync() {
      var n = ctl.groups.length;
      s.textContent = 'Metric groups: ' + (n === labels.length ? 'all' : (n === 1 ? ctl.groups[0] : n + ' of ' + labels.length));
      allG.checked = n === labels.length; allG.indeterminate = n > 0 && n < labels.length;
    }
    var allG = chk('All groups', false, function (v) { ctl.groups = v ? labels.slice() : []; gb.forEach(function (b) { b.checked = v; }); sync(); redraw(); });
    m.appendChild(document.createElement('hr'));
    labels.forEach(function (g) { gb.push(chk(g, ctl.groups.indexOf(g) >= 0, function () { ctl.groups = labels.filter(function (q, j) { return gb[j].checked; }); sync(); redraw(); })); });
    sync();
    if (!host._l) {
      host._l = 1;
      document.addEventListener('click', function (e) { var x = host.querySelector('details'); if (x && x.open && !x.contains(e.target)) x.open = false; });
      document.addEventListener('keydown', function (e) { var x = host.querySelector('details'); if (e.key === 'Escape' && x) x.open = false; });
    }
  }
  // variant dropdown checklist (used by the Matrix)
  function variantPicker(host, ctl, redraw) {
    if (!host) return;
    ctl.vars = PAIRS.slice();
    var d = document.createElement('details'); d.className = 'dd';
    var s = document.createElement('summary'); d.appendChild(s);
    var m = el('div', 'dd-menu'); d.appendChild(m); host.appendChild(d);
    var vb = [];
    function chk(text, fn) {
      var l = document.createElement('label'), i = document.createElement('input');
      i.type = 'checkbox'; i.checked = true; i.addEventListener('change', function () { fn(i.checked); });
      l.appendChild(i); l.appendChild(document.createTextNode(text)); m.appendChild(l); return i;
    }
    function sync() {
      var n = ctl.vars.length;
      s.textContent = 'Variants: ' + (n === PAIRS.length ? 'all' : n + ' of ' + PAIRS.length);
      allV.checked = n === PAIRS.length; allV.indeterminate = n > 0 && n < PAIRS.length;
    }
    var allV = chk('All variants', function (v) { ctl.vars = v ? PAIRS.slice() : []; vb.forEach(function (b) { b.checked = v; }); sync(); redraw(); });
    m.appendChild(document.createElement('hr'));
    PAIRS.forEach(function (p) { vb.push(chk(p + ' vs ' + REFL, function () { ctl.vars = PAIRS.filter(function (q, j) { return vb[j].checked; }); sync(); redraw(); })); });
    sync();
    document.addEventListener('click', function (e) { if (d.open && !d.contains(e.target)) d.open = false; });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') d.open = false; });
  }
  // variant and field pickers (dropdown checklists) for the two appendix tables (variants all on; default fields: Capability, Exp change, % change)
  function fieldPicker(host, ctl, fields, redraw, defaults) {
    if (!host) return;
    ctl.vars = PAIRS.slice();
    function menu(title) {
      var d = document.createElement('details'); d.className = 'dd';
      var s = document.createElement('summary'); d.appendChild(s);
      var m = el('div', 'dd-menu'); d.appendChild(m); host.appendChild(d);
      return { d: d, s: s, m: m, title: title };
    }
    function chk(parent, text, fn, init) {
      var l = document.createElement('label'), i = document.createElement('input');
      i.type = 'checkbox'; i.checked = init !== false; i.addEventListener('change', function () { fn(i.checked); });
      l.appendChild(i); l.appendChild(document.createTextNode(text)); parent.appendChild(l); return i;
    }
    var vm = menu('Variants'), fm = menu('Fields'), vb = [], fb = [];
    function sync() {
      var nv = ctl.vars.length, nf = fields.filter(function (g) { return ctl.on[g[0]] !== false; }).length;
      vm.s.textContent = 'Variants: ' + (nv === PAIRS.length ? 'all' : nv + ' of ' + PAIRS.length);
      fm.s.textContent = 'Fields: ' + (nf === fields.length ? 'all' : nf + ' of ' + fields.length);
      allV.checked = nv === PAIRS.length; allV.indeterminate = nv > 0 && nv < PAIRS.length;
      allF.checked = nf === fields.length; allF.indeterminate = nf > 0 && nf < fields.length;
    }
    var allV = chk(vm.m, 'All variants', function (v) { ctl.vars = v ? PAIRS.slice() : []; vb.forEach(function (b) { b.checked = v; }); sync(); redraw(); });
    vm.m.appendChild(document.createElement('hr'));
    PAIRS.forEach(function (p) {
      vb.push(chk(vm.m, p + ' vs ' + REFL, function () { ctl.vars = PAIRS.filter(function (q, j) { return vb[j].checked; }); sync(); redraw(); }));
    });
    var allF = chk(fm.m, 'All fields', function (v) { fields.forEach(function (f, i) { ctl.on[f[0]] = v; fb[i].checked = v; }); sync(); redraw(); });
    fm.m.appendChild(document.createElement('hr'));
    fields.forEach(function (f) { var on = !defaults || defaults.indexOf(f[0]) >= 0; ctl.on[f[0]] = on; fb.push(chk(fm.m, f[1], function (v) { ctl.on[f[0]] = v; sync(); redraw(); }, on)); });
    sync();
    document.addEventListener('click', function (e) { [vm.d, fm.d].forEach(function (d) { if (d.open && !d.contains(e.target)) d.open = false; }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') [vm.d, fm.d].forEach(function (d) { d.open = false; }); });
  }
  // % change cell: PAB-adjusted value with its reading tag
  function pctCell(td, r, adjCls) {
    var w = el('span', 'rd');
    w.appendChild(el('span', '', fU(r.unit, r.adj_val) + dag(r)));
    var a = document.createElement('span'); setPill(a, adjCls, r.adj_val); w.appendChild(a);
    td.appendChild(w);
  }
  // Exp change cell: the observed effect with the reading tag of that observed effect next to it
  function expCell(td, r, obsCls, obsVal) {
    var w = el('span', 'rd');
    w.appendChild(el('span', '', fU(r.unit, obsVal)));
    if (obsCls) { var o = document.createElement('span'); setPill(o, obsCls, obsVal); w.appendChild(o); }
    td.appendChild(w);
  }

  // results table
  var resTbl = $('#tbl-res');
  var RES_OPT = { capability: 'cap', reference: 'ref', comparator: 'cmp', obs_v: 'exp', pab_val: 'pab', adj_delta: 'delta', adj_val: 'pct', conf: 'conf', p: 'p', n: 'n' };
  var resCols = ['capability', 'metric', 'reference', 'comparator', 'obs_v', 'pab_val', 'adj_delta', 'adj_val', 'conf', 'p', 'n'].map(function (f) {
    var c = { f: f, rh: f === 'metric', num: ['capability', 'metric', 'pair'].indexOf(f) < 0, opt: RES_OPT[f], fmt: function (r) { return fmtRes2(r, f); } };
    if (f === 'adj_val') c.cell = function (td, r) { pctCell(td, r, r.adj_final); };
    if (f === 'obs_v') c.cell = function (td, r) { expCell(td, r, r.final, r.obs_v); };
    return c;
  });
  var resQ = $('#res-q'), resCap = $('#res-cap'), resFin = $('#res-fin');
  var resGrp = { of: function (r) { return mg(r.capability, r.metric); }, cmp: function (a, b) { return mg(a.capability, a.metric).mi - mg(b.capability, b.metric).mi || (a.metric < b.metric ? -1 : a.metric > b.metric ? 1 : 0) || (a.pair < b.pair ? -1 : 1); } };
  var resCtl = sortable(resTbl, function () {
    var rows = prepResults() || [];
    var q = resQ.value.trim().toLowerCase();
    var out = rows.filter(function (r) { return resCtl.vars.indexOf(r.pair) >= 0 && (!resCap.value || mg(r.capability, r.metric).label === resCap.value) && (!resFin.value || r.adj_final === resFin.value) && (!q || r.metric.toLowerCase().indexOf(q) >= 0); });
    $('#res-count').textContent = out.length + ' of ' + rows.length + ' results';
    return out;
  }, resCols, 'id', resGrp);
  [resQ, resCap, resFin].forEach(function (el) { el.addEventListener('input', function () { resCtl.render(); }); });
  fieldPicker($('#res-pick'), resCtl, [['cap', 'Capability'], ['ref', REFL + ' (reference)'], ['cmp', 'Comparator'], ['exp', 'Exp change'], ['pab', 'PAB'], ['delta', 'Delta (PAB-adj.)'], ['pct', '% change (PAB-adj.)'], ['conf', 'Conf'], ['p', 'p'], ['n', 'Paired units']], function () { resCtl.render(); }, ['cap', 'exp', 'pct']);

  // ---- cohort and cut drill-down ----
  function cellOrder(dim, cells) {
    if (dim === 'cohort') return COH.filter(function (c) { return cells.indexOf(c) >= 0; });
    return cells.slice().sort(function (a, b) { return a === 'other' ? 1 : b === 'other' ? -1 : (a < b ? -1 : 1); });
  }
  function cdag(c) { return c.pab_status === 'COMPUTED' ? '' : ' †'; }
  function cellTitle(c) {
    return c.metric + ' · ' + c.cell + ' · ' + c.pair + ': ' + fU(c.unit, c.adj_val) + cdag(c) + ', Conf: ' + fConf(c.conf) + ' · ' + (LAB[c.final] || c.final) + (c.pab_status === 'COMPUTED' ? ' · observed ' + fU(c.unit, c.obs_val) + ', PAB ' + fU(c.unit, c.pab_val) : ' · unadjusted (' + (LAB[c.pab_status] || c.pab_status) + ')');
  }
  var cellIdx = null;
  // country and install-source deep dives are not shown unless the user asks for them
  var HIDE = { country: 1, install_bucket: 1 };
  function cellsData() {
    var raw = ok('cells'); if (!raw) return null;
    if (!raw._v) { raw.forEach(function (c) { c.adj_delta = c.unit === 'pct' ? c.reference * c.adj_val / 100 : c.adj_val; }); raw._v = raw.filter(function (c) { return !HIDE[c.dimension]; }); }
    var cs = raw._v;
    if (!cellIdx || cellIdx.src !== cs) { var m = {}; cs.forEach(function (c) { m[c.dimension + '|' + c.cell + '|' + c.metric + '|' + c.pair] = c; }); cellIdx = { src: cs, map: m }; }
    return cs;
  }

  function bullets(text, cls) {
    var parts = text.split(/(?<=[A-Za-z0-9%)†])\. (?=[A-Z"†])/).map(function (x) { return x.replace(/\.$/, ''); }).filter(Boolean);
    if (!parts.length) return el('div');
    if (parts.length === 1 || cls === 'note') { var ul = el('ul', 'bl' + (cls ? ' ' + cls : '')); parts.forEach(function (x) { ul.appendChild(el('li', '', x)); }); return ul; }
    var d = el('details', 'dr'); d.appendChild(el('summary', '', parts[0]));
    var sub = el('ul', 'bl sub'); parts.slice(1).forEach(function (x) { sub.appendChild(el('li', '', x)); }); d.appendChild(sub);
    var wrap = el('div', 'dl'); wrap.appendChild(d); return wrap;
  }
  function cohRows(m) { return COH.map(function (c) { return ['cohort', c, m]; }); }
  var HL = [
    { t: 'Cohort · revenue per DAU: up in the D15-D30 to D120 cohorts, flat for fresh installs', n: "Rev/DAU is flat for D00 to D14 and up in D15-D30 (observed †), D31-D60 and D61-D120, the last at about +6%. The oldest cohorts swing both ways on small bases (D241-D360 +7%, D181-D240 −2.5%, neither strong enough to read alone).",
      rows: cohRows('Revenue/DAU (all)') },
    { t: 'Cohort · clears: lower in almost every cohort', n: "Clear per DAU is down in every cohort from D08-D14 to D241-D360, by about 1.5% to 3.7%, and flat to slightly down for D00 to D07. D361-D720 is a tiny cell with a very large PAB gap and is not read.",
      rows: cohRows('Clear/DAU (overall)') },
    { t: 'Cohort · W2E impressions: up in most cohorts, down in D241-D360', n: "W2E impressions per DAU rise from D08-D14 onwards (D15-D30 about +8%, observed †), apart from D181-D240 (flat) and D241-D360 (−8%).",
      rows: cohRows('W2E Impressions/DAU') },
    { t: 'Cohort · rolling retention: noisy, no consistent direction', n: "Rolling D1 swings from −72 bps (D31-D60) to +43 bps (D121-D180) with no pattern across neighbouring cohorts, which is what noisy small cells look like. Fresh-install cohorts are not clearly different from zero.",
      rows: cohRows('Rolling D1') },
    { t: 'User type · revenue per DAU: the lift is in old users', n: "Old users: Rev/DAU about +2.3%, W2E revenue +6.6%, IAP +24%, interstitial −5.4%. New users (observed †): Rev/DAU flat, interstitial −1.6%.",
      rows: [['user_type', 'new', 'Revenue/DAU (all)'], ['user_type', 'old', 'Revenue/DAU (all)'], ['user_type', 'new', 'W2E Rev/DAU'], ['user_type', 'old', 'W2E Rev/DAU'], ['user_type', 'new', 'Iap Rev/DAU'], ['user_type', 'old', 'Iap Rev/DAU'], ['user_type', 'new', 'Interstitial Rev/DAU'], ['user_type', 'old', 'Interstitial Rev/DAU']] },
    { t: 'User type · clears and hints: fewer clears, more hints in both groups', n: "Clear/DAU is down for new users (−1.6%, observed †) and old users (−3.1%); Use_hint/DAU is up in both (+2.6% observed †, +4.7%).",
      rows: [['user_type', 'new', 'Clear/DAU (overall)'], ['user_type', 'old', 'Clear/DAU (overall)'], ['user_type', 'new', 'Use_hint/DAU (overall)'], ['user_type', 'old', 'Use_hint/DAU (overall)'], ['user_type', 'new', 'Session Time/DAU'], ['user_type', 'old', 'Session Time/DAU'], ['user_type', 'new', 'Rolling D1'], ['user_type', 'old', 'Rolling D1']] },
    { t: 'Payer status · payers carry the revenue gain', n: "Payers are about 5% of DAU. Their Rev/DAU is up about 15% (IAP +19%, W2E revenue +18%, banner impressions +18%) while their interstitial revenue is down about 13%. Non-payers are flat on revenue.",
      rows: [['payer', 'payer', 'Revenue/DAU (all)'], ['payer', 'non_payer', 'Revenue/DAU (all)'], ['payer', 'payer', 'Iap Rev/DAU'], ['payer', 'non_payer', 'Iap Rev/DAU'], ['payer', 'payer', 'W2E Rev/DAU'], ['payer', 'non_payer', 'W2E Rev/DAU'], ['payer', 'payer', 'Interstitial Rev/DAU'], ['payer', 'non_payer', 'Interstitial Rev/DAU'], ['payer', 'payer', 'Clear/DAU (overall)'], ['payer', 'non_payer', 'Clear/DAU (overall)']] }
  ];
  function hlCell(c) {
    var td = el('td', 'num');
    if (!c) { td.textContent = '—'; return td; }
    td.textContent = fU(c.unit, c.adj_val) + cdag(c) + '  ·  Conf: ' + fConf(c.conf);
    td.className = 'num' + (c.final === 'MEANINGFUL' ? ' mx-m' + dirCls(c.final, c.adj_val) : '');
    td.title = cellTitle(c);
    return td;
  }
  function drawHL() {
    var cs = cellsData(); if (!cs) return;
    var host = $('#hl-grid');
    host.replaceChildren.apply(host, HL.map(function (h) {
      var card = el('div', 'card'); card.appendChild(el('h3', '', h.t)); card.appendChild(bullets(h.n));
      var w = el('div', 'tw'); w.style.maxHeight = 'none'; w.style.marginTop = 'var(--cds-gap-sm)';
      var t = el('table'); w.appendChild(t);
      var hr = el('tr'); ['Cell' + (h.metric ? ' · ' + h.metric : '')].concat(PAIRS).forEach(function (x, i) { var th = el('th', i ? 'num' : '', x); if (i) th.dataset.arm = x; hr.appendChild(th); });
      var th = el('thead'); th.appendChild(hr); t.appendChild(th);
      var tb = el('tbody'); t.appendChild(tb);
      h.rows.forEach(function (r) {
        var metric = r[2] || h.metric;
        var tr = el('tr'); tr.appendChild(el('td', '', (DIMS[r[0]] ? r[1] : r[1]) + (r[2] ? ' · ' + r[2] : '')));
        var any = false;
        PAIRS.forEach(function (p) { var cc = cellIdx.map[r[0] + '|' + r[1] + '|' + metric + '|' + p]; if (!cc) return; any = true; var c = hlCell(cc); c.dataset.arm = p; tr.appendChild(c); });
        if (any) tb.appendChild(tr);
      });
      card.appendChild(w);
      card.appendChild(bullets('% change (bps for retention), PAB-adjusted, with Conf. Green = upside, red = downside, plain = neutral. † = no PAB, observed. Hover for observed and PAB.', 'note'));
      return card;
    }));
    var n = cs.length, m = cs.filter(function (c) { return c.final === 'MEANINGFUL'; }).length;
    var nm = uniq(cs.map(function (c) { return c.metric; })).length, nd = uniq(cs.map(function (c) { return c.dimension; })).length;
    var lead = $('#hl-lead'), li = [fI(n) + ' cells tested across ' + nd + ' cuts and ' + nm + ' metrics', m + ' are meaningful', 'Each group below uses one cut, cohorts first', 'Groups show where related cells agree, or where a cell is worth flagging as an outlier'];
    var lul = el('ul', 'bl'); li.forEach(function (x) { lul.appendChild(el('li', '', x)); }); lead.replaceChildren(lul);
  }

  function drawSummary() {
    var cs = cellsData(); if (!cs) return;
    var tb = $('#tbl-sum tbody'), rows = [];
    uniq(cs.map(function (c) { return c.dimension; })).forEach(function (d) {
      var s = cs.filter(function (c) { return c.dimension === d; });
      rows.push([DIMS[d] || d, s.length, s.filter(function (c) { return c.pab_status === 'COMPUTED'; }).length, ].concat(PAIRS.map(function (p) { return s.filter(function (c) { return c.pair === p && c.final === 'MEANINGFUL'; }).length; })));
    });
    tb.replaceChildren.apply(tb, rows.map(function (r) {
      var tr = el('tr'); r.forEach(function (v, i) { tr.appendChild(el('td', i ? 'num' : '', i ? fI(v) : v)); }); return tr;
    }));
    var ms = uniq(cs.map(function (c) { return c.metric; }));
    var none = ms.filter(function (m) { return !cs.some(function (c) { return c.metric === m && c.final === 'MEANINGFUL'; }); });
    $('#sum-none').textContent = none.length ? 'No cell in any cut shows upside or downside for: ' + none.join(', ') + '.' : '';
  }

  var drDim = $('#dr-dim'), drOnly = $('#dr-only'), mxCtl = {};
  function drawMatrix() {
    var cs = cellsData(), res = prepResults(); if (!cs) return;
    var dim = drDim.value, only = drOnly.checked, vars = mxCtl.vars || PAIRS, groups = mxCtl.groups || [];
    var resMap = {}; (res || []).forEach(function (r) { resMap[r.capability + '|' + r.metric + '|' + r.pair] = r; });
    var sub = cs.filter(function (c) { return c.dimension === dim && groups.indexOf(mg(c.capability, c.metric).label) >= 0 && vars.indexOf(c.pair) >= 0; });
    var cols = cellOrder(dim, uniq(sub.map(function (c) { return c.cell; })));
    var host = $('#dr-mx'); host.replaceChildren();
    if (!vars.length || !groups.length) { host.appendChild(el('p', 'note', !vars.length ? 'Select at least one variant in the Variants menu.' : 'Select at least one metric group in the Metric groups menu.')); return; }
    var map = {};
    sub.forEach(function (c) {
      var m = map[c.metric] || (map[c.metric] = { metric: c.metric, cap: c.capability, v: {} });
      var v = m.v[c.pair] || (m.v[c.pair] = { cells: {}, nm: 0 });
      v.cells[c.cell] = c; if (c.final === 'MEANINGFUL') v.nm++;
    });
    var rows = Object.keys(map).map(function (k) {
      var m = map[k];
      vars.forEach(function (p) { var v = m.v[p] || (m.v[p] = { cells: {}, nm: 0 }); v.ov = resMap[m.cap + '|' + m.metric + '|' + p]; v.ovm = v.ov && v.ov.adj_final === 'MEANINGFUL' ? 1 : 0; });
      m.any = vars.some(function (p) { return m.v[p].nm > 0 || m.v[p].ovm; });
      return m;
    });
    var shown = rows.filter(function (m) { return !only || m.any; });
    shown.sort(function (a, b) { return mg(a.cap, a.metric).mi - mg(b.cap, b.metric).mi || (a.metric < b.metric ? -1 : 1); });
    var w = el('div', 'tw'); w.style.maxHeight = '34rem'; w.style.marginBottom = 'var(--cds-gap-md)';
    var t = el('table', 'mx'); w.appendChild(t);
    var hr = el('tr'); hr.appendChild(el('th', '', 'Metric · variant pair')); hr.appendChild(el('th', 'num', 'Overall'));
    cols.forEach(function (c) { hr.appendChild(el('th', 'num', c)); });
    var th = el('thead'); th.appendChild(hr); t.appendChild(th);
    var tb = el('tbody'); t.appendChild(tb);
    var lastG = null;
    shown.forEach(function (m) {
      var gl = mg(m.cap, m.metric).label;
      if (gl !== lastG) { lastG = gl; var gr = el('tr', 'grp'), gd = el('td', '', gl); gd.colSpan = cols.length + 2; gr.appendChild(gd); tb.appendChild(gr); }
      vars.forEach(function (p, vi) {
        var v = m.v[p], tr = el('tr', vi === 0 ? 'mx-g' : '');
        var h = el('td', 'mx-h' + (vi ? ' mx-rep' : ''), m.metric + ' · ' + p + ' vs ' + REFL); h.setAttribute('role', 'rowheader'); tr.appendChild(h);
        var o = el('td', 'num' + (v.ovm ? ' mx-m' + dirCls('MEANINGFUL', v.ov.adj_val) : ''), v.ov ? fU(v.ov.unit, v.ov.adj_val) : '—'); if (v.ov) o.title = m.metric + ' · ' + p + ' overall · ' + (LAB[v.ov.adj_final] || ''); tr.appendChild(o);
        cols.forEach(function (c) {
          var x = v.cells[c], td = el('td', 'num' + (x && x.final === 'MEANINGFUL' ? ' mx-m' + dirCls(x.final, x.adj_val) : ''));
          if (x) { td.textContent = fU(x.unit, x.adj_val).replace(' bps', 'bp') + cdag(x); td.title = cellTitle(x); } else td.textContent = '—';
          tr.appendChild(td);
        });
        tb.appendChild(tr);
      });
    });
    if (!shown.length) { var e = el('tr'); var d = el('td', 'note', 'No metrics match.'); d.colSpan = cols.length + 2; e.appendChild(d); tb.appendChild(e); }
    host.appendChild(w);
    host.appendChild(el('p', 'note', shown.length + ' of ' + rows.length + ' metrics shown, one line per selected variant.'));
  }
  [drDim, drOnly].forEach(function (e) { e.addEventListener('change', drawMatrix); });
  variantPicker($('#dr-pick'), mxCtl, drawMatrix);

  var dtDim = $('#dt-dim'), dtCap = $('#dt-grp'), dtQ = $('#dt-q'), dtOnly = $('#dt-only'), dtMore = $('#dt-more');
  function fDelta(c) { return c.unit === 'pct' ? fSg(c.reference * c.adj_val / 100) : (c.unit === 'bps' ? fS1(c.adj_val) + ' bps' : fSg(c.adj_val)); }
  var dtCols = [
    { f: 'metric', rh: true, fmt: function (r) { return r.metric + ' · ' + r.pair + ' vs ' + REFL; } },
    { f: 'cell', fmt: function (r) { return r.cell + ' (' + (DIMS[r.dimension] || r.dimension).split(' (')[0].toLowerCase() + ')'; } },
    { f: 'reference', num: true, opt: 'ref', fmt: function (r) { return fG(r.reference); } },
    { f: 'comparator', num: true, opt: 'cmp', fmt: function (r) { return fG(r.comparator); } },
    { f: 'obs_val', num: true, opt: 'exp', fmt: function (r) { return fU(r.unit, r.obs_val); }, cell: function (td, r) { expCell(td, r, r.obs_final, r.obs_val); } },
    { f: 'pab_val', num: true, opt: 'pab', fmt: function (r) { return num(r.pab_val) ? '—' : fU(r.unit, r.pab_val); } },
    { f: 'adj_delta', num: true, opt: 'delta', fmt: fDelta },
    { f: 'adj_val', num: true, opt: 'pct', fmt: function (r) { return fU(r.unit, r.adj_val) + cdag(r); }, cell: function (td, r) { pctCell(td, r, r.final); } },
    { f: 'conf', num: true, opt: 'conf', fmt: function (r) { return fConf(r.conf); } },
    { f: 'p', num: true, opt: 'p', fmt: function (r) { return fP(r.p); } },
    { f: 'exposure', num: true, opt: 'dau', fmt: function (r) { return fI(Math.round(r.exposure)); } },
    { f: 'pab_status', opt: 'pabs', fmt: function (r) { return LAB[r.pab_status] || r.pab_status; } }];
  var dtCtl = sortable($('#tbl-cells'), function () {
    var cs = cellsData() || [], q = dtQ.value.trim().toLowerCase();
    var out = cs.filter(function (c) {
      return (!dtDim.value || c.dimension === dtDim.value) && mg(c.capability, c.metric).label === dtCap.value && dtCtl.vars.indexOf(c.pair) >= 0 && (!dtOnly.checked || c.final === 'MEANINGFUL') && (!q || c.metric.toLowerCase().indexOf(q) >= 0 || c.cell.toLowerCase().indexOf(q) >= 0);
    });
    return out;
  }, dtCols, 'key', { of: function (r) { return mg(r.capability, r.metric); }, cmp: function (a, b) { return mg(a.capability, a.metric).mi - mg(b.capability, b.metric).mi || (a.metric < b.metric ? -1 : a.metric > b.metric ? 1 : 0) || (COH.indexOf(a.cell) - COH.indexOf(b.cell)) || (a.cell < b.cell ? -1 : a.cell > b.cell ? 1 : 0) || (a.pair < b.pair ? -1 : 1); } });
  dtCtl.max = 300;
  fieldPicker($('#dt-pick'), dtCtl, [['ref', REFL + ' (reference)'], ['cmp', 'Comparator'], ['exp', 'Exp change'], ['pab', 'PAB'], ['delta', 'Delta (PAB-adj.)'], ['pct', '% change (PAB-adj.)'], ['conf', 'Conf'], ['p', 'p'], ['dau', REFL + ' DAU-days'], ['pabs', 'PAB status']], function () { dtCtl.max = 300; drawTable(); }, ['exp', 'pct']);
  function drawTable() {
    dtCtl.render();
    $('#dt-count').textContent = (dtCtl.total > dtCtl.max ? 'Showing ' + dtCtl.max + ' of ' : '') + fI(dtCtl.total) + ' cells';
    dtMore.hidden = !(dtCtl.total > dtCtl.max);
  }
  [dtDim, dtCap, dtOnly].forEach(function (e) { e.addEventListener('change', function () { dtCtl.max = 300; drawTable(); }); });
  dtQ.addEventListener('input', function () { dtCtl.max = 300; drawTable(); });
  dtMore.addEventListener('click', function () { dtCtl.max = Infinity; drawTable(); });
  // sorting re-renders through the sortable api; keep the count note in sync
  $('#tbl-cells').addEventListener('click', function () { setTimeout(function () { $('#dt-count').textContent = (dtCtl.total > dtCtl.max ? 'Showing ' + dtCtl.max + ' of ' : '') + fI(dtCtl.total) + ' cells'; }, 0); });

  function initDrill() {
    var cs = cellsData(); if (!cs) return;
    var dims = uniq(cs.map(function (c) { return c.dimension; }));
    var gl = GROUPS.filter(function (g) { return cs.some(function (c) { return mg(c.capability, c.metric).label === g; }); });
    fillSelect(drDim, dims.map(function (d) { return [d, DIMS[d] || d]; }));
    groupPicker($('#dr-grp-pick'), mxCtl, gl, drawMatrix);
    fillSelect(dtDim, dims.map(function (d) { return [d, DIMS[d] || d]; }));
    fillSelect(dtCap, gl.map(function (g) { return [g, g]; }));
    if (!dtDim.dataset.init) { dtDim.value = 'cohort'; dtDim.dataset.init = '1'; }
    drawHL(); drawSummary(); drawMatrix(); drawTable();
  }

  function initUI() {
    if (initUI.done) return; initUI.done = 1;
    var root = $('#rs-root');
    for (var ci = 0; ci < 8; ci++) if (C[ci]) root.style.setProperty('--c' + (ci + 1), C[ci]);
    var brand = $('#bar-brand'), h1 = document.querySelector('.rs h1');
    if (brand && h1 && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { brand.textContent = es[0].isIntersecting || es[0].boundingClientRect.top > 0 ? brand.dataset.top : brand.dataset.scrolled; }, { threshold: 0 }).observe(h1);
    }
    var links = Array.prototype.slice.call(document.querySelectorAll('.rs .topbar .links a[href^="#"]'));
    var bar = document.querySelector('.rs .topbar');
    function spy() {
      var y = (bar ? bar.getBoundingClientRect().bottom : 0) + 12, cur = null;
      links.forEach(function (a) {
        var s = document.getElementById(a.getAttribute('href').slice(1));
        if (!s || !s.offsetParent) return;
        if (s.getBoundingClientRect().top <= y) cur = a;
      });
      links.forEach(function (a) { a.classList.toggle('on', a === cur); if (a === cur) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
    }
    var tick = false;
    function onScroll() { if (!tick) { tick = true; requestAnimationFrame(function () { tick = false; spy(); }); } }
    // the page may scroll inside a host container rather than the window, so listen in the capture phase for any scrolling ancestor
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('resize', spy); spy(); setTimeout(spy, 300);
    var ap = $('#appendix');
    if (ap) ap.addEventListener('toggle', function () { if (ap.open) drawTrends(); spy(); });
  }
  // ---- segment explorer: any combination of the cut dimensions present in the daily data, computed from the daily cross-cut rows ----
  // Everything here is discovered from the data: which dimensions exist (cohort, user type, payer status, or whatever the experiment carries),
  // which values each has, which revenue types, action types and economy types are present. Nothing is hard-coded per experiment.
  var EX_IDS = ['x_dau', 'x_rev', 'x_sess', 'x_rr', 'x_eng', 'x_econ'];
  var EX_DIM_LABEL = { c: 'Cohorts (days since install)', u: 'User type', p: 'Payer status' };
  var EX_VAL_LABEL = { 'new': 'New users', old: 'Old users', payer: 'Payers', non_payer: 'Non-payers' };
  var EX_OPT_LABEL = { 'new': 'New users (user_type = new)', old: 'Old users (user_type = old)', payer: 'Payers', non_payer: 'Non-payers' };
  var EX_ALL_LABEL = { c: 'All cohorts', u: 'Overall (new and old users)', p: 'Overall (payers and non-payers)' };
  var EX_TYPE_LABEL = { w2e: 'W2E', interstitial: 'Interstitial', banner: 'Banner', ad_on_inactivity: 'Ad-on-inactivity', iap: 'IAP', offerwall: 'Offerwall', btob_w2e: 'B2B W2E', bright: 'Bright', xpromo: 'Xpromo', mid_interstitial: 'Mid-interstitial' };
  var EX_TYPE_ORDER = ['w2e', 'interstitial', 'mid_interstitial', 'banner', 'ad_on_inactivity', 'iap', 'offerwall', 'btob_w2e', 'bright'];
  var EX_ACT_ORDER = ['clear', 'w_clear', 'view', 'use_hint', 'category_hint', 'row_clear', 'col_clear', 'icon_clear', 'stars_clear', 'frenzy_clear'];
  var EX_NOT_AD = { iap: 1, offerwall: 1 };
  function exLabel(map, v) { return map[v] || (String(v).charAt(0).toUpperCase() + String(v).slice(1)).replace(/_/g, ' '); }
  function exCohortKey(c) { var m = /^D(\d+)/.exec(c); return m ? +m[1] : (/^D/.test(c) ? 9998 : 9999); }
  function exOrder(list, order) { return list.slice().sort(function (a, b) { var i = order.indexOf(a), j = order.indexOf(b); i = i < 0 ? 999 : i; j = j < 0 ? 999 : j; return i - j || (a < b ? -1 : a > b ? 1 : 0); }); }
  function exData() {
    var o = {}, i, any = false;
    for (i = 0; i < EX_IDS.length; i++) { var d = ok(EX_IDS[i]); if (d) { o[EX_IDS[i]] = d; any = true; } var p = ok('p' + EX_IDS[i].slice(1)); if (p) o['p' + EX_IDS[i].slice(1)] = p; }
    return any && o.x_dau ? o : null;
  }
  var exMeta = null;
  function exDiscover(X) {
    if (exMeta) return exMeta;
    var rows = X.x_dau, keys = {}, i, k;
    for (i = 0; i < Math.min(rows.length, 500); i++) for (k in rows[i]) if (rows[i].hasOwnProperty(k) && 'vdn'.indexOf(k) < 0) keys[k] = 1;
    var dims = Object.keys(keys).map(function (key) {
      var vals = uniq(rows.map(function (r) { return r[key]; }).filter(function (v) { return v !== null && v !== undefined; }));
      vals = key === 'c' ? vals.sort(function (a, b) { return exCohortKey(a) - exCohortKey(b) || (a < b ? -1 : 1); }) : exOrder(vals, ['new', 'old', 'payer', 'non_payer']);
      return { key: key, label: EX_DIM_LABEL[key] || key, vals: vals };
    });
    dims.sort(function (a, b) { var o = ['c', 'u', 'p']; var i = o.indexOf(a.key), j = o.indexOf(b.key); return (i < 0 ? 9 : i) - (j < 0 ? 9 : j); });
    var preVals = {};
    if (X.p_dau) X.p_dau.slice(0, 5000).forEach(function (r) { for (k in r) if ('vdn'.indexOf(k) < 0) { (preVals[k] = preVals[k] || {})[r[k]] = 1; } });
    // metric list from what the tables carry
    var M = [];
    if (X.x_rev) {
      var types = exOrder(uniq(X.x_rev.map(function (r) { return r.t; })), EX_TYPE_ORDER), adTypes = types.filter(function (t) { return !EX_NOT_AD[t]; });
      M.push({ g: 'Revenue per DAU', m: 'Rev/DAU (all)', src: 'rev', num: function (r) { return r.r; } });
      if (types.indexOf('iap') >= 0) M.push({ g: 'Revenue per DAU', m: 'Ad Rev/DAU (non-IAP)', src: 'rev', f: function (r) { return r.t !== 'iap'; }, num: function (r) { return r.r; } });
      types.forEach(function (t) { M.push({ g: 'Revenue per DAU', m: exLabel(EX_TYPE_LABEL, t) + ' Rev/DAU', src: 'rev', f: function (r) { return r.t === t; }, num: function (r) { return r.r; } }); });
      var hasImp = X.x_rev.some(function (r) { return r.i > 0; });
      if (hasImp) {
        M.push({ g: 'Ad impressions per DAU', m: 'Impressions/DAU (non-IAP)', src: 'rev', f: function (r) { return !EX_NOT_AD[r.t]; }, num: function (r) { return r.i; } });
        adTypes.forEach(function (t) { M.push({ g: 'Ad impressions per DAU', m: exLabel(EX_TYPE_LABEL, t) + ' impressions/DAU', src: 'rev', f: function (r) { return r.t === t; }, num: function (r) { return r.i; } }); });
        adTypes.forEach(function (t) { M.push({ g: 'eCPM', m: exLabel(EX_TYPE_LABEL, t) + ' eCPM', src: 'rev', f: function (r) { return r.t === t; }, num: function (r) { return r.r; }, den: function (r) { return r.i; }, scale: 1000 }); });
      }
    }
    if (X.x_eng) {
      exOrder(uniq(X.x_eng.map(function (r) { return r.t; })), EX_ACT_ORDER).forEach(function (t) { M.push({ g: 'Engagement: actions per DAU', m: exLabel({ clear: 'Clear', w_clear: 'W_clear', view: 'View', use_hint: 'Use_hint', category_hint: 'Category_hint', row_clear: 'Row_clear', col_clear: 'Col_clear', icon_clear: 'Icon_clear' }, t) + '/DAU', src: 'eng', f: function (r) { return r.t === t; }, num: function (r) { return r.a; } }); });
    }
    if (X.x_sess) {
      M.push({ g: 'Sessions and time per DAU', m: 'Sessions/DAU', src: 'sess', num: function (r) { return r.s; }, den: function (r) { return r.n; } });
      M.push({ g: 'Sessions and time per DAU', m: 'Session time/DAU', src: 'sess', num: function (r) { return r.l; }, den: function (r) { return r.n; }, scale: 1 / 60 });
    }
    if (X.x_econ) {
      var ets = exOrder(uniq(X.x_econ.map(function (r) { return r.t; })), ['earn', 'spend', 'purchase']), EL = { earn: 'earned', spend: 'spent', purchase: 'purchased' };
      ets.forEach(function (t) { M.push({ g: 'In-game economy, cash per DAU', m: 'Cash ' + exLabel(EL, t).toLowerCase() + '/DAU', src: 'econ', f: function (r) { return r.t === t; }, num: function (r) { return r.a; } }); });
      ets.filter(function (t) { return t === 'earn' || t === 'spend'; }).forEach(function (t) { M.push({ g: 'In-game economy, users per DAU', m: (t === 'earn' ? 'Cash earners' : 'Cash spenders') + '/DAU', src: 'econ', f: function (r) { return r.t === t; }, num: function (r) { return r.n; } }); });
    }
    if (X.x_rr) {
      if (X.x_rr.some(function (r) { return r.a > 0; })) M.push({ g: 'Rolling retention', m: 'Rolling D1', src: 'rr', kind: 'bps', num: function (r) { return r.a; }, den: function (r) { return r.n; }, trim: 3 });
      if (X.x_rr.some(function (r) { return r.b > 0; })) M.push({ g: 'Rolling retention', m: 'Rolling D3', src: 'rr', kind: 'bps', num: function (r) { return r.b; }, den: function (r) { return r.n; }, trim: 5 });
    }
    var stored = Array.prototype.map.call(document.querySelectorAll('#sum-default tr.grp'), function (r) { return r.textContent.trim(); });
    exMeta = { dims: dims, preVals: preVals, metrics: M, groups: uniq(M.map(function (x) { return x.g; })), allGroups: uniq(stored.concat(M.map(function (x) { return x.g; }))) };
    return exMeta;
  }
  // accumulate {variant|day: [num, den]} for a metric over rows passing seg
  function exAcc(rows, m, seg, denRows) {
    var acc = {}, k, r, i;
    for (i = 0; i < rows.length; i++) {
      r = rows[i]; if (!seg(r) || (m.f && !m.f(r))) continue;
      k = r.v + '|' + r.d; var a = acc[k] || (acc[k] = [0, 0]);
      a[0] += m.num(r) || 0; if (m.den) a[1] += m.den(r) || 0;
    }
    if (!m.den) {
      for (i = 0; i < denRows.length; i++) { r = denRows[i]; if (!seg(r)) continue; k = r.v + '|' + r.d; var b = acc[k] || (acc[k] = [0, 0]); b[1] += r.n || 0; }
    }
    return acc;
  }
  function exEff(acc, pair, days, scale, kind) {
    var rr = [], cc = [], idx = [], i, d, a, b;
    for (i = 0; i < days.length; i++) {
      d = days[i]; a = acc['control|' + d]; b = acc[pair + '|' + d];
      if (!a || !b || !(a[1] > 0) || !(b[1] > 0)) continue;
      rr.push(a[0] / a[1] * scale); cc.push(b[0] / b[1] * scale); idx.push(d);
    }
    var n = idx.length; if (n < 2) return null;
    var sn = 0, sd = 0, cn = 0, cd = 0;
    for (i = 0; i < idx.length; i++) { a = acc['control|' + idx[i]]; b = acc[pair + '|' + idx[i]]; sn += a[0]; sd += a[1]; cn += b[0]; cd += b[1]; }
    var ref = sn / sd * scale, cmp = cn / cd * scale;
    var diffs = cc.map(function (c, j) { return c - rr[j]; }), mean = d3.mean(diffs), s = d3.deviation(diffs);
    if (!(s > 0)) return null;
    var h = tcrit(n - 1) * s / Math.sqrt(n), lo = mean - h, hi = mean + h;
    if (kind === 'bps') return { ref: ref, cmp: cmp, val: (cmp - ref) * 1e4, lo: lo * 1e4, hi: hi * 1e4, n: n, exp: sd };
    return { ref: ref, cmp: cmp, val: (cmp - ref) / ref * 100, lo: lo / ref * 100, hi: hi / ref * 100, n: n, exp: sd };
  }
  var exDays = null;
  function exDayLists(X) {
    if (exDays) return exDays;
    var days = uniq(X.x_dau.map(function (r) { return r.d; })).sort(), pre = X.p_dau ? uniq(X.p_dau.map(function (r) { return r.d; })).sort() : [];
    var z1 = {}, z3 = {}; (X.p_rr || []).forEach(function (r) { if (r.v === 'control') { z1[r.d] = (z1[r.d] || 0) + r.a; z3[r.d] = (z3[r.d] || 0) + r.b; } });
    exDays = { days: days, pre: pre, pre1: pre.filter(function (d) { return z1[d] > 0; }), pre3: pre.filter(function (d) { return z3[d] > 0; }) };
    return exDays;
  }
  // Share of the segment's DAU-days that belong to users who existed before the test (user type old), both variants pooled,
  // over the days used by the observed result. PAB is measured on those users only, so a mixed segment takes old share x PAB.
  function exOldShare(X, seg, days) {
    var on = {}, i, r, old = 0, all = 0; days.forEach(function (d) { on[d] = 1; });
    for (i = 0; i < X.x_dau.length; i++) { r = X.x_dau[i]; if (!on[r.d] || !seg(r)) continue; all += r.n || 0; if (r.u === 'old') old += r.n || 0; }
    return all > 0 ? old / all : null;
  }
  function exCompute(X, m, seg, segPre, pair) {
    var L = exDayLists(X), kind = m.kind || 'pct', scale = m.scale || 1;
    var days = m.trim ? L.days.slice(0, L.days.length - m.trim) : L.days;
    var acc = exAcc(X['x_' + m.src], m, seg, X.x_dau);
    var o = exEff(acc, pair, days, scale, kind); if (!o) return null;
    var out = { obs: o.val, lo: o.lo, hi: o.hi, n: o.n, ref: o.ref, cmp: o.cmp, exp: o.exp, pab: null, adj: o.val, alo: o.lo, ahi: o.hi, pabStatus: 'NOT_AVAILABLE' };
    if (segPre && X['p_' + m.src] && X.p_dau) {
      var pacc = exAcc(X['p_' + m.src], m, segPre, X.p_dau);
      var pdays = m.m === 'Rolling D1' ? L.pre1 : (m.m === 'Rolling D3' ? L.pre3 : L.pre);
      var p = exEff(pacc, pair, pdays, scale, kind);
      var w = p ? exOldShare(X, seg, days) : null;
      if (p && p.n >= 10 && w !== null && w > 0) {
        var pv = w * p.val, ph = w * (p.hi - p.lo) / 2;
        var ctr = (o.lo + o.hi) / 2 - pv, hh = Math.sqrt(Math.pow((o.hi - o.lo) / 2, 2) + Math.pow(ph, 2));
        out.pab = pv; out.pabRaw = p.val; out.oldShare = w; out.adj = o.val - pv; out.alo = ctr - hh; out.ahi = ctr + hh; out.pabStatus = 'COMPUTED'; out.pabN = p.n;
      }
    }
    out.conf = confOf(out.alo, out.ahi, o.n);
    out.cls = classify(kind, out.alo, out.ahi, out.adj, out.conf);
    return out;
  }
  // sel: {dimKey: [values] or null for all}
  function exSeg(sel) {
    var keys = Object.keys(sel).filter(function (k) { return sel[k]; }), sets = {};
    keys.forEach(function (k) { var s = {}; sel[k].forEach(function (v) { s[v] = 1; }); sets[k] = s; });
    return function (r) { for (var i = 0; i < keys.length; i++) if (!sets[keys[i]][r[keys[i]]]) return false; return true; };
  }
  // Pre-test counterpart. Every selected dimension that the pre data carries is matched on the same values; a dimension the pre data lacks
  // (user type) only has a counterpart when the selection is not restricted to users who did not exist before the test ('new').
  // Cohorts: when every cohort that exists in the pre data is selected, the whole pre population is the counterpart (as for the overall and
  // user-type results, where the rolled-up small pre cohorts are included); otherwise the same cohorts only.
  function exSegPre(meta, sel) {
    var pv = meta.preVals, k, pre = {};
    if (!Object.keys(pv).length) return null;
    for (k in sel) {
      if (!sel[k]) continue;
      if (!pv[k]) { if (sel[k].length && sel[k].every(function (v) { return v === 'new'; })) return null; continue; }
      var inPre = Object.keys(pv[k]), chosen = sel[k].filter(function (v) { return pv[k][v]; });
      if (!chosen.length) return null;
      var all = inPre.every(function (v) { return chosen.indexOf(v) >= 0 || (k === 'c' && !/^D\d/.test(v)); });
      if (!all) pre[k] = chosen;
    }
    return exSeg(pre);
  }
  function exSelection(meta) {
    var sel = {};
    meta.dims.forEach(function (d) {
      var box = $('#ex-d-' + d.key); if (!box) return;
      sel[d.key] = Array.prototype.map.call(box.querySelectorAll('input:checked'), function (i) { return i.value; });
    });
    return sel;
  }
  function exGroupsSel() { var b = $('#ex-grp'); return b ? Array.prototype.map.call(b.querySelectorAll('input:checked'), function (i) { return i.value; }) : null; }
  // one computed cell (value, reading, Conf, days) for a metric over a segment
  function exCellTd(X, meta, m, sel, pair) {
    var o = exCompute(X, m, exSeg(sel), exSegPre(meta, sel), pair);
    var td = el('td'); td.dataset.arm = pair;
    if (!o) { td.appendChild(el('span', 'note', 'Not computable (too few paired days)')); return { td: td, o: null }; }
    var kind = m.kind || 'pct', dg = o.pabStatus === 'COMPUTED' ? '' : ' †';
    var vc = el('div', 'vc'); var b = el('b', dirCls(o.cls, o.adj).trim(), fU(kind, o.adj) + dg); vc.appendChild(b);
    var pl = el('span'); setPill(pl, o.cls, o.adj); vc.appendChild(pl); td.appendChild(vc);
    td.appendChild(el('div', 'ci note', 'Conf: ' + fConf(o.conf) + ' · ' + o.n + ' days'));
    b.title = 'Observed ' + fU(kind, o.obs) + (o.pabStatus === 'COMPUTED' ? ' · PAB ' + fU(kind, o.pab) + (o.oldShare < 0.9995 ? ' (' + fU(kind, o.pabRaw) + ' × ' + d3.format('.0%')(o.oldShare) + ' old users' : ' (') + (o.oldShare < 0.9995 ? ', ' : '') + o.pabN + ' pre-test days)' : ' · PAB not available') + ' · ' + REFL + ' ' + d3.format('.4~g')(o.ref) + ', ' + pair + ' ' + d3.format('.4~g')(o.cmp) + ' · ' + REFL + ' DAU-days ' + fI(Math.round(o.exp));
    return { td: td, o: o };
  }
  // short description of a selection: "All users", "New users · Payers", "New users · D00, D01"
  function exSegLabel(meta, sel) {
    var parts = [];
    meta.dims.forEach(function (d) {
      var s = sel[d.key]; if (!s || s.length === d.vals.length) return;
      if (d.key === 'c') parts.push(s.length <= 3 ? s.join(', ') : s.length + ' of ' + d.vals.length + ' cohorts');
      else parts.push(s.map(function (v) { return exLabel(EX_VAL_LABEL, v); }).join(' + '));
    });
    return parts.length ? parts.join(' · ') : 'All users';
  }
  function exDimsDefault(meta, sel) {
    return meta.dims.every(function (d) { var x = sel[d.key]; return !x || x.length === d.vals.length; });
  }
  // the stored all-users table, limited to the metric groups ticked in the Metrics dropdown
  function exFilterStored(grps) {
    var rows = document.querySelectorAll('#sum-default tbody tr'), cur = true;
    rows.forEach(function (r) {
      if (r.classList.contains('grp')) { var t = r.textContent.trim(); cur = !grps || grps.indexOf(t) >= 0; }
      r.style.display = cur ? '' : 'none';
    });
  }
  function drawExplorer() {
    var X = exData(), host = $('#ex-out'), def = $('#sum-default'), mode = $('#sum-mode'); if (!host) return;
    if (!X) { host.style.display = 'none'; if (def) def.style.display = ''; if (mode) mode.textContent = 'The daily cut data for this experiment is not loaded, so the cohort, user type and payer options are not available; the table shows all users.'; return; }
    var meta = exDiscover(X), sel = exSelection(meta), grps = exGroupsSel(), pair = PAIRS[0];
    var allG = !grps || grps.length === meta.allGroups.length, dimsDef = exDimsDefault(meta, sel);
    var gTxt = allG ? '' : ' Metric groups: ' + grps.length + ' of ' + meta.allGroups.length + '.';
    if (def) def.style.display = dimsDef ? '' : 'none';
    host.style.display = dimsDef ? 'none' : '';
    if (dimsDef) { exFilterStored(allG ? null : grps); if (mode) mode.textContent = 'Showing: all users, all cohorts (the stored results).' + gTxt; return; }
    exFilterStored(null);
    if (mode) mode.textContent = 'Showing: ' + exSegLabel(meta, sel) + '. Recomputed on this page from the daily cut data.' + gTxt;
    var empty = meta.dims.some(function (d) { return sel[d.key] && !sel[d.key].length; });
    if (empty) { host.replaceChildren(el('p', 'note', 'Pick at least one value in every dropdown.')); return; }
    var metrics = meta.metrics.filter(function (m) { return !grps || grps.indexOf(m.g) >= 0; });
    if (!metrics.length) { host.replaceChildren(el('p', 'note', 'None of the selected metric groups can be cut by segment here (classic retention, LTV, LTDays and rolling LTV are by install date). They are in the all-users view and in the Drill-down.')); return; }
    var w = el('div', 'tw'); w.style.maxHeight = 'none'; var t = el('table', 'vt ex'); w.appendChild(t);
    var th = el('thead'), hr = el('tr'); hr.appendChild(el('th', '', 'Metric'));
    PAIRS.forEach(function (pr) { var h = el('th', '', (PAIRS.length > 1 ? '' : exSegLabel(meta, sel) + ' · ') + pr + ' vs ' + REFL); h.dataset.arm = pr; hr.appendChild(h); });
    th.appendChild(hr); t.appendChild(th);
    var tb = el('tbody'); t.appendChild(tb);
    var lastG = null, nMean = 0;
    metrics.forEach(function (m) {
      if (m.g !== lastG) { lastG = m.g; var g = el('tr', 'grp'); var gd = el('td', '', m.g); gd.colSpan = PAIRS.length + 1; g.appendChild(gd); tb.appendChild(g); }
      var tr = el('tr'); tr.appendChild(el('td', '', m.m));
      PAIRS.forEach(function (pr) { var r = exCellTd(X, meta, m, sel, pr); tr.appendChild(r.td); if (r.o && r.o.cls === 'MEANINGFUL') nMean++; });
      tb.appendChild(tr);
    });
    var lead = el('p', 'note', metrics.length + ' metrics' + (PAIRS.length > 1 ? ', ' + PAIRS.length + ' variant comparisons' : '') + '; ' + nMean + ' upside or downside. PAB applies where the segment has a pre-test counterpart (the same cut values in the 30 days before the test, not restricted to new users); otherwise observed (†). Each cell is its own paired test over the days in the window, with no multiple-testing correction. Classic retention, LTV, LTDays and rolling LTV are by install date and cannot be cut by segment here; they are in the all-users view and in the Drill-down.');
    host.replaceChildren(lead, w);
  }
  // "New users by days since install": user_type = new, one column per install cohort, observed (no PAB exists for users who installed in the window)
  var COHORT_ROWS = ['Rev/DAU (all)', 'Interstitial Rev/DAU', 'W2E impressions/DAU', 'Clear/DAU', 'Use_hint/DAU', 'Session time/DAU', 'Rolling D1', 'Rolling D3'];
  function drawCohortNew() {
    var host = $('#opt-cohort-out'); if (!host) return;
    var X = exData();
    if (!X) { host.replaceChildren(el('p', 'note', 'The daily cut data for this experiment is not loaded, so this section is not available.')); return; }
    var meta = exDiscover(X), pair = PAIRS[0];
    var cohorts = exOrder(uniq(X.x_dau.filter(function (r) { return r.u === 'new'; }).map(function (r) { return r.c; })), []).sort(function (a, b) { return exCohortKey(a) - exCohortKey(b) || (a < b ? -1 : 1); });
    var metrics = COHORT_ROWS.map(function (n) { return meta.metrics.filter(function (m) { return m.m === n; })[0]; }).filter(Boolean);
    if (!cohorts.length || !metrics.length) { host.replaceChildren(el('p', 'note', 'No install cohorts with user_type = new in the daily cut data.')); return; }
    var blocks = PAIRS.map(function (pr) {
      var w = el('div', 'tw'); w.style.maxHeight = 'none'; var t = el('table', 'vt'); w.appendChild(t);
      var hr = el('tr'); var h0 = el('th', '', 'Metric · ' + pr + ' vs ' + REFL + ' (user_type = new, days since install, observed †)'); h0.dataset.arm = pr; hr.appendChild(h0);
      cohorts.forEach(function (c) { var h = el('th', '', c); h.dataset.arm = pr; hr.appendChild(h); });
      var th = el('thead'); th.appendChild(hr); t.appendChild(th);
      var tb = el('tbody'); t.appendChild(tb);
      metrics.forEach(function (m) {
        var tr = el('tr'); tr.appendChild(el('td', '', m.m));
        cohorts.forEach(function (c) { tr.appendChild(exCellTd(X, meta, m, { u: ['new'], c: [c] }, pr).td); });
        tb.appendChild(tr);
      });
      return w;
    });
    host.replaceChildren.apply(host, blocks);
  }
  // one dropdown checklist: values [[value, label]], all ticked by default; the summary shows its title and what is ticked
  function ddPicker(title, id, vals, onChange, presets) {
    var dd = document.createElement('details'); dd.className = 'dd';
    var sm = document.createElement('summary'); dd.appendChild(sm);
    var menu = el('div', 'dd-menu'); menu.id = id; menu.setAttribute('role', 'group'); menu.setAttribute('aria-label', title); dd.appendChild(menu);
    var inputs = [];
    function sync() {
      var on = inputs.filter(function (i) { return i.checked; });
      sm.textContent = title + ': ' + (on.length === inputs.length ? 'All' : (on.length === 0 ? 'None' : (on.length === 1 ? vals.filter(function (v) { return v[0] === on[0].value; })[0][1] : on.length + ' of ' + inputs.length)));
    }
    function setAll(pred) { inputs.forEach(function (i) { i.checked = pred(i.value); }); sync(); onChange(); }
    var bar = el('div', 'ctrl');
    var mk = function (label, pred) { var b = el('button', '', label); b.type = 'button'; b.addEventListener('click', function () { setAll(pred); }); bar.appendChild(b); };
    mk('All', function () { return true; }); mk('None', function () { return false; });
    (presets || []).forEach(function (p) { mk(p[0], p[1]); });
    menu.appendChild(bar); menu.appendChild(document.createElement('hr'));
    vals.forEach(function (v) { var l = document.createElement('label'); var i = document.createElement('input'); i.type = 'checkbox'; i.value = v[0]; i.checked = true; i.addEventListener('change', function () { sync(); onChange(); }); inputs.push(i); l.appendChild(i); l.appendChild(document.createTextNode(v[1])); menu.appendChild(l); });
    dd._sync = sync; dd._set = function (list) { inputs.forEach(function (i) { i.checked = !list || list.indexOf(i.value) >= 0; }); sync(); }; sync();
    document.addEventListener('click', function (e) { if (dd.open && !dd.contains(e.target)) dd.open = false; });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') dd.open = false; });
    return dd;
  }
  // Summary table options: Cohort, User type, Payer flag and Metrics, all dropdown checklists with everything ticked
  function initExplorer() {
    var box = $('#ex-controls'); if (!box || box.dataset.init) return;
    var X = exData(); if (!X) { drawExplorer(); return; }
    box.dataset.init = '1'; box.replaceChildren();
    var meta = exDiscover(X), row = el('div', 'ctrl'), pickers = {};
    var TITLE = { c: 'Cohort', u: 'User type', p: 'Payer flag' }, ORDER = ['c', 'u', 'p'];
    var dims = meta.dims.slice().sort(function (a, b) { var i = ORDER.indexOf(a.key), j = ORDER.indexOf(b.key); return (i < 0 ? 9 : i) - (j < 0 ? 9 : j); });
    dims.forEach(function (d) {
      var presets = d.key === 'c' && meta.preVals.c && d.vals.some(function (v) { return meta.preVals.c[v]; })
        ? [['Installed in the read window', function (v) { return !meta.preVals.c[v]; }], ['Existed before the read window', function (v) { return !!meta.preVals.c[v]; }]] : [];
      var dd = ddPicker(TITLE[d.key] || d.label, 'ex-d-' + d.key, d.vals.map(function (v) { return [v, d.key === 'c' ? v : exLabel(EX_OPT_LABEL, v)]; }), drawExplorer, presets);
      pickers[d.key] = dd; row.appendChild(dd);
    });
    var gd = ddPicker('Metrics', 'ex-grp', meta.allGroups.map(function (g) { return [g, g]; }), drawExplorer);
    pickers.grp = gd; row.appendChild(gd);
    function setAll() { Object.keys(pickers).forEach(function (k) { pickers[k]._set(null); }); }
    // optional dataset `audience` (one row: u, p, c, label): who the experiment is meant for, stated by its owner before the read.
    // It only sets where the dropdowns open; the stored all-users table and Reset stay one click away.
    var aud = ok('audience'); aud = aud && aud[0] ? aud[0] : null;
    function setAudience() {
      setAll();
      var cs = typeof aud.c === 'string' ? aud.c.split(',').map(function (x) { return x.trim(); }).filter(Boolean) : (aud.c || []);
      if (pickers.u && aud.u) pickers.u._set([aud.u]);
      if (pickers.p && aud.p) pickers.p._set([aud.p]);
      if (pickers.c && cs.length && cs.some(function (v) { return meta.dims.filter(function (d) { return d.key === 'c'; })[0].vals.indexOf(v) >= 0; })) pickers.c._set(cs);
      drawExplorer();
    }
    if (aud) { var ab = el('button', '', 'Target audience: ' + (aud.label || 'set by the owner')); ab.type = 'button'; ab.addEventListener('click', setAudience); row.appendChild(ab); }
    var rb = el('button', '', 'Reset'); rb.type = 'button'; rb.addEventListener('click', function () { setAll(); drawExplorer(); }); row.appendChild(rb);
    box.appendChild(row);
    if (aud) { box.appendChild(el('p', 'note', 'Opened on the target audience set for this read: ' + (aud.label || '') + '. It is the owner\'s statement of who the experiment is for, not a filter on the data; Reset shows all users.')); setAudience(); }
  }
  // collapsible sections: every section heading collapses its section; the Experiment card starts collapsed (class in the page body)
  function initCollapse() {
    var root = $('#rs-root'); if (!root || root._cz) return; root._cz = 1;
    function set(s, on) {
      s.classList.toggle('collapsed', on);
      var b = s.querySelector('.cz'); if (b && b.parentNode.parentNode === s) { b.setAttribute('aria-expanded', String(!on)); b.title = on ? 'Expand section' : 'Collapse section'; b.setAttribute('aria-label', b.title); }
    }
    var secs = Array.prototype.slice.call(root.querySelectorAll('section[id^="sec-"]'));
    secs.forEach(function (s) {
      var h = null, i; for (i = 0; i < s.children.length; i++) if (s.children[i].tagName === 'H2') { h = s.children[i]; break; }
      if (!h) return;
      h.setAttribute('data-cz', '1');
      var b = el('button', 'cz'); b.type = 'button'; h.appendChild(b);
      h.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('.hv')) return; set(s, !s.classList.contains('collapsed')); });
      set(s, s.classList.contains('collapsed'));
    });
    var ca = $('#cz-all'), ce = $('#cz-none'), ap = $('#appendix');
    if (ca) ca.addEventListener('click', function () { secs.forEach(function (s) { set(s, true); }); if (ap) ap.open = false; });
    if (ce) ce.addEventListener('click', function () { secs.forEach(function (s) { set(s, false); }); });
    root.querySelectorAll('.topbar .links a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function () {
        var t = document.getElementById(a.getAttribute('href').slice(1)); if (!t) return;
        var d = t.closest ? t.closest('details.appx') : null; if (d && !d.open) d.open = true;
        if (t.classList.contains('collapsed')) set(t, false);
      });
    });
  }

  // Two-part read: until Part 2 has written the Appendix datasets, run_state says part2 = RUNNING and the Appendix
  // shows its notice instead of tables. No run_state dataset (older reads) means complete.
  function applyRunState() {
    var rs = ok('run_state'), row = rs && rs[0] ? rs[0] : null;
    var st = row ? String(row.part2 || '').toUpperCase() : 'COMPLETE';
    var ap = document.getElementById('appendix'); if (!ap) return;
    ap.classList.toggle('part2-pending', st === 'RUNNING');
    var n = document.getElementById('part2-note');
    if (n && row && row.note) n.textContent = row.note;
    if (n && st === 'PARTIAL') { ap.classList.add('part2-pending'); n.textContent = row.note || 'Part 2 did not complete; the Appendix is not shown.'; }
  }

  dash.onData(function () {
    applyRunState();
    fillMarks();
    var res = prepResults();
    if (res) {
      var gl = GROUPS.filter(function (g) { return res.some(function (r) { return mg(r.capability, r.metric).label === g; }); });
      fillSelect(resCap, [['', 'All metric groups (shown separately)']].concat(gl.map(function (g) { return [g, g]; })));
      fillSelect(resFin, [['', 'Any reading'], ['MEANINGFUL', 'Upside or downside'], ['NO_MEANINGFUL_MOVEMENT', 'Neutral: no meaningful movement'], ['INSUFFICIENT_EVIDENCE', 'Insufficient evidence'], ['NOT_CLASSIFIED', 'Not classified']]);
      resCtl.render();
    }
    if (ok('experiment_card')) cardCtl.render();
    initTrends();
    initDrill();
    fillCellMarks();
    fillPuzzle();
    initCollapse();
    initUI();
    initExplorer(); drawExplorer(); drawCohortNew();
  });
})();

// Optional section: new users by days since install stays hidden until the viewer says yes
(function () { var y = document.getElementById('opt-cohort-yes'); if (!y) return; y.addEventListener('click', function () { document.getElementById('opt-cohort').style.display = ''; document.getElementById('opt-cohort-ask').style.display = 'none'; }); })();
