import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  VehicleService,
  Vehicle,
  Supply,
  ConsumptionRecord,
  Maintenance,
  ResultadoAnaliseCiclosConsumo
} from '../services/vehicle.service';
import { AlertController, ToastController, ModalController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { add, colorFill, chevronDown, chevronUp, speedometer, construct, car, map, create, settings, warningOutline } from 'ionicons/icons';
import { Chart, registerables, ChartConfiguration, ChartType } from 'chart.js';
import { SupplyModalComponent } from './modals/supply-modal/supply-modal.component';
import { ConsumptionModalComponent } from './modals/consumption-modal/consumption-modal.component';
import { MaintenanceModalComponent } from './modals/maintenance-modal/maintenance-modal.component';
import { ServicoAjudaOdometro } from '../services/ajuda-odometro.service';

Chart.register(...registerables);

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit, OnDestroy {

  vehicles: Vehicle[] = [];
  allHistory: any[] = [];
  showAllHistory: boolean = false;
  showSummaryCard: boolean = true;
  showQuickActionsCard: boolean = true;
  showHistoryCard: boolean = true;
  showConsumptionChartCard: boolean = true;
  showMaintenanceChartCard: boolean = true;
  homeCardOrder: string[] = ['summary', 'quickActions', 'consumption', 'maintenance', 'history'];
  homeCardsEnabled: Record<string, boolean> = {
    summary: true,
    quickActions: true,
    consumption: true,
    maintenance: true,
    history: true
  };
  
  // Summary & Chart
  summaryVehiclePlate: string = '';
  avgSupply: number = 0;
  avgConsumption: number = 0;
  avgMaintenance: number = 0;
  /** Indica se o veículo possui pelo menos dois abastecimentos com tanque cheio, para cálculo de média. */
  temDoisAbastecimentosTanqueCompleto: boolean = false;
  /** Análise por ciclos tanque cheio → tanque cheio (Média Consumo no resumo). */
  analiseConsumoResumo: ResultadoAnaliseCiclosConsumo = {
    ciclosValidos: [],
    mediaConsumoKmPorLitro: 0,
    ciclosRejeitados: []
  };
  detalhesCiclosConsumoExpandidos: boolean = false;
  tripCount: number = 0;
  lastUpdateDate: string = '-';
  
  // New Summary Stats
  currentOdometer: number = 0;
  lastSupplyPrice: number = 0;
  lastSupplyLiters: number = 0;
  lastSupplyDateObj: Date | null = null;
  lastConsumptionResult: number = 0;
  lastMaintenanceValue: number = 0;

  observador_tema?: MutationObserver;

  consumptionChartData: ChartConfiguration['data'] = { datasets: [], labels: [] };
  public consumptionChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'bottom' }
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: { display: true, text: 'Consumo (Km/L)' }
      }
    }
  };

  public maintenanceChartData: ChartConfiguration['data'] = { datasets: [], labels: [] };
  public maintenanceChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'bottom' }
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: { display: true, text: 'Custo (R$)' }
      }
    }
  };
  
  public lineChartType: ChartType = 'line';

  returnSource: string | null = null;
  selectedVehiclePlate: string = ''; // Keep this for summary selection

  constructor(
    private vehicleService: VehicleService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private modalCtrl: ModalController,
    private route: ActivatedRoute,
    private router: Router,
    public ajuda_odometro: ServicoAjudaOdometro
  ) {
    addIcons({ add, colorFill, 'gas-station': 'assets/icon/gas-station.svg', 'chevron-down': chevronDown, 'chevron-up': chevronUp, speedometer, construct, car, map, create, settings, warningOutline });
    this.checkDarkMode();
  }

  checkDarkMode() {
    const aplicarTema = () => {
      const temaEscuroAtivo = document.body.classList.contains('dark');
      this.updateChartColors(temaEscuroAtivo);
    };

    aplicarTema();

    if (typeof MutationObserver !== 'undefined') {
      if (this.observador_tema) {
        this.observador_tema.disconnect();
      }
      this.observador_tema = new MutationObserver(aplicarTema);
      this.observador_tema.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }
  }

  updateChartColors(isDark: boolean) {
    const textColor = isDark ? '#ffffff' : '#666666';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

    const updateScales = (options: any) => {
      const newOptions = JSON.parse(JSON.stringify(options)); // Deep clone to ensure change detection
      if (newOptions.scales && newOptions.scales.y) {
        newOptions.scales.y.ticks = { ...newOptions.scales.y.ticks, color: textColor };
        newOptions.scales.y.grid = { ...newOptions.scales.y.grid, color: gridColor };
        newOptions.scales.y.title = { ...newOptions.scales.y.title, color: textColor };
      }
      if (newOptions.plugins && newOptions.plugins.legend) {
        newOptions.plugins.legend.labels = { ...newOptions.plugins.legend.labels, color: textColor };
      }
      return newOptions;
    };

    this.consumptionChartOptions = updateScales(this.consumptionChartOptions);
    this.maintenanceChartOptions = updateScales(this.maintenanceChartOptions);
  }

  ngOnDestroy() {
    if (this.observador_tema) {
      this.observador_tema.disconnect();
    }
  }

  ngOnInit() {
    this.loadHomeCardsPrefs();
    this.vehicleService.getVehicles().subscribe(vehicles => {
      this.vehicles = vehicles;
      const defaultVehicle = this.vehicles.find(v => v.isDefault);
      if (defaultVehicle) {
        this.selectedVehiclePlate = defaultVehicle.plate;
        this.summaryVehiclePlate = defaultVehicle.plate;
      } else if (this.vehicles.length === 1) {
        this.selectedVehiclePlate = this.vehicles[0].plate;
        this.summaryVehiclePlate = this.vehicles[0].plate;
      } else if (this.vehicles.length > 0 && !this.summaryVehiclePlate) {
        // Garante um veículo padrão para o resumo quando houver mais de um veículo e nenhum padrão marcado
        this.selectedVehiclePlate = this.vehicles[0].plate;
        this.summaryVehiclePlate = this.vehicles[0].plate;
      }
      this.updateSummary();

      this.updateAllHistory();
    });

    this.route.queryParams.subscribe(async params => {
      if (params) {
        // Capture return source if present
        if (params['source']) {
          this.returnSource = params['source'];
        }

        if (params['action']) {
          const action = params['action'];
          const plate = params['plate'];

          // Clear query params immediately to prevent re-triggering
          await this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { action: null, plate: null, source: null },
            queryParamsHandling: 'merge',
            replaceUrl: true
          });

          if (plate) {
            if (action === 'supply') {
              this.selectedVehiclePlate = plate;
              await this.openSupplyModal(undefined, plate);
            } else if (action === 'maintenance') {
              await this.openMaintenanceModal(undefined, plate);
            } else if (action === 'calculator') {
               await this.openConsumptionModal(undefined, plate);
            }
          }
        }
      }
    });
  }

  ionViewWillEnter() {
    this.loadHomeCardsPrefs();
    this.vehicles = this.vehicleService.getVehiclesSnapshot();
    // Pequeno delay para garantir que os elementos do gráfico estejam no DOM
    // antes de tentar atualizá-los, caso tenham sido reabilitados nas configurações.
    setTimeout(() => {
      if (this.vehicles.length > 0) {
        if (!this.summaryVehiclePlate) {
          const defaultVehicle = this.vehicles.find(v => v.isDefault);
          if (defaultVehicle) {
            this.summaryVehiclePlate = defaultVehicle.plate;
          } else {
            this.summaryVehiclePlate = this.vehicles[0].plate;
          }
        }
        this.updateSummary();
      }
    }, 100);
  }

  private loadHomeCardsPrefs() {
    const storedOrder = localStorage.getItem('home_card_order');
    if (storedOrder) {
      try {
        const arr = JSON.parse(storedOrder);
        const known = ['summary', 'quickActions', 'consumption', 'maintenance', 'history'];
        const filtered = Array.isArray(arr) ? arr.filter((k: string) => known.includes(k)) : [];
        const missing = known.filter(k => !filtered.includes(k));
        this.homeCardOrder = [...filtered, ...missing];
      } catch {}
    }
    const storedEnabled = localStorage.getItem('home_card_enabled');
    if (storedEnabled) {
      try {
        const obj = JSON.parse(storedEnabled);
        this.homeCardsEnabled = { ...this.homeCardsEnabled, ...obj };
      } catch {}
    }
  }

  get noHomeCardsEnabled(): boolean {
    return !Object.values(this.homeCardsEnabled).some(v => v);
  }

  openSettings() {
    this.router.navigate(['/tabs/settings']);
  }

  updateAllHistory() {
    let combinedHistory: any[] = [];

    this.vehicles.forEach(vehicle => {
      // Supplies
      if (vehicle.supplies) {
        vehicle.supplies.forEach(supply => {
          combinedHistory.push({
            type: 'supply',
            date: new Date(supply.date),
            createdAt: supply.createdAt || 0,
            vehicle: vehicle,
            data: supply
          });
        });
      }

      // Consumption Records
      if (vehicle.consumptionHistory) {
        vehicle.consumptionHistory.forEach(record => {
          combinedHistory.push({
            type: 'consumption',
            date: new Date(record.date),
            createdAt: record.createdAt || 0,
            vehicle: vehicle,
            data: record
          });
        });
      }

      // Maintenance
      if (vehicle.maintenance) {
        vehicle.maintenance.forEach(maint => {
          combinedHistory.push({
            type: 'maintenance',
            date: new Date(maint.date),
            createdAt: maint.createdAt || 0,
            vehicle: vehicle,
            data: maint
          });
        });
      }

      // Trips
      if (vehicle.trips) {
        vehicle.trips.forEach(trip => {
          combinedHistory.push({
            type: 'trip',
            date: new Date(trip.date),
            createdAt: trip.createdAt || 0,
            vehicle: vehicle,
            data: trip
          });
        });
      }

      // Other Expenses
      if (vehicle.otherExpenses) {
        vehicle.otherExpenses.forEach(exp => {
          combinedHistory.push({
            type: 'expense',
            date: new Date(exp.date),
            createdAt: exp.createdAt || 0,
            vehicle: vehicle,
            data: exp
          });
        });
      }

      // Incomes
      if (vehicle.incomes) {
        vehicle.incomes.forEach(inc => {
          combinedHistory.push({
            type: 'income',
            date: new Date(inc.date),
            createdAt: inc.createdAt || 0,
            vehicle: vehicle,
            data: inc
          });
        });
      }

      // Vehicle Creation
      if (vehicle.createdAt) {
        combinedHistory.push({
          type: 'vehicle-add',
          date: new Date(vehicle.createdAt),
          createdAt: vehicle.createdAt,
          vehicle: vehicle,
          data: { model: vehicle.model, plate: vehicle.plate }
        });
      }
    });

    // Ordena pela data efetiva do registro (mais recentes primeiro), com fallback em createdAt.
    this.allHistory = combinedHistory.sort((a, b) => this.compararDataRecenteHistoricoHome(a, b));
  }

  private obterTimestampItemHistoricoHome(item: any): number {
    const data = item?.date instanceof Date ? item.date.getTime() : new Date(item?.date).getTime();
    if (Number.isFinite(data) && data > 0) {
      return data;
    }
    return item?.createdAt ?? 0;
  }

  private compararDataRecenteHistoricoHome(a: any, b: any): number {
    const dataA = this.obterTimestampItemHistoricoHome(a);
    const dataB = this.obterTimestampItemHistoricoHome(b);
    if (dataA !== dataB) {
      return dataB - dataA;
    }

    const criadoA = a?.createdAt ?? 0;
    const criadoB = b?.createdAt ?? 0;
    if (criadoA !== criadoB) {
      return criadoB - criadoA;
    }

    return (a?.vehicle?.model || '').localeCompare(b?.vehicle?.model || '');
  }

  toggleCardExpansion(card: 'summary' | 'quickActions' | 'history' | 'consumptionChart' | 'maintenanceChart') {
    if (card === 'summary') {
      this.showSummaryCard = !this.showSummaryCard;
    } else if (card === 'quickActions') {
      this.showQuickActionsCard = !this.showQuickActionsCard;
    } else if (card === 'history') {
      this.showHistoryCard = !this.showHistoryCard;
    } else if (card === 'consumptionChart') {
      this.showConsumptionChartCard = !this.showConsumptionChartCard;
    } else if (card === 'maintenanceChart') {
      this.showMaintenanceChartCard = !this.showMaintenanceChartCard;
    }
  }

  alternarDetalhesCiclosConsumo(): void {
    this.detalhesCiclosConsumoExpandidos = !this.detalhesCiclosConsumoExpandidos;
  }

  ciclosConsumoEstaoExpandidos(): boolean {
    return this.detalhesCiclosConsumoExpandidos;
  }

  getOrderIndex(key: string): number {
    const idx = this.homeCardOrder.indexOf(key);
    return idx === -1 ? 999 : idx;
  }

  obter_icone_item_historico_home(item: any): string {
    if (item.type === 'vehicle-add' && item.vehicle && item.vehicle.type) {
      return this.vehicleService.getVehicleIcon(item.vehicle.type);
    }
    return this.getHistoryIcon(item.type);
  }

  getHistoryIcon(type: string): string {
    switch (type) {
      case 'supply': return 'gas-station';
      case 'consumption': return 'speedometer';
      case 'maintenance': return 'construct';
      case 'trip': return 'map';
      case 'expense': return 'card-outline';
      case 'income': return 'cash-outline';
      case 'vehicle-add': return 'car';
      default: return 'car';
    }
  }

  getHistoryColor(type: string): string {
    switch (type) {
      case 'supply': return 'success';
      case 'consumption': return 'dark';
      case 'maintenance': return 'danger';
      case 'trip': return 'warning';
      case 'expense': return 'danger';
      case 'income': return 'success';
      case 'vehicle-add': return 'tertiary';
      default: return 'medium';
    }
  }

  get displayedHistory() {
    return this.allHistory.slice(0, 4);
  }

  updateSummary() {
    const vehicle = this.vehicles.find(v => v.plate === this.summaryVehiclePlate);
    if (!vehicle) {
        this.summaryVehiclePlate = '';
        this.avgSupply = 0;
        this.avgConsumption = 0;
        this.avgMaintenance = 0;
        this.tripCount = 0;
        this.lastUpdateDate = '-';
        this.currentOdometer = 0;
        this.lastSupplyPrice = 0;
        this.lastSupplyLiters = 0;
        this.lastSupplyDateObj = null;
        this.lastConsumptionResult = 0;
        this.lastMaintenanceValue = 0;
        this.analiseConsumoResumo = { ciclosValidos: [], mediaConsumoKmPorLitro: 0, ciclosRejeitados: [] };
        this.consumptionChartData = { datasets: [], labels: [] };
        this.maintenanceChartData = { datasets: [], labels: [] };
        return;
    }

    // Avg Supply (Value)
    const supplies = vehicle.supplies || [];
    const abastecimentosTanqueCheio = supplies.filter(s => s.tanqueCompleto !== false);
    this.temDoisAbastecimentosTanqueCompleto = abastecimentosTanqueCheio.length >= 2;
    if (supplies.length > 0) {
        const totalVal = supplies.reduce((sum, s) => sum + (s.totalValue || 0), 0);
        this.avgSupply = totalVal / supplies.length;
    } else {
        this.avgSupply = 0;
    }

    // Last Supply
    const sortedSupplies = [...supplies].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (sortedSupplies.length > 0) {
        const last = sortedSupplies[0];
        this.lastSupplyPrice = last.totalValue || 0;
        this.lastSupplyLiters = last.liters || 0;
        this.lastSupplyDateObj = new Date(last.date);
    } else {
        this.lastSupplyPrice = 0;
        this.lastSupplyLiters = 0;
        this.lastSupplyDateObj = null;
    }

    // Média de consumo (Km/L) no resumo: apenas ciclos completos tanque cheio → tanque cheio
    this.analiseConsumoResumo = this.vehicleService.analisarCiclosConsumoPorTanqueCheio(vehicle);
    this.detalhesCiclosConsumoExpandidos = false;
    this.avgConsumption =
      this.analiseConsumoResumo.ciclosValidos.length > 0
        ? this.analiseConsumoResumo.mediaConsumoKmPorLitro
        : 0;

    const history = vehicle.consumptionHistory || [];
    // Último consumo: prioriza consumo derivado do abastecimento mais recente; senão usa o último registro de média
    const sortedSuppliesDesc = [...supplies].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let valorUltimoConsumo = 0;

    if (sortedSuppliesDesc.length >= 2) {
      const ultimoAbast = sortedSuppliesDesc[0];
      const anteriorAbast = sortedSuppliesDesc[1];
      const odoAnterior = anteriorAbast.finalOdometer ?? anteriorAbast.initialOdometer ?? anteriorAbast.odometer ?? 0;
      const odoAtual = ultimoAbast.initialOdometer ?? ultimoAbast.finalOdometer ?? ultimoAbast.odometer ?? 0;
      const litros = ultimoAbast.liters ?? 0;
      if (odoAtual > odoAnterior && litros > 0) {
        valorUltimoConsumo = (odoAtual - odoAnterior) / litros;
      }
    }
    if (valorUltimoConsumo === 0 && sortedSuppliesDesc.length === 1) {
      const ultimo = sortedSuppliesDesc[0];
      if (ultimo.average != null && ultimo.average > 0) {
        valorUltimoConsumo = ultimo.average;
      } else if (
        ultimo.initialOdometer != null && ultimo.finalOdometer != null && ultimo.liters != null &&
        ultimo.finalOdometer > ultimo.initialOdometer && ultimo.liters > 0
      ) {
        valorUltimoConsumo = (ultimo.finalOdometer - ultimo.initialOdometer) / ultimo.liters;
      }
    }
    if (valorUltimoConsumo === 0 && history.length > 0) {
      const sortedCons = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      valorUltimoConsumo = sortedCons[0].result ?? 0;
    }
    this.lastConsumptionResult = valorUltimoConsumo;

    // Avg Maintenance (Value)
    const maintenances = vehicle.maintenance || [];
    if (maintenances.length > 0) {
        const totalMaint = maintenances.reduce((sum, m) => sum + (m.totalValue || 0), 0);
        this.avgMaintenance = totalMaint / maintenances.length;
    } else {
        this.avgMaintenance = 0;
    }

    // Last Maintenance
    const sortedMaint = [...maintenances].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (sortedMaint.length > 0) {
        this.lastMaintenanceValue = sortedMaint[0].totalValue;
    } else {
        this.lastMaintenanceValue = 0;
    }

    // Odômetro atual = MAIOR odômetro registrado (veículo + qualquer tipo de registro que tenha odômetro)
    const registrosOdometro: { data: Date; valor: number }[] = [];

    // Cadastro do veículo
    if ((vehicle.odometer ?? 0) > 0) {
      registrosOdometro.push({
        data: vehicle.createdAt ? new Date(vehicle.createdAt) : new Date(),
        valor: vehicle.odometer!
      });
    }

    // Abastecimentos
    supplies.forEach(s => {
      const dataReg = new Date(s.date);
      const valor = s.finalOdometer ?? s.initialOdometer ?? s.odometer ?? 0;
      if (valor > 0) {
        registrosOdometro.push({ data: dataReg, valor });
      }
    });

    // Registros de média de consumo (quando tiver odômetro final)
    history.forEach(c => {
      const valor = c.finalOdometer ?? 0;
      if (valor > 0) {
        registrosOdometro.push({ data: new Date(c.date), valor });
      }
    });

    // Manutenções
    maintenances.forEach(m => {
      if ((m.odometer ?? 0) > 0) {
        registrosOdometro.push({ data: new Date(m.date), valor: m.odometer! });
      }
    });

    // Outras despesas com odômetro preenchido
    const outrasDespesas = vehicle.otherExpenses || [];
    outrasDespesas.forEach(e => {
      if ((e.odometer ?? 0) > 0) {
        registrosOdometro.push({ data: new Date(e.date), valor: e.odometer! });
      }
    });
    if (registrosOdometro.length > 0) {
      const maior = registrosOdometro.reduce((acc, atual) => {
        return atual.valor > acc.valor ? atual : acc;
      }, registrosOdometro[0]);
      this.currentOdometer = maior.valor;
    } else {
      this.currentOdometer = 0;
    }

    // Trip Count
    this.tripCount = (vehicle.trips || []).length;

    // Last Date
    this.lastUpdateDate = new Date().toLocaleDateString('pt-BR');

    // Chart Data - Consumption: registros de média (history) + consumo derivado dos abastecimentos, ordenados por data
    const pontosConsumo: { data: Date; resultado: number }[] = [];
    history.forEach(h => {
      pontosConsumo.push({ data: new Date(h.date), resultado: h.result ?? 0 });
    });
    const suppliesOrdenados = [...supplies].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    suppliesOrdenados.forEach((atual, i) => {
      let resultado = 0;
      if (atual.average != null && atual.average > 0) {
        resultado = atual.average;
      } else if (atual.initialOdometer != null && atual.finalOdometer != null && atual.liters != null && atual.liters > 0 && atual.finalOdometer > atual.initialOdometer) {
        resultado = (atual.finalOdometer - atual.initialOdometer) / atual.liters;
      } else if (i > 0) {
        const anterior = suppliesOrdenados[i - 1];
        const odoAnterior = anterior.finalOdometer ?? anterior.initialOdometer ?? anterior.odometer ?? 0;
        const odoAtual = atual.initialOdometer ?? atual.finalOdometer ?? atual.odometer ?? 0;
        const litros = atual.liters ?? 0;
        if (odoAtual > odoAnterior && litros > 0) {
          resultado = (odoAtual - odoAnterior) / litros;
        }
      }
      if (resultado > 0) {
        pontosConsumo.push({ data: new Date(atual.date), resultado });
      }
    });
    pontosConsumo.sort((a, b) => a.data.getTime() - b.data.getTime());
    const porData = new Map<number, number>();
    pontosConsumo.forEach(p => {
      const dia = new Date(p.data.getFullYear(), p.data.getMonth(), p.data.getDate()).getTime();
      porData.set(dia, p.resultado);
    });
    const sortedConsumption = Array.from(porData.entries())
      .map(([t, resultado]) => ({ data: new Date(t), resultado }))
      .sort((a, b) => a.data.getTime() - b.data.getTime());
    const chartLabels = sortedConsumption.map(p => {
      const d = p.data.toISOString().split('T')[0];
      const [year, month, day] = d.split('-');
      return `${day}/${month}/${year}`;
    });
    const chartValues = sortedConsumption.map(p => p.resultado);
    this.consumptionChartData = {
        datasets: [
            {
                data: chartValues,
                label: 'Consumo (Km/L)',
                backgroundColor: 'rgba(56, 128, 255, 0.2)',
                borderColor: 'rgba(56, 128, 255, 1)',
                pointBackgroundColor: 'rgba(56, 128, 255, 1)',
                pointBorderColor: '#fff',
                fill: 'origin',
                tension: 0.4,
                spanGaps: true,
                borderWidth: 2
            }
        ],
        labels: chartLabels
    };

    // Chart Data - Maintenance
    // Sort maintenance by date
    const sortedMaintenance = [...maintenances].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Update Maintenance Chart Options with custom Tooltip
    this.maintenanceChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: true, position: 'bottom' },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        const label = context.dataset.label || '';
                        const value = context.parsed.y;
                        const index = context.dataIndex;

                        if (value === null) return '';

                        const detail = sortedMaintenance[index];
                        const formattedVal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
                        const lines = [`${label}: ${formattedVal}`];
                        if (detail) {
                            if (detail.summary) lines.push(`Resumo: ${detail.summary}`);
                            if (detail.parts) lines.push(`Peças: ${detail.parts}`);
                            lines.push(`Odômetro: ${detail.odometer} km`);
                        }
                        return lines;
                    }
                }
            }
        },
        scales: {
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                title: { display: true, text: 'Custo (R$)' }
            }
        }
    };

    this.maintenanceChartData = {
        datasets: [
            {
                data: sortedMaintenance.map(m => m.totalValue),
                label: 'Manutenção (R$)',
                backgroundColor: 'rgba(255, 0, 0, 0.2)',
                borderColor: 'rgba(255, 0, 0, 1)',
                pointBackgroundColor: 'rgba(255, 0, 0, 1)',
                pointBorderColor: '#fff',
                fill: false,
                tension: 0.4,
                spanGaps: true,
                borderWidth: 2
            }
        ],
        labels: sortedMaintenance.map(m => {
            const d = new Date(m.date).toISOString().split('T')[0];
            const [year, month, day] = d.split('-');
            return `${day}/${month}/${year}`;
        })
    };
  }

  updateAllSupplies() {
    this.updateAllHistory();
  }

  updateConsumptionHistory() {
    this.updateAllHistory();
  }

  updateMaintenanceHistory() {
    this.updateAllHistory();
  }

  get supplyHistory() {
    return this.allHistory.filter(item => item.type === 'supply');
  }

  get maintenanceHistory() {
    return this.allHistory.filter(item => item.type === 'maintenance');
  }

  get consumptionHistory() {
    return this.allHistory.filter(item => item.type === 'consumption');
  }

  get displayedSupplies() {
    // Legacy support or remove if template updated
    return [];
  }

  podeEditar(item: any): boolean {
    return ['supply', 'maintenance', 'consumption', 'trip', 'vehicle-add'].includes(item.type);
  }

  podeApagar(item: any): boolean {
    return ['supply', 'maintenance', 'consumption', 'trip', 'expense', 'income'].includes(item.type);
  }

  async editHistoryItem(item: any) {
    if (item.type === 'supply') {
      await this.openSupplyModal(item.data, item.vehicle.plate);
    } else if (item.type === 'maintenance') {
      await this.openMaintenanceModal(item.data, item.vehicle.plate);
    } else if (item.type === 'consumption') {
      await this.openConsumptionModal(item.data, item.vehicle.plate);
    } else if (item.type === 'trip') {
      this.router.navigate(['/tabs/calculator'], { queryParams: { plate: item.vehicle.plate, view: 'trip', editTripId: item.data?.id } });
    } else if (item.type === 'expense') {
      this.router.navigate(['/expense-history'], { queryParams: { plate: item.vehicle.plate } });
    } else if (item.type === 'income') {
      this.router.navigate(['/income-history'], { queryParams: { plate: item.vehicle.plate } });
    } else if (item.type === 'vehicle-add') {
      this.router.navigate(['/tabs/vehicles/form', item.vehicle.plate]);
    }
  }

  async removeHistoryItem(item: any) {
    const alert = await this.alertCtrl.create({
      header: 'Confirmar exclusão',
      message: 'Deseja realmente excluir este registro?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Excluir',
          role: 'destructive',
          handler: () => {
            let removed = false;
            if (item.type === 'supply' && item.data?.id) {
              removed = this.vehicleService.removerAbastecimento(item.vehicle.plate, item.data.id);
            } else if (item.type === 'maintenance' && item.data?.id) {
              removed = this.vehicleService.removerManutencao(item.vehicle.plate, item.data.id);
            } else if (item.type === 'consumption' && item.data?.id) {
              removed = this.vehicleService.removerConsumo(item.vehicle.plate, item.data.id);
            } else if (item.type === 'trip' && item.data?.id) {
              removed = this.vehicleService.removerViagem(item.vehicle.plate, item.data.id);
            } else if (item.type === 'expense' && item.data?.id) {
              removed = this.vehicleService.removerDespesa(item.vehicle.plate, item.data.id);
            } else if (item.type === 'income' && item.data?.id) {
              removed = this.vehicleService.removerReceita(item.vehicle.plate, item.data.id);
            }
            if (removed) {
              this.updateAllHistory();
              this.updateSummary();
              this.toastCtrl.create({
                message: 'Registro removido com sucesso.',
                duration: 1800,
                color: 'success',
                position: 'bottom'
              }).then(t => t.present());
            } else {
              this.toastCtrl.create({
                message: 'Não foi possível remover o registro.',
                duration: 2000,
                color: 'danger',
                position: 'bottom'
              }).then(t => t.present());
            }
          }
        }
      ]
    });
    await alert.present();
  }

  handleRedirect(plate?: string): boolean {
    if (this.returnSource === 'vehicles') {
      this.returnSource = null;
      if (plate) {
        this.router.navigate(['/tabs/vehicles/acoes', plate]);
      } else {
        this.router.navigate(['/tabs/vehicles']);
      }
      return true;
    }
    return false;
  }

  private async ensureVehiclesBeforeAction(actionLabel: string): Promise<boolean> {
    if (this.vehicles && this.vehicles.length > 0) {
      return true;
    }

    const alert = await this.alertCtrl.create({
      header: 'Cadastre um veículo',
      message: `Para ${actionLabel}, cadastre primeiro um veículo no menu Veículos.`,
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

    return false;
  }

  async openSupplyModal(editingSupply?: Supply, vehiclePlate?: string): Promise<boolean> {
    const canProceed = await this.ensureVehiclesBeforeAction('registrar um abastecimento');
    if (!canProceed) {
      return false;
    }

    const modal = await this.modalCtrl.create({
      component: SupplyModalComponent,
      componentProps: {
        vehicles: this.vehicles,
        editingSupply: editingSupply,
        editingVehiclePlate: vehiclePlate || this.selectedVehiclePlate
      }
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data && data.saved) {
      this.vehicles = this.vehicleService.getVehiclesSnapshot();
      this.updateAllHistory();
      this.updateSummary();
    }
    if (data && data.action === 'view_history') {
      this.router.navigate(['/supply-history']);
      return true;
    }
    return this.handleRedirect(vehiclePlate || this.selectedVehiclePlate);
  }

  async openConsumptionModal(editingRecord?: ConsumptionRecord, vehiclePlate?: string): Promise<boolean> {
    const canProceed = await this.ensureVehiclesBeforeAction('calcular consumo');
    if (!canProceed) {
      return false;
    }

    const modal = await this.modalCtrl.create({
      component: ConsumptionModalComponent,
      componentProps: {
        vehicles: this.vehicles,
        editingRecord: editingRecord,
        editingVehiclePlate: vehiclePlate || this.selectedVehiclePlate
      }
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data && data.saved) {
      this.vehicles = this.vehicleService.getVehiclesSnapshot();
      this.updateAllHistory();
      this.updateSummary();
    }
    if (data && data.action === 'view_history') {
      this.router.navigate(['/consumption-history']);
      return true;
    }
    return this.handleRedirect(vehiclePlate || this.selectedVehiclePlate);
  }

  async openMaintenanceModal(editingMaintenance?: Maintenance, vehiclePlate?: string): Promise<boolean> {
    const canProceed = await this.ensureVehiclesBeforeAction('registrar uma manutenção');
    if (!canProceed) {
      return false;
    }

    const modal = await this.modalCtrl.create({
      component: MaintenanceModalComponent,
      componentProps: {
        vehicles: this.vehicles,
        editingMaintenance: editingMaintenance,
        editingVehiclePlate: vehiclePlate || this.selectedVehiclePlate
      }
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data && data.saved) {
      this.vehicles = this.vehicleService.getVehiclesSnapshot();
      this.updateAllHistory();
      this.updateSummary();
    }
    if (data && data.action === 'view_history') {
      this.router.navigate(['/maintenance-history']);
      return true;
    }
    return this.handleRedirect(vehiclePlate || this.selectedVehiclePlate);
  }

}
