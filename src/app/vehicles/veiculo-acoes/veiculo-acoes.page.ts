import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { speedometer, constructOutline, createOutline, carSportOutline, starOutline, chevronForwardOutline } from 'ionicons/icons';
import { VehicleService, Vehicle } from '../../services/vehicle.service';

@Component({
  selector: 'app-veiculo-acoes',
  templateUrl: './veiculo-acoes.page.html',
  styleUrls: ['./veiculo-acoes.page.scss'],
  standalone: false
})
export class VeiculoAcoesPage implements OnInit {
  placaVeiculo: string = '';
  veiculo: Vehicle | null = null;
  odometroAtual = 0;

  constructor(
    private rota: ActivatedRoute,
    private roteador: Router,
    public servicoVeiculo: VehicleService
  ) {
    addIcons({
      speedometer,
      'construct-outline': constructOutline,
      'create-outline': createOutline,
      'car-sport-outline': carSportOutline,
      'star-outline': starOutline,
      'chevron-forward-outline': chevronForwardOutline,
      'gas-station': 'assets/icon/gas-station.svg'
    });
  }

  ngOnInit() {
    this.placaVeiculo = this.rota.snapshot.paramMap.get('plate') || '';
    this.servicoVeiculo.getVehicles().subscribe(veiculos => {
      this.veiculo = veiculos.find(v => v.plate === this.placaVeiculo) || null;
      const vehicle = this.veiculo;
      const readings = vehicle ? [
        vehicle.odometer,
        ...(vehicle.supplies || []).map(s => s.finalOdometer ?? s.initialOdometer ?? s.odometer),
        ...(vehicle.consumptionHistory || []).map(c => c.finalOdometer),
        ...(vehicle.maintenance || []).map(m => m.odometer),
        ...(vehicle.otherExpenses || []).map(e => e.odometer)
      ] : [];
      this.odometroAtual = readings.reduce<number>((highest, value) =>
        typeof value === 'number' && Number.isFinite(value) ? Math.max(highest, value) : highest, 0);
    });
  }

  abastecer() {
    if (!this.veiculo) {
      return;
    }
    this.roteador.navigate(['/tabs/home'], {
      queryParams: { action: 'supply', plate: this.veiculo.plate, source: 'vehicles' }
    });
  }

  manutencao() {
    if (!this.veiculo) {
      return;
    }
    this.roteador.navigate(['/tabs/home'], {
      queryParams: { action: 'maintenance', plate: this.veiculo.plate, source: 'vehicles' }
    });
  }

  fazerMedia() {
    if (!this.veiculo) {
      return;
    }
    this.roteador.navigate(['/tabs/home'], {
      queryParams: { action: 'calculator', plate: this.veiculo.plate, source: 'vehicles' }
    });
  }

  editarVeiculo() {
    if (!this.veiculo) {
      return;
    }
    this.roteador.navigate(['/tabs/vehicles/form', this.veiculo.plate]);
  }
}
