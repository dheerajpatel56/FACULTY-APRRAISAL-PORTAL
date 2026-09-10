import puppeteer, { Browser } from 'puppeteer';
import { VNRVJIET_LOGO_DATA_URI } from './logoAsset';
import {
  lectureRowScore, projectRowScore, eContentRowScore, ictRowScore,
  publicationRowScore, INDEX_LABEL, countAuthors, citationScore, bookRowScore, patentRowScore,
  sponsoredProjectRowScore,
} from './scoringEngine';

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
    <div class="institute" style="text-align:center">
      <img src="${VNRVJIET_LOGO_DATA_URI}" alt="VNRVJIET — Vallurupalli Nageswara Rao Vignana Jyothi Institute of Engineering &amp; Technology" style="height:58px;width:auto;margin-bottom:4px" />
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

// The official form asks for DD-MM-YYYY. Dates are stored as UTC midnight, so
// read the UTC parts — local time could roll the day back.
function fmtDate(d: any): string {
  if (!d) return '—';
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(t.getUTCDate())}-${pad(t.getUTCMonth() + 1)}-${t.getUTCFullYear()}`;
}

const FRONTEND = process.env.FRONTEND_URL?.split(',')[0]?.trim() ?? '';
// A proof is either a file uploaded to the portal (a path) or a pasted link
// (Google Drive etc.). Only paths get the portal prefix — prefixing a full URL
// produced "http://portalhttps://drive..." for every pasted link.
function proofCell(file: any): string {
  if (!file) return '—';
  const f = String(file).trim();
  if (/^https?:\/\//i.test(f)) return `<a href="${esc(f)}">Link</a>`;
  const name = f.split('/').pop() ?? 'file';
  return `<a href="${esc(`${FRONTEND}${f}`)}">Attached (${esc(name)})</a>`;
}

// 5.3 roles are stored as keys; print the form's wording, not the key.
const DIFFERENTIATOR_ROLE_LABEL: Record<string, string> = {
  participating: 'Participating',
  leading: 'Leading',
  initiating: 'Initiating, shaping & executing',
};

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

  // Only render the reviewer's assessment when it was actually handed to us.
  // The faculty's copy has those fields removed (utils/reviewVisibility), and
  // treating absent marks as zeroes would print a Cat 6 block of 0.0s and a
  // "/ 550" line to the very person they are withheld from.
  const CAT6_KEYS = ['cat6Punctuality', 'cat6Professionalism', 'cat6Willingness', 'cat6Cordiality', 'cat6Classroom'];
  const hasCat6 = review != null && CAT6_KEYS.some((k) => review[k] != null);
  const cat6 = hasCat6
    ? CAT6_KEYS.reduce((sum, k) => sum + (review[k] ?? 0), 0)
    : null;

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
    ['Course', 'Level', 'Year/Sem', 'Novel Pedagogy Method', 'Novelty Score', 'Periods Planned', 'Conducted', 'Engagement %', 'Engagement Score', 'Total'],
    (sub.cat1Courses ?? []).map((c: any) => {
      // Same helper the engine scores with — never re-derive 1.1 here.
      const r = lectureRowScore(c);
      return [
        c.courseName, c.level, c.yearSem,
        r.novelty ? (c.novelPedagogyMethod || 'Yes') : '—', r.novelty,
        c.periodPlanned, c.periodsConducted,
        r.pct == null ? '—' : `${r.pct}%`, r.engagement, r.total,
      ];
    })
  )}
  ${listTable('1.2 Courses Taught — Attendance, Feedback, Results',
    ['Course', 'Class Size', 'Avg. Attendance %', 'Feedback', 'Pass %'],
    (sub.cat1CourseResults ?? []).map((c: any) => [c.courseName, c.classSize, c.avgAttendancePct, c.feedbackReceived, c.passPercentage])
  )}
  ${listTable('1.3 Academic Projects Guided',
    ['Course', 'Type of Project', 'Number of Projects Guided', 'Score'],
    (sub.cat1Projects ?? []).map((p: any) => {
      // Same helper the engine scores with — never re-derive 1.3 here.
      const r = projectRowScore(p);
      const units = r.unit === 'student' ? (r.count === 1 ? 'student' : 'students') : (r.count === 1 ? 'batch' : 'batches');
      return [p.course === 'MTECH' ? 'M.Tech' : 'B.Tech', p.projectType === 'MAJOR' ? 'Major Project' : 'Mini Project', `${r.count} ${units}`, r.score];
    })
  )}
  ${listTable('1.4 e-Content Development / Other Instructional Material',
    ['Course Name (B.Tech/M.Tech)', 'Name of the Content', 'Nature of the Content', 'Evidence', 'Score'],
    (sub.cat1EContent ?? []).map((e: any) => {
      // Same helper the engine scores with — never re-derive 1.4 here.
      const r = eContentRowScore(e);
      return [e.courseName, e.contentName, e.nature, r.evidence ? proofCell(e.evidenceFile) : 'No evidence link', r.score];
    })
  )}
  ${listTable('1.5 Use of ICT &amp; Digital Platforms',
    ['Course Name (B.Tech/M.Tech)', 'Platform / Tool Used', 'Nature of Use', 'Evidence', 'Score'],
    (sub.cat1ICT ?? []).map((i: any) => {
      // Same helper the engine scores with — never re-derive 1.5 here.
      const r = ictRowScore(i);
      return [i.courseName, i.platform, i.natureOfUse, r.evidence ? proofCell(i.evidenceFile) : 'No evidence link', r.score];
    })
  )}

  <h2>Cat 2 — Research &amp; Consultancy</h2>
  ${(() => {
    // 2.1 — one table per part, with the PDF's columns. Same helper the engine
    // scores with — never re-derive 2.1 here. Part C was missing from this
    // export entirely until 2026-09-11.
    const head = ['Title of the Publication', 'Journal / Proceedings', 'No. & List of Authors', 'Author Position',
      'Vol. / Issue / Pages', 'Date (DD-MM-YYYY)', 'ISSN & DOI', 'Impact Factor', 'Indexed & Quartile', 'Score', 'Proof'];
    const cols = (p: any) => [
      `${countAuthors(p.authors) || '—'}: ${p.authors ?? ''}`, p.authorPosition,
      [p.volume, p.issueNo, p.pageNos].filter(Boolean).join(' / ') || '—',
      fmtDate(p.dateOfPub), [p.issn, p.doi].filter(Boolean).join(' / ') || '—',
      p.impactFactor || '—', [INDEX_LABEL[p.indexed] ?? p.indexed, p.quartile].filter(Boolean).join(', '),
    ];
    return [
      listTable('2.1-A Journal Publications', head, (sub.cat2Journals ?? []).map((p: any) => [
        p.title, p.journalName, ...cols(p), publicationRowScore('journal', p.indexed),
        [proofCell(p.proofFile), p.indexProofFile ? `Index: ${proofCell(p.indexProofFile)}` : ''].filter(Boolean).join('<br/>'),
      ])),
      listTable('2.1-B Conference Proceedings', head, (sub.cat2Conferences ?? []).map((p: any) => [
        p.title, p.conferenceName, ...cols(p), publicationRowScore('conference', p.indexed), proofCell(p.proofFile),
      ])),
      listTable('2.1-C Book Chapters (from Conferences)', head, (sub.cat2ConfBookChapters ?? []).map((p: any) => [
        p.title, p.conferenceName, ...cols(p), publicationRowScore('chapter', p.indexed), proofCell(p.proofFile),
      ])),
    ].join('');
  })()}
  ${listTable('2.2 Citations of Research Publications / Books (Scopus / WoS only)',
    ['No. of Publications / Books till date', 'No. with Citations', 'Total No. of Citations', 'h-Index (Scopus)', 'h-Index (WoS)', 'Score'],
    sub.cat2Citations ? [[
      sub.cat2Citations.totalPubsTillDate, sub.cat2Citations.pubsWithCitations, sub.cat2Citations.totalCitations,
      sub.cat2Citations.hIndexScopus, sub.cat2Citations.hIndexWos, citationScore(sub.cat2Citations.totalCitations),
    ]] : []
  )}
  ${(() => {
    // 2.3 — the PDF's columns. Same helper the engine scores with — never
    // re-derive 2.3 here.
    const row = (b: any, kind: 'Book' | 'Chapter') => {
      const r = bookRowScore(b);
      const level = b.scope === 'INTERNATIONAL' ? 'International' : b.scope === 'NATIONAL' ? 'National' : 'Not chosen';
      return [
        b.title, kind, level, b.authors, b.publisher || '—', kind === 'Chapter' ? (b.chapterNo || '—') : '—',
        b.isbn || '—', b.isEdited ? 'Edited' : 'Published', r.score, proofCell(b.proofFile),
      ];
    };
    return listTable('2.3 Books and Academic Book Chapters Published / Edited',
      ['Title of Book / Chapter / Article', 'Book / Chapter', 'National / International', 'Authors', 'Publisher Details',
        'Chapter Details', 'ISBN No.', 'Published / Edited', 'Score', 'Proof'],
      [
        ...(sub.cat2Books ?? []).map((b: any) => row(b, 'Book')),
        ...(sub.cat2BookChapters ?? []).map((b: any) => row(b, 'Chapter')),
      ]);
  })()}
  ${listTable('2.4 Patents / Transfer of Technology / Trade Marks / Copyrights / Other IPR',
    ['Title of the Patent / Design / etc.', 'Type', 'Country', 'Name of the Inventor', 'Application / Patent Number',
      'Status', 'Date of Publication', 'Date of Grant', 'Valid Duration', 'Score', 'Proof'],
    // Same helper the engine scores with — never re-derive 2.4 here.
    (sub.cat2Patents ?? []).map((p: any) => [
      p.title, p.iprType === 'Other' ? (p.iprTypeOther || 'Other') : (p.iprType || '—'), p.country, p.inventors,
      p.appNumber || '—', p.status ? p.status[0] + p.status.slice(1).toLowerCase() : '—',
      fmtDate(p.dateOfPub), fmtDate(p.dateOfGrant), p.validDuration || '—', patentRowScore(p).score, proofCell(p.proofFile),
    ])
  )}
  ${listTable('2.5 Sponsored Research Projects',
    ['Title of the Project', 'Funding Agency', 'Amount (Rs. Lakhs)', 'PI / Co-investigator', 'Status',
      'Duration & Period / Date of Application', 'Score', 'Proof'],
    // Same helper the engine scores with — never re-derive 2.5 here.
    (sub.cat2Projects ?? []).map((p: any) => [
      p.title, p.fundingAgency, p.amountLakhs ?? '—', p.role === 'Co-PI' ? 'Co-investigator' : 'Principal Investigator',
      p.status ? p.status[0] + p.status.slice(1).toLowerCase() : '—',
      p.status === 'APPLIED' ? fmtDate(p.dateOfApplication) : (p.durationPeriod || '—'),
      sponsoredProjectRowScore(p).score, proofCell(p.proofFile),
    ])
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
    (sub.cat5Differentiators ?? []).map((d: any) => [d.name, DIFFERENTIATOR_ROLE_LABEL[d.role] ?? d.role])
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

// ─── Annual feedback PDF (W6.5) ──────────────────────────────────────

// The narrative is free text written by a HoD; it must not be able to close a
// tag and take over the document.
function esc(v: any): string {
  if (v == null) return '';
  return String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const narrativeBlock = (label: string, text: any): string => `
  <h3>${label}</h3>
  <div style="white-space:pre-wrap;border-left:3px solid #e9a93a;padding:4px 10px;background:#fdf6e4;min-height:18px">${
    esc(text) || '<span style="color:#94a3b8">—</span>'
  }</div>
`;

/**
 * `snapshot` is the cadre / eligibility / self-score standing. Pass it only for
 * a HoD or admin: faculty see their narrative and nothing of the eligibility
 * machinery, exactly as GET /appraisals/:id/feedback strips it for the owner.
 */
export function renderFeedbackHtml(
  feedback: any,
  snapshot: any | null,
  meta: { user: any; yearLabel: string },
): string {
  const u = meta.user ?? {};
  const s = snapshot;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>${BASE_STYLES}</style></head>
<body>
  ${instituteHeader()}
  <h1>Annual Faculty Feedback</h1>
  <div style="text-align:center;font-size:10pt;color:#64748b;margin-bottom:14px">
    Academic Year ${esc(meta.yearLabel)} · ${statusBadge(feedback.status)}
  </div>

  <h2>Faculty</h2>
  <div class="meta">
    <div><b>Name:</b> ${esc(u.name) || '—'}</div>
    <div><b>Employee Code:</b> ${esc(u.employeeCode) || '—'}</div>
    <div><b>Designation:</b> ${esc(u.designation) || '—'}</div>
    <div><b>Department:</b> ${esc(u.department?.name) || '—'}</div>
  </div>

  ${s ? `
    <h2>Standing</h2>
    <div class="meta">
      <div><b>Cadre:</b> ${esc(s.cadreLabel) || '—'}</div>
      <div><b>Meets ideal targets:</b> ${s.eligible ? 'Yes' : 'No'}</div>
    </div>
    ${s.scores ? `
      <div class="score-grid">
        ${([['cat1', 'Cat 1'], ['cat2', 'Cat 2'], ['cat3', 'Cat 3'], ['cat4', 'Cat 4'], ['cat5', 'Cat 5']] as const)
          .map(([k, lbl]) => `
            <div class="score-cell">
              <div class="num">${(s.scores[k] ?? 0).toFixed(1)}</div>
              <div class="lbl">${lbl}</div>
            </div>`).join('')}
      </div>
      <div class="grand">Self-appraisal total: ${(s.scores.total ?? 0).toFixed(1)} <small>/ 500</small></div>
    ` : ''}
    ${s.requirements?.length ? `
      <h3>Ideal targets</h3>
      <table>
        <thead><tr><th>Criterion</th><th>Target</th><th>Actual</th><th>Met</th></tr></thead>
        <tbody>
          ${s.requirements.map((r: any) => `
            <tr>
              <td>${esc(r.label)}${r.gating ? ' <b>*</b>' : ''}</td>
              <td>${esc(r.target)}</td>
              <td>${esc(r.actual)}</td>
              <td>${r.met ? 'Yes' : 'No'}</td>
            </tr>`).join('')}
        </tbody>
      </table>
      <div style="font-size:8pt;color:#64748b">* mandatory criterion</div>
    ` : ''}
  ` : ''}

  <h2>Feedback</h2>
  ${narrativeBlock('Strengths', feedback.strengths)}
  ${narrativeBlock('Areas to improve', feedback.improvements)}
  ${narrativeBlock('Growth targets (next cycle)', feedback.growthTargets)}

  <div class="sig-grid">
    <div class="sig-box">
      ${feedback.issuedAt ? `Issued ${fmtDate(feedback.issuedAt)}<br />${esc(feedback.issuedBy?.name)}` : 'Not yet issued'}
      <br /><b>Head of Department</b>
    </div>
    <div class="sig-box"><br /><b>Signature of Faculty</b><br />${esc(u.name)}</div>
  </div>

  <div class="footer">
    Generated by VNRVJIET Faculty Appraisal Portal · ${new Date().toLocaleString()}
  </div>
</body></html>`;
}
