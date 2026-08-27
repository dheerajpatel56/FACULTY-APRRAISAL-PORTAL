// Credentials for the local dev scripts.
//
// Nothing is hardcoded here on purpose: the campus hosting agreement forbids
// committed passwords, and a grep of this repository turning up "admin123" is
// a finding regardless of it being a throwaway seed value.
//
// Supply them per run, e.g.
//   ADMIN_PW=... HOD_PW=... FACULTY_PW=... node scripts/smoke-all.mjs
// or export them once in your shell. Defaults to the seed accounts' codes only
// (which are not secret); passwords must come from the environment.

const need = (name) => {
  const v = process.env[name];
  if (!v) {
    console.error(
      `Missing ${name}.\n\n` +
      `These scripts hit a running API and need real credentials, which are not\n` +
      `stored in the repo. Set them for this run, e.g.\n\n` +
      `  ADMIN_PW=... HOD_PW=... FACULTY_PW=... node scripts/<script>.mjs\n`
    );
    process.exit(1);
  }
  return v;
};

export const ADMIN_CODE = process.env.ADMIN_CODE ?? 'ADMIN001';
export const HOD_CODE = process.env.HOD_CODE ?? '00CSE003';
export const FACULTY_CODE = process.env.FACULTY_CODE ?? 'FAC21';

export const adminPw = () => need('ADMIN_PW');
export const hodPw = () => need('HOD_PW');
export const facultyPw = () => need('FACULTY_PW');

// Mailbox for scripts that deliberately send a real email.
export const testEmail = () => need('TEST_EMAIL');
