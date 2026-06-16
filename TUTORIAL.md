# Tutorial — Using the Faculty Appraisal System

This guide walks through the portal from each role's point of view. It assumes the app is running locally (backend on `:5000`, frontend on `:5173`) and seeded — see [README.md](README.md) for setup.

Log in at **http://localhost:5173** with any [seeded account](README.md#seeded-accounts).

---

## 1. Logging In & Account Basics

1. Open the portal. You'll see a split-screen login with the institute branding on the left and a sign-in card on the right.
2. Enter your **Employee Code** and **password** (e.g. `FAC21` / `faculty123`) and click **Sign In**.
3. You land on the dashboard for your highest role.

### Forgot your password?

1. Click **Forgot password?** under the Sign In button.
2. Enter your employee code → an OTP is emailed to your registered address.
3. Enter the 6-digit OTP, choose a new password (min 8 characters), and confirm. You're returned to login.

### Changing your password (while logged in)

1. Go to **Profile**.
2. In **Change Password**, enter your current password and click **Send OTP to Email**.
3. Enter the OTP plus your new password, then **Update Password**.

---

## 2. Faculty Walkthrough

### Fill and submit an annual appraisal

1. On the **Dashboard**, pick the **academic year** in the top-right selector. If the submission window is open, a **New Appraisal** button appears.
2. Click **New Appraisal** → you enter the multi-step form.
3. Work through the steps:
   - **Leave & Info** — leave counts and any higher-qualification note.
   - **Teaching (Cat 1)** — add courses, projects, e-content, ICT entries.
   - **Research (Cat 2)** — journals, conferences, patents, projects, consultancy, guidance, etc.
   - **Development (Cat 3)**, **Governance (Cat 4)**, **Supplementary (Cat 5)** — fill the relevant rows.
   - The form **auto-saves** as you go; you can leave and return.
4. On the **Preview & Submit** step you see your **self-appraisal score** (Categories 1–5, out of 500) with a per-category breakdown.
5. Click **Submit**. You'll receive a confirmation email and the submission becomes read-only.

> You will *not* see reviewer scores or the grand total at any point — only your own self-score.

### After review

- When your reviewer approves or rejects, you get an email and the **reviewer's comments** become visible on the submission's **View** page. Download a **PDF** copy from the same page.
- If an admin **unlocks** your submission, you're notified and can edit and resubmit.

### Fill your FPGP (growth plan)

1. Go to **FPGP** and select the academic year.
2. Click **Create Plan**, then **Fill / Edit Plan**.
3. Read **Annexure I & II** (linked at the top), then complete the **4 categories / 21 subsections**. Note that subsection **3.2 requires at least two professional-society memberships**.
4. Click **Save Draft** anytime. When ready, click **Sign & Activate** — this locks the plan and notifies your HoD.
5. After your HoD counter-signs, you'll see their signature and any feedback on the **View** page, and you can download the **PDF**.

---

## 3. Reviewer / HoD Walkthrough

### Review a submitted appraisal

1. Log in as a reviewer (e.g. `FAC11`) or HoD (e.g. `HOD002`).
2. Open **Review Queue** — every submitted appraisal in your department(s) is listed.
3. Click **Review** on a row. The left panel shows the faculty member's self-appraisal data and score; the right panel is your review form.
4. Score **Category 6 — Core Values** (five fields, 0–10 each).
5. Write **per-category comments** and an overall comment. These are released to the faculty member only on approval/rejection.
6. Choose **Approve** or **Reject** and click **Submit Review**. The faculty member is emailed automatically.

### Department FPGP (HoD)

1. Go to **Dept FPGP** and select the academic year.
2. The table lists every plan in your department with signing status.
3. Click **View** on an *ACTIVE* plan, then **HoD Sign Plan** to counter-sign (status becomes REVIEWED). You can also post feedback.

### Department reports

- **Reports** (under your role's menu) shows reviewed appraisals for your department with summary tiles and a faculty-wise table. Use **Export Excel** to download.

---

## 4. Admin Walkthrough

The admin menu exposes the full management surface.

### Manage users

1. **Users** lists everyone with search and pagination.
2. **New User** — fill the form; pick a **Department** from the dropdown. If the department doesn't exist yet, choose **+ Create new department…** to jump to the Departments page.
3. **Import CSV** — bulk-create users:
   - Click **Import CSV → Download template**.
   - Fill the columns: `employeeCode, name, email, password, department` (required) plus optional `designation, dateOfJoining, phone, specialization, educationalQuals, role`.
   - Upload the file and click **Validate**. Every row is checked (email format, duplicate codes, department exists, valid role).
   - Review the green/red preview, then **Import N valid rows**. A summary shows created/skipped/failed counts.
4. **Roles** (per user) — open the role modal to assign FACULTY / HOD / REVIEWER / ADMIN. HoD and Reviewer roles require a department. Revoke a role with the trash icon. All changes are audit-logged.

### Departments, Academic Years

- **Departments** — create/edit departments; **Deactivate** removes one from new assignments (blocked if active users remain).
- **Academic Years** — create a year and toggle its **submission window** open/closed. Faculty can only submit while the window is open.

### Oversight

- **All Appraisals** — every submission across the institute, filterable by year/status and searchable by faculty. From here you can **Assign** a reviewer to a submitted appraisal or **Unlock** a locked one.
- **Reports** — institute-wide stats with a department breakdown and **Export Excel**.
- **Emails** — the notification queue: filter by status (Pending/Sent/Failed), **Retry** failed sends, or manually trigger **Draft Reminders** / **Reviewer Digest**.
- **Audit Log** — a paginated, filterable record of every sensitive action. Click a row to expand its JSON metadata.

---

## 5. Common Tasks Cheat-Sheet

| I want to… | Go to |
|------------|-------|
| Start this year's appraisal | Faculty → Dashboard → New Appraisal |
| See my score | Appraisal → Preview step, or the View page after submit |
| Download my appraisal/FPGP as PDF | The View page → **PDF** button |
| Create my growth plan | FPGP → Create Plan → Fill → Sign & Activate |
| Review a colleague's appraisal | Reviewer → Review Queue |
| Counter-sign a growth plan | HoD → Dept FPGP → View → HoD Sign Plan |
| Add many faculty at once | Admin → Users → Import CSV |
| Make someone a reviewer | Admin → Users → Roles |
| Open/close submission for a year | Admin → Academic Years → Open/Close |
| Re-open a locked submission | Admin → All Appraisals → Unlock |
| Check why an email didn't arrive | Admin → Emails (filter Failed → Retry) |
| See who changed what | Admin → Audit Log |

---

## 6. Tips & Notes

- **Auto-save**: the appraisal and FPGP forms save automatically; a manual **Save Draft** is also available.
- **Submission window**: if **New Appraisal** is missing, the academic year's window is closed — ask an admin to open it.
- **Email in dev**: with `EMAIL_DISABLED=true`, no real email is sent, but you can still see queued messages (and OTP codes in the backend console) at Admin → Emails.
- **PDF first load**: the very first PDF export after a server start is slower (a few seconds) while the headless browser warms up; later ones are fast.
- **Mobile**: on narrow screens the sidebar collapses into a hamburger menu in the top bar.
