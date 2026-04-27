import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { IncomeHistoryPageRoutingModule } from './income-history-routing.module';
import { IncomeHistoryPage } from './income-history.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    IncomeHistoryPageRoutingModule
  ],
  declarations: [IncomeHistoryPage]
})
export class IncomeHistoryPageModule {}

