import { Component, OnInit } from '@angular/core';
import { VehicleService, Vehicle } from '../services/vehicle.service';
import { Router } from '@angular/router';
import { ActionSheetController, AlertController, ToastController } from '@ionic/angular';
import { ServicoAjudaOdometro } from '../services/ajuda-odometro.service';
import { addIcons } from 'ionicons';
import { 
  carSportOutline, carOutline, busOutline, close, star, starOutline, 
  createOutline, trashOutline, colorFillOutline, constructOutline, calculatorOutline, speedometer 
} from 'ionicons/icons';

@Component({
  selector: 'app-vehicles',
  templateUrl: 'vehicles.page.html',
  styleUrls: ['vehicles.page.scss'],
  standalone: false,
})
export class VehiclesPage implements OnInit {

  vehicles: Vehicle[] = [];
  vehicleType: string = '';
  vehicleModel: string = '';
  vehicleConsumption: number | null = null;
  vehicleOdometer: number | null = null;
  vehiclePlate: string = '';
  vehicleObservations: string = '';
  
  isFormVisible: boolean = false;
  editingPlate: string | null = null;

  constructor(
    private vehicleService: VehicleService, 
    private router: Router,
    private actionSheetCtrl: ActionSheetController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    public ajuda_odometro: ServicoAjudaOdometro
  ) {
    addIcons({ 
      'car-sport-outline': carSportOutline, 
      'car-outline': carOutline, 
      'bus-outline': busOutline, 
      'close': close, 
      'star': star, 
      'star-outline': starOutline, 
      'create-outline': createOutline, 
      'trash-outline': trashOutline, 
      'color-fill-outline': colorFillOutline, 
      'construct-outline': constructOutline, 
      'calculator-outline': calculatorOutline,
      'gas-station': 'assets/icon/gas-station.svg',
      'speedometer': speedometer
    });
  }

  ngOnInit() {
    this.vehicleService.getVehicles().subscribe(vehicles => {
      this.vehicles = vehicles;
    });
  }

  getVehicleTypeName(type: string) {
    return this.vehicleService.getVehicleTypeName(type);
  }

  getVehicleIcon(type: string) {
    return this.vehicleService.getVehicleIcon(type);
  }

  async openVehicleTypeSelector() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Selecione o Tipo de Veículo',
      buttons: [
        {
          text: 'Carro',
          icon: 'car-sport-outline',
          handler: () => { this.vehicleType = 'car'; }
        },
        {
          text: 'Moto',
          icon: 'moto-custom',
          handler: () => { this.vehicleType = 'motorcycle'; }
        },
        {
          text: 'Caminhão',
          icon: 'truck-heavy',
          handler: () => { this.vehicleType = 'truck'; }
        },
        {
          text: 'Ônibus',
          icon: 'bus-outline',
          handler: () => { this.vehicleType = 'bus'; }
        },
        {
          text: 'Van',
          icon: 'car-outline',
          handler: () => { this.vehicleType = 'van'; }
        },
        {
          text: 'Cancelar',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  goToSupply(vehicle: Vehicle) {
    this.router.navigate(['/tabs/home'], { queryParams: { action: 'supply', plate: vehicle.plate, source: 'vehicles' } });
  }

  goToMaintenance(vehicle: Vehicle) {
    this.router.navigate(['/tabs/home'], { queryParams: { action: 'maintenance', plate: vehicle.plate, source: 'vehicles' } });
  }

  goToCalculator(vehicle: Vehicle) {
    this.router.navigate(['/tabs/home'], { queryParams: { action: 'calculator', plate: vehicle.plate, source: 'vehicles' } });
  }

  abrirHistoricoAbastecimentos(veiculo: Vehicle) {
    this.router.navigate(['/supply-history'], { queryParams: { plate: veiculo.plate } });
  }

  abrirHistoricoManutencoes(veiculo: Vehicle) {
    this.router.navigate(['/maintenance-history'], { queryParams: { plate: veiculo.plate } });
  }

  abrirPaginaAcoesVeiculo(veiculo: Vehicle) {
    this.router.navigate(['/tabs/vehicles/acoes', veiculo.plate]);
  }

  saveVehicle() {
    if (this.vehicleType && this.vehicleModel && this.vehiclePlate) {
      const normalizedPlate = this.vehiclePlate.toUpperCase();
      this.vehiclePlate = normalizedPlate;

      const vehicleData: Vehicle = {
        type: this.vehicleType,
        model: this.vehicleModel,
        consumption: this.vehicleConsumption || undefined,
        odometer: this.vehicleOdometer ?? undefined,
        plate: normalizedPlate,
        observations: this.vehicleObservations || undefined
      };

      if (this.editingPlate) {
        this.vehicleService.updateVehicle(this.editingPlate, vehicleData);
        alert('Veículo atualizado com sucesso!');
        this.editingPlate = null;
        this.isFormVisible = false;
      } else {
        if (this.vehicles.some(v => v.plate === normalizedPlate)) {
          alert('Já existe um veículo com esta placa!');
          return;
        }
        this.vehicleService.addVehicle(vehicleData);
        alert('Veículo salvo com sucesso!');
        this.isFormVisible = false;
      }
      
      // Limpar campos
      this.clearForm();

      // Se não estiver editando, pode redirecionar ou manter na tela
      // this.router.navigate(['/tabs/home']); 
    } else {
      alert('Por favor, preencha todos os campos obrigatórios.');
    }
  }

  editVehicle(vehicle: Vehicle) {
    this.router.navigate(['/tabs/vehicles/form', vehicle.plate]);
  }

  async setDefault(vehicle: Vehicle) {
    this.vehicleService.setDefaultVehicle(vehicle.plate);
    const toast = await this.toastCtrl.create({
      message: `Veículo ${vehicle.model} definido como padrão.`,
      duration: 2000,
      position: 'bottom'
    });
    toast.present();
  }

  async deleteVehicle(vehicle: Vehicle) {
    const alert = await this.alertCtrl.create({
      header: 'Confirmar Exclusão',
      message: `Deseja realmente excluir o veículo ${vehicle.model}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Excluir',
          handler: () => {
            this.vehicleService.deleteVehicle(vehicle.plate);
            if (this.editingPlate === vehicle.plate) {
              this.cancelEdit();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  cancelEdit() {
    this.editingPlate = null;
    this.isFormVisible = false;
    this.clearForm();
  }

  toggleForm() {
    this.router.navigate(['/tabs/vehicles/form']);
  }

  clearForm() {
    this.vehicleType = '';
    this.vehicleModel = '';
    this.vehicleConsumption = null;
    this.vehicleOdometer = null;
    this.vehiclePlate = '';
    this.vehicleObservations = '';
  }

}
