import { Component, Input, OnInit } from '@angular/core';
import { ModalController, AlertController, ToastController } from '@ionic/angular';
import { VehicleService, Vehicle, Maintenance } from '../../../services/vehicle.service';
import { ServicoAjudaOdometro } from '../../../services/ajuda-odometro.service';
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
  maintTime: string = '';
  maintVehicle: string = '';
  maintOdometer: number | null = null;
  maintOdometerStr: string = '';
  maintSummary: string = '';
  maintParts: string = '';
  maintPartsValue: number | null = null;
  maintPartsValueStr: string = '';
  maintServiceValue: number | null = null;
  maintServiceValueStr: string = '';
  maintTotalValue: number | null = null;
  maintTotalValueStr: string = '';
  
  isEditing: boolean = false;
  vehicleError: boolean = false;
  dateError: boolean = false;
  odometerError: boolean = false;
  summaryError: boolean = false;
  totalValueError: boolean = false;

  mostrarMaisCampos: boolean = false;

  /** Formato DD/MM/YYYY na exibição do botão de data */
  readonly opcoesFormatoData: { date: Intl.DateTimeFormatOptions } = {
    date: { day: '2-digit', month: '2-digit', year: 'numeric' }
  };

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
    const localISO = new Date(today.getTime() - offset).toISOString();
    this.maintDate = localISO;
    this.maintTime = localISO;
  }

  loadMaintenance(maint: Maintenance) {
      this.maintVehicle = this.editingVehiclePlate!;
      const d = new Date(maint.date);
      const offset = d.getTimezoneOffset() * 60000;
      const isoLocal = new Date(d.getTime() - offset).toISOString();
      this.maintDate = isoLocal;
      this.maintTime = isoLocal;
      
      this.maintOdometer = maint.odometer;
      this.maintOdometerStr = new Intl.NumberFormat('pt-BR').format(maint.odometer);
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

  get missingFields(): string[] {
    const fields: string[] = [];
    if (!this.maintVehicle) {
      fields.push('Veículo');
    }
    if (!this.maintDate) {
      fields.push('Data');
    }
    if (!this.maintSummary) {
      fields.push('Resumo do Serviço');
    }
    if (!this.maintTotalValue) {
      fields.push('Valor Total');
    }
    return fields;
  }

  get hasValidationErrors(): boolean {
    return this.vehicleError || this.dateError || this.summaryError || this.totalValueError;
  }

  updateMaintenanceTotal() {
    const parts = this.maintPartsValue || 0;
    const service = this.maintServiceValue || 0;
    
    // Só calcula automaticamente se o usuário não editou manualmente o total
    // OU se a soma das partes for maior que o total atual (assumindo que ele quer atualizar)
    // Para simplificar e atender ao pedido: vamos somar, mas permitir edição posterior.
    // O pedido diz: "não obrigue o campo a somente receber o valor calculado"
    // Então, ao alterar peças/mão de obra, podemos sugerir o total, mas o campo total deve ser editável.
    
    // Nova lógica: Se alterar peças ou mão de obra, atualiza o total SOMANDO eles.
    this.maintTotalValue = parts + service;
    this.maintTotalValueStr = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(this.maintTotalValue);
    this.totalValueError = false;
  }

  aoDigitarValorTotal(event: any) {
    let value = event.target.value;
    value = value.replace(/\D/g, '');
    if (value === '') {
      this.maintTotalValueStr = '';
      this.maintTotalValue = null;
      return;
    }
    const numericValue = parseInt(value, 10) / 100;
    this.maintTotalValue = numericValue;
    this.maintTotalValueStr = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numericValue);
    this.totalValueError = false;
  }

  formatOdometer(event: any) {
    let value = event.target.value;
    const numericString = value.replace(/\D/g, '');
    if (numericString === '') {
      this.maintOdometerStr = '';
      this.maintOdometer = null;
      return;
    }
    const numericValue = parseInt(numericString, 10);
    this.maintOdometer = numericValue;
    this.maintOdometerStr = new Intl.NumberFormat('pt-BR').format(numericValue);
  }

  async save() {
    // Resetar erros
    this.vehicleError = false;
    this.dateError = false;
    this.odometerError = false;
    this.summaryError = false;
    this.totalValueError = false;

    let hasError = false;

    if (!this.maintVehicle) {
      this.vehicleError = true;
      hasError = true;
    }
    if (!this.maintDate) {
      this.dateError = true;
      hasError = true;
    }
    // Odômetro não é mais obrigatório
    // if (!this.maintOdometer) {
    //   this.odometerError = true;
    //   hasError = true;
    // }
    if (!this.maintSummary) {
      this.summaryError = true;
      hasError = true;
    }
    if (!this.maintTotalValue) {
      this.totalValueError = true;
      hasError = true;
    }

    if (hasError) {
      return;
    }

    const origemDataHora = this.maintTime || this.maintDate;
    const [datePart, timePartRaw] = origemDataHora.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const timePart = (timePartRaw || '').split('.')[0] || '00:00:00';
    const [hour, minute, second] = timePart.split(':').map(Number);
    const localDate = new Date(year, month - 1, day, hour || 0, minute || 0, second || 0);

    const newMaintenance: Maintenance = {
      id: this.isEditing ? this.editingMaintenance!.id : undefined,
      date: localDate,
      odometer: this.maintOdometer || 0, // Envia 0 ou valor presente
      summary: this.maintSummary,
      parts: this.maintParts,
      partsValue: this.maintPartsValue || 0,
      serviceValue: this.maintServiceValue || 0,
      totalValue: this.maintTotalValue!
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
