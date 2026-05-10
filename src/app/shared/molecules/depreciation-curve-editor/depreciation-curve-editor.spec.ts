import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DepreciationCurveEditor } from './depreciation-curve-editor';
import { ScenarioStore } from '../../../scenario/scenario.store';
import {
  DEFAULT_CURVES,
  factorsOf,
  makeCurve,
} from '../../../scenario/calculations/depreciation';
import { provideTranslocoTesting } from '../../../../test-helpers/transloco-testing';

function make(): { fixture: ComponentFixture<DepreciationCurveEditor>; store: ScenarioStore } {
  TestBed.configureTestingModule({
    imports: [DepreciationCurveEditor],
    providers: [provideRouter([]), ...provideTranslocoTesting()],
  });
  const store = TestBed.inject(ScenarioStore);
  const fixture = TestBed.createComponent(DepreciationCurveEditor);
  fixture.detectChanges();
  return { fixture, store };
}

function $(fixture: ComponentFixture<unknown>, sel: string): HTMLElement | null {
  return fixture.nativeElement.querySelector(sel) as HTMLElement | null;
}

function $$(fixture: ComponentFixture<unknown>, sel: string): HTMLElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll(sel)) as HTMLElement[];
}

function setOpen(fixture: ComponentFixture<DepreciationCurveEditor>, open: boolean): void {
  fixture.componentRef.setInput('open', open);
  fixture.detectChanges();
}

function inputAt(
  fixture: ComponentFixture<DepreciationCurveEditor>,
  age: number,
): HTMLInputElement {
  const el = $(fixture, `[data-testid="curve-input-${age}"]`);
  if (!el) throw new Error(`no input for age ${age}`);
  return el as HTMLInputElement;
}

function typeFactor(input: HTMLInputElement, factor: number): void {
  input.value = String(factor);
  input.dispatchEvent(new Event('input'));
  input.dispatchEvent(new Event('change'));
}

describe('DepreciationCurveEditor — trigger', () => {
  it('renders an "Edit depreciation curve" trigger button', () => {
    const { fixture } = make();
    const trigger = $(fixture, '[data-testid="curve-trigger"]');
    expect(trigger).not.toBeNull();
    expect(trigger?.textContent ?? '').toContain('depreciation curve');
  });

  it('hides the override indicator dot when no override is active', () => {
    const { fixture } = make();
    expect($(fixture, '[data-testid="curve-override-dot"]')).toBeNull();
  });

  it('shows the override indicator dot when an override is active', () => {
    const { fixture, store } = make();
    store.depreciationCurveOverride.set(makeCurve([1, 0.5, 0.3, 0.18, 0.1]));
    fixture.detectChanges();
    expect($(fixture, '[data-testid="curve-override-dot"]')).not.toBeNull();
  });

  it('clicking the trigger sets open=true', () => {
    const { fixture } = make();
    setOpen(fixture, false);
    const trigger = $(fixture, '[data-testid="curve-trigger"]') as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.open()).toBe(true);
  });
});

describe('DepreciationCurveEditor — chain display', () => {
  it('renders MSRP and both residuals inside the modal', () => {
    const { fixture } = make();
    setOpen(fixture, true);
    expect($(fixture, '[data-testid="curve-chain-msrp"]')).not.toBeNull();
    expect($(fixture, '[data-testid="curve-chain-residual-keep"]')).not.toBeNull();
    expect($(fixture, '[data-testid="curve-chain-residual-lease"]')).not.toBeNull();
  });

  it('residual rows reflect the active curve (default ICE)', () => {
    const { fixture, store } = make();
    store.setRegion('US');
    store.setPowertrain('ICE');
    store.purchasePrice.set(35000);
    store.vehicleAge.set(0);
    store.keepDuration.set(4); // anchor → factor 0.49
    store.leaseTerm.set(48); // anchor → factor 0.49
    setOpen(fixture, true);
    const keepText = $(fixture, '[data-testid="curve-chain-residual-keep"]')?.textContent ?? '';
    const leaseText = $(fixture, '[data-testid="curve-chain-residual-lease"]')?.textContent ?? '';
    // 35000 * 0.49 = 17,150 (formatting differs by locale, just check the magnitude string)
    expect(keepText).toContain('17,150');
    expect(leaseText).toContain('17,150');
  });

  it('chain values update reactively when the curve override changes', () => {
    const { fixture, store } = make();
    store.setRegion('US');
    store.setPowertrain('ICE');
    store.purchasePrice.set(35000);
    store.vehicleAge.set(0);
    store.leaseTerm.set(48);
    setOpen(fixture, true);
    const before = $(fixture, '[data-testid="curve-chain-residual-lease"]')?.textContent ?? '';
    // Drop Y4 to 0.30 → 35000 * 0.30 = 10,500.
    store.depreciationCurveOverride.set(makeCurve([1, 0.5, 0.3, 0.2, 0.1]));
    fixture.detectChanges();
    const after = $(fixture, '[data-testid="curve-chain-residual-lease"]')?.textContent ?? '';
    expect(after).not.toBe(before);
    expect(after).toContain('10,500');
  });
});

describe('DepreciationCurveEditor — vehicleAge anchor (display-only normalization)', () => {
  it('displays Y at vehicleAge as 1.00 (locked reference)', () => {
    const { fixture, store } = make();
    store.setPowertrain('ICE'); // Y2 stored = 0.68
    store.vehicleAge.set(2);
    setOpen(fixture, true);
    expect(parseFloat(inputAt(fixture, 2).value)).toBeCloseTo(1.0, 4);
  });

  it('displays Y0 (MSRP) as a value > 1 for a used car', () => {
    const { fixture, store } = make();
    store.setPowertrain('ICE');
    store.vehicleAge.set(2);
    setOpen(fixture, true);
    // Y0 displayed = stored Y0 / stored factor(vehicleAge) = 1 / 0.68 ≈ 1.47
    expect(parseFloat(inputAt(fixture, 0).value)).toBeCloseTo(1 / 0.68, 2);
  });

  it('translates an edited displayed value back into stored MSRP-normalized form', () => {
    const { fixture, store } = make();
    store.setPowertrain('ICE');
    store.vehicleAge.set(2); // factor(2)=0.68
    setOpen(fixture, true);
    // displayed Y7 default = 0.34/0.68 ≈ 0.50; user types 0.40.
    typeFactor(inputAt(fixture, 7), 0.4);
    const factors = factorsOf(store.depreciationCurve());
    // stored Y7 = 0.40 × 0.68 = 0.272 (clamps to Y12=0.20 floor, but
    // 0.272 > 0.20, so passes; left bound Y4=0.49, also OK).
    expect(factors[3]).toBeCloseTo(0.272, 3);
  });

  it('vehicleAge=0 keeps display === stored (round-trip identity)', () => {
    const { fixture, store } = make();
    store.setPowertrain('ICE');
    store.vehicleAge.set(0);
    setOpen(fixture, true);
    const expected = factorsOf(DEFAULT_CURVES.ICE);
    [0, 2, 4, 7, 12].forEach((age, i) => {
      expect(parseFloat(inputAt(fixture, age).value)).toBeCloseTo(expected[i], 4);
    });
  });
});

describe('DepreciationCurveEditor — chain display by tab', () => {
  it('hides "Residual @ lease end" when activeTab !== lease', () => {
    const { fixture, store } = make();
    store.activeTab.set('cash');
    setOpen(fixture, true);
    expect($(fixture, '[data-testid="curve-chain-residual-lease"]')).toBeNull();
  });

  it('shows "Residual @ lease end" when activeTab === lease', () => {
    const { fixture, store } = make();
    store.activeTab.set('lease');
    setOpen(fixture, true);
    expect($(fixture, '[data-testid="curve-chain-residual-lease"]')).not.toBeNull();
  });
});

describe('DepreciationCurveEditor — drag safety', () => {
  // When the user drags near the smooth curve dataset (which has many
  // sample points) instead of an anchor, the plugin can fire onDrag with
  // an out-of-range index. The handler must ignore it rather than write
  // a malformed curve to the store.
  it('ignores a drag with an out-of-range anchor index', () => {
    const { fixture, store } = make();
    setOpen(fixture, true);
    const before = store.depreciationCurveOverride();
    // Simulate the plugin reporting a drag at a bogus index (e.g., 7 or
    // 30 — far past ANCHOR_AGES.length=5). Reach into the protected
    // commitFactor via the component instance.
    const editor = fixture.componentInstance as unknown as {
      commitFactor: (i: number, v: number) => number | undefined;
    };
    expect(() => editor.commitFactor(7, 0.5)).not.toThrow();
    expect(() => editor.commitFactor(30, 0.5)).not.toThrow();
    // No-op shouldn't have created an override.
    expect(store.depreciationCurveOverride()).toBe(before);
  });
});

describe('DepreciationCurveEditor — chart preview', () => {
  it('renders a <canvas> element inside the dialog body when open', () => {
    const { fixture } = make();
    setOpen(fixture, true);
    expect($(fixture, '[data-testid="curve-preview"] canvas')).not.toBeNull();
  });
});

describe('DepreciationCurveEditor — modal body', () => {
  it('renders one input per anchor age', () => {
    const { fixture } = make();
    setOpen(fixture, true);
    const inputs = $$(fixture, '[data-testid^="curve-input-"]');
    expect(inputs.length).toBe(5);
  });

  it('renders Y0 as a locked / read-only display of 1.00', () => {
    const { fixture } = make();
    setOpen(fixture, true);
    const y0 = inputAt(fixture, 0);
    expect(y0.readOnly || y0.disabled).toBe(true);
    expect(parseFloat(y0.value)).toBeCloseTo(1, 4);
  });

  it('inputs reflect the current active curve (default = ICE)', () => {
    const { fixture, store } = make();
    store.setPowertrain('ICE');
    setOpen(fixture, true);
    const expected = factorsOf(DEFAULT_CURVES.ICE);
    [0, 2, 4, 7, 12].forEach((age, i) => {
      const v = parseFloat(inputAt(fixture, age).value);
      expect(v).toBeCloseTo(expected[i], 4);
    });
  });

  it('inputs reflect the EV defaults when powertrain switches', () => {
    const { fixture, store } = make();
    store.setPowertrain('EV');
    setOpen(fixture, true);
    const expected = factorsOf(DEFAULT_CURVES.EV);
    [0, 2, 4, 7, 12].forEach((age, i) => {
      const v = parseFloat(inputAt(fixture, age).value);
      expect(v).toBeCloseTo(expected[i], 4);
    });
  });

  it('editing an input writes a curve override to the store', () => {
    const { fixture, store } = make();
    store.setPowertrain('ICE'); // Y2=0.68, Y7=0.34
    setOpen(fixture, true);
    // Y4 must stay within [Y7=0.34, Y2=0.68] — pick 0.4.
    typeFactor(inputAt(fixture, 4), 0.4);
    expect(store.depreciationCurveOverride()).not.toBeNull();
    const factors = factorsOf(store.depreciationCurve());
    expect(factors[2]).toBeCloseTo(0.4, 4); // anchor index 2 = age 4
  });

  it('clamps an interior factor that would exceed its left neighbor', () => {
    const { fixture, store } = make();
    setOpen(fixture, true);
    // Y2 < Y0 (= 1.0). Try to set Y2 above its left neighbor.
    typeFactor(inputAt(fixture, 2), 1.5);
    const factors = factorsOf(store.depreciationCurve());
    expect(factors[1]).toBeLessThanOrEqual(factors[0]);
  });

  it('clamps an interior factor that would fall below its right neighbor', () => {
    const { fixture, store } = make();
    store.setPowertrain('ICE'); // Y4 default = 0.49
    setOpen(fixture, true);
    // Y2 must stay ≥ Y4. Try to set Y2 below Y4.
    typeFactor(inputAt(fixture, 2), 0.1);
    const factors = factorsOf(store.depreciationCurve());
    expect(factors[1]).toBeGreaterThanOrEqual(factors[2]);
  });
});

describe('DepreciationCurveEditor — reset', () => {
  it('does not show the reset button when no override is active', () => {
    const { fixture } = make();
    setOpen(fixture, true);
    expect($(fixture, '[data-testid="curve-reset"]')).toBeNull();
  });

  it('shows the reset button when an override is active', () => {
    const { fixture, store } = make();
    store.depreciationCurveOverride.set(makeCurve([1, 0.5, 0.3, 0.18, 0.1]));
    setOpen(fixture, true);
    expect($(fixture, '[data-testid="curve-reset"]')).not.toBeNull();
  });

  it('clicking reset clears the override', () => {
    const { fixture, store } = make();
    store.depreciationCurveOverride.set(makeCurve([1, 0.5, 0.3, 0.18, 0.1]));
    setOpen(fixture, true);
    const btn = $(fixture, '[data-testid="curve-reset"]') as HTMLButtonElement;
    btn.click();
    expect(store.depreciationCurveOverride()).toBeNull();
  });
});
