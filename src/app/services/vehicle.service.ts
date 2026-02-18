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
  createdAt?: number;
}

export interface Trip {
  id?: string;
  date: Date;
  distance: number;
  consumption: number;
  fuelPrice: number;
  tollCost?: number;
  totalCost: number;
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
      if (vehicle.maintenance) {
        vehicle.maintenance.forEach(m => {
          m.date = new Date(m.date);
          if (!m.id) {
            m.id = this.generateId();
          }
        });
      }
    });
    this.vehiclesSubject.next(this.vehicles);
  }

  importBackup(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data)) {
        // Basic validation: check if items look like vehicles
        const isValid = data.every(item => item.hasOwnProperty('plate') && item.hasOwnProperty('model'));
        if (isValid) {
          this.processLoadedVehicles(data);
          this.saveVehicles();
          return true;
        }
      }
      return false;
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

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private saveVehicles() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.vehicles));
  }

  getVehicles() {
    return this.vehiclesSubject.asObservable();
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
      // Preserve supplies if not provided in updatedVehicle
      const supplies = this.vehicles[index].supplies || [];
      this.vehicles[index] = { ...updatedVehicle, supplies: supplies };
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
