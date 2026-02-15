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
}
