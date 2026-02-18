import { Component, OnInit } from '@angular/core';
import { VehicleService, Vehicle, Supply, ConsumptionRecord, Maintenance, Trip } from '../services/vehicle.service';
import { Router } from '@angular/router';
import { ServicoAjudaOdometro } from '../services/ajuda-odometro.service';
import { ModalController } from '@ionic/angular';
import { SupplyModalComponent } from '../home/modals/supply-modal/supply-modal.component';
import { ConsumptionModalComponent } from '../home/modals/consumption-modal/consumption-modal.component';
import { MaintenanceModalComponent } from '../home/modals/maintenance-modal/maintenance-modal.component';

interface ItemHistorico {
  type: 'supply' | 'consumption' | 'maintenance' | 'trip' | 'vehicle-add';
  date: Date;
  createdAt: number;
  vehicle: Vehicle;
  data: Supply | ConsumptionRecord | Maintenance | Trip | any;
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

  constructor(
    private servicoVeiculos: VehicleService,
    private roteador: Router,
    private controladorModal: ModalController,
    public ajuda_odometro: ServicoAjudaOdometro
  ) {}

  ngOnInit() {
    this.servicoVeiculos.getVehicles().subscribe(veiculos => {
      this.veiculos = veiculos;
      this.atualizar_historico_completo();
    });
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
    const copia = [...this.historicoCompleto_bruto];

    if (this.criterio_ordenacao === 'data_recente') {
      this.historicoCompleto = copia.sort((a, b) => {
        const dataA = a.date.getTime();
        const dataB = b.date.getTime();
        if (dataA !== dataB) {
          return dataB - dataA;
        }
        return b.createdAt - a.createdAt;
      });
    } else if (this.criterio_ordenacao === 'data_antiga') {
      this.historicoCompleto = copia.sort((a, b) => {
        const dataA = a.date.getTime();
        const dataB = b.date.getTime();
        if (dataA !== dataB) {
          return dataA - dataB;
        }
        return a.createdAt - b.createdAt;
      });
    } else if (this.criterio_ordenacao === 'alfabetica_az') {
      this.historicoCompleto = copia.sort((a, b) => {
        const nomeA = (a.vehicle.model || '').toLocaleLowerCase();
        const nomeB = (b.vehicle.model || '').toLocaleLowerCase();
        if (nomeA < nomeB) return -1;
        if (nomeA > nomeB) return 1;
        const dataA = a.date.getTime();
        const dataB = b.date.getTime();
        return dataB - dataA;
      });
    } else if (this.criterio_ordenacao === 'alfabetica_za') {
      this.historicoCompleto = copia.sort((a, b) => {
        const nomeA = (a.vehicle.model || '').toLocaleLowerCase();
        const nomeB = (b.vehicle.model || '').toLocaleLowerCase();
        if (nomeA < nomeB) return 1;
        if (nomeA > nomeB) return -1;
        const dataA = a.date.getTime();
        const dataB = b.date.getTime();
        return dataB - dataA;
      });
    } else if (this.criterio_ordenacao === 'tipo') {
      this.historicoCompleto = copia.sort((a, b) => {
        const tipoA = a.type;
        const tipoB = b.type;
        if (tipoA < tipoB) return -1;
        if (tipoA > tipoB) return 1;
        const dataA = a.date.getTime();
        const dataB = b.date.getTime();
        return dataB - dataA;
      });
    } else {
      this.historicoCompleto = copia;
    }
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

  obter_nome_tipo_veiculo(veiculo: Vehicle): string {
    return this.servicoVeiculos.getVehicleTypeName(veiculo.type);
  }

  obter_rotulo_tipo_item(item: ItemHistorico): string {
    if (item.type === 'supply') {
      return 'Abastecimento';
    }
    if (item.type === 'maintenance') {
      return 'Manutenção';
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
    if (data && data.action === 'view_history') {
      this.roteador.navigate(['/maintenance-history']);
    }
  }

  obter_icone_historico(tipo: string): string {
    switch (tipo) {
      case 'supply': return 'gas-station';
      case 'consumption': return 'speedometer';
      case 'maintenance': return 'construct';
      case 'trip': return 'map';
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
      case 'vehicle-add': return 'tertiary';
      default: return 'medium';
    }
  }

  async editar_item_historico(item: ItemHistorico) {
    if (item.type === 'supply') {
      await this.abrir_modal_abastecimento(item.data as Supply, item.vehicle.plate);
    } else if (item.type === 'maintenance') {
      await this.abrir_modal_manutencao(item.data as Maintenance, item.vehicle.plate);
    } else if (item.type === 'consumption') {
      await this.abrir_modal_consumo(item.data as ConsumptionRecord, item.vehicle.plate);
    } else if (item.type === 'vehicle-add') {
      this.roteador.navigate(['/tabs/vehicles/form', item.vehicle.plate]);
    }
  }
}
