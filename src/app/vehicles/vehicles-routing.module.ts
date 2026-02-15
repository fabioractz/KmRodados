import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { VehiclesPage } from './vehicles.page';
import { VeiculoFormPage } from './veiculo-form/veiculo-form.page';

const routes: Routes = [
  {
    path: '',
    component: VehiclesPage
  },
  {
    path: 'form',
    component: VeiculoFormPage
  },
  {
    path: 'form/:plate',
    component: VeiculoFormPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class VehiclesPageRoutingModule {}
