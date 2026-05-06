import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { buildSimilarWindow, filterSimilarTrips, mergeSimilarCandidatePages, toSimilarTripView } = require('../../cloudfunctions/tripSimilar/logic.js');

const baseTrip = {
  _id: 'base',
  from: '长安校区',
  to: '咸阳机场',
  earliestTime: 1777500000000,
  status: 'open'
};

describe('tripSimilar logic', () => {
  it('builds a 90 minute similar time window around the base trip', () => {
    expect(buildSimilarWindow({ from: '长安校区', to: '咸阳机场', earliestTime: 1777500000000 })).toEqual({
      from: '长安校区',
      to: '咸阳机场',
      start: 1777500000000 - 90 * 60 * 1000,
      end: 1777500000000 + 90 * 60 * 1000
    });
  });

  it('does not build a 1970 window for trips without a valid earliest time', () => {
    expect(buildSimilarWindow({ from: '长安校区', to: '咸阳机场' })).toEqual({
      from: '长安校区',
      to: '咸阳机场',
      start: null,
      end: null
    });
  });

  it('keeps only open same-route trips within the similar window', () => {
    const trips = [
      { _id: 'base', from: '长安校区', to: '咸阳机场', earliestTime: 1777500000000, status: 'open' },
      { _id: 'near', from: '长安校区', to: '咸阳机场', earliestTime: 1777500000000 + 30 * 60 * 1000, status: 'open' },
      { _id: 'hidden', from: '长安校区', to: '咸阳机场', earliestTime: 1777500000000 + 20 * 60 * 1000, status: 'hidden' },
      { _id: 'closed', from: '长安校区', to: '咸阳机场', earliestTime: 1777500000000 + 40 * 60 * 1000, status: 'closed' },
      { _id: 'wrong-from', from: '友谊校区', to: '咸阳机场', earliestTime: 1777500000000 + 10 * 60 * 1000, status: 'open' },
      { _id: 'wrong-to', from: '长安校区', to: '西安北站', earliestTime: 1777500000000 + 10 * 60 * 1000, status: 'open' },
      { _id: 'far', from: '长安校区', to: '咸阳机场', earliestTime: 1777500000000 + 91 * 60 * 1000, status: 'open' }
    ];

    expect(filterSimilarTrips(baseTrip, trips).map((trip) => trip._id)).toEqual(['near']);
  });

  it('sorts by absolute time difference and limits to three trips', () => {
    const trips = [
      { _id: 'diff-70', from: '长安校区', to: '咸阳机场', earliestTime: baseTrip.earliestTime + 70 * 60 * 1000, status: 'open' },
      { _id: 'diff-10', from: '长安校区', to: '咸阳机场', earliestTime: baseTrip.earliestTime - 10 * 60 * 1000, status: 'open' },
      { _id: 'diff-30', from: '长安校区', to: '咸阳机场', earliestTime: baseTrip.earliestTime + 30 * 60 * 1000, status: 'open' },
      { _id: 'diff-50', from: '长安校区', to: '咸阳机场', earliestTime: baseTrip.earliestTime - 50 * 60 * 1000, status: 'open' }
    ];

    expect(filterSimilarTrips(baseTrip, trips).map((trip) => trip._id)).toEqual(['diff-10', 'diff-30', 'diff-50']);
  });

  it('deduplicates merged before/after candidate pages before sorting top matches', () => {
    const trips = mergeSimilarCandidatePages([
      [
        { _id: 'after-20', from: '长安校区', to: '咸阳机场', earliestTime: baseTrip.earliestTime + 20 * 60 * 1000, status: 'open' },
        { _id: 'duplicate', from: '长安校区', to: '咸阳机场', earliestTime: baseTrip.earliestTime + 40 * 60 * 1000, status: 'open' }
      ],
      [
        { _id: 'before-5', from: '长安校区', to: '咸阳机场', earliestTime: baseTrip.earliestTime - 5 * 60 * 1000, status: 'open' },
        { _id: 'duplicate', from: '长安校区', to: '咸阳机场', earliestTime: baseTrip.earliestTime + 40 * 60 * 1000, status: 'open' },
        { _id: 'before-15', from: '长安校区', to: '咸阳机场', earliestTime: baseTrip.earliestTime - 15 * 60 * 1000, status: 'open' }
      ]
    ]);

    expect(trips.map((trip) => trip._id)).toEqual(['after-20', 'duplicate', 'before-5', 'before-15']);
    expect(filterSimilarTrips(baseTrip, trips).map((trip) => trip._id)).toEqual(['before-5', 'before-15', 'after-20']);
  });

  it('removes contact fields from similar trip view', () => {
    expect(toSimilarTripView({ _id: 't1', from: '长安校区', contactType: 'qq', contactValue: '123' })).toEqual({
      _id: 't1',
      from: '长安校区'
    });
  });
});
