import { Component, OnInit } from '@angular/core';
import { VehicleService, Vehicle, Trip, ConsumptionRecord } from '../services/vehicle.service';
import { AlertController, ToastController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { addIcons } from 'ionicons';
import { backspaceOutline, create, speedometerOutline, carOutline, calculatorOutline, arrowBackOutline, mapOutline } from 'ionicons/icons';
import { AdsService } from '../services/ads.service';
import { ServicoAjudaOdometro } from '../services/ajuda-odometro.service';

@Component({
  selector: 'app-calculator',
  templateUrl: 'calculator.page.html',
  styleUrls: ['calculator.page.scss'],
  standalone: false,
})
export class CalculatorPage implements OnInit {

  // View State
  currentView: 'menu' | 'trip' | 'consumption' | 'simple' = 'menu';

  // Trip Calculator
  vehicles: Vehicle[] = [];
  selectedVehicle: Vehicle | null = null;
  distance: number | null = null;
  fuelPrice: number | null = null;
  fuelPriceStr: string = '';
  costObservations: string = '';
  
  result: number | null = null;
  litersNeeded: number | null = null;

  // Consumption Calculator
  calcSelectedVehicle: string = '';
  calcDate: string = '';
  calcInitialOdometer: number | null = null;
  calcFinalOdometer: number | null = null;
  calcDist: number | null = null;
  calcLiters: number | null = null;
  calcResult: number | null = null;

  // History & Editing
  isHistoryOpen: boolean = false;
  isEditing: boolean = false;
  editingId: string | undefined = undefined;
  tripDate: string = new Date().toISOString();

  placa_padrao_atual: string | null = null;
  placa_parametro: string | null = null;

  // Simple Calculator
  calcDisplay: string = '0';
  currentInput: string = '';
  previousInput: string = '';
  operation: string | null = null;
  shouldResetDisplay: boolean = false;

  constructor(
    private vehicleService: VehicleService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private route: ActivatedRoute,
    private ads: AdsService,
    public ajuda_odometro: ServicoAjudaOdometro
  ) {
    addIcons({ backspaceOutline, create, speedometerOutline, carOutline, calculatorOutline, arrowBackOutline, mapOutline });
  }

  ngOnInit() {
    this.initDate();
    this.ads.preloadInterstitial();
    this.route.queryParams.subscribe(params => {
      if (params && params['plate']) {
        this.placa_parametro = params['plate'];
      }
    });
    this.vehicleService.getVehicles().subscribe(vehicles => {
      this.vehicles = vehicles;
      
      let veiculo_parametro: Vehicle | undefined;
      if (this.placa_parametro) {
        veiculo_parametro = this.vehicles.find(v => v.plate === this.placa_parametro);
      }

      const veiculo_padrao = this.vehicles.find(v => v.isDefault) || null;
      const placa_padrao_nova = veiculo_padrao ? veiculo_padrao.plate : null;

      if (veiculo_parametro && !this.selectedVehicle) {
        this.selectedVehicle = veiculo_parametro;
        if (!this.calcSelectedVehicle) {
          this.calcSelectedVehicle = veiculo_parametro.plate;
        }
      }

      if (placa_padrao_nova && placa_padrao_nova !== this.placa_padrao_atual) {
        this.placa_padrao_atual = placa_padrao_nova;
        if (!this.placa_parametro) {
          this.selectedVehicle = veiculo_padrao;
          this.calcSelectedVehicle = placa_padrao_nova;
        }
      }

      if (!this.selectedVehicle && this.vehicles.length > 0) {
        const primeiro_veiculo = this.vehicles[0];
        this.selectedVehicle = primeiro_veiculo;
        if (!this.calcSelectedVehicle) {
          this.calcSelectedVehicle = primeiro_veiculo.plate;
        }
      } else if (!this.calcSelectedVehicle && this.selectedVehicle) {
        this.calcSelectedVehicle = this.selectedVehicle.plate;
      }
    });
  }

  initDate() {
    const today = new Date();
    const offset = today.getTimezoneOffset() * 60000;
    const localIso = new Date(today.getTime() - offset).toISOString();
    this.calcDate = localIso;
    this.tripDate = localIso;
  }

  setView(view: 'menu' | 'trip' | 'consumption' | 'simple') {
    this.currentView = view;
  }

  // Consumption Calculator Logic
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

  async saveConsumption() {
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
      date: new Date(),
      initialOdometer: this.calcInitialOdometer ?? undefined,
      finalOdometer: this.calcFinalOdometer ?? undefined,
      distance: this.calcDist,
      liters: this.calcLiters,
      result: this.calcResult
    };

    const success = this.vehicleService.addConsumptionRecord(this.calcSelectedVehicle, newRecord);

    if (success) {
      const toast = await this.toastCtrl.create({
        message: 'Cálculo salvo com sucesso!',
        duration: 2000,
        position: 'bottom',
        color: 'success'
      });
      await toast.present();
      const r = await this.ads.showInterstitialWithResult();
      if (!r.ok || !r.shown) {
        if (r.reason === 'throttled') {
          return;
        }
        const diag = this.ads.obterDiagnostico();
        const detalhes = `reason=${r.reason || 'unknown'}; error=${r.error || ''}; adId=${diag.adId}; testMode=${diag.testMode}; plataforma=${diag.plataforma}${diag.ultimoErro ? '; ultimoErro='+diag.ultimoErro : ''}${diag.diagnosticoAtivo ? '; diagnosticoAtivo=true' : ''}`;
        const alerta = await this.alertCtrl.create({
          header: 'Falha ao exibir anúncio',
          message: 'Não foi possível exibir o anúncio agora.',
          buttons: [
            {
              text: 'Copiar',
              handler: async () => {
                try {
                  await (navigator as any).clipboard?.writeText(detalhes);
                } catch {
                  try { (window as any).prompt?.('Copiar detalhes do erro:', detalhes); } catch {}
                }
              }
            },
            { text: 'OK', role: 'cancel' }
          ]
        });
        await alerta.present();
      }
      
      // Clear form
      this.calcInitialOdometer = null;
      this.calcFinalOdometer = null;
      this.calcDist = null;
      this.calcLiters = null;
      this.calcResult = null;
    }
  }

  onVehicleChange() {
    // Only reset result if we are NOT editing (or if we want to force re-calc)
    // When editing, we populate fields, so we might want to keep them.
    if (!this.isEditing) {
      this.result = null;
      this.litersNeeded = null;
    }
  }

  calculate() {
    this.fuelPrice = this.parseCurrency(this.fuelPriceStr);

    if (this.selectedVehicle && this.distance && this.fuelPrice && this.selectedVehicle.consumption) {
      this.litersNeeded = this.distance / this.selectedVehicle.consumption;
      this.result = this.litersNeeded * this.fuelPrice;
    } else {
      alert('Por favor, preencha todos os campos e certifique-se que o veículo tem consumo cadastrado.');
    }
  }

  async saveTrip() {
    this.fuelPrice = this.parseCurrency(this.fuelPriceStr);

    if (!this.selectedVehicle || !this.result || !this.distance || !this.fuelPrice) {
      const alert = await this.alertCtrl.create({
        header: 'Atenção',
        message: 'Calcule o custo antes de salvar.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    const datePart = this.tripDate.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);

    const newTrip: Trip = {
      id: this.isEditing ? this.editingId : undefined,
      date: localDate,
      distance: this.distance,
      consumption: this.selectedVehicle.consumption || 0,
      fuelPrice: this.fuelPrice,
      totalCost: this.result,
      createdAt: Date.now()
    };

    let success = false;
    if (this.isEditing) {
      success = this.vehicleService.updateTrip(this.selectedVehicle.plate, newTrip);
    } else {
      success = this.vehicleService.addTrip(this.selectedVehicle.plate, newTrip);
    }

    if (success) {
      const toast = await this.toastCtrl.create({
        message: this.isEditing ? 'Viagem atualizada com sucesso!' : 'Viagem salva no histórico!',
        duration: 2000,
        position: 'bottom',
        color: 'success'
      });
      await toast.present();
      const r = await this.ads.showInterstitialWithResult();
      if (!r.ok || !r.shown) {
        if (r.reason === 'throttled') {
          return;
        }
        const diag = this.ads.obterDiagnostico();
        const detalhes = `reason=${r.reason || 'unknown'}; error=${r.error || ''}; adId=${diag.adId}; testMode=${diag.testMode}; plataforma=${diag.plataforma}${diag.ultimoErro ? '; ultimoErro='+diag.ultimoErro : ''}${diag.diagnosticoAtivo ? '; diagnosticoAtivo=true' : ''}`;
        const alerta = await this.alertCtrl.create({
          header: 'Falha ao exibir anúncio',
          message: 'Não foi possível exibir o anúncio agora.',
          buttons: [
            {
              text: 'Copiar',
              handler: async () => {
                try {
                  await (navigator as any).clipboard?.writeText(detalhes);
                } catch {
                  try { (window as any).prompt?.('Copiar detalhes do erro:', detalhes); } catch {}
                }
              }
            },
            { text: 'OK', role: 'cancel' }
          ]
        });
        await alerta.present();
      }
      
      this.clearForm();
      this.setHistoryOpen(false);
    }
  }

  clearForm() {
    this.distance = null;
    this.fuelPrice = null;
    this.fuelPriceStr = '';
    this.costObservations = '';
    this.result = null;
    this.litersNeeded = null;
    this.isEditing = false;
    this.editingId = undefined;
  }

  get tripHistory() {
    const history: { vehicle: Vehicle, trip: Trip }[] = [];
    this.vehicles.forEach(v => {
      if (v.trips) {
        v.trips.forEach(t => {
          history.push({ vehicle: v, trip: t });
        });
      }
    });
    // Sort by date desc
    return history.sort((a, b) => new Date(b.trip.date).getTime() - new Date(a.trip.date).getTime());
  }

  get consumptionHistory() {
    const history: { vehicle: Vehicle, record: ConsumptionRecord }[] = [];
    this.vehicles.forEach(v => {
      if (v.consumptionHistory) {
        v.consumptionHistory.forEach(c => {
          history.push({ vehicle: v, record: c });
        });
      }
    });
    return history.sort((a, b) => new Date(b.record.date).getTime() - new Date(a.record.date).getTime());
  }

  setHistoryOpen(isOpen: boolean) {
    this.isHistoryOpen = isOpen;
    if (!isOpen) {
      this.isEditing = false;
      this.editingId = undefined;
    }
  }

  editHistoryItem(item: { vehicle: Vehicle, trip: Trip }) {
    this.isHistoryOpen = false;
    this.isEditing = true;
    this.editingId = item.trip.id;
    
    this.selectedVehicle = this.vehicles.find(v => v.plate === item.vehicle.plate) || null;
    
    const d = new Date(item.trip.date);
    const offset = d.getTimezoneOffset() * 60000;
    this.tripDate = new Date(d.getTime() - offset).toISOString();

    this.distance = item.trip.distance;
    this.fuelPrice = item.trip.fuelPrice;
    this.fuelPriceStr = this.fuelPrice ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(this.fuelPrice) : '';
    this.result = item.trip.totalCost;
    
    // Recalculate liters needed for display consistency
    if (this.selectedVehicle && this.selectedVehicle.consumption) {
      this.litersNeeded = this.distance / this.selectedVehicle.consumption;
    }
  }

  formatCurrency(event: any) {
    let value = event.target.value;
    
    // Remove everything that is not a digit
    value = value.replace(/\D/g, '');
    
    if (value === '') {
      this.fuelPriceStr = '';
      return;
    }

    // Convert to number and divide by 100 to handle cents
    const numericValue = parseInt(value, 10) / 100;
    
    // Format as BRL currency
    this.fuelPriceStr = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numericValue);
  }

  parseCurrency(value: string): number | null {
    if (!value) return null;
    // Remove 'R$', spaces and replace dots/commas
    // Example: "R$ 1.234,56" -> "1234.56"
    const cleanValue = value.replace(/[^\d,]/g, '').replace(',', '.');
    return parseFloat(cleanValue);
  }

  // Calculator Logic
  appendNumber(number: string) {
    if (this.shouldResetDisplay) {
      this.calcDisplay = '';
      this.shouldResetDisplay = false;
    }
    if (this.calcDisplay === '0' && number !== '.') {
      this.calcDisplay = number;
    } else {
      this.calcDisplay += number;
    }
  }

  backspace() {
    if (this.calcDisplay.length > 1) {
      this.calcDisplay = this.calcDisplay.slice(0, -1);
    } else {
      this.calcDisplay = '0';
    }
  }

  percentage() {
    const current = parseFloat(this.calcDisplay);
    this.calcDisplay = (current / 100).toString();
    this.shouldResetDisplay = true;
  }

  setOperation(op: string) {
    if (this.operation !== null) {
      this.calculateResult();
    }
    this.previousInput = this.calcDisplay;
    this.operation = op;
    this.shouldResetDisplay = true;
  }

  calculateResult() {
    if (this.operation === null || this.shouldResetDisplay) return;
    
    const prev = parseFloat(this.previousInput);
    const current = parseFloat(this.calcDisplay);
    let result = 0;

    switch (this.operation) {
      case '+':
        result = prev + current;
        break;
      case '-':
        result = prev - current;
        break;
      case '*':
        result = prev * current;
        break;
      case '/':
        result = prev / current;
        break;
    }

    this.calcDisplay = result.toString();
    this.operation = null;
    this.shouldResetDisplay = true;
  }

  clearCalculator() {
    this.calcDisplay = '0';
    this.currentInput = '';
    this.previousInput = '';
    this.operation = null;
    this.shouldResetDisplay = false;
  }


}
