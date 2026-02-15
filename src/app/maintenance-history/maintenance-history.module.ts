import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MaintenanceHistoryPageRoutingModule } from './maintenance-history-routing.module';

import { MaintenanceHistoryPage } from './maintenance-history.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MaintenanceHistoryPageRoutingModule
  ],
  declarations: [MaintenanceHistoryPage]
})
export class MaintenanceHistoryPageModule {}
