import { recommendTab } from './recommendation';

describe('recommendTab', () => {
  it('picks the tab with the lowest cost per distance', () => {
    const rec = recommendTab({
      costPerDistance: { lease: 0.5, finance: 0.4, cash: 0.45 },
    });
    expect(rec.tab).toBe('finance');
    expect(rec.winnerCost).toBe(0.4);
  });

  it('picks lease when it is the cheapest', () => {
    const rec = recommendTab({
      costPerDistance: { lease: 0.3, finance: 0.45, cash: 0.5 },
    });
    expect(rec.tab).toBe('lease');
  });

  it('picks cash when it wins', () => {
    const rec = recommendTab({
      costPerDistance: { lease: 0.5, finance: 0.45, cash: 0.32 },
    });
    expect(rec.tab).toBe('cash');
  });

  it('returns the two losing tabs in lease > finance > cash order with their costs', () => {
    const rec = recommendTab({
      costPerDistance: { lease: 0.5, finance: 0.4, cash: 0.45 },
    });
    expect(rec.others.map((o) => o.tab)).toEqual(['lease', 'cash']);
    expect(rec.others.map((o) => o.cost)).toEqual([0.5, 0.45]);
  });

  it('breaks ties deterministically by preferring earlier tab in lease > finance > cash order', () => {
    const rec = recommendTab({
      costPerDistance: { lease: 0.4, finance: 0.4, cash: 0.4 },
    });
    expect(rec.tab).toBe('lease');
  });
});
