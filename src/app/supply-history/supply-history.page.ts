import { Component, OnInit } from '@angular/core';
import { VehicleService, Vehicle, Supply } from '../services/vehicle.service';
import { ServicoAjudaOdometro } from '../services/ajuda-odometro.service';
import { ActivatedRoute } from '@angular/router';
import { AlertController, ModalController } from '@ionic/angular';
import { SupplyModalComponent } from '../home/modals/supply-modal/supply-modal.component';

interface SupplyWithVehicle extends Supply {
  vehicleModel: string;
  vehiclePlate: string;
}

@Component({
  selector: 'app-supply-history',
  templateUrl: './supply-history.page.html',
  styleUrls: ['./supply-history.page.scss'],
  standalone: false
})
export class SupplyHistoryPage implements OnInit {
  supplies: SupplyWithVehicle[] = [];
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
      this.supplies = this.flattenSupplies(vehicles, this.placaFiltrada);
    });
  }

  flattenSupplies(vehicles: Vehicle[], placaFiltrada?: string | null): SupplyWithVehicle[] {
    const allSupplies: SupplyWithVehicle[] = [];
    
    vehicles.forEach(vehicle => {
      if (placaFiltrada && vehicle.plate !== placaFiltrada) {
        return;
      }
      if (vehicle.supplies) {
        vehicle.supplies.forEach(supply => {
          allSupplies.push({
            ...supply,
            vehicleModel: vehicle.model,
            vehiclePlate: vehicle.plate
          });
        });
      }
    });

    // Sort by date descending (newest first)
    return allSupplies.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async editar_abastecimento(registro: SupplyWithVehicle) {
    const veiculo = this.vehicles.find(v => v.plate === registro.vehiclePlate);
    if (!veiculo) {
      return;
    }

    const modal = await this.modalCtrl.create({
      component: SupplyModalComponent,
      componentProps: {
        vehicles: this.vehicles,
        editingSupply: registro,
        editingVehiclePlate: veiculo.plate
      }
    });

    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data && data.saved) {
      this.supplies = this.flattenSupplies(this.vehicles, this.placaFiltrada);
    }
  }

  async remover_abastecimento(registro: SupplyWithVehicle) {
    if (!registro.id) {
      return;
    }
    const veiculo = this.vehicles.find(v => v.plate === registro.vehiclePlate);
    if (!veiculo) {
      return;
    }

    const alerta = await this.alertCtrl.create({
      header: 'Confirmar exclusão',
      message: 'Deseja realmente excluir este abastecimento?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Excluir',
          role: 'destructive',
          handler: () => {
            this.vehicleService.removerAbastecimento(veiculo.plate, registro.id!);
            this.supplies = this.flattenSupplies(this.vehicles, this.placaFiltrada);
          }
        }
      ]
    });

    await alerta.present();
  }
}
