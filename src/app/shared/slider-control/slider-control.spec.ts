import { TestBed, ComponentFixture } from '@angular/core/testing';
import { SliderControl } from './slider-control';
import { provideTranslocoTesting } from '../../../test-helpers/transloco-testing';

function make(): ComponentFixture<SliderControl> {
  TestBed.configureTestingModule({
    imports: [SliderControl],
    providers: [...provideTranslocoTesting()],
  });
  const fixture = TestBed.createComponent(SliderControl);
  fixture.componentRef.setInput('label', 'APR');
  fixture.componentRef.setInput('tip', '');
  fixture.componentRef.setInput('min', 0);
  fixture.componentRef.setInput('max', 20);
  fixture.componentRef.setInput('minLabel', '0%');
  fixture.componentRef.setInput('maxLabel', '20%');
  fixture.componentRef.setInput('value', 1);
  return fixture;
}

describe('SliderControl — auto / reset UI', () => {
  it('renders neither auto-tag nor reset-link by default', () => {
    const fixture = make();
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[data-testid="auto-tag"]')).toBeNull();
    expect(el.querySelector('[data-testid="reset-link"]')).toBeNull();
  });

  it('renders auto-tag when isAuto=true', () => {
    const fixture = make();
    fixture.componentRef.setInput('isAuto', true);
    fixture.detectChanges();
    const tag = fixture.nativeElement.querySelector('[data-testid="auto-tag"]');
    expect(tag).not.toBeNull();
    expect(tag.textContent.trim().toLowerCase()).toContain('auto');
  });

  it('renders reset-link when isAuto=false', () => {
    const fixture = make();
    fixture.componentRef.setInput('isAuto', false);
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('[data-testid="reset-link"]');
    expect(link).not.toBeNull();
  });

  it('clicking reset-link emits reset', () => {
    const fixture = make();
    fixture.componentRef.setInput('isAuto', false);
    let emitted = false;
    fixture.componentInstance.reset.subscribe(() => (emitted = true));
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector(
      '[data-testid="reset-link"]',
    ) as HTMLButtonElement;
    link.click();
    expect(emitted).toBe(true);
  });
});
