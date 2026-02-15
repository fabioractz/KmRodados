import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConsumptionHistoryPage } from './consumption-history.page';

describe('ConsumptionHistoryPage', () => {
  let component: ConsumptionHistoryPage;
  let fixture: ComponentFixture<ConsumptionHistoryPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ConsumptionHistoryPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
