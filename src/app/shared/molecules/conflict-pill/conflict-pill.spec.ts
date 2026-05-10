import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ConflictPill } from './conflict-pill';
import { provideTranslocoTesting } from '../../../../test-helpers/transloco-testing';

function make(): ComponentFixture<ConflictPill> {
  TestBed.configureTestingModule({
    imports: [ConflictPill],
    providers: [...provideTranslocoTesting()],
  });
  const fixture = TestBed.createComponent(ConflictPill);
  fixture.componentRef.setInput('visible', true);
  fixture.componentRef.setInput('label', 'Lease APR');
  fixture.componentRef.setInput('proposedValue', '1%');
  fixture.componentRef.setInput('currentValue', '1.5%');
  fixture.componentRef.setInput(
    'reason',
    'new cars qualify for promotional financing.',
  );
  return fixture;
}

describe('ConflictPill', () => {
  it('renders nothing when visible=false', () => {
    const fixture = make();
    fixture.componentRef.setInput('visible', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="conflict-pill"]')).toBeNull();
  });

  it('renders proposedValue, currentValue and reason in the "Recommending X instead of Y because..." form', () => {
    const fixture = make();
    fixture.detectChanges();
    const text = (fixture.nativeElement.textContent ?? '') as string;
    expect(text).toContain('1%');
    expect(text).toContain('1.5%');
    expect(text.toLowerCase()).toContain('recommending');
    expect(text.toLowerCase()).toContain('instead of');
    expect(text.toLowerCase()).toContain('because');
    expect(text).toContain('new cars qualify for promotional financing.');
  });

  it('clicking apply emits apply', () => {
    const fixture = make();
    let emitted = false;
    fixture.componentInstance.apply.subscribe(() => (emitted = true));
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector(
      '[data-testid="conflict-pill-apply"]',
    ) as HTMLButtonElement;
    btn.click();
    expect(emitted).toBe(true);
  });

  it('clicking keep emits keep', () => {
    const fixture = make();
    let emitted = false;
    fixture.componentInstance.keep.subscribe(() => (emitted = true));
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector(
      '[data-testid="conflict-pill-keep"]',
    ) as HTMLButtonElement;
    btn.click();
    expect(emitted).toBe(true);
  });
});
