import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { HomePage } from './home.page';
import { SupplyModalComponent } from './modals/supply-modal/supply-modal.component';
import { ConsumptionModalComponent } from './modals/consumption-modal/consumption-modal.component';
import { MaintenanceModalComponent } from './modals/maintenance-modal/maintenance-modal.component';
import { TripModalComponent } from './modals/trip-modal/trip-modal.component';

import { HomePageRoutingModule } from './home-routing.module';
import { BaseChartDirective } from 'ng2-charts';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HomePageRoutingModule,
    BaseChartDirective
  ],
  declarations: [
    HomePage,
    SupplyModalComponent,
    ConsumptionModalComponent,
    MaintenanceModalComponent,
    TripModalComponent
  ]
})
export class HomePageModule {}
