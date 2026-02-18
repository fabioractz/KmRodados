import { Component, OnInit, OnDestroy } from '@angular/core';
import { VehicleService, Vehicle, Supply, ConsumptionRecord, Maintenance } from '../services/vehicle.service';
import { AlertController, ToastController, ModalController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { add, colorFill, chevronDown, chevronUp, speedometer, construct, car, map, create, settings } from 'ionicons/icons';
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
    addIcons({ add, colorFill, 'gas-station': 'assets/icon/gas-station.svg', 'chevron-down': chevronDown, 'chevron-up': chevronUp, speedometer, construct, car, map, create, settings });
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

    // Sort by Date Descending, then CreatedAt Descending
    this.allHistory = combinedHistory.sort((a, b) => {
      const dateA = a.date.getTime();
      const dateB = b.date.getTime();
      if (dateA !== dateB) {
        return dateB - dateA;
      }
      return b.createdAt - a.createdAt;
    });
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
      case 'vehicle-add': return 'tertiary';
      default: return 'medium';
    }
  }

  get displayedHistory() {
    return this.showAllHistory ? this.allHistory : this.allHistory.slice(0, 5);
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
        this.consumptionChartData = { datasets: [], labels: [] };
        this.maintenanceChartData = { datasets: [], labels: [] };
        return;
    }

    // Avg Supply (Value)
    const supplies = vehicle.supplies || [];
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

    // Avg Consumption (Km/L)
    const history = vehicle.consumptionHistory || [];
    if (history.length > 0) {
        const totalCons = history.reduce((sum, h) => sum + (h.result || 0), 0);
        this.avgConsumption = totalCons / history.length;
    } else {
        this.avgConsumption = 0;
    }

    // Last Consumption
    const sortedCons = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (sortedCons.length > 0) {
        this.lastConsumptionResult = sortedCons[0].result;
    } else {
        this.lastConsumptionResult = 0;
    }

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

    // Current Odometer (Max of all records)
    let maxOdo = 0;
    supplies.forEach(s => { 
        if((s.odometer || 0) > maxOdo) maxOdo = s.odometer || 0;
        if((s.finalOdometer || 0) > maxOdo) maxOdo = s.finalOdometer || 0;
    });
    history.forEach(c => { 
        if((c.finalOdometer || 0) > maxOdo) maxOdo = c.finalOdometer || 0;
        // c.distance is trip distance, not odometer reading
    }); 
    maintenances.forEach(m => { if((m.odometer || 0) > maxOdo) maxOdo = m.odometer || 0; });
    
    this.currentOdometer = maxOdo;

    // Trip Count
    this.tripCount = (vehicle.trips || []).length;

    // Last Date
    this.lastUpdateDate = new Date().toLocaleDateString('pt-BR');

    // Chart Data - Consumption
    // Sort consumption history by date
    const sortedConsumption = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    this.consumptionChartData = {
        datasets: [
            {
                data: sortedConsumption.map(h => h.result),
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
        labels: sortedConsumption.map(h => {
            const d = new Date(h.date).toISOString().split('T')[0];
            const [year, month, day] = d.split('-');
            return `${day}/${month}/${year}`;
        })
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

  async editHistoryItem(item: any) {
    if (item.type === 'supply') {
      await this.openSupplyModal(item.data, item.vehicle.plate);
    } else if (item.type === 'maintenance') {
      await this.openMaintenanceModal(item.data, item.vehicle.plate);
    } else if (item.type === 'consumption') {
      await this.openConsumptionModal(item.data, item.vehicle.plate);
    }
  }

  toggleHistory() {
    this.showAllHistory = !this.showAllHistory;
  }

  async openSupplyModal(editingSupply?: Supply, vehiclePlate?: string): Promise<boolean> {
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
      this.updateAllHistory();
      this.updateSummary();
    }
    if (data && data.action === 'view_history') {
      this.router.navigate(['/supply-history']);
      return true;
    }
    return this.handleRedirect();
  }

  async openConsumptionModal(editingRecord?: ConsumptionRecord, vehiclePlate?: string): Promise<boolean> {
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
      this.updateAllHistory();
      this.updateSummary();
    }
    if (data && data.action === 'view_history') {
      this.router.navigate(['/consumption-history']);
      return true;
    }
    return this.handleRedirect();
  }

  async openMaintenanceModal(editingMaintenance?: Maintenance, vehiclePlate?: string): Promise<boolean> {
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
      this.updateAllHistory();
      this.updateSummary();
    }
    if (data && data.action === 'view_history') {
      this.router.navigate(['/maintenance-history']);
      return true;
    }
    return this.handleRedirect();
  }

  abrir_historico_abastecimentos() {
    this.router.navigate(['/supply-history']);
  }

  abrir_historico_manutencoes() {
    this.router.navigate(['/maintenance-history']);
  }

  handleRedirect(): boolean {
    if (this.returnSource === 'vehicles') {
      this.returnSource = null;
      this.router.navigate(['/tabs/vehicles']);
      return true;
    }
    return false;
  }

}
