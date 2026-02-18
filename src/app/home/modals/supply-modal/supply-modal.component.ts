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
  liters: number | null = null;
  totalValue: number | null = null;
  totalValueStr: string = '';
  motorista: string = '';
  observations: string = '';

  isEditing: boolean = false;

  postosProximos: PostoCombustivel[] = [];
  exibindoListaPostos: boolean = false;
  exibindoCarregandoPostos: boolean = false;
  mensagemErroPostos: string | null = null;

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
    this.tipoAbastecimento = (supply as any).tipoAbastecimento || '';
    const litros = supply.liters;
    const valorTotal = supply.totalValue;
    this.precoPorLitro = (supply as any).precoPorLitro ?? ((litros && valorTotal && litros > 0) ? valorTotal / litros : null);
    this.liters = supply.liters || null;
    this.totalValue = supply.totalValue || null;
    if (this.totalValue) {
      this.totalValueStr = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(this.totalValue);
    }
    this.motorista = (supply as any).motorista || '';
    this.observations = supply.observations || '';
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

  async aoFocarCampoPosto() {
    if (this.exibindoCarregandoPostos) {
      return;
    }

    this.mensagemErroPostos = null;
    this.exibindoListaPostos = false;
    this.exibindoCarregandoPostos = true;

    try {
      let status = await Geolocation.checkPermissions();
      if (status.location === 'denied' || status.location === 'prompt') {
        status = await Geolocation.requestPermissions();
      }

      if (status.location === 'denied') {
        this.mensagemErroPostos = 'Permissão de localização negada. Você pode digitar o posto manualmente.';
        return;
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

      this.postosProximos = postos;
      this.exibindoListaPostos = this.postosProximos.length > 0;
    } catch (_erro) {
      this.mensagemErroPostos = 'Não foi possível buscar postos próximos. Verifique sua conexão e tente novamente.';
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

  atualizarLitrosAutomaticamente() {
    const preco = this.precoPorLitro != null ? Number(this.precoPorLitro) : NaN;
    const total = this.totalValue != null ? Number(this.totalValue) : NaN;
    if (!isNaN(preco) && preco > 0 && !isNaN(total) && total > 0) {
      this.liters = Number((total / preco).toFixed(3));
    }
  }

  aoAlterarPrecoPorLitro() {
    if (this.precoPorLitro != null) {
      this.precoPorLitro = Number(this.precoPorLitro);
    }
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
      return;
    }
    const numericValue = parseInt(value, 10) / 100;
    this.totalValue = numericValue;
    this.totalValueStr = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numericValue);
    this.atualizarLitrosAutomaticamente();
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

    let precoPorLitroCalculado: number | null = this.precoPorLitro != null ? Number(this.precoPorLitro) : null;
    if ((precoPorLitroCalculado == null || isNaN(precoPorLitroCalculado)) && this.liters && this.totalValue && this.liters > 0) {
      precoPorLitroCalculado = this.totalValue / this.liters;
    }

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
