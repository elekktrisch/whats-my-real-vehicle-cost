import { defaultScenario } from './scenario.defaults';
import {
  fromLocalStorage,
  fromQueryParams,
  hasAnyParams,
  tabFromPath,
  toLocalStorage,
  toQueryParams,
} from './scenario.serializer';
import type { ScenarioSnapshot } from './scenario.types';

describe('scenario.serializer', () => {
  describe('toQueryParams / fromQueryParams', () => {
    it('round-trips the default scenario without losing values', () => {
      const snap = defaultScenario('US');
      const params = new URLSearchParams(toQueryParams(snap));
      const recovered = fromQueryParams(params);
      expect(recovered.globals?.locale).toBe('US');
      expect(recovered.globals?.purchasePrice).toBe(snap.globals.purchasePrice);
      expect(recovered.globals?.keepDuration).toBe(snap.globals.keepDuration);
      expect(recovered.lease?.apr).toBe(snap.lease.apr);
      expect(recovered.finance?.loanTerm).toBe(snap.finance.loanTerm);
      expect(recovered.cash?.opportunityCostRate).toBe(snap.cash.opportunityCostRate);
    });

    it('does not put activeTab in the query string (path is the source)', () => {
      const snap = { ...defaultScenario('US') };
      snap.globals.activeTab = 'finance';
      const params = toQueryParams(snap);
      expect(params['tab']).toBeUndefined();
    });

    it('omits null TCO overrides to keep URLs short', () => {
      const snap = defaultScenario('US');
      const params = toQueryParams(snap);
      expect(params['ins']).toBeUndefined();
      expect(params['maint']).toBeUndefined();
      expect(params['eff']).toBeUndefined();
    });

    it('serializes overrides when set', () => {
      const snap: ScenarioSnapshot = defaultScenario('US');
      snap.overrides.insurance = 1234;
      snap.overrides.maintenance = 567;
      const params = toQueryParams(snap);
      expect(params['ins']).toBe('1234');
      expect(params['maint']).toBe('567');
    });

    it('round-trips an explicit lease end choice', () => {
      const snap = defaultScenario('US');
      snap.lease.leaseEndChoice = 'buyOut';
      const params = new URLSearchParams(toQueryParams(snap));
      const recovered = fromQueryParams(params);
      expect(recovered.lease?.leaseEndChoice).toBe('buyOut');
    });

    it('ignores garbage values without crashing', () => {
      const params = new URLSearchParams('l=Mars&p=warp&price=banana');
      const recovered = fromQueryParams(params);
      expect(recovered.globals?.locale).toBeUndefined();
      expect(recovered.globals?.powertrain).toBeUndefined();
      expect(recovered.globals?.purchasePrice).toBeUndefined();
    });
  });

  describe('localStorage round-trip', () => {
    it('preserves activeTab', () => {
      const snap = defaultScenario('EU');
      snap.globals.activeTab = 'cash';
      const recovered = fromLocalStorage(toLocalStorage(snap));
      expect(recovered.globals?.activeTab).toBe('cash');
    });

    it('returns empty object for null/empty/garbage', () => {
      expect(fromLocalStorage(null)).toEqual({});
      expect(fromLocalStorage('')).toEqual({});
      expect(fromLocalStorage('not json')).toEqual({});
    });
  });

  describe('tabFromPath', () => {
    it('reads tab from /lease, /finance, /cash', () => {
      expect(tabFromPath('/lease')).toBe('lease');
      expect(tabFromPath('/finance')).toBe('finance');
      expect(tabFromPath('/cash')).toBe('cash');
    });
    it('returns null for non-tab paths', () => {
      expect(tabFromPath('/')).toBeNull();
      expect(tabFromPath('/wizard')).toBeNull();
    });
  });

  describe('hasAnyParams', () => {
    it('true if localStorage has any value', () => {
      expect(hasAnyParams(new URLSearchParams(), '{"a":1}')).toBe(true);
    });
    it('true if URL has any param', () => {
      expect(hasAnyParams(new URLSearchParams('price=42000'), null)).toBe(true);
    });
    it('false otherwise', () => {
      expect(hasAnyParams(new URLSearchParams(), null)).toBe(false);
    });
  });
});