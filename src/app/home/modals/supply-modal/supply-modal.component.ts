import { Component, Input, OnInit } from '@angular/core';
import { ModalController, AlertController, ToastController } from '@ionic/angular';
import { VehicleService, Vehicle, Supply } from '../../../services/vehicle.service';
import { ServicoAjudaOdometro } from '../../../services/ajuda-odometro.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-supply-modal',
  templateUrl: './supply-modal.component.html',
  styleUrls: ['./supply-modal.component.scss'],
  standalone: false
})
export class SupplyModalComponent implements OnInit {
  @Input() vehicles: Vehicle[] = [];
  @Input() editingSupply: Supply | null = null;
  @Input() editingVehiclePlate: string | null = null;

  supplyDate: string = '';
  selectedVehiclePlate: string = '';
  gasStation: string = '';
  initialOdometer: number | null = null;
  liters: number | null = null;
  totalValue: number | null = null;
  totalValueStr: string = '';
  observations: string = '';

  isEditing: boolean = false;

  constructor(
    private modalCtrl: ModalController,
    private vehicleService: VehicleService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private router: Router,
    public ajuda_odometro: ServicoAjudaOdometro
  ) {}

  ngOnInit() {
    this.initDate();
    if (this.editingSupply && this.editingVehiclePlate) {
      this.isEditing = true;
      this.loadSupply(this.editingSupply);
    } else {
      if (this.vehicles.length > 0) {
        // If a plate was passed via Input (e.g. from query params logic in parent), use it
        // Note: The parent should pass it as selectedVehiclePlate if needed, but for now we check logic
        // We can add an Input for preSelectedPlate
        if (this.editingVehiclePlate) {
            this.selectedVehiclePlate = this.editingVehiclePlate;
        } else {
            const defaultVehicle = this.vehicles.find(v => v.isDefault);
            this.selectedVehiclePlate = defaultVehicle ? defaultVehicle.plate : this.vehicles[0].plate;
        }
      }
    }
  }

  @Input() set preSelectedPlate(plate: string) {
      if (plate) this.selectedVehiclePlate = plate;
  }

  initDate() {
    // Use current local date for ion-datetime
    const today = new Date();
    // Adjust for timezone to ensure we get the local date string
    const offset = today.getTimezoneOffset() * 60000;
    this.supplyDate = new Date(today.getTime() - offset).toISOString();
  }

  loadSupply(supply: Supply) {
    this.selectedVehiclePlate = this.editingVehiclePlate!;
    const d = new Date(supply.date);
    // Adjust for timezone to ensure we get the local date string
    const offset = d.getTimezoneOffset() * 60000;
    this.supplyDate = new Date(d.getTime() - offset).toISOString();

    this.gasStation = supply.gasStation || '';
    this.initialOdometer = supply.initialOdometer || null;
    this.liters = supply.liters || null;
    this.totalValue = supply.totalValue || null;
    if (this.totalValue) {
      this.totalValueStr = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(this.totalValue);
    }
    this.observations = supply.observations || '';
  }

  close() {
    this.modalCtrl.dismiss();
  }

  formatCurrency(event: any) {
    let value = event.target.value;
    value = value.replace(/\D/g, '');
    if (value === '') {
      this.totalValueStr = '';
      this.totalValue = null;
      return;
    }
    const numericValue = parseInt(value, 10) / 100;
    this.totalValue = numericValue;
    this.totalValueStr = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numericValue);
  }

  async save() {
    if (!this.selectedVehiclePlate || !this.supplyDate) {
      const alert = await this.alertCtrl.create({
        header: 'Campos Obrigatórios',
        message: 'Por favor, selecione um veículo e informe a data.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    const datePart = this.supplyDate.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);

    const newSupply: Supply = {
      id: this.isEditing ? this.editingSupply!.id : undefined,
      date: localDate,
      gasStation: this.gasStation,
      initialOdometer: this.initialOdometer ?? undefined,
      liters: this.liters ?? undefined,
      totalValue: this.totalValue ?? undefined,
      observations: this.observations
    };

    if (this.isEditing) {
      this.vehicleService.updateSupply(this.selectedVehiclePlate, newSupply);
    } else {
      this.vehicleService.addSupply(this.selectedVehiclePlate, newSupply);
    }

    const toast = await this.toastCtrl.create({
      message: this.isEditing ? 'Abastecimento atualizado com sucesso!' : 'Abastecimento registrado com sucesso!',
      duration: 2000,
      position: 'bottom',
      color: 'success'
    });
    await toast.present();

    this.modalCtrl.dismiss({ saved: true });
  }

  viewHistory() {
    this.modalCtrl.dismiss({ action: 'view_history' });
  }
}
