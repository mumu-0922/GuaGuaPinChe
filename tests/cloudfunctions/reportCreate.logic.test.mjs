import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { buildReportDocument, validateReport } = require('../../cloudfunctions/reportCreate/logic.js');

describe('reportCreate logic', () => {
  it('accepts supported reason', () => {
    expect(validateReport({ reason: 'black_car_risk', detail: '\u7591\u4f3c\u9ed1\u8f66' })).toEqual({ ok: true, errors: [] });
  });

  it('rejects long detail', () => {
    const result = validateReport({ reason: 'other', detail: 'a'.repeat(201) });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('\u4e3e\u62a5\u8be6\u60c5\u4e0d\u80fd\u8d85\u8fc7200\u5b57');
  });

  it('rejects unsupported reason', () => {
    const result = validateReport({ reason: 'spam', detail: '' });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('\u4e3e\u62a5\u539f\u56e0\u65e0\u6548');
  });

  it('builds open report document', () => {
    expect(buildReportDocument('t1', 'reporter', { reason: 'other', detail: '\u5176\u4ed6' }, 1777480000000)).toEqual({
      tripId: 't1',
      reporterOpenid: 'reporter',
      reason: 'other',
      detail: '\u5176\u4ed6',
      status: 'open',
      createdAt: 1777480000000,
      updatedAt: 1777480000000
    });
  });
});
