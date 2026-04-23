import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChooseRoleComponent } from './choose-role.component';

describe('ChooseRoleComponent', () => {
  let component: ChooseRoleComponent;
  let fixture: ComponentFixture<ChooseRoleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChooseRoleComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChooseRoleComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
