import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SupplyHistoryPage } from './supply-history.page';

const routes: Routes = [
  {
    path: '',
    component: SupplyHistoryPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SupplyHistoryPageRoutingModule {}
