import { Component, Input, OnInit } from '@angular/core';
import { ModalController, AlertController, ToastController } from '@ionic/angular';
import { VehicleService, Vehicle, Trip } from '../../../services/vehicle.service';

@Component({
  selector: 'app-trip-modal',
  templateUrl: './trip-modal.component.html',
  styleUrls: ['./trip-modal.component.scss'],
  standalone: false
})
export class TripModalComponent implements OnInit {
  @Input() vehicles: Vehicle[] = [];
  @Input() editingTrip: Trip | null = null;
  @Input() editingVehiclePlate: string | null = null;

  tripDate: string = '';
  tripVehicle: string = '';
  distance: number | null = null;
  fuelPriceStr: string = '';
  tollPriceStr: string = '';
  fuelPrice: number | null = null;
  tollPrice: number | null = null;
  totalCost: number | null = null;
  observations: string = '';
  consumoManual: number | null = null;

  isEditing: boolean = false;
  hasValidationErrors: boolean = false;
  vehicleError: boolean = false;
  dateError: boolean = false;
  distanceError: boolean = false;
  fuelPriceError: boolean = false;
  resultError: boolean = false;

  /** Formato DD/MM/YYYY na exibição do botão de data */
  readonly opcoesFormatoData: { date: Intl.DateTimeFormatOptions } = {
    date: { day: '2-digit', month: '2-digit', year: 'numeric' }
  };

  constructor(
    private modalCtrl: ModalController,
    private vehicleService: VehicleService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.initDate();
    if (this.editingTrip && this.editingVehiclePlate) {
      this.isEditing = true;
      this.loadTrip(this.editingTrip);
    } else {
      if (this.editingVehiclePlate) {
        this.tripVehicle = this.editingVehiclePlate;
      } else if (this.vehicles.length > 0) {
        const defaultVehicle = this.vehicles.find(v => v.isDefault);
        this.tripVehicle = defaultVehicle ? defaultVehicle.plate : this.vehicles[0].plate;
      }
      this.aoMudarVeiculo();
    }
  }

  initDate() {
    const today = new Date();
    const offset = today.getTimezoneOffset() * 60000;
    this.tripDate = new Date(today.getTime() - offset).toISOString();
  }

  loadTrip(trip: Trip) {
    this.tripVehicle = this.editingVehiclePlate || '';
    const d = new Date(trip.date);
    const offset = d.getTimezoneOffset() * 60000;
    this.tripDate = new Date(d.getTime() - offset).toISOString();

    this.distance = trip.distance;
    this.fuelPrice = trip.fuelPrice;
    this.totalCost = trip.totalCost;
    this.tollPrice = trip.tollCost ?? null;
    this.observations = trip.observations ?? '';

    this.fuelPriceStr = this.fuelPrice
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(this.fuelPrice)
      : '';

    this.tollPriceStr = this.tollPrice != null
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(this.tollPrice)
      : '';

    const vehicle = this.vehicles.find(v => v.plate === this.tripVehicle.toUpperCase());
    if ((!vehicle?.consumption || vehicle.consumption <= 0) && trip.consumption) {
      this.consumoManual = trip.consumption;
    }
  }

  /** Consumo usado no cálculo: cadastro do veículo, viagem em edição ou valor digitado manualmente. */
  getConsumoEfetivoModal(): number | null {
    const vehicle = this.vehicles.find(v => v.plate === this.tripVehicle?.toUpperCase());
    if (vehicle?.consumption && vehicle.consumption > 0) return vehicle.consumption;
    if (this.consumoManual != null && this.consumoManual > 0) return this.consumoManual;
    if (this.isEditing && this.editingTrip?.consumption) return this.editingTrip.consumption;
    return null;
  }

  get missingFields(): string[] {
    const fields: string[] = [];
    if (!this.tripVehicle) {
      fields.push('Veículo');
    }
    if (!this.tripDate) {
      fields.push('Data');
    }
    if (!this.distance) {
      fields.push('Distância');
    }
    if (!this.fuelPriceStr) {
      fields.push('Preço do Combustível');
    }
    const vehicle = this.vehicles.find(v => v.plate === this.tripVehicle?.toUpperCase());
    const precisaMedia = vehicle && (this.getConsumoVeiculo() === null || this.getConsumoVeiculo() === 0);
    if (precisaMedia && (!this.getConsumoEfetivoModal() || this.getConsumoEfetivoModal()! <= 0)) {
      fields.push('Média do veículo');
    }
    return fields;
  }

  close() {
    this.modalCtrl.dismiss();
  }

  private parseCurrency(value: string): number | null {
    if (!value) {
      return null;
    }
    const onlyDigits = value.replace(/\D/g, '');
    if (!onlyDigits) {
      return null;
    }
    const numericValue = parseInt(onlyDigits, 10) / 100;
    return numericValue;
  }

  formatFuelPrice(event: any) {
    let value = event.target.value;
    value = value.replace(/\D/g, '');
    if (value === '') {
      this.fuelPriceStr = '';
      this.fuelPrice = null;
      this.fuelPriceError = false;
      return;
    }
    const numericValue = parseInt(value, 10) / 100;
    this.fuelPrice = numericValue;
    this.fuelPriceStr = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numericValue);
    this.fuelPriceError = false;
  }

  formatTollPrice(event: any) {
    let value = event.target.value;
    value = value.replace(/\D/g, '');
    if (value === '') {
      this.tollPriceStr = '';
      this.tollPrice = null;
      return;
    }
    const numericValue = parseInt(value, 10) / 100;
    this.tollPrice = numericValue;
    this.tollPriceStr = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numericValue);
  }

  calculateTotal() {
    this.vehicleError = false;
    this.dateError = false;
    this.distanceError = false;
    this.fuelPriceError = false;
    this.resultError = false;
    this.hasValidationErrors = false;

    const vehicle = this.vehicles.find(v => v.plate === this.tripVehicle.toUpperCase());

    if (!vehicle) {
      this.vehicleError = true;
      this.hasValidationErrors = true;
    }
    if (!this.tripDate) {
      this.dateError = true;
      this.hasValidationErrors = true;
    }
    if (!this.distance) {
      this.distanceError = true;
      this.hasValidationErrors = true;
    }

    this.fuelPrice = this.parseCurrency(this.fuelPriceStr);
    this.tollPrice = this.parseCurrency(this.tollPriceStr || '') || null;

    if (!this.fuelPrice) {
      this.fuelPriceError = true;
      this.hasValidationErrors = true;
    }

    const consumo = this.getConsumoEfetivoModal();
    const precisaMedia = vehicle && (this.getConsumoVeiculo() === null || this.getConsumoVeiculo() === 0);
    if (precisaMedia && (!consumo || consumo <= 0)) {
      this.resultError = true;
      this.hasValidationErrors = true;
    }
    if (!vehicle || !consumo || !this.distance || !this.fuelPrice) {
      this.totalCost = null;
      return;
    }

    const litersNeeded = this.distance / consumo;
    const fuelCost = litersNeeded * this.fuelPrice;
    const tollCost = this.tollPrice || 0;
    this.totalCost = fuelCost + tollCost;
  }

  async save() {
    this.vehicleError = false;
    this.dateError = false;
    this.distanceError = false;
    this.fuelPriceError = false;
    this.resultError = false;
    this.hasValidationErrors = false;

    if (!this.tripVehicle) {
      this.vehicleError = true;
      this.hasValidationErrors = true;
    }
    if (!this.tripDate) {
      this.dateError = true;
      this.hasValidationErrors = true;
    }
    if (!this.distance) {
      this.distanceError = true;
      this.hasValidationErrors = true;
    }

    this.fuelPrice = this.parseCurrency(this.fuelPriceStr);
    this.tollPrice = this.parseCurrency(this.tollPriceStr || '') || null;

    if (!this.fuelPrice) {
      this.fuelPriceError = true;
      this.hasValidationErrors = true;
    }

    if (this.hasValidationErrors) {
      const alert = await this.alertCtrl.create({
        header: 'Campos obrigatórios',
        message: 'Preencha todos os campos obrigatórios antes de salvar.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    const datePart = this.tripDate.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);

    const normalizedPlate = this.tripVehicle.toUpperCase();
    const vehicle = this.vehicles.find(v => v.plate === normalizedPlate);

    const consumo = this.getConsumoEfetivoModal();
    if (!vehicle || !consumo) {
      const alert = await this.alertCtrl.create({
        header: 'Consumo obrigatório',
        message: 'Digite a média do veículo (km/L) para calcular o custo da viagem.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    const custoCombustivel = (this.distance! / consumo) * this.fuelPrice!;
    const custoPedagio = this.tollPrice ?? 0;
    const totalRecalculado = custoCombustivel + custoPedagio;

    const newTrip: Trip = {
      id: this.isEditing && this.editingTrip ? this.editingTrip.id : undefined,
      date: localDate,
      distance: this.distance!,
      consumption: consumo,
      fuelPrice: this.fuelPrice!,
      tollCost: this.tollPrice ?? undefined,
      totalCost: totalRecalculado,
      observations: this.observations?.trim() || undefined,
      createdAt: this.editingTrip?.createdAt || Date.now()
    };

    let success = false;
    if (this.isEditing && this.editingTrip) {
      success = this.vehicleService.updateTrip(normalizedPlate, newTrip);
    } else {
      success = this.vehicleService.addTrip(normalizedPlate, newTrip);
    }

    if (success) {
      const toast = await this.toastCtrl.create({
        message: this.isEditing ? 'Viagem atualizada com sucesso!' : 'Viagem registrada com sucesso!',
        duration: 2000,
        position: 'bottom',
        color: 'success'
      });
      await toast.present();

      this.modalCtrl.dismiss({ saved: true });
    }
  }

  getConsumoVeiculo(): number | null {
    if (!this.tripVehicle) return null;
    const vehicle = this.vehicles.find(v => v.plate === this.tripVehicle.toUpperCase());
    return vehicle?.consumption ?? null;
  }

  aoMudarVeiculo() {
    const vehicle = this.vehicles.find(v => v.plate === this.tripVehicle?.toUpperCase());
    if (vehicle && (!vehicle.consumption || vehicle.consumption <= 0)) {
      const media = this.vehicleService.calcularMediaConsumoResumo(vehicle);
      this.consumoManual = media > 0 ? media : null;
    } else {
      this.consumoManual = null;
    }
  }

  viewHistory() {
    this.modalCtrl.dismiss({ action: 'view_history' });
  }
}

