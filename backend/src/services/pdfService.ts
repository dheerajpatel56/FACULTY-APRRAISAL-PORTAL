import puppeteer, { Browser } from 'puppeteer';

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      // In Docker we install system Chromium and point here; locally this is
      // unset and puppeteer uses its bundled browser.
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  }
  return browserPromise;
}

export async function renderHtmlToPdf(html: string, opts?: { landscape?: boolean }): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'load' });
    const pdf = await page.pdf({
      format: 'A4',
      landscape: opts?.landscape ?? false,
      printBackground: true,
      margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' },
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}

const BASE_STYLES = `
  * { box-sizing: border-box; }
  body { font-family: 'Times New Roman', Georgia, serif; color: #0f172a; font-size: 11pt; line-height: 1.5; margin: 0; }
  h1 { font-size: 18pt; color: #1e3a5f; margin: 0 0 4px; text-align: center; }
  h2 { font-size: 14pt; color: #1e3a5f; margin: 16px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #e9a93a; }
  h3 { font-size: 12pt; color: #1e3a5f; margin: 12px 0 6px; }
  .institute { text-align: center; margin-bottom: 6px; }
  .institute .name { font-size: 14pt; font-weight: bold; color: #1e3a5f; }
  .institute .sub { font-size: 9pt; color: #64748b; }
  .accred { text-align: center; font-size: 9pt; color: #64748b; margin-bottom: 14px; }
  .accred span { background: #fdf6e4; color: #8a5f04; border: 1px solid #f5d680; padding: 1px 6px; border-radius: 3px; margin: 0 3px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0 12px; font-size: 10pt; }
  th, td { border: 1px solid #cbd5e1; padding: 5px 7px; text-align: left; vertical-align: top; }
  th { background: #1e3a5f; color: #fff; font-weight: 600; font-size: 9.5pt; }
  tr:nth-child(even) td { background: #f8fafc; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; font-size: 10pt; margin-bottom: 12px; }
  .meta b { color: #334155; }
  .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px; }
  .sig-box { border-top: 1px solid #0f172a; padding-top: 4px; text-align: center; font-size: 9pt; color: #334155; min-height: 60px; }
  .footer { font-size: 8pt; color: #94a3b8; text-align: center; margin-top: 24px; border-top: 1px solid #cbd5e1; padding-top: 6px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 9pt; font-weight: 600; }
  .badge-approved { background: #d1fae5; color: #065f46; }
  .badge-rejected { background: #fee2e2; color: #991b1b; }
  .badge-pending  { background: #fef3c7; color: #92400e; }
  .badge-default  { background: #e2e8f0; color: #475569; }
  .score-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin: 8px 0; }
  .score-cell { border: 1px solid #cbd5e1; padding: 6px; text-align: center; border-radius: 3px; background: #f8fafc; }
  .score-cell .num { font-size: 14pt; font-weight: bold; color: #1e3a5f; }
  .score-cell .lbl { font-size: 8pt; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
  .score-cell .max { font-size: 8pt; color: #94a3b8; }
  .grand { text-align: center; font-size: 14pt; color: #1e3a5f; font-weight: bold; margin: 8px 0; }
  .grand small { color: #94a3b8; font-weight: normal; }
  @page { size: A4; margin: 15mm; }
`;

function instituteHeader(): string {
  return `
    <div class="institute">
      <div class="name">VALLURUPALLI NAGESWARA RAO VIGNANA JYOTHI</div>
      <div class="sub">INSTITUTE OF ENGINEERING &amp; TECHNOLOGY</div>
    </div>
    <div class="accred">
      <span>NAAC A++</span><span>NBA Accredited</span><span>Autonomous Institution</span>
    </div>
  `;
}

function statusBadge(status: string): string {
  const map: Record<string, string> = {
    APPROVED: 'badge-approved', REJECTED: 'badge-rejected',
    DRAFT: 'badge-default', SUBMITTED: 'badge-pending', UNDER_REVIEW: 'badge-pending',
    ACTIVE: 'badge-approved', REVIEWED: 'badge-approved',
  };
  return `<span class="badge ${map[status] ?? 'badge-default'}">${status}</span>`;
}

function fmtDate(d: any): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString(); } catch { return '—'; }
}

const FRONTEND = process.env.FRONTEND_URL?.split(',')[0]?.trim() ?? '';
function proofCell(file: any): string {
  if (!file) return '—';
  const name = String(file).split('/').pop() ?? 'file';
  return `<a href="${FRONTEND}${file}">Attached (${name})</a>`;
}

function listTable(title: string, headers: string[], rows: any[][]): string {
  if (!rows.length) return '';
  return `
    <h3>${title}</h3>
    <table>
      <thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>
        ${rows.map((r) => `<tr>${r.map((c) => `<td>${c ?? '—'}</td>`).join('')}</tr>`).join('')}
      </tbody>
    </table>
  `;
}

// ─── Appraisal PDF ───────────────────────────────────────────────────

export function renderAppraisalHtml(sub: any, score: any, review: any | null): string {
  const yearLabel = sub.academicYear?.label ?? '—';
  const user = sub.user ?? {};

  const cat6 = review ? (review.cat6Punctuality ?? 0) + (review.cat6Professionalism ?? 0) +
    (review.cat6Willingness ?? 0) + (review.cat6Cordiality ?? 0) + (review.cat6Classroom ?? 0) : null;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>${BASE_STYLES}</style></head>
<body>
  ${instituteHeader()}
  <h1>Faculty Appraisal Report</h1>
  <div style="text-align:center;font-size:10pt;color:#64748b;margin-bottom:14px">
    Academic Year ${yearLabel} · Submission #${sub.submissionNumber} · ${statusBadge(sub.status)}
  </div>

  <h2>Faculty Profile</h2>
  <div class="meta">
    <div><b>Name:</b> ${user.name ?? '—'}</div>
    <div><b>Employee Code:</b> ${user.employeeCode ?? '—'}</div>
    <div><b>Designation:</b> ${user.designation ?? '—'}</div>
    <div><b>Department:</b> ${user.department?.name ?? '—'}</div>
    <div><b>Email:</b> ${user.email ?? '—'}</div>
    <div><b>Phone:</b> ${user.phone ?? '—'}</div>
    <div><b>Date of Joining:</b> ${fmtDate(user.dateOfJoining)}</div>
    <div><b>Submitted:</b> ${fmtDate(sub.submittedAt)}</div>
  </div>

  <h2>Self-Appraisal Scores</h2>
  <div class="score-grid">
    <div class="score-cell"><div class="num">${score.cat1.total.toFixed(1)}</div><div class="lbl">Teaching</div><div class="max">/ 150</div></div>
    <div class="score-cell"><div class="num">${score.cat2.total.toFixed(1)}</div><div class="lbl">Research</div><div class="max">/ 150</div></div>
    <div class="score-cell"><div class="num">${score.cat3.total.toFixed(1)}</div><div class="lbl">Development</div><div class="max">/ 100</div></div>
    <div class="score-cell"><div class="num">${score.cat4.total.toFixed(1)}</div><div class="lbl">Governance</div><div class="max">/ 50</div></div>
    <div class="score-cell"><div class="num">${score.cat5.total.toFixed(1)}</div><div class="lbl">Supplementary</div><div class="max">/ 50</div></div>
  </div>
  <div class="grand">Self Total: ${score.selfTotal.toFixed(1)} <small>/ 500</small></div>

  ${review && cat6 != null ? `
    <h2>Reviewer Assessment</h2>
    <div class="score-grid" style="grid-template-columns: repeat(5, 1fr)">
      <div class="score-cell"><div class="num">${review.cat6Punctuality?.toFixed(1) ?? '0.0'}</div><div class="lbl">Punctuality</div><div class="max">/ 10</div></div>
      <div class="score-cell"><div class="num">${review.cat6Professionalism?.toFixed(1) ?? '0.0'}</div><div class="lbl">Profession.</div><div class="max">/ 10</div></div>
      <div class="score-cell"><div class="num">${review.cat6Willingness?.toFixed(1) ?? '0.0'}</div><div class="lbl">Willingness</div><div class="max">/ 10</div></div>
      <div class="score-cell"><div class="num">${review.cat6Cordiality?.toFixed(1) ?? '0.0'}</div><div class="lbl">Cordiality</div><div class="max">/ 10</div></div>
      <div class="score-cell"><div class="num">${review.cat6Classroom?.toFixed(1) ?? '0.0'}</div><div class="lbl">Classroom</div><div class="max">/ 10</div></div>
    </div>
    <div class="grand">Cat 6 Total: ${cat6.toFixed(1)} <small>/ 50</small></div>
    <div class="grand" style="font-size:16pt;background:#1e3a5f;color:#fff;padding:10px;border-radius:4px">
      GRAND TOTAL: ${review.grandTotal?.toFixed(1) ?? '—'} <small style="color:#cbd5e1">/ 550</small>
    </div>
  ` : ''}

  ${review && (review.teachingComment || review.overallComment) ? `
    <h2>Reviewer Comments</h2>
    <table>
      ${[
        ['Teaching', review.teachingComment],
        ['Research', review.researchComment],
        ['Development', review.developmentComment],
        ['Governance', review.governanceComment],
        ['Supplementary', review.supplementaryComment],
        ['Overall', review.overallComment],
      ].filter(([, v]) => v).map(([k, v]) => `<tr><td style="width:140px;font-weight:600;color:#334155">${k}</td><td>${v}</td></tr>`).join('')}
    </table>
  ` : ''}

  <h2>Cat 1 — Teaching &amp; Learning</h2>
  ${listTable('1.1 Courses Handled',
    ['Course', 'Level', 'Year/Sem', 'Periods Planned', 'Conducted', 'Novel Pedagogy Method'],
    (sub.cat1Courses ?? []).map((c: any) => [c.courseName, c.level, c.yearSem, c.periodPlanned, c.periodsConducted, c.novelPedagogyUsed ? (c.novelPedagogyMethod || 'Yes') : 'No'])
  )}
  ${listTable('1.2 Courses Taught — Attendance, Feedback, Results',
    ['Course', 'Class Size', '≥75%', '<75 & ≥65%', 'Feedback', 'Grade O,A+', 'Grade A,B', 'Grade C,D'],
    (sub.cat1CourseResults ?? []).map((c: any) => [c.courseName, c.classSize, c.attnGte75, c.attnLt75Gte65, c.feedbackReceived, c.gradeOAPlus, c.gradeAB, c.gradeCD])
  )}
  ${listTable('1.3 Academic Projects Guided',
    ['Course', 'Type', 'Count'],
    (sub.cat1Projects ?? []).map((p: any) => [p.course, p.projectType, p.count])
  )}
  ${listTable('E-Content Developed',
    ['Course', 'Content', 'Nature'],
    (sub.cat1EContent ?? []).map((e: any) => [e.courseName, e.contentName, e.nature])
  )}
  ${listTable('ICT Usage',
    ['Course', 'Platform', 'Nature of Use'],
    (sub.cat1ICT ?? []).map((i: any) => [i.courseName, i.platform, i.natureOfUse])
  )}

  <h2>Cat 2 — Research &amp; Consultancy</h2>
  ${listTable('Journal Publications',
    ['Title', 'Journal', 'Index', 'Date', 'Authors', 'Proof'],
    (sub.cat2Journals ?? []).map((j: any) => [j.title, j.journalName, j.indexed, fmtDate(j.dateOfPub), j.authors, proofCell(j.proofFile)])
  )}
  ${listTable('Conference Publications',
    ['Title', 'Conference', 'Date', 'Index', 'Proof'],
    (sub.cat2Conferences ?? []).map((c: any) => [c.title, c.conferenceName, fmtDate(c.dateOfPub), c.indexed, proofCell(c.proofFile)])
  )}
  ${listTable('Citations',
    ['Publications', 'Pubs w/ Citations', 'Total Citations', 'h-Index (Google)', 'h-Index (Scopus)', 'h-Index (WoS)'],
    sub.cat2Citations ? [[
      sub.cat2Citations.totalPubsTillDate, sub.cat2Citations.pubsWithCitations, sub.cat2Citations.totalCitations,
      sub.cat2Citations.hIndexGoogle, sub.cat2Citations.hIndexScopus, sub.cat2Citations.hIndexWos,
    ]] : []
  )}
  ${listTable('Books & Chapters',
    ['Title', 'Authors', 'Publisher', 'Type'],
    [
      ...(sub.cat2Books ?? []).map((b: any) => [b.title, b.authors, b.publisher, b.isEdited ? 'Edited' : 'Published']),
      ...(sub.cat2BookChapters ?? []).map((b: any) => [b.title, b.authors, b.publisher, b.isEdited ? 'Edited' : 'Published']),
    ]
  )}
  ${listTable('Patents',
    ['Title', 'Status', 'Application No', 'Date', 'Proof'],
    (sub.cat2Patents ?? []).map((p: any) => [p.title, p.status, p.appNumber, fmtDate(p.dateOfPub), proofCell(p.proofFile)])
  )}
  ${listTable('Funded Projects',
    ['Title', 'Funding Agency', 'Amount (Lakhs)', 'Status', 'Proof'],
    (sub.cat2Projects ?? []).map((p: any) => [p.title, p.fundingAgency, p.amountLakhs, p.status, proofCell(p.proofFile)])
  )}
  ${listTable('Consultancy',
    ['Name', 'Agency', 'Amount (Lakhs)'],
    (sub.cat2Consultancy ?? []).map((c: any) => [c.name, c.agency, c.amountLakhs])
  )}
  ${listTable('Research Guidance (PhD/PG)',
    ['Scholar', 'University', 'Thesis', 'Guide/Co-Guide'],
    (sub.cat2Guidance ?? []).map((g: any) => [g.studentName, g.university, g.thesisTitle, g.isGuide ? 'Guide' : 'Co-Guide'])
  )}
  ${listTable('Research Interest Groups',
    ['Group', 'Size', 'Outcome'],
    (sub.cat2ResearchGroups ?? []).map((r: any) => [r.groupName, r.size, r.outcome])
  )}
  ${listTable('Institute / HEI Linkages',
    ['Institute', 'Contact Person', 'Outcome'],
    (sub.cat2Linkages ?? []).map((l: any) => [l.instituteName, l.contactPerson, l.outcome])
  )}
  ${listTable('Industry Linkage',
    ['Industry', 'Contact Person', 'Outcome'],
    (sub.cat2IndustryLinkages ?? []).map((l: any) => [l.industryName, l.contactPerson, l.outcome])
  )}

  <h2>Cat 3 — Developmental Activities</h2>
  ${listTable('3.2 Programs Organised',
    ['Title', 'Period', 'Sponsor', 'Status', 'Scope'],
    (sub.cat3Organised ?? []).map((e: any) => [e.title, e.period, e.sponsor, e.status, e.scope])
  )}
  ${listTable('3.3 Conferences / Seminars / Workshops Attended',
    ['Paper Title', 'Authors', 'Conference', 'Period'],
    (sub.cat3ConferencesAttended ?? []).map((c: any) => [c.paperTitle, c.authors, c.conferenceName, c.period])
  )}
  ${listTable('3.4 Resource Person',
    ['Type', 'Program', 'Topic', 'Duration', 'Venue', 'Organised By'],
    (sub.cat3ResourcePerson ?? []).map((r: any) => [r.programType, r.programName, r.topic, r.duration, r.venue, r.organisedBy])
  )}
  ${listTable('3.4 Editorial / Review Roles',
    ['Contribution', 'Organization / Journal', 'Scope', 'Date / Duration'],
    (sub.cat3Editorial ?? []).map((e: any) => [e.natureOfContrib, e.orgOrJournal, e.scope, e.dateDuration])
  )}
  ${listTable('3.5 Training Attended',
    ['Name', 'Period', 'Duration (days)', 'Proof'],
    (sub.cat3Training ?? []).map((t: any) => [t.name, t.period, t.durationDays, proofCell(t.proofFile)])
  )}

  <h2>Cat 4 — Governance</h2>
  ${listTable('Administrative Responsibilities',
    ['Responsibility', 'Institute/Dept', 'Work Involved', 'Period'],
    (sub.cat4AdminResp ?? []).map((a: any) => [a.responsibility, a.level, a.workInvolved, a.period])
  )}
  ${listTable('Student Activities',
    ['Activity', 'Period'],
    (sub.cat4StudentAct ?? []).map((s: any) => [s.activityName, s.period])
  )}

  <h2>Cat 5 — Supplementary</h2>
  ${listTable('Professional Memberships',
    ['Association', 'Status'],
    (sub.cat5Memberships ?? []).map((m: any) => [m.association, m.status])
  )}
  ${listTable('Awards',
    ['Award Type', 'Organization', 'Level', 'Proof'],
    (sub.cat5Awards ?? []).map((a: any) => [a.awardType, a.organization, a.level, proofCell(a.proofFile)])
  )}
  ${listTable('Differentiators',
    ['Name', 'Role'],
    (sub.cat5Differentiators ?? []).map((d: any) => [d.name, d.role])
  )}
  ${listTable('Internships Coordinated',
    ['Industry/Institute', 'Batch', 'Details', 'Period'],
    (sub.cat5Internships ?? []).map((i: any) => [i.industryOrInst, i.studentBatch, i.internshipDetails, i.period])
  )}

  <div class="sig-grid">
    <div class="sig-box">${sub.submittedAt ? `Signed ${fmtDate(sub.submittedAt)}` : ''}<br /><b>Signature of Faculty</b><br />${user.name ?? ''}</div>
    <div class="sig-box">${review?.reviewedAt ? `Reviewed ${fmtDate(review.reviewedAt)}` : ''}<br /><b>Signature of Reviewer/HoD</b></div>
  </div>

  <div class="footer">
    Generated by VNRVJIET Faculty Appraisal Portal · ${new Date().toLocaleString()}
  </div>
</body></html>`;
}

// ─── FPGP PDF ────────────────────────────────────────────────────────

function renderRows(rows: any[]): string {
  if (!Array.isArray(rows) || rows.length === 0) return '';
  // Get union of keys across rows
  const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r || {}))));
  return `
    <table>
      <thead><tr>${keys.map((k) => `<th>${k}</th>`).join('')}</tr></thead>
      <tbody>
        ${rows.map((r) => `<tr>${keys.map((k) => `<td>${r[k] ?? '—'}</td>`).join('')}</tr>`).join('')}
      </tbody>
    </table>
  `;
}

export function renderFpgpHtml(plan: any, template: any[]): string {
  const user = plan.user ?? {};
  const subBySub = new Map<string, any>();
  for (const s of plan.subsections ?? []) subBySub.set(s.subsection, s);

  const CATS = [
    { id: '1', title: 'Category 1 — Teaching & Learning' },
    { id: '2', title: 'Category 2 — Research & Consultancy' },
    { id: '3', title: 'Category 3 — Departmental / Institutional Development' },
    { id: '4', title: 'Category 4 — Others' },
  ];

  const renderSub = (def: any) => {
    const s = subBySub.get(def.sub) || {};
    const parts: string[] = [];
    if (s.sem1Text) parts.push(`<div><b>Semester 1:</b> ${s.sem1Text}</div>`);
    if (s.sem2Text) parts.push(`<div><b>Semester 2:</b> ${s.sem2Text}</div>`);
    if (s.extraText1) parts.push(`<div>${s.extraText1}</div>`);
    if (s.extraText2) parts.push(`<div>${s.extraText2}</div>`);
    if (s.extraText3) parts.push(`<div>${s.extraText3}</div>`);
    const rowsHtml = renderRows(s.rows ?? []);
    if (parts.length === 0 && !rowsHtml) return '';
    return `
      <h3>${def.sub} — ${def.label.split('—')[0].trim()}</h3>
      ${def.label.includes('—') ? `<div style="font-size:9pt;color:#64748b;margin-bottom:4px">${def.label.split('—').slice(1).join('—').trim()}</div>` : ''}
      ${parts.join('')}
      ${rowsHtml}
    `;
  };

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>${BASE_STYLES}</style></head>
<body>
  ${instituteHeader()}
  <h1>Faculty Performance Growth Plan</h1>
  <div style="text-align:center;font-size:10pt;color:#64748b;margin-bottom:14px">
    Academic Year ${plan.academicYear?.label ?? '—'} · ${statusBadge(plan.status)}
  </div>

  <h2>Faculty Profile</h2>
  <div class="meta">
    <div><b>Name:</b> ${user.name ?? '—'}</div>
    <div><b>Employee Code:</b> ${user.employeeCode ?? '—'}</div>
    <div><b>Designation:</b> ${plan.designationSnap ?? user.designation ?? '—'}</div>
    <div><b>Department:</b> ${plan.departmentSnap ?? user.department?.name ?? '—'}</div>
    <div><b>Date of Joining:</b> ${fmtDate(plan.dateOfJoiningSnap)}</div>
    <div><b>Total Experience:</b> ${plan.totalExperienceSnap != null ? `${plan.totalExperienceSnap} years` : '—'}</div>
  </div>

  ${CATS.map((cat) => {
    const subs = template.filter((t) => t.sub.startsWith(`${cat.id}.`));
    const inner = subs.map((def) => renderSub(def)).filter(Boolean).join('');
    if (!inner) return '';
    return `<h2>${cat.title}</h2>${inner}`;
  }).join('')}

  <div class="sig-grid">
    <div class="sig-box">${plan.facultySignedAt ? `Signed ${fmtDate(plan.facultySignedAt)}` : 'Not signed'}<br /><b>Signature of Faculty</b><br />${user.name ?? ''}</div>
    <div class="sig-box">${plan.hodSignedAt ? `Signed ${fmtDate(plan.hodSignedAt)}<br />${plan.hodSigner?.name ?? ''}` : 'Pending'}<br /><b>Signature of HoD</b></div>
  </div>

  ${plan.reviews?.length ? `
    <h2>HoD Feedback</h2>
    ${plan.reviews.map((r: any) => `
      <div style="border-left: 3px solid #e9a93a; padding: 4px 10px; margin-bottom: 8px; background: #fdf6e4;">
        <div>${r.comments}</div>
        <div style="font-size:8pt;color:#64748b;margin-top:4px">— ${r.reviewer?.name ?? 'Reviewer'} · ${fmtDate(r.reviewedAt)}</div>
      </div>
    `).join('')}
  ` : ''}

  <div class="footer">
    Generated by VNRVJIET Faculty Appraisal Portal · ${new Date().toLocaleString()}
  </div>
</body></html>`;
}
