import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { VehicleService, Vehicle } from '../services/vehicle.service';
import { AlertController, ToastController } from '@ionic/angular';
import { AdsService } from '../services/ads.service';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: false
})
export class SettingsPage implements OnInit {

  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef;
  vehicles: Vehicle[] = [];
  themeMode: string = 'system';
  
  colors = [
    { name: 'Azul', value: '#3880ff', contrast: '#ffffff', shade: '#3171e0', tint: '#4c8dff' },
    { name: 'Indigo', value: '#5260ff', contrast: '#ffffff', shade: '#4854e0', tint: '#6370ff' },
    { name: 'Roxo', value: '#7a49a5', contrast: '#ffffff', shade: '#6b4091', tint: '#875bae' },
    { name: 'Rosa', value: '#ff2d55', contrast: '#ffffff', shade: '#e0284b', tint: '#ff4266' },
    { name: 'Vermelho', value: '#eb445a', contrast: '#ffffff', shade: '#cf3c4f', tint: '#ed576b' },
    { name: 'Laranja', value: '#fd7e14', contrast: '#ffffff', shade: '#df6f12', tint: '#fd8b2c' },
    { name: 'Amarelo', value: '#ffc409', contrast: '#000000', shade: '#e0ac08', tint: '#ffca22' },
    { name: 'Verde', value: '#2dd36f', contrast: '#000000', shade: '#28ba62', tint: '#42d77d' },
    { name: 'Esmeralda', value: '#20c997', contrast: '#ffffff', shade: '#1cb185', tint: '#36cea2' },
    { name: 'Ciano', value: '#3dc2ff', contrast: '#ffffff', shade: '#36abe0', tint: '#50c8ff' },
    { name: 'Cinza', value: '#607d8b', contrast: '#ffffff', shade: '#546e7a', tint: '#708c99' },
    { name: 'Grafite', value: '#a6a6a6', contrast: '#000000', shade: '#929292', tint: '#afafaf' }
  ];
  selectedColor: string = '#3880ff';
  showColorPicker: boolean = false;
  
  homeCardsOrder: string[] = ['summary', 'quickActions', 'consumption', 'maintenance', 'history'];
  readonly homeCardsLabels: Record<string, string> = {
    summary: 'Resumo do Veículo',
    quickActions: 'Ações Rápidas',
    consumption: 'Histórico de Consumo',
    maintenance: 'Histórico de Manutenções',
    history: 'Histórico'
  };
  homeCardsEnabled: Record<string, boolean> = {
    summary: true,
    quickActions: true,
    consumption: true,
    maintenance: true,
    history: true
  };

  constructor(
    private vehicleService: VehicleService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private ads: AdsService
  ) { }

  ngOnInit() {
    this.vehicleService.getVehicles().subscribe(vehicles => {
      this.vehicles = vehicles;
    });
    
    // Check initial state
    const storedThemeMode = localStorage.getItem('themeMode');
    const oldDarkMode = localStorage.getItem('darkMode');
    
    if (storedThemeMode) {
      this.themeMode = storedThemeMode;
    } else if (oldDarkMode === 'true') {
      this.themeMode = 'dark';
    } else if (oldDarkMode === 'false') {
      this.themeMode = 'light';
    } else {
      this.themeMode = 'system';
    }

    // Check stored color
    const storedColor = localStorage.getItem('primaryColor');
    if (storedColor) {
      this.selectedColor = storedColor;
    }
    
    const storedOrder = localStorage.getItem('home_card_order');
    if (storedOrder) {
      try {
        const arr = JSON.parse(storedOrder);
        if (Array.isArray(arr) && arr.length) {
          // Filter unknown keys and ensure all known keys are present
          const known = ['summary', 'quickActions', 'consumption', 'maintenance', 'history'];
          const filtered = arr.filter((k: string) => known.includes(k));
          const missing = known.filter(k => !filtered.includes(k));
          this.homeCardsOrder = [...filtered, ...missing];
        }
      } catch {}
    }
    const storedEnabled = localStorage.getItem('home_card_enabled');
    if (storedEnabled) {
      try {
        const obj = JSON.parse(storedEnabled);
        this.homeCardsEnabled = { ...this.homeCardsEnabled, ...obj };
      } catch {}
    }
    this.ads.preloadInterstitial();
  }

  getSelectedColorName(): string {
    const color = this.colors.find(c => c.value === this.selectedColor);
    return color ? color.name : '';
  }

  onReorder(ev: CustomEvent) {
    const from = (ev as any).detail.from as number;
    const to = (ev as any).detail.to as number;
    if (from !== to) {
      const moved = this.homeCardsOrder.splice(from, 1)[0];
      this.homeCardsOrder.splice(to, 0, moved);
      localStorage.setItem('home_card_order', JSON.stringify(this.homeCardsOrder));
    }
    (ev as any).detail.complete();
  }

  toggleCardEnabled(key: string, ev: CustomEvent) {
    const val = (ev as any).detail.checked as boolean;
    this.homeCardsEnabled[key] = val;
    localStorage.setItem('home_card_enabled', JSON.stringify(this.homeCardsEnabled));
  }

  toggleColorPicker() {
    this.showColorPicker = !this.showColorPicker;
  }

  async changeColor(color: string) {
    const selected = this.colors.find(c => c.value === color);
    if (selected) {
      this.selectedColor = color;
      
      const setProperty = (name: string, value: string) => {
        document.documentElement.style.setProperty(name, value);
        document.body.style.setProperty(name, value);
      };

      setProperty('--ion-color-primary', selected.value);
      setProperty('--ion-color-primary-contrast', selected.contrast);
      setProperty('--ion-color-primary-shade', selected.shade);
      setProperty('--ion-color-primary-tint', selected.tint);
      
      localStorage.setItem('primaryColor', selected.value);
      localStorage.setItem('primaryColorContrast', selected.contrast);
      localStorage.setItem('primaryColorShade', selected.shade);
      localStorage.setItem('primaryColorTint', selected.tint);
      const r = await this.ads.showInterstitialWithResult();
      if (!r.ok || !r.shown) {
        if (r.reason === 'throttled') {
          return;
        }
        const diag = this.ads.obterDiagnostico();
        const detalhes = `reason=${r.reason || 'unknown'}; error=${r.error || ''}; adId=${diag.adId}; testMode=${diag.testMode}; plataforma=${diag.plataforma}${diag.ultimoErro ? '; ultimoErro='+diag.ultimoErro : ''}${diag.diagnosticoAtivo ? '; diagnosticoAtivo=true' : ''}`;
        const alerta = await this.alertCtrl.create({
          header: 'Falha ao exibir anúncio',
          message: 'Não foi possível exibir o anúncio agora.',
          buttons: [
            {
              text: 'Copiar',
              handler: async () => {
                try {
                  await (navigator as any).clipboard?.writeText(detalhes);
                } catch {
                  try { (window as any).prompt?.('Copiar detalhes do erro:', detalhes); } catch {}
                }
              }
            },
            { text: 'OK', role: 'cancel' }
          ]
        });
        await alerta.present();
      }
    }
  }

  async changeTheme(event: any) {
    const mode = event.detail.value;
    this.themeMode = mode;
    localStorage.setItem('themeMode', mode);
    
    // Remove legacy key
    localStorage.removeItem('darkMode');

    if (mode === 'dark') {
      document.body.classList.add('dark');
      document.body.classList.remove('light');
    } else if (mode === 'light') {
      document.body.classList.remove('dark');
      document.body.classList.add('light');
    } else if (mode === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
      document.body.classList.remove('light');
      if (prefersDark.matches) {
        document.body.classList.add('dark');
      } else {
        document.body.classList.remove('dark');
      }
    }
    const r = await this.ads.showInterstitialWithResult();
    if (!r.ok || !r.shown) {
      if (r.reason === 'throttled') {
        return;
      }
      const diag = this.ads.obterDiagnostico();
      const detalhes = `reason=${r.reason || 'unknown'}; error=${r.error || ''}; adId=${diag.adId}; testMode=${diag.testMode}; plataforma=${diag.plataforma}${diag.ultimoErro ? '; ultimoErro='+diag.ultimoErro : ''}${diag.diagnosticoAtivo ? '; diagnosticoAtivo=true' : ''}`;
      const alerta = await this.alertCtrl.create({
        header: 'Falha ao exibir anúncio',
        message: 'Não foi possível exibir o anúncio agora.',
        buttons: [
          {
            text: 'Copiar',
            handler: async () => {
              try {
                await (navigator as any).clipboard?.writeText(detalhes);
              } catch {
                try { (window as any).prompt?.('Copiar detalhes do erro:', detalhes); } catch {}
              }
            }
          },
          { text: 'OK', role: 'cancel' }
        ]
      });
      await alerta.present();
    }
  }

  selecionarTema(modo: 'system' | 'light' | 'dark', ev?: Event) {
    if (ev) ev.stopPropagation();
    this.changeTheme({ detail: { value: modo } });
  }

  async downloadBackup() {
    const dados = JSON.stringify(this.vehicles, null, 2);
    const data_atual = new Date().toISOString().split('T')[0];
    const nome_arquivo = `kmrodados_backup_${data_atual}.json`;
    const plataforma = Capacitor.getPlatform();
    if (plataforma === 'ios' || plataforma === 'android') {
      try {
        await Filesystem.writeFile({
          path: nome_arquivo,
          data: dados,
          directory: Directory.Documents,
          encoding: Encoding.UTF8
        });
        let uri_arquivo = '';
        try {
          const resultado_uri = await Filesystem.getUri({
            path: nome_arquivo,
            directory: Directory.Documents
          });
          uri_arquivo = resultado_uri.uri;
        } catch {}
        if (uri_arquivo) {
          try {
            await Share.share({
              title: 'Backup Km Rodados',
              text: 'Backup dos dados do aplicativo Km Rodados.',
              url: uri_arquivo,
              dialogTitle: 'Compartilhar backup'
            });
          } catch {}
        }
        const toast = await this.toastCtrl.create({
          message: plataforma === 'ios'
            ? 'Backup salvo. Use o app Arquivos ou compartilhamento para acessar.'
            : 'Backup salvo. Use seu gerenciador de arquivos ou compartilhamento para acessar.',
          duration: 2500,
          color: 'success',
          position: 'bottom'
        });
        toast.present();
      } catch (erro: any) {
        const plataforma_info = plataforma || (navigator as any).platform || 'desconhecida';
        const user_agent = navigator.userAgent || '';
        let detalhes_erro = '';
        if (erro && typeof erro === 'object') {
          if (erro.message) {
            detalhes_erro = erro.message;
          } else {
            try {
              detalhes_erro = JSON.stringify(erro);
            } catch {
              detalhes_erro = String(erro);
            }
          }
        } else {
          detalhes_erro = String(erro);
        }
        const detalhes_completos = `mensagem=${detalhes_erro}; plataforma=${plataforma_info}; userAgent=${user_agent}`;
        const alerta = await this.alertCtrl.create({
          header: 'Erro ao exportar backup',
          message: 'Não foi possível exportar o backup.\n\n' + detalhes_completos,
          buttons: [
            {
              text: 'Copiar erro',
              handler: async () => {
                try {
                  await (navigator as any).clipboard?.writeText(detalhes_completos);
                } catch {
                  try { (window as any).prompt?.('Copiar detalhes do erro:', detalhes_completos); } catch {}
                }
              }
            },
            { text: 'OK', role: 'cancel' }
          ]
        });
        await alerta.present();
      }
      return;
    }
    try {
      const blob = new Blob([dados], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const ancora = document.createElement('a');
      ancora.href = url;
      ancora.download = nome_arquivo;
      document.body.appendChild(ancora);
      ancora.click();
      document.body.removeChild(ancora);
      window.URL.revokeObjectURL(url);
      const toast = await this.toastCtrl.create({
        message: 'Backup realizado com sucesso!',
        duration: 2000,
        color: 'success',
        position: 'bottom'
      });
      toast.present();
    } catch (erro_web: any) {
      const plataforma_info = 'web';
      const user_agent = navigator.userAgent || '';
      let detalhes_erro = '';
      if (erro_web && typeof erro_web === 'object') {
        if (erro_web.message) {
          detalhes_erro = erro_web.message;
        } else {
          try {
            detalhes_erro = JSON.stringify(erro_web);
          } catch {
            detalhes_erro = String(erro_web);
          }
        }
      } else {
        detalhes_erro = String(erro_web);
      }
      const detalhes_completos = `mensagem=${detalhes_erro}; plataforma=${plataforma_info}; userAgent=${user_agent}`;
      const alerta = await this.alertCtrl.create({
        header: 'Erro ao exportar backup',
        message: 'Não foi possível exportar o backup.\n\n' + detalhes_completos,
        buttons: [
          {
            text: 'Copiar erro',
            handler: async () => {
              try {
                await (navigator as any).clipboard?.writeText(detalhes_completos);
              } catch {
                try { (window as any).prompt?.('Copiar detalhes do erro:', detalhes_completos); } catch {}
              }
            }
          },
          { text: 'OK', role: 'cancel' }
        ]
      });
      await alerta.present();
    }
  }

  triggerImport() {
    this.fileInput.nativeElement.click();
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e: any) => {
      const content = e.target.result;
      if (this.vehicleService.importBackup(content)) {
        const toast = await this.toastCtrl.create({
          message: 'Backup importado com sucesso!',
          duration: 2000,
          color: 'success',
          position: 'bottom'
        });
        toast.present();
      } else {
        const alert = await this.alertCtrl.create({
          header: 'Erro',
          message: 'Falha ao importar backup. Arquivo inválido.',
          buttons: ['OK']
        });
        await alert.present();
      }
      // Reset input
      this.fileInput.nativeElement.value = '';
    };
    reader.readAsText(file);
  }

  async confirmClearData() {
    const alert = await this.alertCtrl.create({
      header: 'Apagar Tudo',
      message: 'Tem certeza que deseja apagar TODOS os dados? Esta ação não pode ser desfeita.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary'
        }, {
          text: 'Apagar',
          cssClass: 'danger',
          handler: () => {
            this.vehicleService.clearAllData();
            this.showClearSuccessToast();
          }
        }
      ]
    });

    await alert.present();
  }

  async showClearSuccessToast() {
    const toast = await this.toastCtrl.create({
      message: 'Todos os dados foram apagados com sucesso.',
      duration: 2000,
      color: 'success',
      position: 'bottom'
    });
    toast.present();
  }
}
