import { defaultScenario } from './scenario.defaults';
import { makeCurve } from './calculations/depreciation';
import {
  SNAPSHOT_VERSION,
  URL_PARAM,
  decodeSnapshot,
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

    it('round-trips lease.apr=null (auto-track)', () => {
      const snap = defaultScenario('US');
      snap.lease.apr = null;
      const recovered = decodeSnapshot(encodeSnapshot(snap));
      expect(recovered.lease?.apr).toBeNull();
    });

    it('round-trips lease.apr as a numeric override', () => {
      const snap = defaultScenario('US');
      snap.lease.apr = 4.2;
      const recovered = decodeSnapshot(encodeSnapshot(snap));
      expect(recovered.lease?.apr).toBe(4.2);
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

    it('round-trips depreciationCurve as null (auto-derive)', () => {
      const snap = defaultScenario('US');
      snap.globals.depreciationCurve = null;
      const recovered = decodeSnapshot(encodeSnapshot(snap));
      expect(recovered.globals?.depreciationCurve).toBeNull();
    });

    it('round-trips depreciationCurve as a curve object', () => {
      const snap = defaultScenario('US');
      const custom = makeCurve([1.0, 0.5, 0.3, 0.18, 0.1]);
      snap.globals.depreciationCurve = custom;
      const recovered = decodeSnapshot(encodeSnapshot(snap));
      expect(recovered.globals?.depreciationCurve).toEqual(custom);
    });

    it('decodes an old URL without depreciationCurve as missing (forward-compat)', () => {
      // Mimic an old snapshot at the current schema version that simply
      // doesn't carry the new field — applySnapshot then merges with the
      // initial scenario which carries depreciationCurve: null.
      const old = JSON.stringify({
        v: SNAPSHOT_VERSION,
        globals: { ...defaultScenario('US').globals },
      });
      // Strip the field so the JSON looks pre-feature.
      const stripped = old.replace(/,"depreciationCurve":null/, '');
      const recovered = decodeSnapshot(stripped);
      expect(recovered.globals?.depreciationCurve).toBeUndefined();
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