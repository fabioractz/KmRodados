import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { IncomePage } from './income.page';

const routes: Routes = [
  {
    path: '',
    component: IncomePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class IncomePageRoutingModule {}
