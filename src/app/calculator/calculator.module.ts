import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule, UpperCasePipe, CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { CalculatorPageRoutingModule } from './calculator-routing.module';
import { CalculatorPage } from './calculator.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    UpperCasePipe,
    CurrencyPipe,
    DecimalPipe,
    CalculatorPageRoutingModule
  ],
  declarations: [CalculatorPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CalculatorPageModule {}
