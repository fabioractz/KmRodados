import { Component, OnInit } from '@angular/core';
import { VehicleService, Vehicle, Maintenance } from '../services/vehicle.service';
import { ServicoAjudaOdometro } from '../services/ajuda-odometro.service';
import { ActivatedRoute } from '@angular/router';
import { AlertController, ModalController } from '@ionic/angular';
import { MaintenanceModalComponent } from '../home/modals/maintenance-modal/maintenance-modal.component';

interface MaintenanceWithVehicle extends Maintenance {
  vehicleModel: string;
  vehiclePlate: string;
}

@Component({
  selector: 'app-maintenance-history',
  templateUrl: './maintenance-history.page.html',
  styleUrls: ['./maintenance-history.page.scss'],
  standalone: false
})
export class MaintenanceHistoryPage implements OnInit {
  maintenances: MaintenanceWithVehicle[] = [];
  vehicles: Vehicle[] = [];
  placaFiltrada: string | null = null;

  constructor(
    private vehicleService: VehicleService,
    public ajuda_odometro: ServicoAjudaOdometro,
    private route: ActivatedRoute,
    private alertCtrl: AlertController,
    private modalCtrl: ModalController
  ) { }

  ngOnInit() {
    this.placaFiltrada = this.route.snapshot.queryParamMap.get('plate');
    this.vehicleService.getVehicles().subscribe(vehicles => {
      this.vehicles = vehicles;
      this.maintenances = this.flattenMaintenances(vehicles, this.placaFiltrada);
    });
  }

  flattenMaintenances(vehicles: Vehicle[], placaFiltrada?: string | null): MaintenanceWithVehicle[] {
    const allMaintenances: MaintenanceWithVehicle[] = [];
    
    vehicles.forEach(vehicle => {
      if (placaFiltrada && vehicle.plate !== placaFiltrada) {
        return;
      }
      if (vehicle.maintenance) {
        vehicle.maintenance.forEach(maint => {
          allMaintenances.push({
            ...maint,
            vehicleModel: vehicle.model,
            vehiclePlate: vehicle.plate
          });
        });
      }
    });

    // Sort by date descending (newest first)
    return allMaintenances.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async editar_manutencao(registro: MaintenanceWithVehicle) {
    const veiculo = this.vehicles.find(v => v.plate === registro.vehiclePlate);
    if (!veiculo) {
      return;
    }

    const modal = await this.modalCtrl.create({
      component: MaintenanceModalComponent,
      componentProps: {
        vehicles: this.vehicles,
        editingMaintenance: registro,
        editingVehiclePlate: veiculo.plate
      }
    });

    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data && data.saved) {
      this.maintenances = this.flattenMaintenances(this.vehicles, this.placaFiltrada);
    }
  }

  async remover_manutencao(registro: MaintenanceWithVehicle) {
    if (!registro.id) {
      return;
    }
    const veiculo = this.vehicles.find(v => v.plate === registro.vehiclePlate);
    if (!veiculo) {
      return;
    }

    const alerta = await this.alertCtrl.create({
      header: 'Confirmar exclusão',
      message: 'Deseja realmente excluir esta manutenção?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Excluir',
          role: 'destructive',
          handler: () => {
            this.vehicleService.removerManutencao(veiculo.plate, registro.id!);
            this.maintenances = this.flattenMaintenances(this.vehicles, this.placaFiltrada);
          }
        }
      ]
    });

    await alerta.present();
  }
}
