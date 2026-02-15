import { Component, Input, OnInit } from '@angular/core';
import { ModalController, AlertController, ToastController } from '@ionic/angular';
import { VehicleService, Vehicle, Maintenance } from '../../../services/vehicle.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-maintenance-modal',
  templateUrl: './maintenance-modal.component.html',
  styleUrls: ['./maintenance-modal.component.scss'],
  standalone: false
})
export class MaintenanceModalComponent implements OnInit {
  @Input() vehicles: Vehicle[] = [];
  @Input() editingMaintenance: Maintenance | null = null;
  @Input() editingVehiclePlate: string | null = null;

  maintDate: string = '';
  maintVehicle: string = '';
  maintOdometer: number | null = null;
  maintSummary: string = '';
  maintParts: string = '';
  maintPartsValue: number | null = null;
  maintPartsValueStr: string = '';
  maintServiceValue: number | null = null;
  maintServiceValueStr: string = '';
  maintTotalValue: number | null = null;
  maintTotalValueStr: string = '';
  
  isEditing: boolean = false;

  constructor(
    private modalCtrl: ModalController,
    private vehicleService: VehicleService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private router: Router
  ) {}

  ngOnInit() {
    this.initDate();
    if (this.editingMaintenance && this.editingVehiclePlate) {
        this.isEditing = true;
        this.loadMaintenance(this.editingMaintenance);
    } else {
        if (this.editingVehiclePlate) {
            this.maintVehicle = this.editingVehiclePlate;
        } else if (this.vehicles.length > 0) {
            const defaultVehicle = this.vehicles.find(v => v.isDefault);
            this.maintVehicle = defaultVehicle ? defaultVehicle.plate : this.vehicles[0].plate;
        }
    }
  }

  @Input() set preSelectedPlate(plate: string) {
      if (plate) this.maintVehicle = plate;
  }

  initDate() {
    const today = new Date();
    const offset = today.getTimezoneOffset() * 60000;
    this.maintDate = new Date(today.getTime() - offset).toISOString();
  }

  loadMaintenance(maint: Maintenance) {
      this.maintVehicle = this.editingVehiclePlate!;
      const d = new Date(maint.date);
      const offset = d.getTimezoneOffset() * 60000;
      this.maintDate = new Date(d.getTime() - offset).toISOString();
      
      this.maintOdometer = maint.odometer;
      this.maintSummary = maint.summary;
      this.maintParts = maint.parts || '';
      
      this.maintPartsValue = maint.partsValue || null;
      this.maintPartsValueStr = this.maintPartsValue ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(this.maintPartsValue) : '';
      
      this.maintServiceValue = maint.serviceValue || null;
      this.maintServiceValueStr = this.maintServiceValue ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(this.maintServiceValue) : '';
      
      this.maintTotalValue = maint.totalValue;
      this.maintTotalValueStr = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(this.maintTotalValue);
  }

  close() {
    this.modalCtrl.dismiss();
  }

  handleCurrencyInput(event: any, field: string) {
    let value = event.target.value;
    value = value.replace(/\D/g, '');
    if (value === '') {
      (this as any)[field] = '';
      if (field === 'maintPartsValueStr') this.maintPartsValue = null;
      if (field === 'maintServiceValueStr') this.maintServiceValue = null;
      this.updateMaintenanceTotal();
      return;
    }
    const numericValue = parseInt(value, 10) / 100;
    (this as any)[field] = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numericValue);
    
    if (field === 'maintPartsValueStr') this.maintPartsValue = numericValue;
    if (field === 'maintServiceValueStr') this.maintServiceValue = numericValue;
    
    this.updateMaintenanceTotal();
  }

  updateMaintenanceTotal() {
    const parts = this.maintPartsValue || 0;
    const service = this.maintServiceValue || 0;
    this.maintTotalValue = parts + service;
    this.maintTotalValueStr = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(this.maintTotalValue);
  }

  async save() {
    if (!this.maintVehicle || !this.maintDate || !this.maintOdometer || !this.maintSummary || !this.maintTotalValue) {
      const alert = await this.alertCtrl.create({
        header: 'Atenção',
        message: 'Preencha os campos obrigatórios (Veículo, Data, Odômetro, Resumo e Valores).',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    const datePart = this.maintDate.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);

    const newMaintenance: Maintenance = {
      id: this.isEditing ? this.editingMaintenance!.id : undefined,
      date: localDate,
      odometer: this.maintOdometer,
      summary: this.maintSummary,
      parts: this.maintParts,
      partsValue: this.maintPartsValue || 0,
      serviceValue: this.maintServiceValue || 0,
      totalValue: this.maintTotalValue
    };

    if (this.isEditing) {
      this.vehicleService.updateMaintenance(this.maintVehicle, newMaintenance);
    } else {
      this.vehicleService.addMaintenance(this.maintVehicle, newMaintenance);
    }

    const toast = await this.toastCtrl.create({
        message: this.isEditing ? 'Manutenção atualizada com sucesso!' : 'Manutenção registrada com sucesso!',
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
