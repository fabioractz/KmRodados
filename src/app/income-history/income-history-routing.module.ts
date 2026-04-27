import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { IncomeHistoryPage } from './income-history.page';

const routes: Routes = [
  {
    path: '',
    component: IncomeHistoryPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class IncomeHistoryPageRoutingModule {}

