import { Component, OnInit } from '@angular/core';
import { VehicleService, Vehicle, ConsumptionRecord } from '../services/vehicle.service';

interface ConsumptionWithVehicle extends ConsumptionRecord {
  vehicleModel: string;
  vehiclePlate: string;
}

@Component({
  selector: 'app-consumption-history',
  templateUrl: './consumption-history.page.html',
  styleUrls: ['./consumption-history.page.scss'],
  standalone: false
})
export class ConsumptionHistoryPage implements OnInit {
  records: ConsumptionWithVehicle[] = [];

  constructor(private vehicleService: VehicleService) { }

  ngOnInit() {
    this.vehicleService.getVehicles().subscribe(vehicles => {
      this.records = this.flattenRecords(vehicles);
    });
  }

  flattenRecords(vehicles: Vehicle[]): ConsumptionWithVehicle[] {
    const allRecords: ConsumptionWithVehicle[] = [];
    
    vehicles.forEach(vehicle => {
      if (vehicle.consumptionHistory) {
        vehicle.consumptionHistory.forEach(record => {
          allRecords.push({
            ...record,
            vehicleModel: vehicle.model,
            vehiclePlate: vehicle.plate
          });
        });
      }
    });

    // Sort by date descending (newest first)
    return allRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
}
