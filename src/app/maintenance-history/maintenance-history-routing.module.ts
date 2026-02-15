import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MaintenanceHistoryPage } from './maintenance-history.page';

const routes: Routes = [
  {
    path: '',
    component: MaintenanceHistoryPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MaintenanceHistoryPageRoutingModule {}
