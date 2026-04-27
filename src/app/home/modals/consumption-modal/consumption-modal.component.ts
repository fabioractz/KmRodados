import { Component, Input, OnInit } from '@angular/core';
import { ModalController, AlertController, ToastController } from '@ionic/angular';
import { VehicleService, Vehicle, ConsumptionRecord } from '../../../services/vehicle.service';
import { ServicoAjudaOdometro } from '../../../services/ajuda-odometro.service';

@Component({
  selector: 'app-consumption-modal',
  templateUrl: './consumption-modal.component.html',
  styleUrls: ['./consumption-modal.component.scss'],
  standalone: false
})
export class ConsumptionModalComponent implements OnInit {
  @Input() vehicles: Vehicle[] = [];
  @Input() editingRecord: ConsumptionRecord | null = null;
  @Input() editingVehiclePlate: string | null = null;
  
  calcSelectedVehicle: string = '';
  calcInitialOdometer: number | null = null;
  calcInitialOdometerStr: string = '';
  calcFinalOdometer: number | null = null;
  calcFinalOdometerStr: string = '';
  calcDist: number | null = null;
  calcLiters: number | string | null = null;
  calcResult: number | null = null;
  
  isEditing: boolean = false;
  vehicleError: boolean = false;
  initialOdometerError: boolean = false;
  finalOdometerError: boolean = false;
  litersError: boolean = false;
  resultError: boolean = false;

  constructor(
    private modalCtrl: ModalController,
    private vehicleService: VehicleService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    public ajuda_odometro: ServicoAjudaOdometro
  ) {}

  ngOnInit() {
    if (this.editingRecord && this.editingVehiclePlate) {
      this.isEditing = true;
      this.loadRecord(this.editingRecord);
    } else {
        if (this.editingVehiclePlate) {
            this.calcSelectedVehicle = this.editingVehiclePlate;
        } else if (this.vehicles.length > 0) {
            const defaultVehicle = this.vehicles.find(v => v.isDefault);
            this.calcSelectedVehicle = defaultVehicle ? defaultVehicle.plate : this.vehicles[0].plate;
        }
    }
  }
  
  @Input() set preSelectedPlate(plate: string) {
      if (plate) this.calcSelectedVehicle = plate;
  }

  loadRecord(record: ConsumptionRecord) {
      this.calcSelectedVehicle = this.editingVehiclePlate!;
      this.calcInitialOdometer = record.initialOdometer || null;
      this.calcInitialOdometerStr = this.calcInitialOdometer ? new Intl.NumberFormat('pt-BR').format(this.calcInitialOdometer) : '';
      this.calcFinalOdometer = record.finalOdometer || null;
      this.calcFinalOdometerStr = this.calcFinalOdometer ? new Intl.NumberFormat('pt-BR').format(this.calcFinalOdometer) : '';
      this.calcDist = record.distance;
      this.calcLiters = record.liters;
      this.calcResult = record.result;
  }

  close() {
    this.modalCtrl.dismiss();
  }

  get missingFields(): string[] {
    const fields: string[] = [];
    if (!this.calcSelectedVehicle) {
      fields.push('Veículo');
    }
    if (this.calcInitialOdometer === null) {
      fields.push('Odômetro Inicial');
    }
    if (this.calcFinalOdometer === null) {
      fields.push('Odômetro Final');
    }
    if (!this.calcLiters) {
      fields.push('Litros Abastecidos');
    }
    return fields;
  }

  get hasValidationErrors(): boolean {
    return this.vehicleError || this.initialOdometerError || this.finalOdometerError || this.litersError;
  }

  updateDistance() {
    if (this.calcInitialOdometer !== null && this.calcFinalOdometer !== null) {
      this.calcDist = this.calcFinalOdometer - this.calcInitialOdometer;
      this.initialOdometerError = false;
      this.finalOdometerError = false;
    }
    this.calculateConsumption();
  }

  formatInitialOdometer(event: any) {
    let value = event.target.value;
    const numericString = value.replace(/\D/g, '');
    if (numericString === '') {
      this.calcInitialOdometerStr = '';
      this.calcInitialOdometer = null;
      return;
    }
    const numericValue = parseInt(numericString, 10);
    this.calcInitialOdometer = numericValue;
    this.calcInitialOdometerStr = new Intl.NumberFormat('pt-BR').format(numericValue);
    this.updateDistance();
  }

  formatFinalOdometer(event: any) {
    let value = event.target.value;
    const numericString = value.replace(/\D/g, '');
    if (numericString === '') {
      this.calcFinalOdometerStr = '';
      this.calcFinalOdometer = null;
      return;
    }
    const numericValue = parseInt(numericString, 10);
    this.calcFinalOdometer = numericValue;
    this.calcFinalOdometerStr = new Intl.NumberFormat('pt-BR').format(numericValue);
    this.updateDistance();
  }

  /** Converte número digitado com vírgula/ponto (pt-BR) para number. */
  private parseDecimalBrasil(valor: any): number | null {
    if (valor === null || valor === undefined) return null;
    const texto = String(valor).trim();
    if (!texto) return null;
    // remove separadores de milhar e converte vírgula para ponto
    const normalizado = texto.replace(/\./g, '').replace(',', '.');
    const numero = Number(normalizado);
    return isNaN(numero) ? null : numero;
  }

  calculateConsumption(event?: any) {
    const distancia = this.calcDist != null ? this.calcDist : null;
    const origemLitros = event?.target?.value ?? this.calcLiters;
    const litros = this.parseDecimalBrasil(origemLitros);
    if (distancia != null && litros != null && litros > 0) {
      this.calcResult = Number((distancia / litros).toFixed(3));
      this.litersError = false;
    } else {
      this.calcResult = null;
    }
  }

  async save() {
    // Resetar erros
    this.vehicleError = false;
    this.initialOdometerError = false;
    this.finalOdometerError = false;
    this.litersError = false;

    let hasError = false;

    const litrosNumero = this.parseDecimalBrasil(this.calcLiters);

    if (!this.calcSelectedVehicle) {
      this.vehicleError = true;
      hasError = true;
    }
    if (this.calcInitialOdometer === null) {
      this.initialOdometerError = true;
      hasError = true;
    }
    if (this.calcFinalOdometer === null) {
      this.finalOdometerError = true;
      hasError = true;
    }
    if (!litrosNumero || litrosNumero <= 0) {
      this.litersError = true;
      hasError = true;
    }

    if (hasError) {
      return;
    }

    const newRecord: ConsumptionRecord = {
      id: this.isEditing ? this.editingRecord!.id : undefined,
      date: new Date(),
      initialOdometer: this.calcInitialOdometer ?? undefined,
      finalOdometer: this.calcFinalOdometer ?? undefined,
      distance: this.calcDist!,
      liters: litrosNumero!,
      result: this.calcResult!
    };

    if (this.isEditing) {
      this.vehicleService.updateConsumptionRecord(this.calcSelectedVehicle, newRecord);
    } else {
      this.vehicleService.addConsumptionRecord(this.calcSelectedVehicle, newRecord);
    }

    const toast = await this.toastCtrl.create({
        message: this.isEditing ? 'Registro atualizado com sucesso!' : 'Média de consumo salva com sucesso!',
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
