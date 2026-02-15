import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MaintenanceHistoryPage } from './maintenance-history.page';

describe('MaintenanceHistoryPage', () => {
  let component: MaintenanceHistoryPage;
  let fixture: ComponentFixture<MaintenanceHistoryPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MaintenanceHistoryPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
