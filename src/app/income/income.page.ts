import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { VehicleService, Vehicle, IncomeEntry } from '../services/vehicle.service';
import { NotificationService } from '../services/notification.service';
import { AlertController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-income',
  templateUrl: './income.page.html',
  styleUrls: ['./income.page.scss'],
  standalone: false
})
export class IncomePage implements OnInit {

  vehicles: Vehicle[] = [];
  selectedVehiclePlate: string = '';
  incomeDate: string = new Date().toISOString();
  horaReceita: string = '';
  incomeTime: string = '';
  incomeType: string = '';
  incomeTypes: string[] = [
    'Frete',
    'Carona',
    'Venda de Veículo',
    'Reembolso de empresa',
    'Aluguel do veículo',
    'Indenização de seguro',
    'Uso em aplicativo de transporte',
    'Venda de sucata/peças',
    'Outros'
  ];
  recurrence: string = 'Única';
  recurrenceOptions: string[] = [
    'Única',
    'Diária',
    'Semanal',
    'Mensal',
    'Anual',
    'A cada 15 dias',
    'A cada 2 meses',
    'A cada 3 meses',
    'A cada 6 meses',
    'A cada 2 anos'
  ];
  amountStr: string = '';
  amount: number | null = null;
  notes: string = '';
  reminderEnabled: boolean = false;
  reminderTime: string = '';
  reminderOptions: string[] = [];
  history: IncomeEntry[] = [];
  showHistory: boolean = false;
  incomeTypeError: boolean = false;
  vehicleError: boolean = false;
  amountError: boolean = false;

  mostrarMaisCampos: boolean = false;

  /** Formato DD/MM/YYYY na exibição do botão de data */
  readonly opcoesFormatoData: { date: Intl.DateTimeFormatOptions } = {
    date: { day: '2-digit', month: '2-digit', year: 'numeric' }
  };

  constructor(
    private router: Router,
    private vehicleService: VehicleService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.initDate();
    this.vehicleService.getVehicles().subscribe(vehicles => {
      this.vehicles = vehicles;
      // Seleciona automaticamente o veículo padrão (favorito), se existir
      const veiculo_padrao = this.vehicles.find(v => v.isDefault);
      this.selectedVehiclePlate = veiculo_padrao ? veiculo_padrao.plate : '';
      this.updateHistory();
    });
  }

  initDate() {
    const agora = new Date();
    const offset = agora.getTimezoneOffset() * 60000;
    const isoLocal = new Date(agora.getTime() - offset).toISOString();
    this.incomeDate = isoLocal;
    this.horaReceita = isoLocal;
  }

  formatAmount(event: any) {
    let value = event.target.value || '';
    value = value.replace(/\D/g, '');
    if (value === '') {
      this.amountStr = '';
      this.amount = null;
      this.amountError = false;
      return;
    }
    const numericValue = parseInt(value, 10) / 100;
    this.amount = numericValue;
    this.amountStr = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numericValue);
    this.amountError = false;
  }

  onVehicleChange() {
    this.vehicleError = false;
    this.updateHistory();
  }

  onRecurrenceChange() {
    if (this.recurrence === 'Única') {
      this.reminderEnabled = false;
    }
    this.updateReminderOptions();
  }

  updateReminderOptions() {
    this.reminderOptions = [];
    this.reminderTime = ''; // Reset selection

    // Opções de curto prazo
    const timeOptions = [
      'Na hora',
      '5 minutos antes',
      '15 minutos antes',
      '30 minutos antes',
      '1 hora antes',
      '2 horas antes'
    ];

    switch (this.recurrence) {
      case 'Diária':
        // Lembrete para recorrência diária
        this.reminderOptions = [...timeOptions]; 
        break;
      case 'Semanal':
        this.reminderOptions = [...timeOptions, '1 dia antes', '2 dias antes', '3 dias antes'];
        break;
      case 'Mensal':
      case 'A cada 2 meses':
      case 'A cada 3 meses':
      case 'A cada 6 meses':
        this.reminderOptions = [...timeOptions, '1 dia antes', '2 dias antes', '1 semana antes', '2 semanas antes'];
        break;
      case 'Anual':
      case 'A cada 2 anos':
        this.reminderOptions = [...timeOptions, '1 dia antes', '1 semana antes', '2 semanas antes', '1 mês antes'];
        break;
      case 'A cada 15 dias':
        this.reminderOptions = [...timeOptions, '1 dia antes', '2 dias antes', '1 semana antes'];
        break;
      default:
        this.reminderOptions = [...timeOptions, '1 dia antes'];
        break;
    }
    
    // Selecionar o primeiro por padrão se não houver seleção
    if (this.reminderOptions.length > 0) {
      this.reminderTime = this.reminderOptions[0];
    }
  }

  onIncomeTypeChange() {
    this.incomeTypeError = false;
  }

  toggleHistory() {
    this.showHistory = !this.showHistory;
    if (this.showHistory) {
      this.updateHistory();
    }
  }

  get totalIncome(): number {
    return this.history.reduce((sum, i) => sum + (i.amount || 0), 0);
  }

  fechar() {
    this.router.navigate(['/tabs/more']);
  }

  abrirHistorico() {
    if (this.selectedVehiclePlate) {
      this.router.navigate(['/income-history'], { queryParams: { plate: this.selectedVehiclePlate } });
    } else {
      this.router.navigate(['/income-history']);
    }
  }

  private updateHistory() {
    if (!this.selectedVehiclePlate) {
      this.history = [];
      return;
    }
    const normalizedPlate = this.selectedVehiclePlate.toUpperCase();
    const vehicle = this.vehicles.find(v => v.plate === normalizedPlate);
    if (vehicle && vehicle.incomes) {
      this.history = [...vehicle.incomes].sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        return db - da;
      });
    } else {
      this.history = [];
    }
  }

  get missingFields(): string[] {
    const fields: string[] = [];
    if (!this.selectedVehiclePlate) {
      fields.push('Escolha o Veículo');
    }
    if (!this.incomeType) {
      fields.push('Tipo de Receita');
    }
    if (!this.amount) {
      fields.push('Valor da Receita');
    }
    return fields;
  }

  get hasValidationErrors(): boolean {
    return this.vehicleError || this.incomeTypeError || this.amountError;
  }

  async salvar() {
    // Resetar erros
    this.vehicleError = false;
    this.incomeTypeError = false;
    this.amountError = false;

    let hasError = false;

    if (!this.selectedVehiclePlate) {
      this.vehicleError = true;
      hasError = true;
    }
    if (!this.incomeType) {
      this.incomeTypeError = true;
      hasError = true;
    }
    if (!this.amount) {
      this.amountError = true;
      hasError = true;
    }

    if (hasError) {
      return;
    }

    const datePart = this.incomeDate.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);

    let horas = 0;
    let minutos = 0;
    const origemHora = this.horaReceita || this.incomeDate;
    if (origemHora) {
      const partesHora = origemHora.split('T')[1] || '';
      const horaMinutoSeg = partesHora.split('.')[0] || '';
      const [horaStr, minutoStr] = horaMinutoSeg.split(':');
      horas = Number(horaStr) || 0;
      minutos = Number(minutoStr) || 0;
    }

    const dataAtual = new Date(year, month - 1, day, horas, minutos);
    
    // Manter incomeTime para compatibilidade
    this.incomeTime = `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
    let proximaData: Date | null = null;

    if (this.recurrence === 'Diária') {
      proximaData = new Date(dataAtual);
      proximaData.setDate(proximaData.getDate() + 1);
    } else if (this.recurrence === 'Semanal') {
      proximaData = new Date(dataAtual);
      proximaData.setDate(proximaData.getDate() + 7);
    } else if (this.recurrence === 'Mensal') {
      proximaData = new Date(dataAtual);
      proximaData.setMonth(proximaData.getMonth() + 1);
    } else if (this.recurrence === 'Anual') {
      proximaData = new Date(dataAtual);
      proximaData.setFullYear(proximaData.getFullYear() + 1);
    } else if (this.recurrence === 'A cada 15 dias') {
      proximaData = new Date(dataAtual);
      proximaData.setDate(proximaData.getDate() + 15);
    } else if (this.recurrence === 'A cada 2 meses') {
      proximaData = new Date(dataAtual);
      proximaData.setMonth(proximaData.getMonth() + 2);
    } else if (this.recurrence === 'A cada 3 meses') {
      proximaData = new Date(dataAtual);
      proximaData.setMonth(proximaData.getMonth() + 3);
    } else if (this.recurrence === 'A cada 6 meses') {
      proximaData = new Date(dataAtual);
      proximaData.setMonth(proximaData.getMonth() + 6);
    } else if (this.recurrence === 'A cada 2 anos') {
      proximaData = new Date(dataAtual);
      proximaData.setFullYear(proximaData.getFullYear() + 2);
    }

    let notificationId: number | undefined;

    if (this.reminderEnabled && proximaData && this.reminderTime) {
      notificationId = Date.now();
      const notificationDate = this.notificationService.calculateNotificationDate(proximaData, this.reminderTime);
      
      // Agendar apenas se a data for futura
      if (notificationDate.getTime() > Date.now()) {
        await this.notificationService.scheduleReminder(
          notificationId,
          `Lembrete de Receita: ${this.incomeType}`,
          `Lembrete para ${this.incomeType} do veículo ${this.selectedVehiclePlate}`,
          notificationDate
        );
      } else {
        notificationId = undefined;
      }
    }

    const income: IncomeEntry = {
      date: dataAtual,
      time: this.incomeTime,
      type: this.incomeType,
      recurrence: this.recurrence,
      reminderEnabled: this.reminderEnabled,
      reminderTime: this.reminderEnabled ? this.reminderTime : undefined,
      nextDate: proximaData || undefined,
      notificationId: notificationId,
      amount: this.amount!,
      notes: this.notes || undefined
    };

    const saved = this.vehicleService.addIncome(this.selectedVehiclePlate, income);
    if (!saved) {
      const alert = await this.alertCtrl.create({
        header: 'Erro',
        message: 'Não foi possível salvar a receita.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    this.updateHistory();

    this.incomeType = '';
    this.incomeTypeError = false;
    this.vehicleError = false;
    this.amountError = false;
    this.recurrence = 'Única';
    this.reminderEnabled = false;
    this.amount = null;
    this.amountStr = '';
    this.notes = '';
    this.initDate();

    let toastMessage = 'Receita salva.';
    if (this.reminderEnabled && proximaData) {
      const proximaDataStr = proximaData.toLocaleDateString('pt-BR');
      toastMessage = `Receita salva. Você será lembrado em ${proximaDataStr}.`;
    }

    const toast = await this.toastCtrl.create({
      message: toastMessage,
      duration: 3000,
      position: 'bottom',
      color: 'success'
    });
    await toast.present();
  }

  editarReceita(item: IncomeEntry) {
    // Redireciona para a página de histórico onde pode editar
    this.abrirHistorico();
  }

  async removerReceita(item: IncomeEntry) {
    if (!item.id || !this.selectedVehiclePlate) {
      return;
    }

    const alerta = await this.alertCtrl.create({
      header: 'Confirmar exclusão',
      message: 'Deseja realmente excluir esta receita?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Excluir',
          role: 'destructive',
          handler: () => {
            this.vehicleService.removerReceita(this.selectedVehiclePlate, item.id!);
            this.updateHistory();
            this.toastCtrl.create({
              message: 'Receita removida com sucesso.',
              duration: 2000,
              color: 'success',
              position: 'bottom'
            }).then(t => t.present());
          }
        }
      ]
    });

    await alerta.present();
  }
}
