import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CandidateSetupComponent } from './candidate-setup.component';

describe('CandidateSetupComponent', () => {
  let component: CandidateSetupComponent;
  let fixture: ComponentFixture<CandidateSetupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CandidateSetupComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CandidateSetupComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
