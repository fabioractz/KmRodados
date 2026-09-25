import { Component, OnInit, OnDestroy } from '@angular/core';
import { VehicleService, Vehicle, Supply } from '../services/vehicle.service';
import { ServicoAjudaOdometro } from '../services/ajuda-odometro.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ModalController } from '@ionic/angular';
import { Subject, takeUntil } from 'rxjs';
import { SupplyModalComponent } from '../home/modals/supply-modal/supply-modal.component';

interface SupplyWithVehicle extends Supply {
  vehicleModel: string;
  vehiclePlate: string;
}

export interface CycleHistoryItem {
  vehicleModel: string;
  vehiclePlate: string;
  supplies: SupplyWithVehicle[];
  reference?: number;
  reason?: string;
  reviewKey?: string;
  suspicious?: boolean;
  distance?: number;
  liters?: number;
  consumption?: number;
  comparison?: { reference: number; ratio: number; above: boolean; referenceWidth: number; cycleWidth: number };
}

@Component({
  selector: 'app-supply-history',
  templateUrl: './supply-history.page.html',
  styleUrls: ['./supply-history.page.scss'],
  standalone: false
})
export class SupplyHistoryPage implements OnInit, OnDestroy {
  supplies: SupplyWithVehicle[] = [];
  vehicles: Vehicle[] = [];
  placaFiltrada: string | null = null;
  view = 'supplies';
  cicloSelecionado: string | null = null;
  cycles: CycleHistoryItem[] = [];
  issues: CycleHistoryItem[] = [];
  adjustment: { cycleKey?: string; supply: SupplyWithVehicle; title: string; odometer: number | null; finalOdometer: number | null; liters: number | null; full: boolean } | null = null;
  adjustmentError = '';
  adjustmentMessage = '';
  adjustmentStatus: 'success' | 'warning' = 'success';
  reviewFocusKey: string | null = null;
  private readonly destroyed$ = new Subject<void>();

  constructor(
    private vehicleService: VehicleService,
    public ajuda_odometro: ServicoAjudaOdometro,
    private route: ActivatedRoute,
    private alertCtrl: AlertController,
    private modalCtrl: ModalController,
    private router?: Router
  ) { }

  ngOnInit() {
    this.route.queryParamMap.pipe(takeUntil(this.destroyed$)).subscribe(params => {
      this.placaFiltrada = params.get('plate');
      this.cicloSelecionado = params.get('cycle');
      const view = params.get('view');
      this.view = view === 'cycles' || view === 'issues' ? view : 'supplies';
      this.refreshHistory();
    });
    this.vehicleService.getVehicles().pipe(takeUntil(this.destroyed$)).subscribe(vehicles => {
      this.vehicles = vehicles;
      this.refreshHistory();
    });
  }

  ngOnDestroy() {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  refreshHistory() {
    this.supplies = this.flattenSupplies(this.vehicles, this.placaFiltrada);
    this.cycles = [];
    this.issues = [];
    for (const vehicle of this.vehicles) {
      if (this.placaFiltrada && vehicle.plate !== this.placaFiltrada) continue;
      const ordered = this.vehicleService.ordenarAbastecimentosParaCiclos(vehicle);
      const analysis = this.vehicleService.analisarCiclosConsumoPorTanqueCheio(vehicle);
      const values = analysis.ciclosValidos.map(c => c.consumoKmPorLitro).filter(v => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
      const middle = Math.floor(values.length / 2);
      const reference = values.length ? (values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2) : undefined;
      const records = (start: number, end: number) => ordered.slice(start, end + 1)
        .map(supply => ({ ...supply, vehicleModel: vehicle.model, vehiclePlate: vehicle.plate }));
      const atypical = this.vehicleService.identificarCiclosAtipicos(vehicle)
        .filter(cycle => !this.vehicleService.avisoConsumoDispensado(vehicle, cycle));
      this.cycles.push(...analysis.ciclosValidos.map(cycle => {
        const alert = atypical.find(item => item.indiceInicio === cycle.indiceInicio && item.indiceFim === cycle.indiceFim);
        const reference = alert?.referencia;
        const value = cycle.consumoKmPorLitro;
        const comparison = reference && Number.isFinite(reference) && reference > 0 && Number.isFinite(value) && value > 0
          ? { reference, ratio: value / reference, above: value > reference,
              referenceWidth: reference / Math.max(reference, value) * 100,
              cycleWidth: value / Math.max(reference, value) * 100 }
          : undefined;
        return {
          reviewKey: this.vehicleService.chaveAvisoConsumo(vehicle, cycle),
          vehicleModel: vehicle.model, vehiclePlate: vehicle.plate,
          supplies: records(cycle.indiceInicio, cycle.indiceFim),
          distance: cycle.kmPercorridos, liters: cycle.litrosTotaisNoCiclo,
          consumption: cycle.consumoKmPorLitro, comparison
        };
      }));
      this.issues.push(...atypical.map(cycle => ({
        reviewKey: this.vehicleService.chaveAvisoConsumo(vehicle, cycle),
        vehicleModel: vehicle.model, vehiclePlate: vehicle.plate,
        supplies: records(cycle.indiceInicio, cycle.indiceFim), reason: cycle.motivo,
        suspicious: true, consumption: cycle.consumoKmPorLitro,
        distance: cycle.kmPercorridos, liters: cycle.litrosTotaisNoCiclo,
        comparison: this.cycles.find(item => item.vehiclePlate === vehicle.plate &&
          item.reviewKey === this.vehicleService.chaveAvisoConsumo(vehicle, cycle))?.comparison
      })));
      this.issues.push(...analysis.ciclosRejeitados.filter(cycle => !this.vehicleService.avisoConsumoDispensado(vehicle, cycle)).map(cycle => ({
        reviewKey: this.vehicleService.chaveAvisoConsumo(vehicle, cycle),
        vehicleModel: vehicle.model, vehiclePlate: vehicle.plate,
        supplies: records(cycle.indiceInicio, cycle.indiceFim), reason: cycle.motivo, reference
      })));
    }
    const newestFirst = (a: CycleHistoryItem, b: CycleHistoryItem) =>
      new Date(b.supplies[b.supplies.length - 1].date).getTime() - new Date(a.supplies[a.supplies.length - 1].date).getTime();
    this.cycles.sort(newestFirst);
    this.issues.sort(newestFirst);
  }

  abrirRevisao() {
    this.view = 'issues';
    this.cicloSelecionado = null;
    return this.router?.navigate([], { relativeTo: this.route, queryParams: { cycle: null, view: 'issues' }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  verTodosOsCiclos() {
    this.cicloSelecionado = null;
    this.view = 'cycles';
    return this.router?.navigate([], { relativeTo: this.route, queryParams: { cycle: null, view: 'cycles' }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  get ciclosExibidos(): CycleHistoryItem[] {
    return this.cicloSelecionado ? this.cycles.filter(c => c.reviewKey === this.cicloSelecionado) : this.cycles;
  }

  dispensarAviso(cycle: CycleHistoryItem) {
    if (!cycle.reviewKey) return;
    this.vehicleService.dispensarAvisoConsumo(cycle.vehiclePlate, cycle.reviewKey);
    this.refreshHistory();
  }

  flattenSupplies(vehicles: Vehicle[], placaFiltrada?: string | null): SupplyWithVehicle[] {
    const allSupplies: SupplyWithVehicle[] = [];
    
    vehicles.forEach(vehicle => {
      if (placaFiltrada && vehicle.plate !== placaFiltrada) {
        return;
      }
      if (vehicle.supplies) {
        vehicle.supplies.forEach(supply => {
          allSupplies.push({
            ...supply,
            vehicleModel: vehicle.model,
            vehiclePlate: vehicle.plate
          });
        });
      }
    });

    // Sort by date descending (newest first)
    return allSupplies.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  abrirAjuste(cycle: CycleHistoryItem, supply: SupplyWithVehicle, title: string) {
    this.adjustmentError = '';
    this.adjustmentMessage = '';
    this.adjustment = { cycleKey: cycle.reviewKey, supply, title,
      odometer: supply.initialOdometer ?? supply.odometer ?? supply.finalOdometer ?? null,
      finalOdometer: supply.finalOdometer ?? null, liters: supply.liters ?? null,
      full: supply.tanqueCompleto !== false };
  }

  formatarOdometroAjuste(value: number | null): string {
    return value == null ? '' : new Intl.NumberFormat('pt-BR').format(value);
  }

  atualizarOdometroAjuste(event: Event, field: 'odometer' | 'finalOdometer') {
    if (!this.adjustment) return;
    const input = event.target as HTMLInputElement;
    const cursor = input.selectionStart ?? input.value.length;
    const digitsBeforeCursor = input.value.slice(0, cursor).replace(/\D/g, '').length;
    const digits = input.value.replace(/\D/g, '');
    const value = digits ? Number(digits) : null;
    this.adjustment[field] = value;
    input.value = this.formatarOdometroAjuste(value);
    let position = 0;
    let count = 0;
    while (position < input.value.length && count < digitsBeforeCursor) {
      if (/\d/.test(input.value[position])) count++;
      position++;
    }
    input.setSelectionRange(position, position);
    this.adjustmentError = '';
  }

  salvarAjuste() {
    const edit = this.adjustment;
    if (!edit) return;
    const odometer = Number(edit.odometer), liters = Number(edit.liters);
    const finalOdometer = edit.finalOdometer == null ? undefined : Number(edit.finalOdometer);
    if (!Number.isFinite(odometer) || odometer <= 0 || !Number.isFinite(liters) || liters <= 0 ||
        (finalOdometer != null && (!Number.isFinite(finalOdometer) || finalOdometer <= 0))) {
      this.adjustmentError = 'Informe odômetro e litros maiores que zero.';
      return;
    }
    const current = this.vehicles.find(v => v.plate === edit.supply.vehiclePlate)?.supplies?.find(s => s.id === edit.supply.id);
    if (!edit.supply.id || !current) {
      this.adjustmentError = 'Não foi possível localizar este abastecimento. Abra a edição completa.';
      return;
    }
    const updated: Supply = { ...current, liters, tanqueCompleto: edit.full };
    if (current.initialOdometer != null) updated.initialOdometer = odometer;
    if (current.odometer != null) updated.odometer = odometer;
    if (current.initialOdometer == null && current.odometer == null && current.finalOdometer == null) updated.initialOdometer = odometer;
    if (current.finalOdometer != null) updated.finalOdometer = current.initialOdometer == null && current.odometer == null ? odometer : finalOdometer;
    if (liters !== current.liters && current.totalValue != null) updated.precoPorLitro = current.totalValue / liters;
    if (!this.vehicleService.updateSupply(edit.supply.vehiclePlate, updated)) {
      this.adjustmentError = 'Não foi possível salvar. Tente novamente.';
      return;
    }
    this.adjustment = null;
    this.avaliarAjuste(edit.supply, edit.cycleKey);
  }

  private avaliarAjuste(registro: SupplyWithVehicle, originalKey?: string) {
    this.refreshHistory();
    const vehicle = this.vehicles.find(v => v.plate === registro.vehiclePlate);
    if (!vehicle) return;
    const ordered = this.vehicleService.ordenarAbastecimentosParaCiclos(vehicle);
    const analysis = this.vehicleService.analisarCiclosConsumoPorTanqueCheio(vehicle);
    const affected = (cycle: { indiceInicio: number; indiceFim: number }) =>
      (originalKey != null && this.vehicleService.chaveAvisoConsumo(vehicle, cycle) === originalKey) ||
      ordered.slice(cycle.indiceInicio, cycle.indiceFim + 1).some(s => registro.id != null && s.id === registro.id);
    // Revalidate the saved data, including warnings previously dismissed by the user.
    const pending = [
      ...analysis.ciclosRejeitados,
      ...this.vehicleService.identificarCiclosAtipicos(vehicle)
    ].filter(affected);
    this.adjustmentStatus = 'warning';
    this.reviewFocusKey = null;
    if (pending.length) {
      this.reviewFocusKey = this.vehicleService.chaveAvisoConsumo(vehicle, pending[0]);
      this.adjustmentMessage = `Ajuste salvo, mas ainda há ${pending.length === 1 ? 'uma pendência' : pending.length + ' pendências'} no trecho: ${pending[0].motivo}`;
    } else if (analysis.ciclosValidos.some(affected)) {
      this.adjustmentStatus = 'success';
      this.adjustmentMessage = 'Ajuste salvo. Nenhuma inconsistência identificada nos ciclos afetados; os avisos resolvidos foram removidos da revisão.';
    } else {
      this.adjustmentMessage = 'Ajuste salvo. O trecho não forma mais um ciclo completo. Será possível avaliar o consumo quando houver dois registros de tanque cheio.';
    }
  }

  async editar_abastecimento(registro: SupplyWithVehicle) {
    const veiculo = this.vehicles.find(v => v.plate === registro.vehiclePlate);
    if (!veiculo) {
      return;
    }

    const originalKey = this.adjustment?.cycleKey || this.cicloSelecionado || undefined;
    this.adjustmentMessage = '';
    const modal = await this.modalCtrl.create({
      component: SupplyModalComponent,
      componentProps: {
        vehicles: this.vehicles,
        editingSupply: registro,
        editingVehiclePlate: veiculo.plate
      }
    });

    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data && data.saved) {
      this.avaliarAjuste(registro, originalKey);
    }
  }

  async remover_abastecimento(registro: SupplyWithVehicle) {
    if (!registro.id) {
      return;
    }
    const veiculo = this.vehicles.find(v => v.plate === registro.vehiclePlate);
    if (!veiculo) {
      return;
    }

    const alerta = await this.alertCtrl.create({
      header: 'Confirmar exclusão',
      message: 'Deseja realmente excluir este abastecimento?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Excluir',
          role: 'destructive',
          handler: () => {
            this.vehicleService.removerAbastecimento(veiculo.plate, registro.id!);
            this.refreshHistory();
          }
        }
      ]
    });

    await alerta.present();
  }
}
