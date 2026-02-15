import { Component, OnInit } from '@angular/core';
import { VehicleService, Vehicle, Maintenance } from '../services/vehicle.service';
import { ServicoAjudaOdometro } from '../services/ajuda-odometro.service';

interface MaintenanceWithVehicle extends Maintenance {
  vehicleModel: string;
  vehiclePlate: string;
}

@Component({
  selector: 'app-maintenance-history',
  templateUrl: './maintenance-history.page.html',
  styleUrls: ['./maintenance-history.page.scss'],
  standalone: false
})
export class MaintenanceHistoryPage implements OnInit {
  maintenances: MaintenanceWithVehicle[] = [];

  constructor(
    private vehicleService: VehicleService,
    public ajuda_odometro: ServicoAjudaOdometro
  ) { }

  ngOnInit() {
    this.vehicleService.getVehicles().subscribe(vehicles => {
      this.maintenances = this.flattenMaintenances(vehicles);
    });
  }

  flattenMaintenances(vehicles: Vehicle[]): MaintenanceWithVehicle[] {
    const allMaintenances: MaintenanceWithVehicle[] = [];
    
    vehicles.forEach(vehicle => {
      if (vehicle.maintenance) {
        vehicle.maintenance.forEach(maint => {
          allMaintenances.push({
            ...maint,
            vehicleModel: vehicle.model,
            vehiclePlate: vehicle.plate
          });
        });
      }
    });

    // Sort by date descending (newest first)
    return allMaintenances.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
}
