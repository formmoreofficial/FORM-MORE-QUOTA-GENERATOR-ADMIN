const $ = s => document.querySelector(s);
const KEY = 'formmore.quotes.v1', SEQ = 'formmore.seq';
const BASE = ['Shirt blank base', 'Electricity', 'Labor', 'DTF print', 'Additional prints', 'Packaging', 'Delivery'];
const IDEA = 'Creative fees';

const iso = d => d.toISOString().slice(0, 10);
const peso = n => '₱' + (+n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const read = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const seq = () => (+localStorage.getItem(SEQ) || 0) + 1;
const typeName = (x = q) => x.mode === 'design' ? 'With a design' : 'Just an idea';

const mk = () => ({
  id: '', mode: 'design', client: '', contact: '', project: '', notes: '', discount: 0,
  no: `FM-${new Date().getFullYear()}-${String(seq()).padStart(4, '0')}`,
  date: iso(new Date()), valid: iso(new Date(Date.now() + 6048e5)),
  rows: [...BASE, IDEA].map(n => ({ n, q: 1, p: 0 }))
});
let q = mk();

// "Just an idea" = every design line + Creative fees
const act = (x = q) => x.mode === 'design' ? x.rows.slice(0, BASE.length) : x.rows;
const sums = (x = q) => {
  const s = act(x).reduce((a, r) => a + r.q * r.p, 0), d = Math.min(+x.discount || 0, s);
  return { s, d, t: s - d };
};

/* ---------- form + live quotation ---------- */
function buildForm() {
  document.querySelectorAll('.seg button').forEach(b => b.classList.toggle('on', b.dataset.m === q.mode));
  ['client', 'contact', 'project', 'date', 'valid', 'notes', 'discount'].forEach(k => $('#' + k).value = q[k]);
  $('#rows').innerHTML = act().map((r, i) => `
    <div class="row"><span>${i + 1}</span><span class="nm">${esc(r.n)}</span>
      <label>Qty<input data-i="${i}" data-k="q" type="number" min="0" step="any" value="${r.q}"></label>
      <label>Price (₱)<input data-i="${i}" data-k="p" type="number" min="0" step="0.01" value="${r.p}"></label>
      <output id="a${i}">${peso(r.q * r.p)}</output></div>`).join('');
  draw();
}
function draw() {
  act().forEach((r, i) => { const o = $('#a' + i); if (o) o.textContent = peso(r.q * r.p); });
  $('#sheet').innerHTML = sheetHTML(false);
}
function sheetHTML(forFile) {
  const { s, d, t } = sums();
  return `<div class="hd">${forFile ? '<b class="wm">FORM/MORE</b>' : '<img src="logo.png" alt="FORM/MORE">'}
    <p>Quotation ${esc(q.no)}<br>${esc(q.date)}${q.valid ? '<br>Valid until ' + esc(q.valid) : ''}</p></div>
  <div class="meta"><p><small>For</small>${esc(q.client) || '—'}<br>${esc(q.contact)}</p>
    <p><small>Project</small>${esc(q.project) || '—'}<br>${typeName()}</p></div>
  <table><thead><tr><th>#</th><th>Item</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead><tbody>
  ${act().map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.n)}</td><td>${r.q}</td><td>${peso(r.p)}</td><td>${peso(r.q * r.p)}</td></tr>`).join('')}
  </tbody><tfoot><tr><td colspan="4">Subtotal</td><td>${peso(s)}</td></tr>
  ${d ? `<tr><td colspan="4">Discount</td><td>−${peso(d)}</td></tr>` : ''}
  <tr class="tt"><td colspan="4">Total</td><td>${peso(t)}</td></tr></tfoot></table>
  ${q.notes ? `<p class="nt">${esc(q.notes).replace(/\n/g, '<br>')}</p>` : ''}`;
}

document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.k) q.rows[+t.dataset.i][t.dataset.k] = +t.value || 0;
  else if (t.closest('#form') && t.id in q) q[t.id] = t.value;
  draw();
});
document.querySelector('.seg').onclick = e => {
  if (e.target.dataset.m) { q.mode = e.target.dataset.m; buildForm(); }
};
$('#new').onclick = () => { q = mk(); buildForm(); say('New quotation'); };

/* ---------- saved quotations (stored in this browser) ---------- */
const all = () => read(KEY) || [];
function persist(a) {
  try { localStorage.setItem(KEY, JSON.stringify(a)); return true; }
  catch { say('This browser blocked saving. Use Download instead.'); return false; }
}
$('#save').onclick = () => {
  const a = all(), fresh = !q.id;
  if (fresh) q.id = Date.now().toString(36);
  const i = a.findIndex(x => x.id === q.id);
  i < 0 ? a.unshift(structuredClone(q)) : a[i] = structuredClone(q);
  if (persist(a)) {
    if (fresh) try { localStorage.setItem(SEQ, seq()); } catch {}
    listSaved(); say('Saved ' + q.no);
  }
};
function listSaved() {
  const a = all();
  $('#saved').innerHTML = a.length ? a.map(x => `<li>
    <button class="lk" data-o="${x.id}"><span><b>${esc(x.no)}</b> ${esc(x.client)} (${typeName(x)})</span><span>${peso(sums(x).t)}</span></button>
    <button data-d="${x.id}" aria-label="Delete ${esc(x.no)}">Delete</button></li>`).join('')
    : '<li class="empty">Nothing saved yet. Save a quotation and it shows up here.</li>';
}
$('#saved').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  const a = all();
  if (b.dataset.o) { q = structuredClone(a.find(x => x.id === b.dataset.o)); buildForm(); scrollTo({ top: 0 }); }
  if (b.dataset.d && confirm('Delete this quotation?')) { persist(a.filter(x => x.id !== b.dataset.d)); listSaved(); }
};
$('#backup').onclick = () => save('FORM-MORE_all-quotations.json', 'application/json', JSON.stringify(all(), null, 2));
$('#import').onchange = async e => {
  try {
    const inc = JSON.parse(await e.target.files[0].text()), a = all();
    (Array.isArray(inc) ? inc : [inc]).forEach(x => { if (x.id && x.rows && !a.some(y => y.id === x.id)) a.push(x); });
    persist(a); listSaved(); say('Imported');
  } catch { say('That file is not a quotation backup.'); }
  e.target.value = '';
};

/* ---------- downloads ---------- */
const fname = ext => `FORM-MORE_${q.no}${q.client.trim() ? '_' + q.client.trim().replace(/[^\w]+/g, '-') : ''}.${ext}`;
function save(name, type, data) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type }));
  a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
const EX = 'body{margin:0;background:#26d1cf;color:#000;font:15px/1.5 Arial,sans-serif}.sheet{max-width:760px;margin:auto;padding:40px}.wm{font:700 22px "Arial Black",Arial;letter-spacing:.08em}.hd,.meta{display:flex;justify-content:space-between;gap:24px;margin-bottom:28px}.hd p{text-align:right}small{display:block;opacity:.7}table{width:100%;border-collapse:collapse}th,td{text-align:right;padding:8px 6px;border-bottom:1px solid #000}thead th:nth-child(-n+2),tbody td:nth-child(-n+2){text-align:left}.tt td{font-weight:700;font-size:1.2em}.nt{margin-top:24px}';
const doc = kind => `<!doctype html><html${kind === 'word' ? ' xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"' : ''}><head><meta charset="utf-8"><title>${esc(q.no)}</title><style>${EX}</style></head><body><div class="sheet">${sheetHTML(true)}</div></body></html>`;
const txt = () => {
  const { s, d, t } = sums();
  return [`FORM/MORE QUOTATION ${q.no}`, `Date: ${q.date}${q.valid ? '  Valid until: ' + q.valid : ''}`,
    `For: ${q.client} ${q.contact}`.trim(), `Project: ${q.project} (${typeName()})`, '',
    ...act().map((r, i) => `${i + 1}. ${r.n}: ${r.q} x ${peso(r.p)} = ${peso(r.q * r.p)}`), '',
    `Subtotal: ${peso(s)}`, ...(d ? [`Discount: -${peso(d)}`] : []), `TOTAL: ${peso(t)}`,
    ...(q.notes ? ['', q.notes] : [])].join('\n');
};
const cell = v => `"${String(v).replace(/"/g, '""')}"`;

async function png() {
  await document.fonts.ready;
  const { s, d, t } = sums(), R = act(), W = 1200, M = 80, nl = q.notes ? Math.ceil(q.notes.length / 55) + q.notes.split('\n').length : 0;
  const c = document.createElement('canvas'); c.width = W; c.height = 640 + R.length * 64 + nl * 30;
  const g = c.getContext('2d'); g.fillStyle = '#26d1cf'; g.fillRect(0, 0, W, c.height); g.fillStyle = '#000'; g.strokeStyle = '#000';
  const T = (x, y, str, f, a) => { g.font = f; g.textAlign = a || 'left'; g.fillText(str, x, y); };
  const B = '20px system-ui,Arial,sans-serif', BB = '600 20px system-ui,Arial,sans-serif';
  T(M, 120, 'FORM/MORE', '400 44px Michroma,"Arial Black",sans-serif');
  T(W - M, 90, 'Quotation ' + q.no, B, 'right'); T(W - M, 120, q.date, B, 'right');
  if (q.valid) T(W - M, 150, 'Valid until ' + q.valid, B, 'right');
  T(M, 250, 'For', '16px system-ui'); T(M, 280, q.client || '-', BB); T(M, 310, q.contact, B);
  T(W / 2, 250, 'Project', '16px system-ui'); T(W / 2, 280, q.project || '-', BB); T(W / 2, 310, typeName(), B);
  let y = 400; g.lineWidth = 2;
  [['#', M], ['Item', M + 50]].forEach(([h, x]) => T(x, y, h, BB));
  [['Qty', W - M - 420], ['Price', W - M - 210], ['Amount', W - M]].forEach(([h, x]) => T(x, y, h, BB, 'right'));
  y += 20; g.beginPath(); g.moveTo(M, y); g.lineTo(W - M, y); g.stroke();
  R.forEach((r, i) => {
    y += 52; T(M, y, String(i + 1), B); T(M + 50, y, r.n, B);
    T(W - M - 420, y, String(r.q), B, 'right'); T(W - M - 210, y, peso(r.p), B, 'right'); T(W - M, y, peso(r.q * r.p), B, 'right');
    g.lineWidth = 1; g.beginPath(); g.moveTo(M, y + 14); g.lineTo(W - M, y + 14); g.stroke();
  });
  y += 56; T(W - M - 210, y, 'Subtotal', B, 'right'); T(W - M, y, peso(s), B, 'right');
  if (d) { y += 36; T(W - M - 210, y, 'Discount', B, 'right'); T(W - M, y, '-' + peso(d), B, 'right'); }
  y += 56; T(W - M - 210, y, 'Total', '600 28px system-ui,Arial', 'right'); T(W - M, y, peso(t), '700 32px system-ui,Arial', 'right');
  y += 70;
  q.notes.split('\n').forEach(p => {
    let l = ''; g.font = B;
    p.split(' ').forEach(w => { if (g.measureText(l + w).width > W - 2 * M) { T(M, y, l, B); y += 30; l = ''; } l += w + ' '; });
    T(M, y, l, B); y += 30;
  });
  c.toBlob(b => save(fname('png'), 'image/png', b));
}

const FILES = {
  pdf: () => { say('Choose "Save as PDF" in the print window'); setTimeout(print, 400); },
  png,
  csv: () => {
    const { s, d, t } = sums();
    const L = [['Quotation', q.no], ['Date', q.date], ['Valid until', q.valid], ['Customer', q.client], ['Contact', q.contact],
      ['Project', q.project], ['Type', typeName()], [], ['No', 'Item', 'Qty', 'Price (PHP)', 'Amount (PHP)'],
      ...act().map((r, i) => [i + 1, r.n, r.q, r.p, r.q * r.p]), [], ['', '', '', 'Subtotal', s], ['', '', '', 'Discount', d], ['', '', '', 'Total', t]];
    save(fname('csv'), 'text/csv', '\ufeff' + L.map(r => r.map(cell).join(',')).join('\r\n'));
  },
  json: () => save(fname('json'), 'application/json', JSON.stringify(q, null, 2)),
  txt: () => save(fname('txt'), 'text/plain', txt()),
  html: () => save(fname('html'), 'text/html', doc('')),
  doc: () => save(fname('doc'), 'application/msword', doc('word')),
  xls: () => save(fname('xls'), 'application/vnd.ms-excel', doc('excel')),
  copy: () => navigator.clipboard.writeText(txt()).then(() => say('Copied. Paste it into Messenger.')).catch(() => say('Copy was blocked. Use Text instead.'))
};
$('#files').onclick = e => { const f = e.target.dataset.f; if (f) FILES[f](); };

let tm;
function say(m) { const el = $('#msg'); el.textContent = m; el.classList.add('show'); clearTimeout(tm); tm = setTimeout(() => el.classList.remove('show'), 2800); }

buildForm();
listSaved();
