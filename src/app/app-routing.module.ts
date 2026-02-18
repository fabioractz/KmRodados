import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./tabs/tabs.module').then(m => m.TabsPageModule)
  },
  {
    path: 'history',
    loadChildren: () => import('./history/history.module').then(m => m.HistoryPageModule)
  },
  {
    path: 'supply-history',
    loadChildren: () => import('./supply-history/supply-history.module').then(m => m.SupplyHistoryPageModule)
  },
  {
    path: 'maintenance-history',
    loadChildren: () => import('./maintenance-history/maintenance-history.module').then( m => m.MaintenanceHistoryPageModule)
  },
  {
    path: 'consumption-history',
    loadChildren: () => import('./consumption-history/consumption-history.module').then( m => m.ConsumptionHistoryPageModule)
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
