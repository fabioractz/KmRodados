import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { ExpenseHistoryPageRoutingModule } from './expense-history-routing.module';
import { ExpenseHistoryPage } from './expense-history.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ExpenseHistoryPageRoutingModule
  ],
  declarations: [ExpenseHistoryPage]
})
export class ExpenseHistoryPageModule {}

