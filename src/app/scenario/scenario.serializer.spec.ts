import { defaultScenario } from './scenario.defaults';
import {
  SHARE_PARAM,
  SNAPSHOT_VERSION,
  URL_PARAM,
  decodeShareSnapshot,
  decodeSnapshot,
  encodeShareSnapshot,
  encodeSnapshot,
  hasAnyState,
  tabFromPath,
} from './scenario.serializer';

describe('scenario.serializer', () => {
  describe('encodeSnapshot / decodeSnapshot', () => {
    it('round-trips the default scenario without losing values', () => {
      const snap = defaultScenario('US');
      const recovered = decodeSnapshot(encodeSnapshot(snap));
      expect(recovered.globals?.locale).toBe('US');
      expect(recovered.globals?.purchasePrice).toBe(snap.globals.purchasePrice);
      expect(recovered.globals?.keepDuration).toBe(snap.globals.keepDuration);
      expect(recovered.globals?.activeTab).toBe(snap.globals.activeTab);
      expect(recovered.globals?.chargerStatus).toBe('buying');
      expect(recovered.globals?.solar).toBe(true);
      expect(recovered.lease?.apr).toBe(snap.lease.apr);
      expect(recovered.finance?.loanTerm).toBe(snap.finance.loanTerm);
      expect(recovered.cash?.opportunityCostRate).toBe(snap.cash.opportunityCostRate);
    });

    it('round-trips overridden fields (insurance, fuelPrice, fuelEfficiency)', () => {
      const snap = defaultScenario('EU');
      snap.overrides.insurance = 1234;
      snap.overrides.fuelPrice = 1.99;
      snap.overrides.fuelEfficiency = 8.4;
      const recovered = decodeSnapshot(encodeSnapshot(snap));
      expect(recovered.overrides?.insurance).toBe(1234);
      expect(recovered.overrides?.fuelPrice).toBe(1.99);
      expect(recovered.overrides?.fuelEfficiency).toBe(8.4);
    });

    it('round-trips the EV-context globals (chargerStatus + solar)', () => {
      const snap = defaultScenario('US');
      snap.globals.chargerStatus = 'buying';
      snap.globals.solar = true;
      const recovered = decodeSnapshot(encodeSnapshot(snap));
      expect(recovered.globals?.chargerStatus).toBe('buying');
      expect(recovered.globals?.solar).toBe(true);
    });

    it('embeds the version field in the encoded JSON', () => {
      const snap = defaultScenario('US');
      const encoded = encodeSnapshot(snap);
      const parsed = JSON.parse(encoded);
      expect(parsed.v).toBe(SNAPSHOT_VERSION);
    });

    it('strips v from the decoded snapshot', () => {
      const snap = defaultScenario('US');
      const recovered = decodeSnapshot(encodeSnapshot(snap)) as Record<string, unknown>;
      expect(recovered['v']).toBeUndefined();
    });

    it('returns empty object when version mismatches', () => {
      const oldFormat = JSON.stringify({ v: 1, globals: { purchasePrice: 99999 } });
      expect(decodeSnapshot(oldFormat)).toEqual({});
    });

    it('returns empty object when version is missing', () => {
      const noVersion = JSON.stringify({ globals: { purchasePrice: 99999 } });
      expect(decodeSnapshot(noVersion)).toEqual({});
    });

    it('returns empty object for null/empty/garbage', () => {
      expect(decodeSnapshot(null)).toEqual({});
      expect(decodeSnapshot('')).toEqual({});
      expect(decodeSnapshot('not json')).toEqual({});
      expect(decodeSnapshot('{')).toEqual({});
    });
  });

  describe('encodeShareSnapshot / decodeShareSnapshot', () => {
    it('round-trips identically to the raw-JSON codec', () => {
      const snap = defaultScenario('EU');
      snap.overrides.insurance = 1234;
      snap.lease.apr = 4.2;
      const recovered = decodeShareSnapshot(encodeShareSnapshot(snap));
      expect(recovered.globals?.locale).toBe('EU');
      expect(recovered.lease?.apr).toBe(4.2);
      expect(recovered.overrides?.insurance).toBe(1234);
    });

    it('produces shorter output than the raw JSON', () => {
      const snap = defaultScenario('US');
      const raw = encodeSnapshot(snap);
      const compressed = encodeShareSnapshot(snap);
      expect(compressed.length).toBeLessThan(raw.length);
    });

    it('output is URL-safe (no chars needing percent-encoding)', () => {
      const snap = defaultScenario('US');
      const compressed = encodeShareSnapshot(snap);
      expect(compressed).toMatch(/^[A-Za-z0-9_\-]+$/);
    });

    it('returns empty object for null/empty/garbage', () => {
      expect(decodeShareSnapshot(null)).toEqual({});
      expect(decodeShareSnapshot('')).toEqual({});
      expect(decodeShareSnapshot('not-deflate')).toEqual({});
    });
  });

  describe('hasAnyState includes the share param', () => {
    it('true when ?c= is present', () => {
      expect(hasAnyState(new URLSearchParams(`${SHARE_PARAM}=anything`))).toBe(true);
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

  describe('hasAnyState', () => {
    it('true when the s URL param is present', () => {
      expect(hasAnyState(new URLSearchParams(`${URL_PARAM}=anything`))).toBe(true);
    });
    it('false otherwise', () => {
      expect(hasAnyState(new URLSearchParams())).toBe(false);
      expect(hasAnyState(new URLSearchParams('price=42000'))).toBe(false);
    });
  });
});