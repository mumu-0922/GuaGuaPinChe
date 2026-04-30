import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { buildReportPayload, validateReportForm } = require('../../miniprogram/pages/report/form.js');

describe('report form helpers', () => {
  it('builds trimmed report payload', () => {
    expect(buildReportPayload('t1', { reason: 'other', detail: '  \u5176\u4ed6\u95ee\u9898  ' })).toEqual({
      tripId: 't1',
      report: { reason: 'other', detail: '\u5176\u4ed6\u95ee\u9898' }
    });
  });

  it('rejects unsupported reason', () => {
    const result = validateReportForm({ reason: 'spam', detail: '' });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('\u4e3e\u62a5\u539f\u56e0\u65e0\u6548');
  });

  it('rejects detail over 200 characters', () => {
    const result = validateReportForm({ reason: 'other', detail: 'a'.repeat(201) });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('\u4e3e\u62a5\u8be6\u60c5\u4e0d\u80fd\u8d85\u8fc7200\u5b57');
  });
});
