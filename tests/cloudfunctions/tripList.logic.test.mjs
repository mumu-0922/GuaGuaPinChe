import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { buildTripQuery, filterByKeyword, getNextCursorTime, toPublicTrip } = require('../../cloudfunctions/tripList/logic.js');

describe('tripList logic', () => {
  it('normalizes filters and caps page size', () => {
    expect(buildTripQuery({ from: ' \u897f\u5317\u5de5\u4e1a\u5927\u5b66\u957f\u5b89\u6821\u533a ', to: '\u673a\u573a', pageSize: 200, keyword: ' T5 ' })).toEqual({
      from: '\u957f\u5b89\u6821\u533a',
      to: '\u54b8\u9633\u673a\u573a',
      dateStart: null,
      dateEnd: null,
      keyword: 'T5',
      pageSize: 50,
      cursorTime: null,
      mineOnly: false
    });
  });

  it('removes contact fields from public trip', () => {
    expect(toPublicTrip({ _id: 't1', from: '\u957f\u5b89\u6821\u533a', contactType: 'qq', contactValue: '123' })).toEqual({
      _id: 't1',
      from: '\u957f\u5b89\u6821\u533a'
    });
  });

  it('filters by keyword across route and note', () => {
    const trips = [
      { from: '\u957f\u5b89\u6821\u533a', to: '\u54b8\u9633\u673a\u573a', note: 'T5' },
      { from: '\u957f\u5b89\u6821\u533a', to: '\u897f\u5b89\u7ad9', note: '\u8d76\u706b\u8f66' }
    ];
    expect(filterByKeyword(trips, 'T5')).toEqual([trips[0]]);
    expect(filterByKeyword(trips, '\u897f\u5b89\u7ad9')).toEqual([trips[1]]);
  });

  it('builds next cursor from the fetched page before keyword filtering', () => {
    const fetchedPage = [
      { earliestTime: 1777500000000, note: 'T5' },
      { earliestTime: 1777503600000, note: '\u4e0d\u5339\u914d' }
    ];
    const filteredTrips = filterByKeyword(fetchedPage, 'T5');
    expect(filteredTrips).toEqual([fetchedPage[0]]);
    expect(getNextCursorTime(fetchedPage)).toBe(1777503600000);
  });

});
