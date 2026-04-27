import { Component, Input, OnInit } from '@angular/core';
import { ModalController, AlertController, ToastController } from '@ionic/angular';
import { VehicleService, Vehicle, Supply } from '../../../services/vehicle.service';
import { ServicoAjudaOdometro } from '../../../services/ajuda-odometro.service';
import { Router } from '@angular/router';
import { GasStationService, PostoCombustivel } from '../../../services/gas-station.service';
import { Geolocation } from '@capacitor/geolocation';
import { firstValueFrom } from 'rxjs';

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
  horaAbastecimento: string = '';
  selectedVehiclePlate: string = '';
  gasStation: string = '';
  initialOdometer: number | null = null;
  initialOdometerStr: string = '';
  tipoAbastecimento: string = '';
  opcoesAbastecimento: string[] = [
    'Gasolina Comum',
    'Gasolina Aditivada',
    'Gasolina Premium/Podium',
    'Etanol',
    'Diesel S10',
    'Diesel S500',
    'GNV',
    'Outro'
  ];
  precoPorLitro: number | null = null;
  precoPorLitroStr: string = '';
  liters: number | null = null;
  totalValue: number | null = null;
  totalValueStr: string = '';
  motorista: string = '';
  observations: string = '';
  tanqueCompleto: boolean = true;

  isEditing: boolean = false;

  postosProximos: PostoCombustivel[] = [];
  exibindoListaPostos: boolean = false;
  exibindoCarregandoPostos: boolean = false;
  mensagemErroPostos: string | null = null;
  vehicleError: boolean = false;
  dateError: boolean = false;
  tipoAbastecimentoError: boolean = false;
  precoPorLitroError: boolean = false;
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
    public ajuda_odometro: ServicoAjudaOdometro,
    private gasStationService: GasStationService
  ) {}

  ngOnInit() {
    this.initDate();
    if (this.editingSupply && this.editingVehiclePlate) {
      this.isEditing = true;
      this.loadSupply(this.editingSupply);
    } else {
      if (this.vehicles.length > 0) {
        if (this.editingVehiclePlate) {
          this.selectedVehiclePlate = this.editingVehiclePlate;
        } else {
          const defaultVehicle = this.vehicles.find(v => v.isDefault);
          this.selectedVehiclePlate = defaultVehicle ? defaultVehicle.plate : this.vehicles[0].plate;
        }
      }
      this.preencherPostoMaisProximo();
    }
  }

  @Input() set preSelectedPlate(plate: string) {
    if (plate) this.selectedVehiclePlate = plate;
  }

  initDate() {
    const agora = new Date();
    const offset = agora.getTimezoneOffset() * 60000;
    const isoLocal = new Date(agora.getTime() - offset).toISOString();
    this.supplyDate = isoLocal;
    this.horaAbastecimento = isoLocal;
  }

  loadSupply(supply: Supply) {
    this.selectedVehiclePlate = this.editingVehiclePlate!;
    const d = new Date(supply.date);
    const offset = d.getTimezoneOffset() * 60000;
    const isoLocal = new Date(d.getTime() - offset).toISOString();
    this.supplyDate = isoLocal;
    this.horaAbastecimento = isoLocal;

    this.gasStation = supply.gasStation || '';
    this.initialOdometer = supply.initialOdometer || null;
    this.initialOdometerStr = this.initialOdometer ? new Intl.NumberFormat('pt-BR').format(this.initialOdometer) : '';
    this.tipoAbastecimento = (supply as any).tipoAbastecimento || '';
    const litros = supply.liters;
    const valorTotal = supply.totalValue;
    this.precoPorLitro = (supply as any).precoPorLitro ?? ((litros && valorTotal && litros > 0) ? valorTotal / litros : null);
    if (this.precoPorLitro) {
      this.precoPorLitroStr = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(this.precoPorLitro);
    }
    this.liters = supply.liters || null;
    this.totalValue = supply.totalValue || null;
    if (this.totalValue) {
      this.totalValueStr = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(this.totalValue);
    }
    this.motorista = (supply as any).motorista || '';
    this.observations = supply.observations || '';
    this.tanqueCompleto = (supply as any).tanqueCompleto ?? true;
  }

  obter_classe_logo_posto(posto: PostoCombustivel): string {
    const nome = (posto?.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (nome.includes('ipiranga')) return 'ipiranga';
    if (nome.includes('petrobras') || nome.includes('petrobr')) return 'petrobras';
    if (nome.includes('shell')) return 'shell';
    return '';
  }

  obter_texto_logo_posto(posto: PostoCombustivel): string {
    const nome = (posto?.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (nome.includes('ipiranga')) return 'I';
    if (nome.includes('petrobras') || nome.includes('petrobr')) return 'BR';
    if (nome.includes('shell')) return 'S';
    const letra = posto?.name?.trim()?.charAt(0);
    return letra ? letra.toUpperCase() : 'P';
  }

  private async buscarPostosProximos(): Promise<PostoCombustivel[]> {
    let status = await Geolocation.checkPermissions();
    if (status.location === 'denied' || status.location === 'prompt') {
      status = await Geolocation.requestPermissions();
    }

    if (status.location === 'denied') {
      throw new Error('permissao-negada');
    }

    const posicao = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000
    });

    const latitude = posicao.coords.latitude;
    const longitude = posicao.coords.longitude;

    const postos = await firstValueFrom(
      this.gasStationService.getNearbyStations(latitude, longitude)
    );

    return postos;
  }

  private async preencherPostoMaisProximo() {
    if (this.isEditing || this.gasStation) {
      return;
    }

    try {
      const postos = await this.buscarPostosProximos();
      this.postosProximos = postos;
      if (this.postosProximos.length > 0) {
        this.gasStation = this.postosProximos[0].name;
      }
    } catch (_erro) {
    }
  }

  async aoFocarCampoPosto() {
    if (this.exibindoCarregandoPostos) {
      return;
    }

    this.mensagemErroPostos = null;
    this.exibindoListaPostos = false;
    this.exibindoCarregandoPostos = true;

    try {
      const postos = await this.buscarPostosProximos();
      this.postosProximos = postos;
      this.exibindoListaPostos = this.postosProximos.length > 0;
    } catch (erro: any) {
      if (erro && erro.message === 'permissao-negada') {
        this.mensagemErroPostos = 'Permissão de localização negada. Você pode digitar o posto manualmente.';
      } else {
        this.mensagemErroPostos = 'Não foi possível buscar postos próximos. Verifique sua conexão e tente novamente.';
      }
    } finally {
      this.exibindoCarregandoPostos = false;
    }
  }

  selecionarPosto(posto: PostoCombustivel) {
    this.gasStation = posto.name;
    this.exibindoListaPostos = false;
  }

  aoDigitarPosto() {
    this.exibindoListaPostos = false;
  }

  get missingFields(): string[] {
    const fields: string[] = [];
    if (!this.selectedVehiclePlate) {
      fields.push('Veículo');
    }
    if (!this.supplyDate) {
      fields.push('Data');
    }
    if (!this.tipoAbastecimento) {
      fields.push('Tipo de Abastecimento');
    }
    if (this.precoPorLitro == null || isNaN(Number(this.precoPorLitro)) || Number(this.precoPorLitro) <= 0) {
      fields.push('Preço/L');
    }
    if (!this.totalValue || this.totalValue <= 0) {
      fields.push('Valor (R$)');
    }
    return fields;
  }

  get hasValidationErrors(): boolean {
    return this.vehicleError || this.dateError || this.tipoAbastecimentoError || this.precoPorLitroError || this.totalValueError;
  }

  atualizarLitrosAutomaticamente() {
    const preco = this.precoPorLitro != null ? Number(this.precoPorLitro) : NaN;
    const total = this.totalValue != null ? Number(this.totalValue) : NaN;
    if (!isNaN(preco) && preco > 0 && !isNaN(total) && total > 0) {
      this.liters = Number((total / preco).toFixed(3));
    }
  }

  aoAlterarPrecoPorLitro(event: any) {
    let value = event.target.value;
    value = value.replace(/\D/g, '');
    if (value === '') {
      this.precoPorLitroStr = '';
      this.precoPorLitro = null;
      this.precoPorLitroError = false;
      return;
    }
    // Preço por litro geralmente tem 3 casas decimais em postos, ou 2?
    // O padrão brasileiro para moeda é 2 casas, mas combustível é 3.
    // O input currency padrão divide por 100 (2 casas).
    // Se quisermos 3 casas (ex: 5,899), deveríamos dividir por 1000.
    // Mas o usuário pediu "assim como o campo Valor R$", que divide por 100.
    // Vou manter o padrão de moeda (2 casas) para consistência visual com "Valor R$".
    // Se for necessário 3 casas, o usuário pode pedir depois.
    const numericValue = parseInt(value, 10) / 100;
    
    this.precoPorLitro = numericValue;
    this.precoPorLitroStr = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numericValue);
    this.precoPorLitroError = false;
    this.atualizarLitrosAutomaticamente();
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
      this.totalValueError = false;
      return;
    }
    const numericValue = parseInt(value, 10) / 100;
    this.totalValue = numericValue;
    this.totalValueStr = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numericValue);
    this.totalValueError = false;
    this.atualizarLitrosAutomaticamente();
  }

  formatOdometer(event: any) {
    let value = event.target.value;
    
    // Remove tudo que não for dígito
    const numericString = value.replace(/\D/g, '');
    
    if (numericString === '') {
      this.initialOdometerStr = '';
      this.initialOdometer = null;
      return;
    }
    
    const numericValue = parseInt(numericString, 10);
    this.initialOdometer = numericValue;
    
    // Formata com pontos de milhar
    this.initialOdometerStr = new Intl.NumberFormat('pt-BR').format(numericValue);
  }

  async save() {
    // Resetar erros
    this.vehicleError = false;
    this.dateError = false;
    this.tipoAbastecimentoError = false;
    this.precoPorLitroError = false;
    this.totalValueError = false;

    let hasError = false;

    if (!this.selectedVehiclePlate) {
      this.vehicleError = true;
      hasError = true;
    }
    if (!this.supplyDate) {
      this.dateError = true;
      hasError = true;
    }
    if (!this.tipoAbastecimento) {
      this.tipoAbastecimentoError = true;
      hasError = true;
    }
    if (this.precoPorLitro == null || isNaN(Number(this.precoPorLitro)) || Number(this.precoPorLitro) <= 0) {
      this.precoPorLitroError = true;
      hasError = true;
    }
    if (!this.totalValue || this.totalValue <= 0) {
      this.totalValueError = true;
      hasError = true;
    }

    if (hasError) {
      return;
    }

    const datePart = this.supplyDate.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);

    let horas = 0;
    let minutos = 0;
    const origemHora = this.horaAbastecimento || this.supplyDate;
    if (origemHora) {
      const partesHora = origemHora.split('T')[1] || '';
      const horaMinutoSeg = partesHora.split('.')[0] || '';
      const [horaStr, minutoStr] = horaMinutoSeg.split(':');
      horas = Number(horaStr) || 0;
      minutos = Number(minutoStr) || 0;
    }

    const localDate = new Date(year, month - 1, day, horas, minutos);

    const precoPorLitroCalculado: number | null = this.precoPorLitro != null ? Number(this.precoPorLitro) : null;

    const newSupply: Supply = {
      id: this.isEditing ? this.editingSupply!.id : undefined,
      date: localDate,
      gasStation: this.gasStation,
      initialOdometer: this.initialOdometer ?? undefined,
      tipoAbastecimento: this.tipoAbastecimento || undefined,
      precoPorLitro: precoPorLitroCalculado ?? undefined,
      liters: this.liters ?? undefined,
      totalValue: this.totalValue ?? undefined,
      motorista: this.motorista || undefined,
      observations: this.observations,
      tanqueCompleto: this.tanqueCompleto
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
