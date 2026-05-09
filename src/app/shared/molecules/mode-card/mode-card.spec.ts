import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ModeCard } from './mode-card';

function make(): ComponentFixture<ModeCard> {
  TestBed.configureTestingModule({ imports: [ModeCard] });
  const fixture = TestBed.createComponent(ModeCard);
  fixture.componentRef.setInput('mode', 'lease');
  fixture.componentRef.setInput('label', 'Lease');
  fixture.componentRef.setInput('active', false);
  fixture.componentRef.setInput('recommended', false);
  fixture.componentRef.setInput('total', '$10k');
  fixture.componentRef.setInput('totalFull', '$10,000');
  fixture.componentRef.setInput('monthly', '$200');
  fixture.componentRef.setInput('monthlyFull', '$200');
  fixture.componentRef.setInput('perDistance', '$0.20');
  fixture.componentRef.setInput('distanceUnit', 'mi');
  fixture.componentRef.setInput('tabId', 'modetab-lease');
  fixture.componentRef.setInput('panelId', 'modepanel-lease');
  return fixture;
}

describe('ModeCard — conflict badge', () => {
  it('renders no badge when conflictCount=0 (default)', () => {
    const fixture = make();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="mode-card-badge"]')).toBeNull();
  });

  it('renders the badge with the count when conflictCount>0', () => {
    const fixture = make();
    fixture.componentRef.setInput('conflictCount', 3);
    fixture.detectChanges();
    const badge = fixture.nativeElement.querySelector('[data-testid="mode-card-badge"]');
    expect(badge).not.toBeNull();
    expect(badge.textContent).toContain('3');
  });
});
