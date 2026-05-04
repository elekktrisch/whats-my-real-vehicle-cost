import { recommendTab } from './recommendation';

describe('recommendTab', () => {
  it('picks the tab with the lowest cost per distance', () => {
    const rec = recommendTab({
      costPerDistance: { lease: 0.5, finance: 0.4, cash: 0.45 },
      locale: 'US',
      distanceUnit: 'mi',
    });
    expect(rec.tab).toBe('finance');
  });

  it('picks lease when it is the cheapest', () => {
    const rec = recommendTab({
      costPerDistance: { lease: 0.3, finance: 0.45, cash: 0.5 },
      locale: 'US',
      distanceUnit: 'mi',
    });
    expect(rec.tab).toBe('lease');
  });

  it('picks cash when it wins', () => {
    const rec = recommendTab({
      costPerDistance: { lease: 0.5, finance: 0.45, cash: 0.32 },
      locale: 'EU',
      distanceUnit: 'km',
    });
    expect(rec.tab).toBe('cash');
  });

  it('reason mentions the winner, the unit and the other tabs for comparison', () => {
    const rec = recommendTab({
      costPerDistance: { lease: 0.5, finance: 0.4, cash: 0.45 },
      locale: 'US',
      distanceUnit: 'mi',
    });
    expect(rec.reason).toContain('Loan');
    expect(rec.reason).toContain('Lease');
    expect(rec.reason).toContain('Cash');
    expect(rec.reason).toContain('mi');
    expect(rec.reason).toContain('$0.40');
  });

  it('uses EU formatting when locale is EU', () => {
    const rec = recommendTab({
      costPerDistance: { lease: 0.5, finance: 0.4, cash: 0.45 },
      locale: 'EU',
      distanceUnit: 'km',
    });
    expect(rec.reason).toContain('€');
    expect(rec.reason).toContain('km');
  });

  it('breaks ties deterministically by preferring earlier tab in lease > finance > cash order', () => {
    const rec = recommendTab({
      costPerDistance: { lease: 0.4, finance: 0.4, cash: 0.4 },
      locale: 'US',
      distanceUnit: 'mi',
    });
    expect(rec.tab).toBe('lease');
  });
});