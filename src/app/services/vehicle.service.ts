import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Supply {
  id?: string;
  date: Date;
  odometer?: number; // Kept for legacy compatibility
  initialOdometer?: number;
  finalOdometer?: number;
  precoPorLitro?: number;
  liters?: number;
  totalValue?: number;
  gasStation?: string;
  tipoAbastecimento?: string;
  motorista?: string;
  observations?: string;
  average?: number;
  /** Indica se o abastecimento deve participar dos cálculos de média de consumo (tanque completo). */
  tanqueCompleto?: boolean;
  createdAt?: number;
}

/** Ciclo fechado entre dois abastecimentos com tanque cheio (ordem cronológica). */
export interface CicloConsumoTanqueCheio {
  /** Índices no array de abastecimentos ordenado por data (ascendente). */
  indiceInicio: number;
  indiceFim: number;
  kmPercorridos: number;
  litrosTotaisNoCiclo: number;
  consumoKmPorLitro: number;
}

export interface CicloConsumoRejeitado {
  indiceInicio: number;
  indiceFim: number;
  motivo: string;
}

export interface ResultadoAnaliseCiclosConsumo {
  ciclosValidos: CicloConsumoTanqueCheio[];
  /** Média aritmética do consumo (km/L) dos ciclos válidos; 0 se não houver nenhum. */
  mediaConsumoKmPorLitro: number;
  ciclosRejeitados: CicloConsumoRejeitado[];
}

export interface Trip {
  id?: string;
  date: Date;
  distance: number;
  consumption: number;
  fuelPrice: number;
  tollCost?: number;
  totalCost: number;
  observations?: string;
  createdAt?: number;
}

export interface ConsumptionRecord {
  id?: string;
  date: Date;
  initialOdometer?: number;
  finalOdometer?: number;
  distance: number;
  liters: number;
  result: number; // km/l
  createdAt?: number;
}

export interface Maintenance {
  id?: string;
  date: Date;
  odometer: number;
  summary: string;
  parts?: string;
  partsValue?: number;
  serviceValue?: number;
  totalValue: number;
  createdAt?: number;
}

export interface OtherExpense {
  id?: string;
  date: Date;
  time?: string;
  type: string;
  recurrence: string;
  reminderEnabled?: boolean;
  reminderTime?: string;
  location?: string;
  odometer?: number;
  cost?: number;
  notes?: string;
  nextDate?: Date;
  notificationId?: number;
  createdAt?: number;
}

export interface IncomeEntry {
  id?: string;
  date: Date;
  time?: string;
  type: string;
  recurrence?: string;
  reminderEnabled?: boolean;
  reminderTime?: string;
  nextDate?: Date;
  notificationId?: number;
  amount: number;
  notes?: string;
  createdAt?: number;
}

export interface Vehicle {
  type: string;
  model: string;
  consumption?: number;
  plate: string;
  odometer?: number;
  observations?: string;
  isDefault?: boolean;
  supplies?: Supply[];
  trips?: Trip[];
  consumptionHistory?: ConsumptionRecord[];
  maintenance?: Maintenance[];
  otherExpenses?: OtherExpense[];
  incomes?: IncomeEntry[];
  createdAt?: number;
}

@Injectable({
  providedIn: 'root'
})
export class VehicleService {
  private vehicles: Vehicle[] = [];
  private vehiclesSubject = new BehaviorSubject<Vehicle[]>([]);
  private STORAGE_KEY = 'kmrodados_vehicles';

  constructor() {
    this.loadVehicles();
  }

  // Carrega veículos do armazenamento local.
  // IMPORTANTE: Não adicionar dados de exemplo (mock) aqui.
  // O aplicativo deve iniciar vazio para novas instalações.
  private loadVehicles() {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (data) {
      this.processLoadedVehicles(JSON.parse(data));
    }
  }

  private processLoadedVehicles(vehiclesData: Vehicle[]) {
    this.vehicles = vehiclesData.map(v => ({
      ...v,
      plate: v.plate ? v.plate.toUpperCase() : v.plate
    }));
    // Converter strings de data de volta para objetos Date e garantir IDs
    this.vehicles.forEach(vehicle => {
      if (vehicle.supplies) {
        vehicle.supplies.forEach(supply => {
          supply.date = new Date(supply.date);
          if (!supply.id) {
            supply.id = this.generateId();
          }
        });
      }
      if (vehicle.consumptionHistory) {
        vehicle.consumptionHistory.forEach(record => {
          record.date = new Date(record.date);
          if (!record.id) {
            record.id = this.generateId();
          }
        });
      }
      if (vehicle.trips) {
        vehicle.trips.forEach(trip => {
          trip.date = new Date(trip.date);
          if (!trip.id) {
            trip.id = this.generateId();
          }
        });
      }
      if (vehicle.maintenance) {
        vehicle.maintenance.forEach(m => {
          m.date = new Date(m.date);
          if (!m.id) {
            m.id = this.generateId();
          }
        });
      }
      if (vehicle.otherExpenses) {
        vehicle.otherExpenses.forEach(e => {
          e.date = new Date(e.date);
          if (e.nextDate) {
            e.nextDate = new Date(e.nextDate);
          }
          if (!e.id) {
            e.id = this.generateId();
          }
        });
      }
      if (vehicle.incomes) {
        vehicle.incomes.forEach(i => {
          i.date = new Date(i.date);
          if (!i.id) {
            i.id = this.generateId();
          }
        });
      }
    });
    this.vehiclesSubject.next(this.vehicles);
  }

  /**
   * Importa backup no formato JSON.
   * Aceita: array de veículos (legado) ou objeto { version, vehicles, preferences? }.
   * Restaura veículos e, se presente, preferências (tema, cor, ordem dos cards).
   */
  importBackup(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      let vehicles: Vehicle[] | null = null;
      let preferences: Record<string, string> | null = null;

      if (Array.isArray(data)) {
        vehicles = data;
      } else if (data && typeof data === 'object' && Array.isArray(data.vehicles)) {
        vehicles = data.vehicles;
        if (data.preferences && typeof data.preferences === 'object') {
          preferences = data.preferences;
        }
      }

      if (!vehicles || !vehicles.length) {
        return false;
      }
      const isValid = vehicles.every((item: any) => item && (item.plate != null) && (item.model != null));
      if (!isValid) {
        return false;
      }

      this.processLoadedVehicles(vehicles);
      this.saveVehicles();

      if (preferences) {
        if (preferences['themeMode'] != null) {
          localStorage.setItem('themeMode', String(preferences['themeMode']));
        }
        if (preferences['primaryColor'] != null) {
          localStorage.setItem('primaryColor', String(preferences['primaryColor']));
        }
        if (preferences['primaryColorContrast'] != null) {
          localStorage.setItem('primaryColorContrast', String(preferences['primaryColorContrast']));
        }
        if (preferences['primaryColorShade'] != null) {
          localStorage.setItem('primaryColorShade', String(preferences['primaryColorShade']));
        }
        if (preferences['primaryColorTint'] != null) {
          localStorage.setItem('primaryColorTint', String(preferences['primaryColorTint']));
        }
        if (preferences['home_card_order'] != null) {
          localStorage.setItem('home_card_order', String(preferences['home_card_order']));
        }
        if (preferences['home_card_enabled'] != null) {
          localStorage.setItem('home_card_enabled', String(preferences['home_card_enabled']));
        }
      }
      return true;
    } catch (e) {
      console.error('Error importing backup:', e);
      return false;
    }
  }

  clearAllData() {
    this.vehicles = [];
    this.vehiclesSubject.next(this.vehicles);
    localStorage.removeItem(this.STORAGE_KEY);
  }

  limparHistoricoCompleto() {
    this.vehicles.forEach(veiculo => {
      veiculo.supplies = [];
      veiculo.trips = [];
      veiculo.consumptionHistory = [];
      veiculo.maintenance = [];
      veiculo.otherExpenses = [];
      veiculo.incomes = [];
    });
    this.vehiclesSubject.next([...this.vehicles]);
    this.saveVehicles();
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private saveVehicles() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.vehicles));
  }

  getVehicles() {
    return this.vehiclesSubject.asObservable();
  }

  /** Retorna a lista atual de veículos (cópia) para uso síncrono, ex.: após fechar modal de abastecimento. */
  getVehiclesSnapshot(): Vehicle[] {
    return [...this.vehicles];
  }

  addVehicle(vehicle: Vehicle) {
    const normalizedPlate = vehicle.plate.toUpperCase();
    vehicle.plate = normalizedPlate;
    if (this.vehicles.length === 0) {
      vehicle.isDefault = true;
    }
    if (!vehicle.createdAt) {
      vehicle.createdAt = Date.now();
    }
    this.vehicles.push({ ...vehicle, supplies: [] });
    this.vehiclesSubject.next(this.vehicles);
    this.saveVehicles();
  }

  setDefaultVehicle(plate: string) {
    const normalizedPlate = plate.toUpperCase();
    let changed = false;
    this.vehicles.forEach(v => {
      if (v.plate === normalizedPlate) {
        if (!v.isDefault) {
          v.isDefault = true;
          changed = true;
        }
      } else {
        if (v.isDefault) {
          v.isDefault = false;
          changed = true;
        }
      }
    });

    if (changed) {
      this.vehiclesSubject.next(this.vehicles);
      this.saveVehicles();
    }
  }

  addConsumptionRecord(plate: string, record: ConsumptionRecord): boolean {
    const normalizedPlate = plate.toUpperCase();
    const vehicle = this.vehicles.find(v => v.plate === normalizedPlate);
    if (vehicle) {
      if (!vehicle.consumptionHistory) {
        vehicle.consumptionHistory = [];
      }
      if (!record.id) {
        record.id = this.generateId();
      }
      if (!record.createdAt) {
        record.createdAt = Date.now();
      }
      vehicle.consumptionHistory.push(record);
      this.vehiclesSubject.next([...this.vehicles]);
      this.saveVehicles();
      return true;
    }
    return false;
  }

  updateVehicle(originalPlate: string, updatedVehicle: Vehicle) {
    const normalizedOriginal = originalPlate.toUpperCase();
    const normalizedUpdatedPlate = updatedVehicle.plate.toUpperCase();
    updatedVehicle.plate = normalizedUpdatedPlate;
    const index = this.vehicles.findIndex(v => v.plate === normalizedOriginal);
    if (index !== -1) {
      const current = this.vehicles[index];
      this.vehicles[index] = {
        ...updatedVehicle,
        supplies: current.supplies || [],
        consumptionHistory: current.consumptionHistory || [],
        maintenance: current.maintenance || [],
        trips: current.trips || [],
        otherExpenses: current.otherExpenses || [],
        incomes: current.incomes || [],
        createdAt: current.createdAt ?? updatedVehicle.createdAt
      };
      this.vehiclesSubject.next(this.vehicles);
      this.saveVehicles();
    }
  }

  deleteVehicle(plate: string) {
    const normalizedPlate = plate.toUpperCase();
    const index = this.vehicles.findIndex(v => v.plate === normalizedPlate);
    if (index !== -1) {
      this.vehicles.splice(index, 1);
      this.vehiclesSubject.next(this.vehicles);
      this.saveVehicles();
    }
  }

  addSupply(plate: string, supply: Supply): boolean {
    const normalizedPlate = plate.toUpperCase();
    const vehicle = this.vehicles.find(v => v.plate === normalizedPlate);
    if (vehicle) {
      if (!vehicle.supplies) {
        vehicle.supplies = [];
      }
      if (!supply.id) {
        supply.id = this.generateId();
      }
      if (!supply.createdAt) {
        supply.createdAt = Date.now();
      }
      vehicle.supplies.push(supply);
      this.vehiclesSubject.next([...this.vehicles]); // Emit shallow copy to ensure change detection
      this.saveVehicles();
      return true;
    }
    console.error('Vehicle not found for plate:', normalizedPlate);
    return false;
  }

  addTrip(plate: string, trip: Trip): boolean {
    const normalizedPlate = plate.toUpperCase();
    const vehicle = this.vehicles.find(v => v.plate === normalizedPlate);
    if (vehicle) {
      if (!vehicle.trips) {
        vehicle.trips = [];
      }
      if (!trip.id) {
        trip.id = this.generateId();
      }
      if (!trip.createdAt) {
        trip.createdAt = Date.now();
      }
      vehicle.trips.push(trip);
      this.vehiclesSubject.next([...this.vehicles]);
      this.saveVehicles();
      return true;
    }
    console.error('Vehicle not found for plate:', plate);
    return false;
  }

  addMaintenance(plate: string, maintenance: Maintenance): boolean {
    const normalizedPlate = plate.toUpperCase();
    const vehicle = this.vehicles.find(v => v.plate === normalizedPlate);
    if (vehicle) {
      if (!vehicle.maintenance) {
        vehicle.maintenance = [];
      }
      if (!maintenance.id) {
        maintenance.id = this.generateId();
      }
      if (!maintenance.createdAt) {
        maintenance.createdAt = Date.now();
      }
      vehicle.maintenance.push(maintenance);
      this.vehiclesSubject.next([...this.vehicles]);
      this.saveVehicles();
      return true;
    }
    return false;
  }

  addOtherExpense(plate: string, expense: OtherExpense): boolean {
    const normalizedPlate = plate.toUpperCase();
    const vehicle = this.vehicles.find(v => v.plate === normalizedPlate);
    if (vehicle) {
      if (!vehicle.otherExpenses) {
        vehicle.otherExpenses = [];
      }
      if (!expense.id) {
        expense.id = this.generateId();
      }
      if (!expense.createdAt) {
        expense.createdAt = Date.now();
      }
      vehicle.otherExpenses.push(expense);
      this.vehiclesSubject.next([...this.vehicles]);
      this.saveVehicles();
      return true;
    }
    return false;
  }

  addIncome(plate: string, income: IncomeEntry): boolean {
    const normalizedPlate = plate.toUpperCase();
    const vehicle = this.vehicles.find(v => v.plate === normalizedPlate);
    if (vehicle) {
      if (!vehicle.incomes) {
        vehicle.incomes = [];
      }
      if (!income.id) {
        income.id = this.generateId();
      }
      if (!income.createdAt) {
        income.createdAt = Date.now();
      }
      vehicle.incomes.push(income);
      this.vehiclesSubject.next([...this.vehicles]);
      this.saveVehicles();
      return true;
    }
    return false;
  }

  removerAbastecimento(plate: string, supplyId: string): boolean {
    const normalizedPlate = plate.toUpperCase();
    const vehicle = this.vehicles.find(v => v.plate === normalizedPlate);
    if (vehicle && vehicle.supplies) {
      const index = vehicle.supplies.findIndex(s => s.id === supplyId);
      if (index !== -1) {
        vehicle.supplies.splice(index, 1);
        this.vehiclesSubject.next([...this.vehicles]);
        this.saveVehicles();
        return true;
      }
    }
    return false;
  }

  removerManutencao(plate: string, maintenanceId: string): boolean {
    const normalizedPlate = plate.toUpperCase();
    const vehicle = this.vehicles.find(v => v.plate === normalizedPlate);
    if (vehicle && vehicle.maintenance) {
      const index = vehicle.maintenance.findIndex(m => m.id === maintenanceId);
      if (index !== -1) {
        vehicle.maintenance.splice(index, 1);
        this.vehiclesSubject.next([...this.vehicles]);
        this.saveVehicles();
        return true;
      }
    }
    return false;
  }

  removerConsumo(plate: string, recordId: string): boolean {
    const normalizedPlate = plate.toUpperCase();
    const vehicle = this.vehicles.find(v => v.plate === normalizedPlate);
    if (vehicle && vehicle.consumptionHistory) {
      const index = vehicle.consumptionHistory.findIndex(r => r.id === recordId);
      if (index !== -1) {
        vehicle.consumptionHistory.splice(index, 1);
        this.vehiclesSubject.next([...this.vehicles]);
        this.saveVehicles();
        return true;
      }
    }
    return false;
  }

  removerViagem(plate: string, tripId: string): boolean {
    const normalizedPlate = plate.toUpperCase();
    const vehicle = this.vehicles.find(v => v.plate === normalizedPlate);
    if (vehicle && vehicle.trips) {
      const index = vehicle.trips.findIndex(t => t.id === tripId);
      if (index !== -1) {
        vehicle.trips.splice(index, 1);
        this.vehiclesSubject.next([...this.vehicles]);
        this.saveVehicles();
        return true;
      }
    }
    return false;
  }

  removerDespesa(plate: string, expenseId: string): boolean {
    const normalizedPlate = plate.toUpperCase();
    const vehicle = this.vehicles.find(v => v.plate === normalizedPlate);
    if (vehicle && vehicle.otherExpenses) {
      const index = vehicle.otherExpenses.findIndex(e => e.id === expenseId);
      if (index !== -1) {
        vehicle.otherExpenses.splice(index, 1);
        this.vehiclesSubject.next([...this.vehicles]);
        this.saveVehicles();
        return true;
      }
    }
    return false;
  }

  removerReceita(plate: string, incomeId: string): boolean {
    const normalizedPlate = plate.toUpperCase();
    const vehicle = this.vehicles.find(v => v.plate === normalizedPlate);
    if (vehicle && vehicle.incomes) {
      const index = vehicle.incomes.findIndex(i => i.id === incomeId);
      if (index !== -1) {
        vehicle.incomes.splice(index, 1);
        this.vehiclesSubject.next([...this.vehicles]);
        this.saveVehicles();
        return true;
      }
    }
    return false;
  }

  updateSupply(plate: string, updatedSupply: Supply): boolean {
    const normalizedPlate = plate.toUpperCase();
    const vehicle = this.vehicles.find(v => v.plate === normalizedPlate);
    if (vehicle && vehicle.supplies) {
      const index = vehicle.supplies.findIndex(s => s.id === updatedSupply.id);
      if (index !== -1) {
        vehicle.supplies[index] = updatedSupply;
        this.vehiclesSubject.next(this.vehicles);
        this.saveVehicles();
        return true;
      }
    }
    return false;
  }

  updateMaintenance(plate: string, updatedMaintenance: Maintenance): boolean {
    const normalizedPlate = plate.toUpperCase();
    const vehicle = this.vehicles.find(v => v.plate === normalizedPlate);
    if (vehicle && vehicle.maintenance) {
      const index = vehicle.maintenance.findIndex(m => m.id === updatedMaintenance.id);
      if (index !== -1) {
        vehicle.maintenance[index] = updatedMaintenance;
        this.vehiclesSubject.next(this.vehicles);
        this.saveVehicles();
        return true;
      }
    }
    return false;
  }

  updateConsumptionRecord(plate: string, updatedRecord: ConsumptionRecord): boolean {
    const normalizedPlate = plate.toUpperCase();
    const vehicle = this.vehicles.find(v => v.plate === normalizedPlate);
    if (vehicle && vehicle.consumptionHistory) {
      const index = vehicle.consumptionHistory.findIndex(r => r.id === updatedRecord.id);
      if (index !== -1) {
        vehicle.consumptionHistory[index] = updatedRecord;
        this.vehiclesSubject.next(this.vehicles);
        this.saveVehicles();
        return true;
      }
    }
    return false;
  }

  updateTrip(plate: string, updatedTrip: Trip): boolean {
    const normalizedPlate = plate.toUpperCase();
    const vehicle = this.vehicles.find(v => v.plate === normalizedPlate);
    if (vehicle && vehicle.trips) {
      const index = vehicle.trips.findIndex(t => t.id === updatedTrip.id);
      if (index !== -1) {
        vehicle.trips[index] = updatedTrip;
        this.vehiclesSubject.next(this.vehicles);
        this.saveVehicles();
        return true;
      }
    }
    return false;
  }

  /**
   * Analisa ciclos tanque cheio → tanque cheio (todos os abastecimentos na ordem cronológica;
   * litros do ciclo = soma dos abastecimentos após o primeiro cheio até o segundo cheio, inclusive).
   */
  analisarCiclosConsumoPorTanqueCheio(vehicle: Vehicle): ResultadoAnaliseCiclosConsumo {
    const ciclosValidos: CicloConsumoTanqueCheio[] = [];
    const ciclosRejeitados: CicloConsumoRejeitado[] = [];
    const brutos = vehicle.supplies || [];
    if (brutos.length === 0) {
      return { ciclosValidos, mediaConsumoKmPorLitro: 0, ciclosRejeitados };
    }

    const ordenados = [...brutos].sort((a, b) => {
      const ta = new Date(a.date).getTime();
      const tb = new Date(b.date).getTime();
      if (ta !== tb) {
        return ta - tb;
      }
      return (a.createdAt ?? 0) - (b.createdAt ?? 0);
    });

    const indicesTanqueCheio: number[] = [];
    ordenados.forEach((s, idx) => {
      if (this.abastecimentoMarcadoTanqueCheio(s)) {
        indicesTanqueCheio.push(idx);
      }
    });

    for (let p = 0; p < indicesTanqueCheio.length - 1; p++) {
      const i = indicesTanqueCheio[p];
      const j = indicesTanqueCheio[p + 1];
      const resultado = this.avaliarCicloConsumoTanqueCheio(ordenados, i, j);
      if (resultado.ok) {
        ciclosValidos.push(resultado.ciclo);
      } else {
        ciclosRejeitados.push({
          indiceInicio: i,
          indiceFim: j,
          motivo: resultado.motivo
        });
      }
    }

    const mediaConsumoKmPorLitro =
      ciclosValidos.length > 0
        ? ciclosValidos.reduce((acc, c) => acc + c.consumoKmPorLitro, 0) / ciclosValidos.length
        : 0;

    return { ciclosValidos, mediaConsumoKmPorLitro, ciclosRejeitados };
  }

  private abastecimentoMarcadoTanqueCheio(s: Supply): boolean {
    return s.tanqueCompleto !== false;
  }

  private obterOdometroAposAbastecimento(s: Supply): number {
    const v =
      s.finalOdometer ?? s.odometer ?? s.initialOdometer;
    return v != null && v > 0 ? v : 0;
  }

  private obterOdometroAntesAbastecimento(s: Supply): number {
    const v =
      s.initialOdometer ?? s.odometer ?? s.finalOdometer;
    return v != null && v > 0 ? v : 0;
  }

  private coletarLeiturasOdometroPositivas(s: Supply): number[] {
    const vals: number[] = [];
    if (s.initialOdometer != null && s.initialOdometer > 0) {
      vals.push(s.initialOdometer);
    }
    if (s.finalOdometer != null && s.finalOdometer > 0) {
      vals.push(s.finalOdometer);
    }
    if (s.odometer != null && s.odometer > 0) {
      vals.push(s.odometer);
    }
    return vals;
  }

  private avaliarCicloConsumoTanqueCheio(
    ordenados: Supply[],
    i: number,
    j: number
  ): { ok: true; ciclo: CicloConsumoTanqueCheio } | { ok: false; motivo: string } {
    if (j <= i) {
      return { ok: false, motivo: 'Índices de ciclo inválidos.' };
    }

    let litrosTotais = 0;
    for (let k = i + 1; k <= j; k++) {
      litrosTotais += ordenados[k].liters ?? 0;
    }
    if (litrosTotais <= 0) {
      return {
        ok: false,
        motivo: 'Soma de litros no ciclo é zero ou inválida (após o primeiro tanque cheio até o próximo).'
      };
    }

    const odoAposInicio = this.obterOdometroAposAbastecimento(ordenados[i]);
    const odoAntesFim = this.obterOdometroAntesAbastecimento(ordenados[j]);
    if (odoAposInicio <= 0 || odoAntesFim <= 0) {
      return {
        ok: false,
        motivo: 'Odômetro ausente ou inválido no início ou no fim do ciclo (após o 1.º cheio / antes do 2.º cheio).'
      };
    }

    let ultimaLeitura = odoAposInicio;
    for (let k = i + 1; k < j; k++) {
      const leituras = this.coletarLeiturasOdometroPositivas(ordenados[k]);
      if (leituras.length === 0) {
        return {
          ok: false,
          motivo: 'Abastecimento intermédio sem odômetro registrado; não é possível validar o ciclo.'
        };
      }
      const minK = Math.min(...leituras);
      const maxK = Math.max(...leituras);
      if (minK < ultimaLeitura) {
        return {
          ok: false,
          motivo: 'Odômetro retrocedeu em relação ao trecho anterior (dados inconsistentes).'
        };
      }
      ultimaLeitura = Math.max(ultimaLeitura, maxK);
    }

    if (odoAntesFim < ultimaLeitura) {
      return {
        ok: false,
        motivo: 'Odômetro no fim do ciclo é menor que leituras anteriores (dados inconsistentes).'
      };
    }

    const kmPercorridos = odoAntesFim - odoAposInicio;
    if (kmPercorridos <= 0) {
      return {
        ok: false,
        motivo: 'Distância do ciclo é zero ou negativa (verifique odômetros após o 1.º cheio e antes do 2.º).'
      };
    }

    const consumoKmPorLitro = kmPercorridos / litrosTotais;
    if (!Number.isFinite(consumoKmPorLitro) || consumoKmPorLitro <= 0) {
      return { ok: false, motivo: 'Consumo calculado é inválido.' };
    }

    return {
      ok: true,
      ciclo: {
        indiceInicio: i,
        indiceFim: j,
        kmPercorridos,
        litrosTotaisNoCiclo: litrosTotais,
        consumoKmPorLitro
      }
    };
  }

  /**
   * Média de consumo para telas que não usam ciclos tanque-a-tanque (ex.: calculadora, modal de viagem).
   * Usa abastecimentos com tanque cheio e, se necessário, registros de consumptionHistory.
   */
  calcularMediaConsumoResumo(vehicle: Vehicle): number {
    const supplies = (vehicle.supplies || []).filter(s => s.tanqueCompleto !== false);
    const history = vehicle.consumptionHistory || [];
    const consumosAbastecimentos: number[] = [];
    supplies.forEach(s => {
      if (s.average != null && s.average > 0) {
        consumosAbastecimentos.push(s.average);
      } else if (
        s.initialOdometer != null &&
        s.finalOdometer != null &&
        s.liters != null &&
        s.liters > 0
      ) {
        const distancia = s.finalOdometer - s.initialOdometer;
        if (distancia > 0) {
          consumosAbastecimentos.push(distancia / s.liters);
        }
      }
    });
    if (consumosAbastecimentos.length === 0 && supplies.length >= 2) {
      const ordenados = [...supplies].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      for (let i = 1; i < ordenados.length; i++) {
        const anterior = ordenados[i - 1];
        const atual = ordenados[i];
        const odometroAnterior = anterior.finalOdometer ?? anterior.initialOdometer ?? anterior.odometer ?? 0;
        const odometroAtual = atual.initialOdometer ?? atual.odometer ?? 0;
        const litrosAtual = atual.liters ?? 0;
        if (odometroAtual > odometroAnterior && litrosAtual > 0) {
          const distancia = odometroAtual - odometroAnterior;
          consumosAbastecimentos.push(distancia / litrosAtual);
        }
      }
    }
    if (consumosAbastecimentos.length > 0) {
      return consumosAbastecimentos.reduce((a, b) => a + b, 0) / consumosAbastecimentos.length;
    }
    if (history.length > 0) {
      const totalCons = history.reduce((sum, h) => sum + (h.result || 0), 0);
      return totalCons / history.length;
    }
    return 0;
  }

  /**
   * Retorna a média de consumo (km/L) apenas com base nos abastecimentos.
   * Retorna 0 se não houver abastecimentos ou não for possível calcular.
   */
  calcularMediaApenasAbastecimentos(vehicle: Vehicle): number {
    const supplies = (vehicle.supplies || []).filter(s => s.tanqueCompleto !== false);
    // Garante pelo menos dois abastecimentos de tanque cheio antes de considerar a média
    if (supplies.length < 2) {
      return 0;
    }

    const consumosAbastecimentos: number[] = [];
    supplies.forEach(s => {
      if (s.average != null && s.average > 0) {
        consumosAbastecimentos.push(s.average);
      } else if (
        s.initialOdometer != null &&
        s.finalOdometer != null &&
        s.liters != null &&
        s.liters > 0
      ) {
        const distancia = s.finalOdometer - s.initialOdometer;
        if (distancia > 0) {
          consumosAbastecimentos.push(distancia / s.liters);
        }
      }
    });
    if (consumosAbastecimentos.length === 0 && supplies.length >= 2) {
      const ordenados = [...supplies].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      for (let i = 1; i < ordenados.length; i++) {
        const anterior = ordenados[i - 1];
        const atual = ordenados[i];
        const odometroAnterior = anterior.finalOdometer ?? anterior.initialOdometer ?? anterior.odometer ?? 0;
        const odometroAtual = atual.initialOdometer ?? atual.odometer ?? 0;
        const litrosAtual = atual.liters ?? 0;
        if (odometroAtual > odometroAnterior && litrosAtual > 0) {
          const distancia = odometroAtual - odometroAnterior;
          consumosAbastecimentos.push(distancia / litrosAtual);
        }
      }
    }
    if (consumosAbastecimentos.length > 0) {
      return consumosAbastecimentos.reduce((a, b) => a + b, 0) / consumosAbastecimentos.length;
    }
    return 0;
  }

  getVehicleTypeName(type: string): string {
    const types: {[key: string]: string} = {
      'car': 'Carro',
      'motorcycle': 'Moto',
      'truck': 'Caminhão',
      'bus': 'Ônibus',
      'van': 'Van'
    };
    return types[type] || type;
  }

  getVehicleIcon(type: string): string {
    switch (type) {
      case 'car': return 'car-sport-outline';
    case 'motorcycle': return 'moto-custom';
    case 'truck': return 'truck-heavy';
      case 'bus': return 'bus-outline';
      case 'van': return 'car-outline';
      default: return 'car-sport-outline';
    }
  }
}
