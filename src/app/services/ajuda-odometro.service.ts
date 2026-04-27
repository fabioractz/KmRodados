import { Injectable, Component } from '@angular/core';
import { PopoverController, IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ajuda-odometro-popover',
  template: `
    <div class="conteudo-ajuda-odometro">
      Odômetro é o indicador que registra a quilometragem total do veículo desde zero.
      Você pode ver esse número no painel, próximo ao velocímetro.
    </div>
  `,
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class ComponenteAjudaOdometroPopover {}

@Component({
  selector: 'app-ajuda-media-consumo-popover',
  template: `
    <div class="conteudo-ajuda-odometro">
      A média usa <strong>ciclos completos</strong>: do 1.º abastecimento com tanque cheio ao próximo também com tanque cheio.
      Somamos <strong>todos os litros</strong> nesse intervalo (parciais inclusos) e dividimos pelos km entre o odômetro <strong>após o 1.º cheio</strong> e <strong>antes do 2.º cheio</strong>.
      Trechos com dados inconsistentes são ignorados.
    </div>
  `,
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class ComponenteAjudaMediaConsumoPopover {}

@Component({
  selector: 'app-ajuda-ciclos-consumo-popover',
  template: `
    <div class="conteudo-ajuda-odometro">
      <strong>O que é um ciclo?</strong> Do 1.º tanque cheio ao próximo tanque cheio.<br><br>
      <strong>E se eu abastecer só um pouco, ou no meio?</strong> Conta na soma de litros desse ciclo. Mas ainda não fecha o ciclo.<br><br>
      <strong>Como fecha o ciclo?</strong> Quando você enche o tanque novamente.
    </div>
  `,
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class ComponenteAjudaCiclosConsumoPopover {}

@Injectable({
  providedIn: 'root'
})
export class ServicoAjudaOdometro {
  constructor(private controlador_popover: PopoverController) {}

  async mostrarAjudaOdometro(evento: Event) {
    const popover = await this.controlador_popover.create({
      component: ComponenteAjudaOdometroPopover,
      event: evento,
      side: 'right',
      alignment: 'center',
      showBackdrop: false,
      cssClass: 'popover-ajuda-odometro'
    });
    await popover.present();
  }

  async mostrarAjudaMediaConsumo(evento: Event) {
    const popover = await this.controlador_popover.create({
      component: ComponenteAjudaMediaConsumoPopover,
      event: evento,
      side: 'right',
      alignment: 'center',
      showBackdrop: false,
      cssClass: 'popover-ajuda-odometro'
    });
    await popover.present();
  }

  async mostrarAjudaCiclosConsumo(evento: Event) {
    const popover = await this.controlador_popover.create({
      component: ComponenteAjudaCiclosConsumoPopover,
      event: evento,
      side: 'right',
      alignment: 'center',
      showBackdrop: false,
      cssClass: 'popover-ajuda-odometro'
    });
    await popover.present();
  }
}
