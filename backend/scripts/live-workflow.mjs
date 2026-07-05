// Live end-to-end workflow driver — exercises all 4 stages via the running API.
// Run: node scripts/live-workflow.mjs   (backend must be live on :5000)
const BASE = 'http://localhost:5000/api';
const log = (...a) => console.log(...a);

async function call(method, path, token, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);
  return json;
}

async function login(code, pw) {
  const r = await call('POST', '/auth/login', null, { employeeCode: code, password: pw });
  return r.accessToken;
}

(async () => {
  // ---- setup: tokens ----
  const fac = await login('FAC15', 'faculty123');
  const hod = await login('HOD001', 'hod123');
  const admin = await login('ADMIN001', 'admin123');
  log('✓ logged in: FAC15 (faculty CSE), HOD001 (HoD CSE), ADMIN001');

  // pick an open academic year
  const years = await call('GET', '/academic-years', fac);
  const year = years.find((y) => y.submissionOpen) ?? years[0];
  if (!year) throw new Error('no academic year seeded');
  log(`✓ academic year: ${year.label} (submissionOpen=${year.submissionOpen})`);

  // ============ STAGE 1: faculty creates + fills + submits appraisal ============
  const created = await call('POST', '/appraisals', fac, { academicYearId: year.id });
  const apId = created.id;
  log(`\n[STAGE 1] appraisal created id=${apId} status=${created.status}`);

  // Fill data: 2 journals + 1 conference + 2 memberships (feeds FPGP targets 2.1/2.2/3.2)
  await call('PUT', `/appraisals/${apId}`, fac, {
    categories: {
      cat2Journals: [
        { title: 'Deep Learning for X', journalName: 'IEEE Trans', authors: 'FAC15, Co-A', authorPosition: '1' },
        { title: 'Edge Computing Survey', journalName: 'ACM Comp', authors: 'FAC15', authorPosition: '2' },
      ],
      cat2Conferences: [
        { title: 'Realtime ML', conferenceName: 'NeurIPS', authors: 'FAC15', authorPosition: '1' },
      ],
      cat5Memberships: [
        { association: 'IEEE', status: 'Senior Member' },
        { association: 'ACM', status: 'Member' },
      ],
    },
  });
  await call('POST', `/appraisals/${apId}/submit`, fac, {});
  const afterSubmit = await call('GET', `/appraisals/${apId}`, fac);
  log(`[STAGE 1] filled 2 journals + 1 conf + 2 memberships, submitted → status=${afterSubmit.status}`);

  // ============ STAGE 2: HoD reviews + approves ============
  const pending = await call('GET', '/reviews/pending', hod);
  const inQueue = pending.some((p) => p.id === apId);
  log(`\n[STAGE 2] HoD pending queue has our appraisal: ${inQueue} (queue size ${pending.length})`);
  await call('POST', `/appraisals/${apId}/review`, hod, {
    cat6Punctuality: 9, cat6Professionalism: 9, cat6Willingness: 8,
    cat6Cordiality: 9, cat6Classroom: 8,
    overallComment: 'Strong research output. Approved.',
    status: 'APPROVED',
  });
  const afterReview = await call('GET', `/appraisals/${apId}`, fac);
  log(`[STAGE 2] HoD approved → status=${afterReview.status}`);

  // ============ STAGE 3: faculty creates FPGP, sets targets, signs; HoD signs ============
  const plan = await call('POST', '/fpgp', fac, { academicYearId: year.id });
  const planId = plan.id;
  log(`\n[STAGE 3] FPGP plan created id=${planId} status=${plan.status}`);

  // Set numeric targets: 2.1 journals=2, 2.2 conf=1, 3.2 memberships=2 (need >=2 names to sign)
  await call('PUT', `/fpgp/${planId}/subsections`, fac, [
    { subsection: '2.1', rows: [{ targetCount: 2, particulars: 'Journal papers' }] },
    { subsection: '2.2', rows: [{ targetCount: 1, particulars: 'Conference papers' }] },
    { subsection: '3.2', rows: [
      { name: 'IEEE', targetCount: 1 },
      { name: 'ACM', targetCount: 1 },
    ] },
  ]);
  await call('POST', `/fpgp/${planId}/sign`, fac, {});
  let p = await call('GET', `/fpgp/${planId}`, fac);
  log(`[STAGE 3] targets set (2.1=2 journals, 2.2=1 conf, 3.2=2 memberships), faculty signed → status=${p.status}`);
  await call('POST', `/fpgp/${planId}/hod-sign`, hod, {});
  p = await call('GET', `/fpgp/${planId}`, fac);
  log(`[STAGE 3] HoD signed → status=${p.status}`);

  // ============ STAGE 4: evaluate targets vs appraisal actuals, notify ============
  const evalRes = await call('POST', '/fpgp/evaluate', admin, { academicYearId: year.id });
  log(`\n[STAGE 4] admin triggered evaluation → ${JSON.stringify(evalRes)}`);
  p = await call('GET', `/fpgp/${planId}`, fac);
  log(`[STAGE 4] plan status=${p.status} autoAccepted=${p.autoAccepted}`);
  log('[STAGE 4] achievement breakdown (target vs achieved):');
  for (const it of (p.achievement ?? [])) {
    log(`   ${it.subsection} ${it.label}: target=${it.target} achieved=${it.achieved} met=${it.met ? '✅' : '❌'}`);
  }

  // confirm notification email enqueued
  const emails = await call('GET', '/admin/emails?limit=5', admin);
  const rows = emails.rows ?? emails;
  const evalMail = rows.find((e) => e.template === 'fpgp_evaluated');
  log(`\n[NOTIFY] fpgp_evaluated email enqueued: ${evalMail ? `yes (status=${evalMail.status}, to=${evalMail.toEmail ?? evalMail.recipient ?? '?'})` : 'NOT FOUND'}`);

  log('\n=== WORKFLOW COMPLETE ===');
})().catch((e) => { console.error('\n✗ FAILED:', e.message); process.exit(1); });
