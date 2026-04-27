import { Component, OnInit } from '@angular/core';
import { VehicleService, Vehicle, Supply, ConsumptionRecord, Maintenance, Trip, OtherExpense, IncomeEntry } from '../services/vehicle.service';
import { Router } from '@angular/router';
import { ServicoAjudaOdometro } from '../services/ajuda-odometro.service';
import { ModalController, AlertController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronDown, chevronUp } from 'ionicons/icons';
import { SupplyModalComponent } from '../home/modals/supply-modal/supply-modal.component';
import { ConsumptionModalComponent } from '../home/modals/consumption-modal/consumption-modal.component';
import { MaintenanceModalComponent } from '../home/modals/maintenance-modal/maintenance-modal.component';
import { TripModalComponent } from '../home/modals/trip-modal/trip-modal.component';

interface ItemHistorico {
  type: 'supply' | 'consumption' | 'maintenance' | 'trip' | 'vehicle-add' | 'expense' | 'income';
  date: Date;
  createdAt: number;
  vehicle: Vehicle;
  data: Supply | ConsumptionRecord | Maintenance | Trip | OtherExpense | IncomeEntry | any;
}

@Component({
  selector: 'app-history',
  templateUrl: './history.page.html',
  styleUrls: ['./history.page.scss'],
  standalone: false
})
export class HistoryPage implements OnInit {
  veiculos: Vehicle[] = [];
  historicoCompleto: ItemHistorico[] = [];
  historicoCompleto_bruto: ItemHistorico[] = [];
  criterio_ordenacao: 'data_recente' | 'data_antiga' | 'alfabetica_az' | 'alfabetica_za' | 'tipo' = 'data_recente';
  filtro_tipo: 'todos' | 'supply' | 'consumption' | 'maintenance' | 'trip' | 'expense' | 'income' = 'todos';
  /** Chaves dos itens do histórico com detalhes expandidos. */
  chavesExpandidasHistorico: Set<string> = new Set();

  constructor(
    private servicoVeiculos: VehicleService,
    private roteador: Router,
    private controladorModal: ModalController,
    public ajuda_odometro: ServicoAjudaOdometro,
    private alertCtrl: AlertController
  ) {
    addIcons({ chevronDown, chevronUp });
  }

  ngOnInit() {
    this.servicoVeiculos.getVehicles().subscribe(veiculos => {
      this.veiculos = veiculos;
      this.atualizar_historico_completo();
    });
  }

  async confirmar_limpar_historico() {
    const alerta = await this.alertCtrl.create({
      header: 'Limpar histórico',
      message: 'Deseja realmente apagar todo o histórico?',
      buttons: [
        {
          text: 'Não',
          role: 'cancel'
        },
        {
          text: 'Sim',
          role: 'destructive',
          handler: () => {
            this.servicoVeiculos.limparHistoricoCompleto();
            this.veiculos = [];
            this.historicoCompleto = [];
            this.historicoCompleto_bruto = [];
            this.chavesExpandidasHistorico = new Set();
          }
        }
      ]
    });

    await alerta.present();
  }

  obterChaveItemHistorico(item: ItemHistorico): string {
    const id = (item.data && item.data.id) ? String(item.data.id) : '';
    return `${item.type}|${item.vehicle.plate}|${id}|${item.createdAt}`;
  }

  alternarExpansaoHistorico(item: ItemHistorico): void {
    const chave = this.obterChaveItemHistorico(item);
    if (this.chavesExpandidasHistorico.has(chave)) {
      this.chavesExpandidasHistorico.delete(chave);
    } else {
      this.chavesExpandidasHistorico.add(chave);
    }
    this.chavesExpandidasHistorico = new Set(this.chavesExpandidasHistorico);
  }

  itemHistoricoEstaExpandido(item: ItemHistorico): boolean {
    return this.chavesExpandidasHistorico.has(this.obterChaveItemHistorico(item));
  }

  rotularTanqueCheio(valor: boolean | undefined): string {
    if (valor === false) {
      return 'Não';
    }
    return 'Sim';
  }

  pararPropagacaoClique(evento: Event): void {
    evento.stopPropagation();
  }

  atualizar_historico_completo() {
    const combinado: ItemHistorico[] = [];

    this.veiculos.forEach(veiculo => {
      if (veiculo.supplies) {
        veiculo.supplies.forEach(supply => {
          combinado.push({
            type: 'supply',
            date: new Date(supply.date),
            createdAt: supply.createdAt || 0,
            vehicle: veiculo,
            data: supply
          });
        });
      }

      if (veiculo.consumptionHistory) {
        veiculo.consumptionHistory.forEach(record => {
          combinado.push({
            type: 'consumption',
            date: new Date(record.date),
            createdAt: record.createdAt || 0,
            vehicle: veiculo,
            data: record
          });
        });
      }

      if (veiculo.maintenance) {
        veiculo.maintenance.forEach(maint => {
          combinado.push({
            type: 'maintenance',
            date: new Date(maint.date),
            createdAt: maint.createdAt || 0,
            vehicle: veiculo,
            data: maint
          });
        });
      }

      if (veiculo.trips) {
        veiculo.trips.forEach(trip => {
          combinado.push({
            type: 'trip',
            date: new Date(trip.date),
            createdAt: trip.createdAt || 0,
            vehicle: veiculo,
            data: trip
          });
        });
      }

      if (veiculo.otherExpenses) {
        veiculo.otherExpenses.forEach(exp => {
          combinado.push({
            type: 'expense',
            date: new Date(exp.date),
            createdAt: exp.createdAt || 0,
            vehicle: veiculo,
            data: exp
          });
        });
      }

      if (veiculo.incomes) {
        veiculo.incomes.forEach(inc => {
          combinado.push({
            type: 'income',
            date: new Date(inc.date),
            createdAt: inc.createdAt || 0,
            vehicle: veiculo,
            data: inc
          });
        });
      }

      if (veiculo.createdAt) {
        combinado.push({
          type: 'vehicle-add',
          date: new Date(veiculo.createdAt),
          createdAt: veiculo.createdAt,
          vehicle: veiculo,
          data: { model: veiculo.model, plate: veiculo.plate }
        });
      }
    });

    this.historicoCompleto_bruto = combinado;
    this.aplicar_ordenacao();
  }

  aplicar_ordenacao() {
    let copia = [...this.historicoCompleto_bruto];

    if (this.filtro_tipo && this.filtro_tipo !== 'todos') {
      copia = copia.filter(item => item.type === this.filtro_tipo);
    }

    if (this.criterio_ordenacao === 'data_recente') {
      // Ordena pela data efetiva do registro (mais recentes primeiro).
      this.historicoCompleto = copia.sort((a, b) => this.comparar_data_recente(a, b));
    } else if (this.criterio_ordenacao === 'data_antiga') {
      // Ordena pela data efetiva do registro (mais antigos primeiro).
      this.historicoCompleto = copia.sort((a, b) => this.comparar_data_antiga(a, b));
    } else if (this.criterio_ordenacao === 'alfabetica_az') {
      this.historicoCompleto = copia.sort((a, b) => {
        const nomeA = (a.vehicle.model || '').toLocaleLowerCase();
        const nomeB = (b.vehicle.model || '').toLocaleLowerCase();
        if (nomeA < nomeB) return -1;
        if (nomeA > nomeB) return 1;
        return this.comparar_data_recente(a, b);
      });
    } else if (this.criterio_ordenacao === 'alfabetica_za') {
      this.historicoCompleto = copia.sort((a, b) => {
        const nomeA = (a.vehicle.model || '').toLocaleLowerCase();
        const nomeB = (b.vehicle.model || '').toLocaleLowerCase();
        if (nomeA < nomeB) return 1;
        if (nomeA > nomeB) return -1;
        return this.comparar_data_recente(a, b);
      });
    } else if (this.criterio_ordenacao === 'tipo') {
      this.historicoCompleto = copia.sort((a, b) => {
        const tipoA = a.type;
        const tipoB = b.type;
        if (tipoA < tipoB) return -1;
        if (tipoA > tipoB) return 1;
        return this.comparar_data_recente(a, b);
      });
    } else {
      this.historicoCompleto = copia;
    }
  }

  private obter_timestamp_data_item(item: ItemHistorico): number {
    const timestamp_data = item.date instanceof Date
      ? item.date.getTime()
      : new Date(item.date as any).getTime();

    if (Number.isFinite(timestamp_data) && timestamp_data > 0) {
      return timestamp_data;
    }

    return item.createdAt ?? 0;
  }

  private comparar_data_recente(a: ItemHistorico, b: ItemHistorico): number {
    const dataA = this.obter_timestamp_data_item(a);
    const dataB = this.obter_timestamp_data_item(b);
    if (dataA !== dataB) {
      return dataB - dataA;
    }

    const criadoA = a.createdAt ?? 0;
    const criadoB = b.createdAt ?? 0;
    if (criadoA !== criadoB) {
      return criadoB - criadoA;
    }

    return (a.vehicle.model || '').localeCompare(b.vehicle.model || '');
  }

  private comparar_data_antiga(a: ItemHistorico, b: ItemHistorico): number {
    const dataA = this.obter_timestamp_data_item(a);
    const dataB = this.obter_timestamp_data_item(b);
    if (dataA !== dataB) {
      return dataA - dataB;
    }

    const criadoA = a.createdAt ?? 0;
    const criadoB = b.createdAt ?? 0;
    if (criadoA !== criadoB) {
      return criadoA - criadoB;
    }

    return (a.vehicle.model || '').localeCompare(b.vehicle.model || '');
  }

  alterar_criterio_ordenacao(valor: any) {
    if (
      valor !== 'data_recente' &&
      valor !== 'data_antiga' &&
      valor !== 'alfabetica_az' &&
      valor !== 'alfabetica_za' &&
      valor !== 'tipo'
    ) {
      return;
    }
    this.criterio_ordenacao = valor;
    this.aplicar_ordenacao();
  }

  alterar_filtro_tipo(valor: any) {
    if (
      valor !== 'todos' &&
      valor !== 'supply' &&
      valor !== 'consumption' &&
      valor !== 'maintenance' &&
      valor !== 'trip' &&
      valor !== 'expense' &&
      valor !== 'income'
    ) {
      return;
    }
    this.filtro_tipo = valor;
    this.aplicar_ordenacao();
  }

  obter_nome_tipo_veiculo(veiculo: Vehicle): string {
    return this.servicoVeiculos.getVehicleTypeName(veiculo.type);
  }

  obter_rotulo_tipo_item(item: ItemHistorico): string {
    if (item.type === 'supply') {
      return 'Abastecimento';
    }
    if (item.type === 'consumption') {
      return 'Média de consumo';
    }
    if (item.type === 'maintenance') {
      return 'Manutenção';
    }
    if (item.type === 'trip') {
      return 'Viagem';
    }
    if (item.type === 'expense') {
      return 'Despesa';
    }
    if (item.type === 'income') {
      return 'Receita';
    }
    return this.obter_nome_tipo_veiculo(item.vehicle);
  }

  obter_icone_tipo_veiculo(veiculo: Vehicle): string {
    return this.servicoVeiculos.getVehicleIcon(veiculo.type);
  }

  async abrir_modal_abastecimento(edicao_abastecimento?: Supply, placa_veiculo?: string): Promise<void> {
    const modal = await this.controladorModal.create({
      component: SupplyModalComponent,
      componentProps: {
        vehicles: this.veiculos,
        editingSupply: edicao_abastecimento,
        editingVehiclePlate: placa_veiculo
      }
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data && data.saved) {
      this.veiculos = this.servicoVeiculos.getVehiclesSnapshot();
      this.atualizar_historico_completo();
    }
    if (data && data.action === 'view_history') {
      this.roteador.navigate(['/supply-history']);
    }
  }

  async abrir_modal_consumo(edicao_consumo?: ConsumptionRecord, placa_veiculo?: string): Promise<void> {
    const modal = await this.controladorModal.create({
      component: ConsumptionModalComponent,
      componentProps: {
        vehicles: this.veiculos,
        editingRecord: edicao_consumo,
        editingVehiclePlate: placa_veiculo
      }
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data && data.saved) {
      this.veiculos = this.servicoVeiculos.getVehiclesSnapshot();
      this.atualizar_historico_completo();
    }
    if (data && data.action === 'view_history') {
      this.roteador.navigate(['/consumption-history']);
    }
  }

  async abrir_modal_manutencao(edicao_manutencao?: Maintenance, placa_veiculo?: string): Promise<void> {
    const modal = await this.controladorModal.create({
      component: MaintenanceModalComponent,
      componentProps: {
        vehicles: this.veiculos,
        editingMaintenance: edicao_manutencao,
        editingVehiclePlate: placa_veiculo
      }
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data && data.saved) {
      this.veiculos = this.servicoVeiculos.getVehiclesSnapshot();
      this.atualizar_historico_completo();
    }
    if (data && data.action === 'view_history') {
      this.roteador.navigate(['/maintenance-history']);
    }
  }

  async abrir_modal_viagem(edicao_viagem?: Trip, placa_veiculo?: string): Promise<void> {
    const modal = await this.controladorModal.create({
      component: TripModalComponent,
      componentProps: {
        vehicles: this.veiculos,
        editingTrip: edicao_viagem,
        editingVehiclePlate: placa_veiculo
      }
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data && data.saved) {
      this.veiculos = this.servicoVeiculos.getVehiclesSnapshot();
      this.atualizar_historico_completo();
    }
    if (data && data.action === 'view_history') {
      this.roteador.navigate(['/tabs/calculator'], {
        queryParams: {
          view: 'trip'
        }
      });
    }
  }

  obter_icone_historico(tipo: string): string {
    switch (tipo) {
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

  obter_icone_item_historico(item: ItemHistorico): string {
    if (item.type === 'vehicle-add') {
      return this.servicoVeiculos.getVehicleIcon(item.vehicle.type);
    }
    return this.obter_icone_historico(item.type);
  }

  obter_cor_historico(tipo: string): string {
    switch (tipo) {
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

  podeEditar(item: ItemHistorico): boolean {
    return ['supply', 'maintenance', 'consumption', 'trip', 'vehicle-add'].includes(item.type);
  }

  podeApagar(item: ItemHistorico): boolean {
    return ['supply', 'maintenance', 'consumption', 'trip', 'expense', 'income'].includes(item.type);
  }

  async editar_item_historico(item: ItemHistorico) {
    if (item.type === 'supply') {
      await this.abrir_modal_abastecimento(item.data as Supply, item.vehicle.plate);
    } else if (item.type === 'maintenance') {
      await this.abrir_modal_manutencao(item.data as Maintenance, item.vehicle.plate);
    } else if (item.type === 'consumption') {
      await this.abrir_modal_consumo(item.data as ConsumptionRecord, item.vehicle.plate);
    } else if (item.type === 'trip') {
      await this.abrir_modal_viagem(item.data as Trip, item.vehicle.plate);
    } else if (item.type === 'vehicle-add') {
      this.roteador.navigate(['/tabs/vehicles/form', item.vehicle.plate]);
    }
  }

  async remover_item_historico(item: ItemHistorico) {
    if (!item.data?.id) {
      return;
    }

    const alerta = await this.alertCtrl.create({
      header: 'Confirmar exclusão',
      message: 'Deseja realmente excluir este registro?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Excluir',
          role: 'destructive',
          handler: () => {
            let removed = false;
            if (item.type === 'supply') {
              removed = this.servicoVeiculos.removerAbastecimento(item.vehicle.plate, item.data.id);
            } else if (item.type === 'maintenance') {
              removed = this.servicoVeiculos.removerManutencao(item.vehicle.plate, item.data.id);
            } else if (item.type === 'consumption') {
              removed = this.servicoVeiculos.removerConsumo(item.vehicle.plate, item.data.id);
            } else if (item.type === 'trip') {
              removed = this.servicoVeiculos.removerViagem(item.vehicle.plate, item.data.id);
            } else if (item.type === 'expense') {
              removed = this.servicoVeiculos.removerDespesa(item.vehicle.plate, item.data.id);
            } else if (item.type === 'income') {
              removed = this.servicoVeiculos.removerReceita(item.vehicle.plate, item.data.id);
            }
            
            if (removed) {
              this.servicoVeiculos.getVehicles().subscribe(veiculos => {
                this.veiculos = veiculos;
                this.atualizar_historico_completo();
              });
            }
          }
        }
      ]
    });

    await alerta.present();
  }
}
