// Isolate stage-4 eval logic: faculty-sign only (stay ACTIVE), then evaluate.
const BASE = 'http://localhost:5000/api';
async function call(method, path, token, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const t = await res.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${t.slice(0,300)}`);
  return j;
}
const login = async (c, p) => (await call('POST', '/auth/login', null, { employeeCode: c, password: p })).accessToken;

(async () => {
  const fac = await login('FAC14', 'faculty123');
  const hod = await login('HOD001', 'hod123');
  const admin = await login('ADMIN001', 'admin123');
  const year = (await call('GET', '/academic-years', fac)).find((y) => y.submissionOpen);

  const ap = await call('POST', '/appraisals', fac, { academicYearId: year.id });
  await call('PUT', `/appraisals/${ap.id}`, fac, { categories: {
    cat2Journals: [{ title: 'A', journalName: 'J', authors: 'X', authorPosition: '1' }], // only 1 journal — target is 2 → MISS
    cat2Conferences: [{ title: 'C', conferenceName: 'NeurIPS', authors: 'X', authorPosition: '1' }],
    cat5Memberships: [{ association: 'IEEE', status: 'M' }, { association: 'ACM', status: 'M' }],
  }});
  await call('POST', `/appraisals/${ap.id}/submit`, fac, {});
  await call('POST', `/appraisals/${ap.id}/review`, hod, {
    cat6Punctuality: 8, cat6Professionalism: 8, cat6Willingness: 8, cat6Cordiality: 8, cat6Classroom: 8,
    status: 'APPROVED',
  });

  const plan = await call('POST', '/fpgp', fac, { academicYearId: year.id });
  await call('PUT', `/fpgp/${plan.id}/subsections`, fac, [
    { subsection: '2.1', rows: [{ targetCount: 2, particulars: 'Journals' }] },  // target 2, achieved 1 → MISS
    { subsection: '2.2', rows: [{ targetCount: 1, particulars: 'Conf' }] },      // target 1, achieved 1 → MET
    { subsection: '3.2', rows: [{ name: 'IEEE', targetCount: 1 }, { name: 'ACM', targetCount: 1 }] }, // 2/2 MET
  ]);
  await call('POST', `/fpgp/${plan.id}/sign`, fac, {}); // → ACTIVE, NO hod-sign
  let p = await call('GET', `/fpgp/${plan.id}`, fac);
  console.log(`plan signed (no HoD) → status=${p.status}`);

  const ev = await call('POST', '/fpgp/evaluate', admin, { academicYearId: year.id });
  console.log(`evaluate → ${JSON.stringify(ev)}`);
  p = await call('GET', `/fpgp/${plan.id}`, fac);
  console.log(`after eval → status=${p.status} autoAccepted=${p.autoAccepted}`);
  for (const it of (p.achievement ?? []))
    console.log(`   ${it.subsection} ${it.label}: target=${it.target} achieved=${it.achieved} met=${it.met ? '✅' : '❌'}`);

  const rows = (await call('GET', '/admin/emails?limit=8', admin)).rows ?? [];
  const m = rows.find((e) => e.template === 'fpgp_evaluated');
  console.log(`fpgp_evaluated email: ${m ? `yes (status=${m.status})` : 'NOT FOUND'}`);
})().catch((e) => { console.error('✗', e.message); process.exit(1); });
