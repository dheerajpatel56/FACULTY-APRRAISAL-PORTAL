import { describe, it, expect, afterEach } from 'vitest';
import { runDueReviewWindows } from '../cron/quarterlySnapshot';

// The daily job mails every opted-in faculty the moment a review window's end
// date arrives, with nobody present to confirm it. QUARTERLY_AUTOSEND=false
// stops it without the operator having to delete their configured windows.

const original = process.env.QUARTERLY_AUTOSEND;
afterEach(() => {
  if (original === undefined) delete process.env.QUARTERLY_AUTOSEND;
  else process.env.QUARTERLY_AUTOSEND = original;
});

describe('quarterly autosend kill switch', () => {
  it('skips entirely when QUARTERLY_AUTOSEND=false', async () => {
    process.env.QUARTERLY_AUTOSEND = 'false';
    const res = await runDueReviewWindows(new Date());
    expect(res).toEqual({ windows: 0, faculty: 0, skipped: true });
  });

  it('is case-insensitive', async () => {
    process.env.QUARTERLY_AUTOSEND = 'FALSE';
    const res: any = await runDueReviewWindows(new Date());
    expect(res.skipped).toBe(true);
  });

  it('runs by default, so existing deployments are unchanged', async () => {
    delete process.env.QUARTERLY_AUTOSEND;
    const res: any = await runDueReviewWindows(new Date());
    // No windows are configured in this database, so it finds nothing due —
    // the point is that it did NOT short-circuit on the switch.
    expect(res.skipped).toBeUndefined();
    expect(res.windows).toBe(0);
  });
});
