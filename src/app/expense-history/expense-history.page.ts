import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { VehicleService, Vehicle, OtherExpense } from '../services/vehicle.service';
import { AlertController } from '@ionic/angular';

interface ExpenseWithVehicle extends OtherExpense {
  vehicleModel: string;
  vehiclePlate: string;
}

@Component({
  selector: 'app-expense-history',
  templateUrl: './expense-history.page.html',
  styleUrls: ['./expense-history.page.scss'],
  standalone: false
})
export class ExpenseHistoryPage implements OnInit {
  expenses: ExpenseWithVehicle[] = [];
  filteredExpenses: ExpenseWithVehicle[] = [];
  vehicles: Vehicle[] = [];

  filtroVeiculo: string = 'todos';
  filtroModoData: 'todos' | 'data' | 'periodo' = 'todos';
  filtroData: string | null = null;
  filtroDataInicio: string | null = null;
  filtroDataFim: string | null = null;
  filtroDataOpcao: 'todos' | 'hoje' | 'ultimos7' | 'ultimos30' | 'estemes' | 'personalizado' = 'todos';
  mostrarModalPeriodoPersonalizado = false;
  modalDataInicio: string | null = null;
  modalDataFim: string | null = null;

  constructor(
    private vehicleService: VehicleService,
    private route: ActivatedRoute,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {
    const initialPlate = this.route.snapshot.queryParamMap.get('plate');
    if (initialPlate) {
      this.filtroVeiculo = initialPlate;
    }

    this.vehicleService.getVehicles().subscribe(vehicles => {
      this.vehicles = vehicles;
      this.expenses = this.flattenExpenses(vehicles);
      this.aplicarFiltros();
    });
  }

  limparFiltros() {
    this.filtroVeiculo = 'todos';
    this.filtroModoData = 'todos';
    this.filtroData = null;
    this.filtroDataInicio = null;
    this.filtroDataFim = null;
    this.filtroDataOpcao = 'todos';
    this.aplicarFiltros();
  }

  get totalDespesas(): number {
    return this.filteredExpenses.reduce((total, e) => total + (e.cost || 0), 0);
  }

  flattenExpenses(vehicles: Vehicle[]): ExpenseWithVehicle[] {
    const all: ExpenseWithVehicle[] = [];
    vehicles.forEach(vehicle => {
      if (vehicle.otherExpenses) {
        vehicle.otherExpenses.forEach(exp => {
          all.push({
            ...exp,
            vehicleModel: vehicle.model,
            vehiclePlate: vehicle.plate
          });
        });
      }
    });
    return all.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });
  }

  onFiltroVeiculoChange(value: any) {
    this.filtroVeiculo = (value ?? 'todos') as string;
    this.aplicarFiltros();
  }

  onFiltroDataPresetChange(value: any) {
    const opcao = (value ?? 'todos') as 'todos' | 'hoje' | 'ultimos7' | 'ultimos30' | 'estemes' | 'personalizado';
    this.filtroDataOpcao = opcao;

    const hoje = new Date();

    if (opcao === 'todos') {
      this.filtroModoData = 'todos';
      this.filtroData = null;
      this.filtroDataInicio = null;
      this.filtroDataFim = null;
      this.aplicarFiltros();
      return;
    }

    if (opcao === 'hoje') {
      this.filtroModoData = 'data';
      this.filtroData = this.toInputDate(hoje);
      this.aplicarFiltros();
      return;
    }

    if (opcao === 'ultimos7') {
      this.filtroModoData = 'periodo';
      const inicio = new Date(hoje);
      inicio.setDate(inicio.getDate() - 6);
      this.filtroDataInicio = this.toInputDate(inicio);
      this.filtroDataFim = this.toInputDate(hoje);
      this.aplicarFiltros();
      return;
    }

    if (opcao === 'ultimos30') {
      this.filtroModoData = 'periodo';
      const inicio = new Date(hoje);
      inicio.setDate(inicio.getDate() - 29);
      this.filtroDataInicio = this.toInputDate(inicio);
      this.filtroDataFim = this.toInputDate(hoje);
      this.aplicarFiltros();
      return;
    }

    if (opcao === 'estemes') {
      this.filtroModoData = 'periodo';
      const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
      this.filtroDataInicio = this.toInputDate(inicio);
      this.filtroDataFim = this.toInputDate(fim);
      this.aplicarFiltros();
      return;
    }

    if (opcao === 'personalizado') {
      this.abrirModalPeriodoPersonalizado();
    }
  }

  abrirModalPeriodoPersonalizado() {
    this.modalDataInicio = this.filtroDataInicio;
    this.modalDataFim = this.filtroDataFim;
    this.mostrarModalPeriodoPersonalizado = true;
  }

  cancelarPeriodoPersonalizado() {
    this.mostrarModalPeriodoPersonalizado = false;
  }

  confirmarPeriodoPersonalizado() {
    this.filtroModoData = 'periodo';
    this.filtroDataInicio = this.normalizeDateVal(this.modalDataInicio);
    this.filtroDataFim = this.normalizeDateVal(this.modalDataFim);
    this.mostrarModalPeriodoPersonalizado = false;
    this.aplicarFiltros();
  }

  private aplicarFiltros() {
    let lista = [...this.expenses];

    if (this.filtroVeiculo && this.filtroVeiculo !== 'todos') {
      lista = lista.filter(e => e.vehiclePlate === this.filtroVeiculo);
    }

    if (this.filtroModoData === 'data' && this.filtroData) {
      const alvo = this.filtroData;
      lista = lista.filter(e => {
        const data = e.date ? new Date(e.date) : null;
        if (!data) return false;
        return this.toInputDate(data) === alvo;
      });
    } else if (this.filtroModoData === 'periodo') {
      if (this.filtroDataInicio) {
        const inicio = new Date(this.filtroDataInicio);
        inicio.setHours(0, 0, 0, 0);
        lista = lista.filter(e => {
          const data = e.date ? new Date(e.date) : null;
          if (!data) return false;
          return data >= inicio;
        });
      }
      if (this.filtroDataFim) {
        const fim = new Date(this.filtroDataFim);
        fim.setHours(23, 59, 59, 999);
        lista = lista.filter(e => {
          const data = e.date ? new Date(e.date) : null;
          if (!data) return false;
          return data <= fim;
        });
      }
    }

    this.filteredExpenses = lista.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });
  }

  private normalizeDateVal(val: any): string | null {
    if (val == null) return null;
    if (Array.isArray(val)) return (val[0] ?? null) as string | null;
    if (typeof val === 'string') return val;
    try {
      return String(val);
    } catch {
      return null;
    }
  }

  private toInputDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  editarDespesa(item: ExpenseWithVehicle) {
    alert('Edição de despesa em breve.');
  }

  async removerDespesa(item: ExpenseWithVehicle) {
    if (!item.id) {
      return;
    }

    const alerta = await this.alertCtrl.create({
      header: 'Confirmar exclusão',
      message: 'Deseja realmente excluir esta despesa?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Excluir',
          role: 'destructive',
          handler: () => {
            this.vehicleService.removerDespesa(item.vehiclePlate, item.id!);
            this.vehicleService.getVehicles().subscribe(vehicles => {
              this.expenses = this.flattenExpenses(vehicles);
              this.aplicarFiltros();
            });
          }
        }
      ]
    });

    await alerta.present();
  }
}
