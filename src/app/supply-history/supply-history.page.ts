import { Component, OnInit } from '@angular/core';
import { VehicleService, Vehicle, Supply } from '../services/vehicle.service';
import { ServicoAjudaOdometro } from '../services/ajuda-odometro.service';

interface SupplyWithVehicle extends Supply {
  vehicleModel: string;
  vehiclePlate: string;
}

@Component({
  selector: 'app-supply-history',
  templateUrl: './supply-history.page.html',
  styleUrls: ['./supply-history.page.scss'],
  standalone: false
})
export class SupplyHistoryPage implements OnInit {
  supplies: SupplyWithVehicle[] = [];

  constructor(
    private vehicleService: VehicleService,
    public ajuda_odometro: ServicoAjudaOdometro
  ) { }

  ngOnInit() {
    this.vehicleService.getVehicles().subscribe(vehicles => {
      this.supplies = this.flattenSupplies(vehicles);
    });
  }

  flattenSupplies(vehicles: Vehicle[]): SupplyWithVehicle[] {
    const allSupplies: SupplyWithVehicle[] = [];
    
    vehicles.forEach(vehicle => {
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
}
