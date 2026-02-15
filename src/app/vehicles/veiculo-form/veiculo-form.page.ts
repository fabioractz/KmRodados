import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ActionSheetController, ToastController } from '@ionic/angular';
import { VehicleService, Vehicle } from '../../services/vehicle.service';
import { ServicoAjudaOdometro } from '../../services/ajuda-odometro.service';

@Component({
  selector: 'app-formulario-veiculo',
  templateUrl: './veiculo-form.page.html',
  styleUrls: ['./veiculo-form.page.scss'],
  standalone: false
})
export class VeiculoFormPage implements OnInit {
  tipo: string = '';
  modelo: string = '';
  consumo: number | null = null;
  odometro: number | null = null;
  placa: string = '';
  observacoes: string = '';

  placa_original: string | null = null;

  constructor(
    private rota: ActivatedRoute,
    private roteador: Router,
    private servico_veiculo: VehicleService,
    private acoes: ActionSheetController,
    private toast: ToastController,
    public ajuda_odometro: ServicoAjudaOdometro
  ) {}

  ngOnInit() {
    const placa_param = this.rota.snapshot.paramMap.get('plate');
    if (placa_param) {
      this.servico_veiculo.getVehicles().subscribe(veiculos => {
        const v = veiculos.find(x => x.plate.toUpperCase() === placa_param.toUpperCase());
        if (v) {
          this.tipo = v.type;
          this.modelo = v.model;
          this.consumo = v.consumption ?? null;
          this.odometro = (v as any).odometer ?? null;
          this.placa = v.plate;
          this.observacoes = (v as any).observations || '';
          this.placa_original = v.plate;
        }
      });
    }
  }

  get titulo_pagina(): string {
    return this.placa_original ? 'Editar Veículo' : 'Adicionar Veículo';
    }

  async abrirSeletorTipoVeiculo() {
    const as = await this.acoes.create({
      header: 'Selecione o Tipo de Veículo',
      buttons: [
        { text: 'Carro', icon: 'car-sport-outline', handler: () => { this.tipo = 'car'; } },
        { text: 'Moto', icon: 'moto-custom', handler: () => { this.tipo = 'motorcycle'; } },
        { text: 'Caminhão', icon: 'truck-heavy', handler: () => { this.tipo = 'truck'; } },
        { text: 'Ônibus', icon: 'bus-outline', handler: () => { this.tipo = 'bus'; } },
        { text: 'Van', icon: 'car-outline', handler: () => { this.tipo = 'van'; } },
        { text: 'Cancelar', icon: 'close', role: 'cancel' }
      ]
    });
    await as.present();
  }

  async salvar() {
    if (!(this.tipo && this.modelo && this.placa)) {
      const t = await this.toast.create({ message: 'Preencha tipo, modelo e placa.', duration: 2000, position: 'bottom' });
      t.present();
      return;
    }
    const placa_norm = this.placa.toUpperCase();
    const dados: Vehicle = {
      type: this.tipo,
      model: this.modelo,
      plate: placa_norm,
      consumption: this.consumo ?? undefined,
      odometer: this.odometro ?? undefined,
      observations: this.observacoes || undefined
    };

    if (this.placa_original) {
      this.servico_veiculo.updateVehicle(this.placa_original, dados);
      const t = await this.toast.create({ message: 'Veículo atualizado com sucesso!', duration: 2000, position: 'bottom' });
      t.present();
    } else {
      let existe = false;
      this.servico_veiculo.getVehicles().subscribe(vs => {
        existe = vs.some(v => v.plate.toUpperCase() === placa_norm);
      }).unsubscribe();
      if (existe) {
        const t = await this.toast.create({ message: 'Já existe um veículo com esta placa!', duration: 2000, position: 'bottom', color: 'warning' });
        t.present();
        return;
      }
      this.servico_veiculo.addVehicle(dados);
      const t = await this.toast.create({ message: 'Veículo salvo com sucesso!', duration: 2000, position: 'bottom' });
      t.present();
    }
    this.roteador.navigate(['/tabs/vehicles']);
  }

  cancelar() {
    this.roteador.navigate(['/tabs/vehicles']);
  }

  obter_nome_tipo(tipo: string): string {
    return this.servico_veiculo.getVehicleTypeName(tipo);
  }
}
