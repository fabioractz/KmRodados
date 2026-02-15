import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { SupplyHistoryPageRoutingModule } from './supply-history-routing.module';
import { SupplyHistoryPage } from './supply-history.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SupplyHistoryPageRoutingModule
  ],
  declarations: [SupplyHistoryPage]
})
export class SupplyHistoryPageModule {}
