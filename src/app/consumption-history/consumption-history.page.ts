import { Component, OnInit } from '@angular/core';
import { VehicleService, Vehicle, ConsumptionRecord } from '../services/vehicle.service';
import { AlertController, ModalController } from '@ionic/angular';
import { ConsumptionModalComponent } from '../home/modals/consumption-modal/consumption-modal.component';
import { firstValueFrom } from 'rxjs';

interface ConsumptionWithVehicle extends ConsumptionRecord {
  vehicleModel: string;
  vehiclePlate: string;
}

@Component({
  selector: 'app-consumption-history',
  templateUrl: './consumption-history.page.html',
  styleUrls: ['./consumption-history.page.scss'],
  standalone: false
})
export class ConsumptionHistoryPage implements OnInit {
  records: ConsumptionWithVehicle[] = [];

  constructor(
    private vehicleService: VehicleService,
    private alertCtrl: AlertController,
    private modalCtrl: ModalController
  ) { }

  ngOnInit() {
    this.vehicleService.getVehicles().subscribe(vehicles => {
      this.records = this.flattenRecords(vehicles);
    });
  }

  flattenRecords(vehicles: Vehicle[]): ConsumptionWithVehicle[] {
    const allRecords: ConsumptionWithVehicle[] = [];
    
    vehicles.forEach(vehicle => {
      if (vehicle.consumptionHistory) {
        vehicle.consumptionHistory.forEach(record => {
          allRecords.push({
            ...record,
            vehicleModel: vehicle.model,
            vehiclePlate: vehicle.plate
          });
        });
      }
    });

    // Sort by date descending (newest first)
    return allRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async editarConsumo(record: ConsumptionWithVehicle) {
    const vehicles = await firstValueFrom(this.vehicleService.getVehicles());
    if (!vehicles) return;

    const modal = await this.modalCtrl.create({
      component: ConsumptionModalComponent,
      componentProps: {
        vehicles: vehicles,
        editingRecord: record,
        editingVehiclePlate: record.vehiclePlate
      }
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data?.saved) {
      this.vehicleService.getVehicles().subscribe(vehicles => {
        this.records = this.flattenRecords(vehicles);
      });
    }
  }

  async removerConsumo(record: ConsumptionWithVehicle) {
    if (!record.id) {
      return;
    }

    const alerta = await this.alertCtrl.create({
      header: 'Confirmar exclusão',
      message: 'Deseja realmente excluir este registro de consumo?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Excluir',
          role: 'destructive',
          handler: () => {
            this.vehicleService.removerConsumo(record.vehiclePlate, record.id!);
            this.vehicleService.getVehicles().subscribe(vehicles => {
              this.records = this.flattenRecords(vehicles);
            });
          }
        }
      ]
    });

    await alerta.present();
  }
}
