# V2 — Form UI Changes (batch 2)

Score-neutral intent, but several items add persisted fields (schema) and a few touch scoring.
Target file: `frontend/src/pages/faculty/AppraisalEditPage.tsx` (+ schema/controller/scoring for the flagged ones).
New branch off `main`: `feature/v2-form-ui`. Grand total stays 550.

## Owner decisions
- **13 (remove Edited in Books):** KEEP the checkbox — no change to 2.3. (Item dropped.)
- **29 (Life Membership in 5.1):** add option, scores **10** (same as international/executive). → scoring change.
- **31 (Executing in 5.3):** add as a **new tier** — value HELD (owner to confirm). → scoring change (blocked).
- **1 (Novel pedagogy):** dropdown — Flipped Classroom / Project-Based / Problem-Based / Case Study / Collaborative-Team-Based / Active Learning (Think-Pair-Share) / Gamification / Blended / Experiential-Hands-on / Peer Learning / Other→text.
- **3 (IPR type):** dropdown Patent / Copyright / Trademark / Design + Other→text.
- **4 (Patent country):** dropdown India / US only.
- **5 (3.4 options, item 27):** HELD.
- **6 (Impact-factor source):** add Source dropdown — Clarivate Analytics (JCR) / Scopus-SCImago (SJR/CiteScore) / Google Scholar / Other→text. → new field.
- **7 (Patent filing date):** add a SEPARATE Filing Date field (keep Date of Publication). → new field.
- **8/12 (Conference status):** add Accepted / Presented / Other dropdown, persisted, NO score. → new field.
- **9/20 (Outside collaboration):** HELD (section + shape TBD).
- **10/24 (Status of Ph.D.):** replace 7 checkboxes with ONE dropdown (None/Registered/Cleared Pre-PhD/Thesis Submitted/Awarded/Post-Doctoral/PG Degree/PG Diploma); frontend maps selection→the existing booleans so scoring is unchanged. No schema change.
- **11/26 (3rd criteria change):** dropped, leave Category 3 as-is.

## Classification

### A. Label/wording only (frontend)
4 Journal "Title"→"Title of the Publication" · 5 "Authors"→"Authors (as listed in order)" ·
9 "Conference Papers"→"Conference Proceedings" · 10 "Conference Name"→"Name of the Conference Proceedings" ·
11 "ISSN"→"ISSN/ISBN" (conference) · 21 Consultancy "Agency"→"Sponsoring Agency" ·
22 Guidance "Student Name"→"Research Scholar Name" · 23 Guide/Co-Guide→"Supervisor/Co-Supervisor" (label; still isGuide bool) ·
25 3.1 heading→"Status of Ph.D." · 30 5.2 "Award Type"→"Award Title" · 32 5.4→"Student Internships Arranged".

### B. Dropdown option changes (frontend; field already free string)
1 Novel pedagogy method → dropdown (OPTIONS?) · 7 Author position → 1st/Corresponding/Supervisor/Other (drop "Second"; apply to journals/conf/confBookCh/bookChapters) ·
16 Patent country → India/US dropdown (+Other?) · 27 3.4 nature → Reviewer/Editorial Board (exact set?).

### C. Control change / remove (frontend)
2 e-Content: replace file-upload with a LINK (URL) text field (reuse evidenceFile as URL) ·
3 ICT: remove the evidence upload · 19 2.5 projects: remove "Duration Period" field.

### D. New persisted field → SCHEMA + controller + reset/defaults (NOT frontend-only)
3 ICT: when platform/natureOfUse = "Other", show a description textbox → new `otherDescription` on Cat1ICT ·
6 Journal: split proof into "1st page proof" + "index proof" → 2nd file field on Cat2Journal ·
8 Journal: impact-factor SOURCE (Clarivate/SCImago/…) — relabel only OR new field? ·
12 Conference: Accepted/Presented/Other status → new field on Cat2Conference (dropdown, no score) ·
14 Books + Book Chapters: proof upload ("coverage"/cover page) → new proofFile on Cat2Book + Cat2BookChapter ·
15 Patents: "Type of IPR" (Patent/Copyright/…) → new field on Cat2Patent (OPTIONS?) ·
17 Patents: "Date of Filing/Publication" — relabel existing dateOfPub OR add a filing date? ·
18 Projects: "Date of Project Grant/Sanction" → new date field on Cat2Project ·
20 Outside collaboration (name + designation + affiliation) → new field(s); WHICH section? per-row? ·
28 3.6 Travel: funding source Self/Institute/Sponsor → new field on Cat3IntlTravel (dropdown).

### E. Touches scoring (update scoringEngine.ts + frontend scoring.ts + parity fixture)
29 add membership status `life_member` → 10 · 31 add differentiator role `executing` → value TBD ·
(24 3.1 checkbox→dropdown is score-safe if selection maps to the right flag; scoring takes highest.)

### F. Needs clarification before build
24/25 3.1: switch checkboxes → single dropdown "Status of Ph.D." with which options + mapping to the 7 flags? ·
26 "3rd criteria to be changed" — WHAT change to Category 3? (unclear) ·
20 outside collaboration — which section + shape.

## Execution
Agent-driven (subagent-driven-development), on `feature/v2-form-ui`. Frontend-only items batched; schema items grouped into one migration; scoring items (29/31) get scoringEngine+module+fixture updates with parity guard.
