// Broad smoke test — auto-ACCEPT FPGP path + every major action/read endpoint.
// Run: node scripts/smoke-all.mjs   (backend live on :5000)
const BASE = 'http://localhost:5000/api';
let pass = 0, fail = 0;
const results = [];

async function call(method, path, token, body, raw = false) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (raw) return res;
  const t = await res.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  if (!res.ok) throw new Error(`${res.status}: ${String(t).slice(0, 200)}`);
  return j;
}
const login = async (c, p) => (await call('POST', '/auth/login', null, { employeeCode: c, password: p })).accessToken;

async function check(name, fn) {
  try { await fn(); pass++; results.push(`✅ ${name}`); }
  catch (e) { fail++; results.push(`❌ ${name} — ${e.message}`); }
}

(async () => {
  const admin = await login('ADMIN001', 'admin123');
  const fac = await login('FAC13', 'faculty123');
  const hod = await login('HOD001', 'hod123');
  const year = (await call('GET', '/academic-years', fac)).find((y) => y.submissionOpen);

  // ---- AUTH ----
  await check('login bad creds → 401', async () => {
    const r = await call('POST', '/auth/login', null, { employeeCode: 'ADMIN001', password: 'x' }, true);
    if (r.status !== 401) throw new Error(`got ${r.status}`);
  });
  await check('protected route no token → 401', async () => {
    const r = await call('GET', '/admin/users', null, null, true);
    if (r.status !== 401) throw new Error(`got ${r.status}`);
  });
  await check('faculty → admin route → 403', async () => {
    const r = await call('GET', '/admin/users', fac, null, true);
    if (r.status !== 403) throw new Error(`got ${r.status}`);
  });
  await check('forgot-password no enumeration', async () => {
    const a = await call('POST', '/auth/forgot-password', null, { employeeCode: 'ADMIN001' });
    const b = await call('POST', '/auth/forgot-password', null, { employeeCode: 'NOPE999' });
    if (a.message !== b.message) throw new Error('messages differ');
  });

  // ---- ADMIN READS ----
  await check('admin list users (paginated)', async () => {
    const r = await call('GET', '/admin/users?limit=5&offset=0', admin);
    if (!Array.isArray(r.rows) || typeof r.total !== 'number') throw new Error('bad shape');
  });
  await check('admin list departments', async () => {
    const r = await call('GET', '/admin/departments', admin);
    if (!Array.isArray(r)) throw new Error('not array');
  });
  await check('admin list appraisals (paginated)', async () => {
    const r = await call('GET', '/appraisals?limit=5', admin);
    if (!Array.isArray(r.rows)) throw new Error('bad shape');
  });
  await check('admin reports (institute)', async () => {
    await call('GET', '/reports/institute', admin);
  });
  await check('admin emails list (paginated)', async () => {
    const r = await call('GET', '/admin/emails?paginated=true&limit=5', admin);
    if (!Array.isArray(r.rows)) throw new Error('bad shape');
  });
  await check('admin audit log (filter+paginate)', async () => {
    const r = await call('GET', '/admin/audit?limit=10', admin);
    if (!Array.isArray(r.rows ?? r)) throw new Error('bad shape');
  });
  await check('admin audit actions list', async () => {
    await call('GET', '/admin/audit/actions', admin);
  });
  await check('csv import template', async () => {
    const r = await call('GET', '/admin/users/bulk-import/template', admin, null, true);
    if (!r.ok) throw new Error(`got ${r.status}`);
  });

  // ---- AUTO-ACCEPT FPGP PATH ----
  let planId, apId;
  await check('appraisal create+fill+submit+approve (meets all targets)', async () => {
    const ap = await call('POST', '/appraisals', fac, { academicYearId: year.id });
    apId = ap.id;
    await call('PUT', `/appraisals/${apId}`, fac, { categories: {
      cat2Journals: [
        { title: 'J1', journalName: 'IEEE', authors: 'X', authorPosition: '1', indexed: 'WOS' },
        { title: 'J2', journalName: 'ACM', authors: 'X', authorPosition: '1', indexed: 'SCOPUS' },
      ],
      cat2Conferences: [{ title: 'C1', conferenceName: 'NeurIPS', authors: 'X', authorPosition: '1', indexed: 'SCOPUS' }],
      cat5Memberships: [{ association: 'IEEE', status: 'M' }, { association: 'ACM', status: 'M' }],
    }});
    await call('POST', `/appraisals/${apId}/submit`, fac, {});
    await call('POST', `/appraisals/${apId}/review`, hod, {
      cat6Punctuality: 9, cat6Professionalism: 9, cat6Willingness: 9, cat6Cordiality: 9, cat6Classroom: 9, status: 'APPROVED',
    });
  });
  await check('appraisal PDF export', async () => {
    const r = await call('GET', `/appraisals/${apId}/pdf`, fac, null, true);
    if (!r.ok) throw new Error(`got ${r.status}`);
    if (!(r.headers.get('content-type') || '').includes('pdf')) throw new Error('not pdf');
  });
  await check('faculty cannot see reviewer scores', async () => {
    const rev = await call('GET', `/appraisals/${apId}/review`, fac);
    if (rev.cat1Score != null || rev.grandTotal != null) throw new Error('scores leaked');
  });
  await check('FPGP create+targets+sign', async () => {
    const p = await call('POST', '/fpgp', fac, { academicYearId: year.id });
    planId = p.id;
    await call('PUT', `/fpgp/${planId}/subsections`, fac, [
      { subsection: '2.1', rows: [{ targetCount: 2, particulars: 'Journals' }] },
      { subsection: '2.2', rows: [{ targetCount: 1, particulars: 'Conf' }] },
      { subsection: '3.2', rows: [{ name: 'IEEE', targetCount: 1 }, { name: 'ACM', targetCount: 1 }] },
    ]);
    await call('POST', `/fpgp/${planId}/sign`, fac, {});
  });
  await check('FPGP evaluate → AUTO-ACCEPTED (all met)', async () => {
    await call('POST', '/fpgp/evaluate', admin, { academicYearId: year.id });
    const p = await call('GET', `/fpgp/${planId}`, fac);
    if (p.status !== 'ACCEPTED' || p.autoAccepted !== true)
      throw new Error(`status=${p.status} autoAccepted=${p.autoAccepted}`);
  });
  await check('FPGP PDF export', async () => {
    const r = await call('GET', `/fpgp/${planId}/pdf`, fac, null, true);
    if (!r.ok) throw new Error(`got ${r.status}`);
  });

  // ---- OBSERVABILITY ----
  await check('/metrics has http histogram', async () => {
    const r = await fetch('http://localhost:5000/metrics');
    const t = await r.text();
    if (!t.includes('http_request_duration_seconds')) throw new Error('no histogram');
  });

  console.log('\n' + results.join('\n'));
  console.log(`\n=== ${pass} passed, ${fail} failed ===`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('\nFATAL:', e.message); process.exit(1); });
