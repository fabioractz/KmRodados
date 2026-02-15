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
  calcFinalOdometer: number | null = null;
  calcDist: number | null = null;
  calcLiters: number | null = null;
  calcResult: number | null = null;
  
  isEditing: boolean = false;

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
      this.calcFinalOdometer = record.finalOdometer || null;
      this.calcDist = record.distance;
      this.calcLiters = record.liters;
      this.calcResult = record.result;
  }

  close() {
    this.modalCtrl.dismiss();
  }

  updateDistance() {
    if (this.calcInitialOdometer !== null && this.calcFinalOdometer !== null) {
      this.calcDist = this.calcFinalOdometer - this.calcInitialOdometer;
    }
    this.calculateConsumption();
  }

  calculateConsumption() {
    if (this.calcDist && this.calcLiters && this.calcLiters > 0) {
      this.calcResult = this.calcDist / this.calcLiters;
    } else {
      this.calcResult = null;
    }
  }

  async save() {
    if (!this.calcSelectedVehicle || !this.calcResult || !this.calcDist || !this.calcLiters) {
      const alert = await this.alertCtrl.create({
        header: 'Campos Obrigatórios',
        message: 'Por favor, selecione um veículo e certifique-se que o cálculo foi realizado.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    const newRecord: ConsumptionRecord = {
      id: this.isEditing ? this.editingRecord!.id : undefined,
      date: new Date(),
      initialOdometer: this.calcInitialOdometer ?? undefined,
      finalOdometer: this.calcFinalOdometer ?? undefined,
      distance: this.calcDist,
      liters: this.calcLiters,
      result: this.calcResult
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
