import { TestBed, ComponentFixture } from '@angular/core/testing';
import { WarningsList } from './warnings-list';
import type { ActiveConflict } from '../../../scenario/conflicts';
import { provideTranslocoTesting } from '../../../../test-helpers/transloco-testing';

function descriptor(over: Partial<ActiveConflict> = {}): ActiveConflict {
  return {
    key: 'leaseApr',
    scope: 'lease',
    label: 'Lease APR',
    reason:
      'New cars qualify for promotional ~1% manufacturer financing. Used cars run ~3%.',
    currentValue: '1.5%',
    proposedValue: '1%',
    sliderAnchor: 'slider-leaseApr',
    apply: jasmine.createSpy('apply'),
    keep: jasmine.createSpy('keep'),
    ...over,
  };
}

function make(): ComponentFixture<WarningsList> {
  TestBed.configureTestingModule({
    imports: [WarningsList],
    providers: [...provideTranslocoTesting()],
  });
  const fixture = TestBed.createComponent(WarningsList);
  fixture.componentRef.setInput('conflicts', []);
  return fixture;
}

describe('WarningsList', () => {
  it('renders nothing when conflicts list is empty', () => {
    const fixture = make();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="warnings-list"]')).toBeNull();
  });

  it('renders one row per conflict with label, reason, current, proposed', () => {
    const fixture = make();
    const c = descriptor();
    fixture.componentRef.setInput('conflicts', [c]);
    fixture.detectChanges();
    const row = fixture.nativeElement.querySelector('[data-testid="warnings-list-row"]');
    expect(row).not.toBeNull();
    const text = (row.textContent ?? '') as string;
    expect(text).toContain('Lease APR');
    expect(text).toContain('1.5%');
    expect(text).toContain('1%');
    expect(text.length).toBeGreaterThan(50);
  });

  it('clicking apply on a row invokes that descriptor.apply', () => {
    const fixture = make();
    const applySpy = jasmine.createSpy('apply');
    const c = descriptor({ apply: applySpy });
    fixture.componentRef.setInput('conflicts', [c]);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector(
      '[data-testid="warnings-list-apply"]',
    ) as HTMLButtonElement;
    btn.click();
    expect(applySpy).toHaveBeenCalled();
  });

  it('clicking keep on a row invokes that descriptor.keep', () => {
    const fixture = make();
    const keepSpy = jasmine.createSpy('keep');
    const c = descriptor({ keep: keepSpy });
    fixture.componentRef.setInput('conflicts', [c]);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector(
      '[data-testid="warnings-list-keep"]',
    ) as HTMLButtonElement;
    btn.click();
    expect(keepSpy).toHaveBeenCalled();
  });

  it('renders multiple rows for multiple conflicts', () => {
    const fixture = make();
    fixture.componentRef.setInput('conflicts', [
      descriptor({ key: 'leaseApr' }),
      descriptor({ key: 'insurance', label: 'Insurance' }),
    ]);
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('[data-testid="warnings-list-row"]');
    expect(rows.length).toBe(2);
  });
});
