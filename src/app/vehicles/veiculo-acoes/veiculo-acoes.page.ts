import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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

  constructor(
    private rota: ActivatedRoute,
    private roteador: Router,
    public servicoVeiculo: VehicleService
  ) {}

  ngOnInit() {
    this.placaVeiculo = this.rota.snapshot.paramMap.get('plate') || '';
    this.servicoVeiculo.getVehicles().subscribe(veiculos => {
      this.veiculo = veiculos.find(v => v.plate === this.placaVeiculo) || null;
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

  historicoAbastecimentos() {
    if (!this.veiculo) {
      return;
    }
    this.roteador.navigate(['/supply-history'], {
      queryParams: { plate: this.veiculo.plate }
    });
  }

  historicoManutencoes() {
    if (!this.veiculo) {
      return;
    }
    this.roteador.navigate(['/maintenance-history'], {
      queryParams: { plate: this.veiculo.plate }
    });
  }
}
