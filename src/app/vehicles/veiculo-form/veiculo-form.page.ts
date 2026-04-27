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
  odometro: number | null = null;
  odometroStr: string = '';
  placa: string = '';
  observacoes: string = '';

  placa_original: string | null = null;
  tipoError: boolean = false;
  modeloError: boolean = false;
  placaError: boolean = false;

  mostrarMaisCampos: boolean = false;

  constructor(
    private rota: ActivatedRoute,
    private roteador: Router,
    private servicoVeiculo: VehicleService,
    private actionSheetCtrl: ActionSheetController,
    private toastCtrl: ToastController,
    public ajuda_odometro: ServicoAjudaOdometro
  ) {}

  ngOnInit() {
    const placa_param = this.rota.snapshot.paramMap.get('plate');
    if (placa_param) {
      this.servicoVeiculo.getVehicles().subscribe(veiculos => {
        const v = veiculos.find(x => x.plate.toUpperCase() === placa_param.toUpperCase());
        if (v) {
          this.tipo = v.type;
          this.modelo = v.model;
          this.odometro = (v as any).odometer ?? null;
          this.odometroStr = this.odometro ? new Intl.NumberFormat('pt-BR').format(this.odometro) : '';
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

  get missingFields(): string[] {
    const fields: string[] = [];
    if (!this.tipo) {
      fields.push('Tipo de Veículo');
    }
    if (!this.modelo) {
      fields.push('Modelo');
    }
    if (!this.placa) {
      fields.push('Placa');
    }
    return fields;
  }

  get hasValidationErrors(): boolean {
    return this.tipoError || this.modeloError || this.placaError;
  }

  async abrirSeletorTipoVeiculo() {
    const as = await this.actionSheetCtrl.create({
      header: 'Selecione o Tipo de Veículo',
      buttons: [
        { text: 'Carro', icon: 'car-sport-outline', handler: () => { this.tipo = 'car'; this.tipoError = false; } },
        { text: 'Moto', icon: 'moto-custom', handler: () => { this.tipo = 'motorcycle'; this.tipoError = false; } },
        { text: 'Caminhão', icon: 'truck-heavy', handler: () => { this.tipo = 'truck'; this.tipoError = false; } },
        { text: 'Ônibus', icon: 'bus-outline', handler: () => { this.tipo = 'bus'; this.tipoError = false; } },
        { text: 'Van', icon: 'car-outline', handler: () => { this.tipo = 'van'; this.tipoError = false; } },
        { text: 'Cancelar', icon: 'close', role: 'cancel' }
      ]
    });
    await as.present();
  }

  async salvar() {
    // Resetar erros
    this.tipoError = false;
    this.modeloError = false;
    this.placaError = false;

    let hasError = false;

    if (!this.tipo) {
      this.tipoError = true;
      hasError = true;
    }
    if (!this.modelo) {
      this.modeloError = true;
      hasError = true;
    }
    if (!this.placa) {
      this.placaError = true;
      hasError = true;
    }

    if (hasError) {
      return;
    }
    const placa_norm = this.placa.toUpperCase();
    let dados: Vehicle;
    if (this.placa_original) {
      const veiculos = this.servicoVeiculo.getVehiclesSnapshot();
      const atual = veiculos.find(x => x.plate.toUpperCase() === this.placa_original!.toUpperCase());
      dados = {
        type: this.tipo,
        model: this.modelo,
        plate: placa_norm,
        consumption: atual?.consumption ?? undefined,
        odometer: this.odometro ?? undefined,
        observations: this.observacoes || undefined
      };
      this.servicoVeiculo.updateVehicle(this.placa_original, dados);
      const t = await this.toastCtrl.create({ message: 'Veículo atualizado com sucesso!', duration: 2000, position: 'bottom' });
      t.present();
    } else {
      dados = {
        type: this.tipo,
        model: this.modelo,
        plate: placa_norm,
        odometer: this.odometro ?? undefined,
        observations: this.observacoes || undefined
      };
      let existe = false;
      this.servicoVeiculo.getVehicles().subscribe(vs => {
        existe = vs.some(v => v.plate.toUpperCase() === placa_norm);
      }).unsubscribe();
      if (existe) {
        const t = await this.toastCtrl.create({ message: 'Já existe um veículo com esta placa!', duration: 2000, position: 'bottom', color: 'warning' });
        t.present();
        return;
      }
      this.servicoVeiculo.addVehicle(dados);
      const t = await this.toastCtrl.create({ message: 'Veículo salvo com sucesso!', duration: 2000, position: 'bottom' });
      t.present();
    }
    this.roteador.navigate(['/tabs/vehicles']);
  }

  cancelar() {
    this.roteador.navigate(['/tabs/vehicles']);
  }

  obter_nome_tipo(tipo: string): string {
    return this.servicoVeiculo.getVehicleTypeName(tipo);
  }

  formatOdometer(event: any) {
    let value = event.target.value;
    const numericString = value.replace(/\D/g, '');
    if (numericString === '') {
      this.odometroStr = '';
      this.odometro = null;
      return;
    }
    const numericValue = parseInt(numericString, 10);
    this.odometro = numericValue;
    this.odometroStr = new Intl.NumberFormat('pt-BR').format(numericValue);
  }
}
