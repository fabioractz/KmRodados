import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ConsumptionHistoryPage } from './consumption-history.page';

const routes: Routes = [
  {
    path: '',
    component: ConsumptionHistoryPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ConsumptionHistoryPageRoutingModule {}
