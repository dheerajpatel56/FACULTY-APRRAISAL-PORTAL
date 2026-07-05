// Full workflow with a real new user + real SMTP send. No HoD sign (auto-eval).
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const admin = await login('ADMIN001', 'admin123');
  const hod = await login('HOD001', 'hod123');

  // CSE dept (so HOD001 can review the appraisal)
  const depts = await call('GET', '/admin/departments', admin);
  const cse = depts.find((d) => /cse|computer/i.test(d.name)) ?? depts[0];
  console.log(`dept: ${cse.name} (${cse.id})`);

  // Create new faculty user with the target email
  const CODE = 'MAILTEST';
  let newUser;
  try {
    newUser = await call('POST', '/admin/users', admin, {
      employeeCode: CODE, name: 'Mail Test Faculty',
      email: 'dheerajpatel5517@gmail.com', password: 'test123',
      departmentId: cse.id, designation: 'Assistant Professor',
    });
    console.log(`created user ${CODE} → ${newUser.email}`);
  } catch (e) {
    console.log(`create skipped (${e.message.slice(0,60)}…) — reusing existing ${CODE}`);
  }

  const fac = await login(CODE, 'test123');
  const year = (await call('GET', '/academic-years', fac)).find((y) => y.submissionOpen);
  console.log(`year: ${year.label}`);

  // STAGE 1 — appraisal: meet all targets (2 journals, 1 conf, 2 memberships)
  const ap = await call('POST', '/appraisals', fac, { academicYearId: year.id });
  await call('PUT', `/appraisals/${ap.id}`, fac, { categories: {
    cat2Journals: [
      { title: 'Paper A', journalName: 'IEEE', authors: 'Me', authorPosition: '1' },
      { title: 'Paper B', journalName: 'ACM', authors: 'Me', authorPosition: '1' },
    ],
    cat2Conferences: [{ title: 'Conf A', conferenceName: 'NeurIPS', authors: 'Me', authorPosition: '1' }],
    cat5Memberships: [{ association: 'IEEE', status: 'Member' }, { association: 'ACM', status: 'Member' }],
  }});
  await call('POST', `/appraisals/${ap.id}/submit`, fac, {});
  console.log(`[1] appraisal submitted`);

  // STAGE 2 — HoD approves appraisal
  await call('POST', `/appraisals/${ap.id}/review`, hod, {
    cat6Punctuality: 9, cat6Professionalism: 9, cat6Willingness: 9, cat6Cordiality: 9, cat6Classroom: 9,
    overallComment: 'Approved.', status: 'APPROVED',
  });
  console.log(`[2] appraisal APPROVED by HoD`);

  // STAGE 3 — FPGP: set targets, faculty signs → ACTIVE (no HoD sign)
  const plan = await call('POST', '/fpgp', fac, { academicYearId: year.id });
  await call('PUT', `/fpgp/${plan.id}/subsections`, fac, [
    { subsection: '2.1', rows: [{ targetCount: 2, particulars: 'Journals' }] },
    { subsection: '2.2', rows: [{ targetCount: 1, particulars: 'Conf' }] },
    { subsection: '3.2', rows: [{ name: 'IEEE', targetCount: 1 }, { name: 'ACM', targetCount: 1 }] },
  ]);
  await call('POST', `/fpgp/${plan.id}/sign`, fac, {});
  let p = await call('GET', `/fpgp/${plan.id}`, fac);
  console.log(`[3] FPGP signed → ${p.status} (no HoD sign)`);

  // STAGE 4 — evaluate (auto-approve when all met)
  const ev = await call('POST', '/fpgp/evaluate', admin, { academicYearId: year.id });
  p = await call('GET', `/fpgp/${plan.id}`, fac);
  console.log(`[4] evaluated → status=${p.status} autoAccepted=${p.autoAccepted}`);
  for (const it of (p.achievement ?? []))
    console.log(`     ${it.subsection} ${it.label}: ${it.achieved}/${it.target} ${it.met ? '✅' : '❌'}`);

  // Wait for emailWorker (polls 30s) to actually send
  console.log(`\nwaiting for emailWorker to send (polls every 30s)…`);
  for (let i = 0; i < 8; i++) {
    await sleep(8000);
    const rows = (await call('GET', '/admin/emails?limit=12', admin)).rows ?? [];
    const mine = rows.filter((e) => (e.toEmail || e.recipientEmail || '') === 'dheerajpatel5517@gmail.com');
    const line = mine.map((e) => `${e.template}=${e.status}`).join('  ');
    console.log(`  +${(i+1)*8}s: ${line || '(none yet)'}`);
    if (mine.length && mine.every((e) => ['SENT','FAILED'].includes(e.status))) break;
  }
})().catch((e) => { console.error('✗', e.message); process.exit(1); });
