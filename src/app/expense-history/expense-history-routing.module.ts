import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ExpenseHistoryPage } from './expense-history.page';

const routes: Routes = [
  {
    path: '',
    component: ExpenseHistoryPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ExpenseHistoryPageRoutingModule {}

