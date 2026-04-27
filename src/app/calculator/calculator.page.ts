import { Component, OnInit } from '@angular/core';
import { VehicleService, Vehicle, Trip, ConsumptionRecord } from '../services/vehicle.service';
import { AlertController, ToastController, ModalController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { backspaceOutline, create, speedometerOutline, carOutline, calculatorOutline, arrowBackOutline, mapOutline } from 'ionicons/icons';
import { AdsService } from '../services/ads.service';
import { ServicoAjudaOdometro } from '../services/ajuda-odometro.service';
import { ConsumptionModalComponent } from '../home/modals/consumption-modal/consumption-modal.component';

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
  tollPrice: number | null = null;
  tollPriceStr: string = '';
  costObservations: string = '';
  consumoManualTrip: number | null = null;

  result: number | null = null;
  litersNeeded: number | null = null;
  tripVehicleError: boolean = false;
  tripDateError: boolean = false;
  tripDistanceError: boolean = false;
  tripFuelPriceError: boolean = false;
  tripConsumptionError: boolean = false;
  tripResultError: boolean = false;

  mostrarMaisCampos: boolean = false;

  // History & Editing
  isEditing: boolean = false;
  editingId: string | undefined = undefined;
  tripDate: string = new Date().toISOString();
  tripTime: string = new Date().toISOString();

  /** Formato DD/MM/YYYY na exibição do botão de data */
  readonly opcoesFormatoData: { date: Intl.DateTimeFormatOptions } = {
    date: { day: '2-digit', month: '2-digit', year: 'numeric' }
  };

  placa_padrao_atual: string | null = null;
  placa_parametro: string | null = null;

  // Consumption Calculator
  calcSelectedVehicle: Vehicle | null = null;
  calcInitialOdometer: number | null = null;
  calcInitialOdometerStr: string = '';
  calcFinalOdometer: number | null = null;
  calcFinalOdometerStr: string = '';
  calcDist: number | null = null;
  calcLiters: number | null = null;
  calcLitersStr: string = '';
  calcResult: number | null = null;
  
  isEditingConsumption: boolean = false;
  editingConsumptionId: string | undefined = undefined;
  
  calcVehicleError: boolean = false;
  calcInitialOdometerError: boolean = false;
  calcFinalOdometerError: boolean = false;
  calcLitersError: boolean = false;
  
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
    public ajuda_odometro: ServicoAjudaOdometro,
    private router: Router,
    private modalCtrl: ModalController
  ) {
    addIcons({ backspaceOutline, create, speedometerOutline, carOutline, calculatorOutline, arrowBackOutline, mapOutline });
  }
  ngOnInit() {
    this.initDate();
    this.ads.preloadInterstitial();
    let viewParam: 'menu' | 'trip' | 'consumption' | 'simple' | undefined;
    let editTripIdParam: string | undefined;
    this.route.queryParams.subscribe(params => {
      if (params && params['plate']) {
        this.placa_parametro = params['plate'];
      }
      if (params && params['view']) {
        const val = String(params['view']);
        if (val === 'trip' || val === 'consumption' || val === 'menu' || val === 'simple') {
          viewParam = val;
        }
      }
      if (params && params['editTripId']) {
        editTripIdParam = String(params['editTripId']);
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
      }

      if (placa_padrao_nova && placa_padrao_nova !== this.placa_padrao_atual) {
        this.placa_padrao_atual = placa_padrao_nova;
        if (!this.placa_parametro) {
          this.selectedVehicle = veiculo_padrao;
        }
      }

      if (!this.selectedVehicle && this.vehicles.length > 0) {
        const primeiro_veiculo = this.vehicles[0];
        this.selectedVehicle = primeiro_veiculo;
      }

      if (this.selectedVehicle && (!this.selectedVehicle.consumption || this.selectedVehicle.consumption <= 0) && !editTripIdParam) {
        const media = this.vehicleService.calcularMediaConsumoResumo(this.selectedVehicle);
        this.consumoManualTrip = media > 0 ? media : null;
      }

      if (viewParam) {
        this.setView(viewParam);
      }
      if (editTripIdParam) {
        let alvo: { vehicle: Vehicle, trip: Trip } | null = null;
        for (const v of this.vehicles) {
          if (v.trips) {
            const t = v.trips.find(tr => tr.id === editTripIdParam);
            if (t) {
              alvo = { vehicle: v, trip: t };
              break;
            }
          }
        }
        if (alvo) {
          this.currentView = 'trip';
          this.isEditing = true;
          this.editingId = alvo.trip.id;
          
          this.selectedVehicle = this.vehicles.find(v => v.plate === alvo!.vehicle.plate) || null;
          
          const d = new Date(alvo.trip.date);
          const offset = d.getTimezoneOffset() * 60000;
          this.tripDate = new Date(d.getTime() - offset).toISOString();
      
          this.distance = alvo.trip.distance;
          this.fuelPrice = alvo.trip.fuelPrice;
          this.fuelPriceStr = this.fuelPrice ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(this.fuelPrice) : '';
          this.result = alvo.trip.totalCost;
          if (!this.selectedVehicle?.consumption || this.selectedVehicle.consumption <= 0) {
            this.consumoManualTrip = alvo.trip.consumption || this.vehicleService.calcularMediaConsumoResumo(alvo.vehicle) || null;
          }
          if (this.distance && (this.selectedVehicle?.consumption || this.consumoManualTrip)) {
            const consumo = this.selectedVehicle?.consumption || this.consumoManualTrip!;
            this.litersNeeded = this.distance / consumo;
          }
        }
      }
    });
  }

  initDate() {
    const today = new Date();
    const offset = today.getTimezoneOffset() * 60000;
    const localIso = new Date(today.getTime() - offset).toISOString();
    this.tripDate = localIso;
    this.tripTime = localIso;
  }

  ionViewWillEnter() {
    const params = this.route.snapshot.queryParams;
    const veioComEdicaoOuView = params && (params['editTripId'] || params['view']);
    if (!veioComEdicaoOuView) {
      this.voltarParaMenuSemSalvar();
    }
  }

  /** Ao entrar na página da calculadora, mostra só o menu de opções e descarta dados não salvos. */
  voltarParaMenuSemSalvar() {
    this.currentView = 'menu';
    this.distance = null;
    this.fuelPrice = null;
    this.fuelPriceStr = '';
    this.tollPrice = null;
    this.tollPriceStr = '';
    this.costObservations = '';
    this.consumoManualTrip = null;
    this.result = null;
    this.litersNeeded = null;
    this.tripVehicleError = false;
    this.tripDateError = false;
    this.tripDistanceError = false;
    this.tripFuelPriceError = false;
    this.tripConsumptionError = false;
    this.tripResultError = false;
    this.mostrarMaisCampos = false;
    this.isEditing = false;
    this.editingId = undefined;
    this.initDate();
    this.calcSelectedVehicle = null;
    this.calcInitialOdometer = null;
    this.calcInitialOdometerStr = '';
    this.calcFinalOdometer = null;
    this.calcFinalOdometerStr = '';
    this.calcDist = null;
    this.calcLiters = null;
    this.calcLitersStr = '';
    this.calcResult = null;
    this.calcVehicleError = false;
    this.calcInitialOdometerError = false;
    this.calcFinalOdometerError = false;
    this.calcLitersError = false;
    this.isEditingConsumption = false;
    this.editingConsumptionId = undefined;
    this.calcDisplay = '0';
    this.currentInput = '';
    this.previousInput = '';
    this.operation = null;
    this.shouldResetDisplay = false;
  }

  async setView(view: 'menu' | 'trip' | 'consumption' | 'simple') {
    if ((view === 'trip' || view === 'consumption') && (!this.vehicles || this.vehicles.length === 0)) {
      const alert = await this.alertCtrl.create({
        header: 'Cadastre um veículo',
        message: 'Para calcular viagem ou consumo, cadastre primeiro um veículo no menu Veículos.',
        buttons: [
          {
            text: 'Cadastrar Veículo',
            handler: () => {
              this.router.navigate(['/tabs/vehicles/form']);
            }
          },
          {
            text: 'Cancelar',
            role: 'cancel'
          }
        ]
      });
      await alert.present();
      return;
    }

    if (view === 'menu' && this.currentView === 'trip') {
      this.clearForm();
      this.tripVehicleError = false;
      this.tripDateError = false;
      this.tripDistanceError = false;
      this.tripFuelPriceError = false;
      this.tripConsumptionError = false;
      this.tripResultError = false;
      this.mostrarMaisCampos = false;
      this.initDate();
    }
    this.currentView = view;
  }

  get calcMissingFields(): string[] {
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

  get hasCalcValidationErrors(): boolean {
    return this.calcVehicleError || this.calcInitialOdometerError || this.calcFinalOdometerError || this.calcLitersError;
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
    this.updateCalcDistance();
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
    this.updateCalcDistance();
  }

  updateCalcDistance() {
    if (this.calcInitialOdometer !== null && this.calcFinalOdometer !== null) {
      this.calcDist = this.calcFinalOdometer - this.calcInitialOdometer;
      this.calcInitialOdometerError = false;
      this.calcFinalOdometerError = false;
    }
    this.calculateConsumption();
  }

  atualizarLitros(event: any) {
    let valor = event.target.value ?? '';
    if (typeof valor !== 'string') {
      valor = String(valor ?? '');
    }

    const valor_normalizado = valor
      .replace(/\s+/g, '')
      .replace(',', '.')
      .replace(/[^0-9.]/g, '');

    if (valor_normalizado === '') {
      this.calcLitersStr = '';
      this.calcLiters = null;
      this.calculateConsumption();
      return;
    }

    const correspondencia = valor_normalizado.match(/^(\d+)(?:\.(\d*))?/);
    if (!correspondencia) {
      this.calcLitersStr = '';
      this.calcLiters = null;
      this.calculateConsumption();
      return;
    }

    const parte_inteira = correspondencia[1] || '0';
    let parte_decimal = correspondencia[2] || '';
    if (parte_decimal.length > 3) {
      parte_decimal = parte_decimal.slice(0, 3);
    }

    const valor_para_parse = parte_decimal ? `${parte_inteira}.${parte_decimal}` : parte_inteira;
    const litros_numero = parseFloat(valor_para_parse);
    if (isNaN(litros_numero) || litros_numero <= 0) {
      this.calcLiters = null;
      this.calculateConsumption();
      return;
    }

    const valor_exibicao = parte_decimal ? `${parte_inteira},${parte_decimal}` : parte_inteira;
    this.calcLitersStr = valor_exibicao;
    this.calcLiters = litros_numero;
    this.calculateConsumption();
  }

  calculateConsumption() {
    if (this.calcDist && this.calcLiters && this.calcLiters > 0) {
      this.calcResult = this.calcDist / this.calcLiters;
      this.calcLitersError = false;
    } else {
      this.calcResult = null;
    }
  }

  async saveConsumption() {
    this.calcVehicleError = false;
    this.calcInitialOdometerError = false;
    this.calcFinalOdometerError = false;
    this.calcLitersError = false;

    let hasError = false;

    if (!this.calcSelectedVehicle) {
      this.calcVehicleError = true;
      hasError = true;
    }
    if (this.calcInitialOdometer === null) {
      this.calcInitialOdometerError = true;
      hasError = true;
    }
    if (this.calcFinalOdometer === null) {
      this.calcFinalOdometerError = true;
      hasError = true;
    }
    if (!this.calcLiters) {
      this.calcLitersError = true;
      hasError = true;
    }

    if (hasError) {
      return;
    }

    const newRecord: ConsumptionRecord = {
      id: this.isEditingConsumption ? this.editingConsumptionId : undefined,
      date: new Date(),
      initialOdometer: this.calcInitialOdometer ?? undefined,
      finalOdometer: this.calcFinalOdometer ?? undefined,
      distance: this.calcDist!,
      liters: this.calcLiters!,
      result: this.calcResult!
    };

    if (this.isEditingConsumption && this.calcSelectedVehicle) {
      this.vehicleService.updateConsumptionRecord(this.calcSelectedVehicle.plate, newRecord);
    } else if (this.calcSelectedVehicle) {
      this.vehicleService.addConsumptionRecord(this.calcSelectedVehicle.plate, newRecord);
    }

    const toast = await this.toastCtrl.create({
        message: this.isEditingConsumption ? 'Registro atualizado com sucesso!' : 'Média de consumo salva com sucesso!',
        duration: 2000,
        position: 'bottom',
        color: 'success'
    });
    await toast.present();
    
    // Clear form
    this.calcInitialOdometer = null;
    this.calcFinalOdometer = null;
    this.calcDist = null;
    this.calcLiters = null;
    this.calcLitersStr = '';
    this.calcResult = null;
    this.isEditingConsumption = false;
    this.editingConsumptionId = undefined;
  }

  get tripMissingFields(): string[] {
    const fields: string[] = [];
    if (!this.selectedVehicle) {
      fields.push('Veículo');
    }
    const consumoEfetivo = this.getConsumoEfetivoViagem();
    if (this.selectedVehicle && (!consumoEfetivo || consumoEfetivo <= 0)) {
      fields.push('Média do veículo');
    }
    if (!this.tripDate) {
      fields.push('Data');
    }
    if (!this.distance) {
      fields.push('Distância');
    }
    if (!this.fuelPrice) {
      fields.push('Preço do Combustível');
    }
    return fields;
  }

  get tripHasValidationErrors(): boolean {
    return this.tripVehicleError || this.tripDateError || this.tripDistanceError || this.tripFuelPriceError || this.tripConsumptionError;
  }

  onVehicleChange() {
    this.tripConsumptionError = false;
    if (!this.isEditing) {
      this.result = null;
      this.litersNeeded = null;
    }
    // Consumo passa a ser sempre calculado automaticamente;
    // não há mais campo manual editável aqui.
    this.consumoManualTrip = null;
  }

  /** Consumo usado no cálculo da viagem: prioridade para média automática dos abastecimentos. */
  getConsumoEfetivoViagem(): number | null {
    if (!this.selectedVehicle) return null;
    if (this.temMediaAbastecimentos) {
      return this.mediaAbastecimentosViagem;
    }
    if (this.selectedVehicle.consumption && this.selectedVehicle.consumption > 0) {
      return this.selectedVehicle.consumption;
    }
    const media = this.vehicleService.calcularMediaConsumoResumo(this.selectedVehicle);
    return media > 0 ? media : null;
  }

  /** Média de consumo apenas com base nos abastecimentos (0 se não houver). */
  get mediaAbastecimentosViagem(): number {
    if (!this.selectedVehicle) return 0;
    return this.vehicleService.calcularMediaApenasAbastecimentos(this.selectedVehicle);
  }

  /**
   * Média de consumo exibida no campo "Consumo do veículo" da tela Calcular Viagem.
   * Usa exatamente o mesmo cálculo do resumo da página inicial.
   */
  get mediaConsumoResumoViagem(): number {
    if (!this.selectedVehicle) return 0;
    return this.vehicleService.calcularMediaConsumoResumo(this.selectedVehicle);
  }

  /** True quando existe média de consumo calculada a partir dos abastecimentos. */
  get temMediaAbastecimentos(): boolean {
    return this.mediaAbastecimentosViagem > 0;
  }

  async calculate() {
    this.fuelPrice = this.parseCurrency(this.fuelPriceStr);
    this.tollPrice = this.parseCurrency(this.tollPriceStr);

    this.tripVehicleError = false;
    this.tripDateError = false;
    this.tripDistanceError = false;
    this.tripFuelPriceError = false;
    this.tripConsumptionError = false;
    this.tripResultError = false;

    if (!this.selectedVehicle) {
      this.tripVehicleError = true;
    }
    if (!this.distance) {
      this.tripDistanceError = true;
    }
    if (!this.fuelPrice) {
      this.tripFuelPriceError = true;
    }
    if (this.tripVehicleError || this.tripDistanceError || this.tripFuelPriceError || this.tripConsumptionError) {
      return;
    }

    const consumoEfetivo = this.getConsumoEfetivoViagem();
    if (!consumoEfetivo || consumoEfetivo <= 0) {
      this.tripConsumptionError = true;
      return;
    }

    this.aplicarCalculoCusto();
  }

  /** Exibe o alerta de consumo (quando não tem consumo registrado). Usado ao clicar em Calcular Custo ou ao clicar no campo Consumo do Veículo. */
  async mostrarAlertaConsumoVeiculo() {
    if (!this.selectedVehicle) return;
    const semConsumoCadastrado = !this.selectedVehicle.consumption || this.selectedVehicle.consumption <= 0;
    if (!semConsumoCadastrado) return;

    const mediaConsumoResumo = this.vehicleService.calcularMediaConsumoResumo(this.selectedVehicle);
    const temMediaConsumo = mediaConsumoResumo > 0;

    if (temMediaConsumo) {
      const mediaFormatada = mediaConsumoResumo.toFixed(2).replace('.', ',');
      const alerta = await this.alertCtrl.create({
        header: 'Consumo do veículo',
        message: `O veículo não tem consumo cadastrado. A média de consumo com base nos abastecimentos registrados é de: ${mediaFormatada} km/L. Deseja usar essa média para o cálculo ou salvar outra no cadastro do veículo?`,
        buttons: [
          { text: 'Cancelar', role: 'cancel' },
          {
            text: 'Cadastrar no veículo',
            handler: () => {
              this.router.navigate(['/tabs/vehicles/form', this.selectedVehicle!.plate]);
            }
          },
          {
            text: 'Usar essa média',
            handler: () => {
              this.selectedVehicle!.consumption = mediaConsumoResumo;
              const atualizado = { ...this.selectedVehicle! };
              this.vehicleService.updateVehicle(this.selectedVehicle!.plate, atualizado);
              this.aplicarCalculoCusto();
            }
          }
        ]
      });
      await alerta.present();
      return;
    }

    const alerta = await this.alertCtrl.create({
      header: 'Consumo do veículo',
      message: 'Cadastre uma média de consumo no cadastro do veículo para calcular o custo da viagem.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Cadastrar',
          handler: () => {
            this.router.navigate(['/tabs/vehicles/form', this.selectedVehicle!.plate]);
          }
        }
      ]
    });
    await alerta.present();
  }

  private aplicarCalculoCusto() {
    const consumo = this.getConsumoEfetivoViagem();
    if (!this.selectedVehicle || !consumo || !this.distance || !this.fuelPrice) return;
    this.litersNeeded = this.distance / consumo;
    const fuelCost = this.litersNeeded! * this.fuelPrice;
    const tollCost = this.tollPrice || 0;
    this.result = fuelCost + tollCost;
  }

  async saveTrip() {
    this.fuelPrice = this.parseCurrency(this.fuelPriceStr);
    this.tollPrice = this.parseCurrency(this.tollPriceStr);

    // Resetar erros
    this.tripVehicleError = false;
    this.tripDateError = false;
    this.tripDistanceError = false;
    this.tripFuelPriceError = false;
    this.tripResultError = false;

    let hasError = false;

    if (!this.selectedVehicle) {
      this.tripVehicleError = true;
      hasError = true;
    }
    const consumoEfetivo = this.getConsumoEfetivoViagem();
    if (this.selectedVehicle && (!consumoEfetivo || consumoEfetivo <= 0)) {
      this.tripVehicleError = true;
      hasError = true;
    }
    if (!this.tripDate) {
      this.tripDateError = true;
      hasError = true;
    }
    if (!this.distance) {
      this.tripDistanceError = true;
      hasError = true;
    }
    if (!this.fuelPrice) {
      this.tripFuelPriceError = true;
      hasError = true;
    }

    if (hasError) {
      return;
    }

    const datePart = this.tripDate.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);

    const consumoSalvar = this.getConsumoEfetivoViagem();
    const newTrip: Trip = {
      id: this.isEditing ? this.editingId : undefined,
      date: localDate,
      distance: this.distance!,
      consumption: consumoSalvar ?? 0,
      fuelPrice: this.fuelPrice!,
      totalCost: this.result!,
      observations: this.costObservations || '',
      createdAt: Date.now()
    };

    let success = false;
    if (this.isEditing) {
      success = this.vehicleService.updateTrip(this.selectedVehicle!.plate, newTrip);
    } else {
      success = this.vehicleService.addTrip(this.selectedVehicle!.plate, newTrip);
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
    }
  }

  clearForm() {
    this.distance = null;
    this.fuelPrice = null;
    this.fuelPriceStr = '';
    this.tollPrice = null;
    this.tollPriceStr = '';
    this.costObservations = '';
    this.result = null;
    this.litersNeeded = null;
    this.isEditing = false;
    this.editingId = undefined;
  }

  async removeConsumptionHistoryItem(item: { vehicle: Vehicle, record: ConsumptionRecord }) {
    if (!item.record.id) {
      return;
    }

    const alerta = await this.alertCtrl.create({
      header: 'Confirmar exclusão',
      message: 'Deseja realmente excluir este registro de consumo?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Excluir',
          role: 'destructive',
          handler: () => {
            this.vehicleService.removerConsumo(item.vehicle.plate, item.record.id!);
            // Refresh history
            this.vehicleService.getVehicles().subscribe(vehicles => {
              this.vehicles = vehicles;
            });
          }
        }
      ]
    });

    await alerta.present();
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

  formatCurrencyToll(event: any) {
    let value = event.target.value;
    value = value.replace(/\D/g, '');
    if (value === '') {
      this.tollPriceStr = '';
      return;
    }
    const numericValue = parseInt(value, 10) / 100;
    this.tollPriceStr = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numericValue);
  }

  // Calculator Logic
  appendNumber(number: string) {
    if (this.shouldResetDisplay) {
      this.calcDisplay = '';
      this.shouldResetDisplay = false;
    }
    // Convert comma to dot for internal calculation
    const numToAdd = number === ',' ? '.' : number;
    if (this.calcDisplay === '0' && numToAdd !== '.') {
      this.calcDisplay = numToAdd;
    } else {
      // Prevent multiple decimal points
      if (numToAdd === '.' && this.calcDisplay.includes('.')) {
        return;
      }
      this.calcDisplay += numToAdd;
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
    const current = this.parseDisplayValue(this.calcDisplay);
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
    
    const prev = this.parseDisplayValue(this.previousInput);
    const current = this.parseDisplayValue(this.calcDisplay);
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
        if (current === 0) {
          this.calcDisplay = 'Erro';
          this.operation = null;
          this.shouldResetDisplay = true;
          return;
        }
        result = prev / current;
        break;
    }

    // Format result to avoid scientific notation and limit decimal places
    if (result % 1 !== 0) {
      // Has decimal part
      const rounded = Math.round(result * 100000000) / 100000000; // Round to 8 decimal places
      this.calcDisplay = rounded.toString();
    } else {
      this.calcDisplay = result.toString();
    }
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

  getDisplayExpression(): string {
    if (this.operation) {
      const opSymbol = this.getOperationSymbol(this.operation);
      const prev = this.formatDisplay(this.previousInput);
      if (this.shouldResetDisplay) {
        return `${prev} ${opSymbol}`;
      }
      const curr = this.formatDisplay(this.calcDisplay);
      return `${prev} ${opSymbol} ${curr}`;
    }
    return this.formatDisplay(this.calcDisplay);
  }

  getOperationSymbol(op: string | null): string {
    switch(op) {
      case '*': return '×';
      case '/': return '÷';
      case '+': return '+';
      case '-': return '−';
      default: return '';
    }
  }

  async copyToClipboard() {
    const textToCopy = this.getDisplayExpression(); // Copia o que está visível, ou o resultado?
    // Geralmente o usuário quer o resultado numérico se for para colar em outro lugar,
    // mas se ele quer copiar a "conta", seria a expressão.
    // O pedido diz "copiar o resultado".
    // Se estiver no meio de uma conta (40 x 3), o resultado ainda não existe (ou é 120 implicitamente).
    // Se eu copiar "40 x 3", não é um número.
    // Vou assumir que ele quer copiar o VALOR NUMÉRICO ATUAL (calcDisplay) ou o resultado final.
    // Mas se ele diz "resultado", e a tela mostra "40 x 3", talvez ele queira "120"?
    // "Permita ao usuário copiar o resultado da calculadora"
    // Se a tela mostra a operação, o "resultado" é o que está no calcDisplay (que é o operando atual) OU o resultado da conta anterior.
    // Vamos simplificar: Copiar o que está na tela (expressão) ou o valor atual?
    // "Copiar o resultado" sugere o número.
    // Se eu mostrar "40 x 3", o usuário pode querer colar "120" em outro lugar.
    // Mas se eu ainda não apertei igual, o "resultado" parcial não está calculado explicitamente na variavel result final.
    // Vamos copiar o texto visível por enquanto, ou melhor:
    // Se houver operação pendente, talvez copiar o valor calculado parcial?
    // Vamos copiar o `calcDisplay` se não houver operação, ou se houver operação, talvez o `calcDisplay` atual?
    // O usuário disse "Faça as operações aparecerem...".
    // Vou fazer copiar o TEXTO VISÍVEL, pois é o feedback visual. Se ele quiser o resultado, ele aperta = e copia.
    
    // Re-lendo: "Permita ao usuário copiar o resultado da calculadora."
    // Se ele digitar 40x3 e apertar =, aparece 120. Aí ele copia 120.
    // Se ele digitar 40x3, aparece "40 x 3". Se ele copiar, copia "40 x 3"?
    // Acho mais seguro copiar o VALOR NUMÉRICO (calcDisplay) limpo, pois geralmente se copia para colar em campos de valor.
    // Mas se o display mostra a conta, o usuário pode ficar confuso se copiar só o número.
    // Vou copiar o valor numérico (calcDisplay) para ser funcional em inputs numéricos.
    
    // Melhor: Vou copiar o que está no `calcDisplay` (o número atual ou resultado).
    // Se ele estiver vendo "40 x 3", e clicar copiar, vai copiar "3"? Estranho.
    // Se eu calcular o resultado parcial e copiar?
    // Vamos manter simples: Copiar o valor numérico atual `calcDisplay`.
    // E vou adicionar um Toast dizendo "Valor copiado: X".
    
    const valueToCopy = this.calcDisplay; // Copia o número cru (ex: 120.5) ou formatado?
    // Melhor copiar formatado (com vírgula) ou cru (ponto)?
    // Para colar em outros apps brasileiros, vírgula é melhor.
    const formattedValue = this.formatDisplay(valueToCopy);
    
    try {
      await navigator.clipboard.writeText(formattedValue);
      const toast = await this.toastCtrl.create({
        message: 'Valor copiado: ' + formattedValue,
        duration: 2000,
        position: 'middle',
        color: 'dark',
        cssClass: 'toast-copy' // Posso estilizar se precisar
      });
      await toast.present();
    } catch (err) {
      console.error('Falha ao copiar', err);
    }
  }

  formatDisplay(value: string): string {
    if (value === 'Erro' || value === 'Infinity' || value === 'NaN') {
      return value;
    }
    // Replace dot with comma for display (Brazilian format)
    return value.replace('.', ',');
  }

  parseDisplayValue(value: string): number {
    // Convert comma to dot for parsing
    return parseFloat(value.replace(',', '.'));
  }

  toggleSign() {
    if (this.calcDisplay === '0' || this.calcDisplay === 'Erro') {
      return;
    }
    const current = this.parseDisplayValue(this.calcDisplay);
    const newValue = -current;
    this.calcDisplay = newValue.toString();
  }

}
