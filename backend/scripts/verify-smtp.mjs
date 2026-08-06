import 'dotenv/config';
import nodemailer from 'nodemailer';

const mask = (v) => (v ? v.slice(0, 2) + '***' + (v.length > 4 ? v.slice(-2) : '') : '(unset)');
const present = (k) => (process.env[k] ? 'set' : 'MISSING');

console.log('--- env keys ---');
for (const k of ['EMAIL_DISABLED', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM']) {
  const shown = k === 'SMTP_PASS' ? mask(process.env[k]) : (process.env[k] ?? '(unset)');
  console.log(`${k}: ${present(k)}  ${k === 'SMTP_PASS' ? '(' + shown + ')' : '= ' + shown}`);
}

async function tryVerify(label, cfg) {
  console.log(`\n--- verify: ${label} ---`);
  console.log(`host=${cfg.host} port=${cfg.port} secure=${cfg.secure} user=${cfg.auth.user}`);
  try {
    const t = nodemailer.createTransport(cfg);
    await t.verify();
    console.log('RESULT: OK — connection + auth succeeded (no mail sent)');
    return true;
  } catch (e) {
    console.log('RESULT: FAIL —', e.code || '', e.message);
    return false;
  }
}

// 1) Exactly as emailService builds it (current .env).
await tryVerify('current .env config', {
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

// 2) With the Gmail host injected — tests whether the app-password itself works.
await tryVerify('Gmail host injected (smtp.gmail.com:587)', {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

process.exit(0);
