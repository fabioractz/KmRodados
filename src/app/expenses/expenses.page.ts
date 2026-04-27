import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { VehicleService, Vehicle, OtherExpense } from '../services/vehicle.service';
import { NotificationService } from '../services/notification.service';
import { AlertController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-expenses',
  templateUrl: './expenses.page.html',
  styleUrls: ['./expenses.page.scss'],
  standalone: false
})
export class ExpensesPage implements OnInit {

  vehicles: Vehicle[] = [];
  selectedVehiclePlate: string = '';
  expenseDate: string = new Date().toISOString();
  horaDespesa: string = '';
  expenseTime: string = '';
  expenseType: string = '';
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
  expenseTypes: string[] = [
    'Estacionamento',
    'Pedágio',
    'Seguro',
    'IPVA',
    'Licenciamento',
    'Multa',
    'Lava Jato',
    'Lavagem',
    'Outros'
  ];
  local: string = '';
  odometer: number | null = null;
  odometerStr: string = '';
  costStr: string = '';
  notes: string = '';
  cost: number | null = null;
  reminderEnabled: boolean = false;
  reminderTime: string = '';
  reminderOptions: string[] = [];
  history: OtherExpense[] = [];
  showHistory: boolean = false;
  expenseTypeError: boolean = false;
  vehicleError: boolean = false;
  costError: boolean = false;

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
    this.expenseDate = isoLocal;
    this.horaDespesa = isoLocal;
  }

  formatCost(event: any) {
    this.costError = false;
    let value = event.target.value || '';
    value = value.replace(/\D/g, '');
    if (value === '') {
      this.costStr = '';
      this.cost = null;
      return;
    }
    const numericValue = parseInt(value, 10) / 100;
    this.cost = numericValue;
    this.costStr = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numericValue);
  }

  formatOdometer(event: any) {
    let value = event.target.value;
    const numericString = value.replace(/\D/g, '');
    if (numericString === '') {
      this.odometerStr = '';
      this.odometer = null;
      return;
    }
    const numericValue = parseInt(numericString, 10);
    this.odometer = numericValue;
    this.odometerStr = new Intl.NumberFormat('pt-BR').format(numericValue);
  }

  get missingFields(): string[] {
    const fields: string[] = [];
    if (!this.selectedVehiclePlate) {
      fields.push('Escolha o Veículo');
    }
    if (!this.expenseType) {
      fields.push('Tipo de Despesa');
    }
    if (this.cost === null) {
      fields.push('Custo');
    }
    return fields;
  }

  get hasValidationErrors(): boolean {
    return this.vehicleError || this.expenseTypeError || this.costError;
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

  onExpenseTypeChange() {
    this.expenseTypeError = false;
  }

  toggleHistory() {
    this.showHistory = !this.showHistory;
    if (this.showHistory) {
      this.updateHistory();
    }
  }

  fechar() {
    this.router.navigate(['/tabs/more']);
  }

  abrirHistorico() {
    if (this.selectedVehiclePlate) {
      this.router.navigate(['/expense-history'], { queryParams: { plate: this.selectedVehiclePlate } });
    } else {
      this.router.navigate(['/expense-history']);
    }
  }

  private updateHistory() {
    if (!this.selectedVehiclePlate) {
      this.history = [];
      return;
    }
    const normalizedPlate = this.selectedVehiclePlate.toUpperCase();
    const vehicle = this.vehicles.find(v => v.plate === normalizedPlate);
    if (vehicle && vehicle.otherExpenses) {
      this.history = [...vehicle.otherExpenses].sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        return db - da;
      });
    } else {
      this.history = [];
    }
  }

  async salvar() {
    // Resetar erros
    this.vehicleError = false;
    this.expenseTypeError = false;
    this.costError = false;

    let hasError = false;

    if (!this.selectedVehiclePlate) {
      this.vehicleError = true;
      hasError = true;
    }
    if (!this.expenseType) {
      this.expenseTypeError = true;
      hasError = true;
    }
    if (this.cost === null) {
      this.costError = true;
      hasError = true;
    }

    if (hasError) {
      return;
    }

    const datePart = this.expenseDate.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);

    let horas = 0;
    let minutos = 0;
    const origemHora = this.horaDespesa || this.expenseDate;
    if (origemHora) {
      const partesHora = origemHora.split('T')[1] || '';
      const horaMinutoSeg = partesHora.split('.')[0] || '';
      const [horaStr, minutoStr] = horaMinutoSeg.split(':');
      horas = Number(horaStr) || 0;
      minutos = Number(minutoStr) || 0;
    }

    const dataAtual = new Date(year, month - 1, day, horas, minutos);
    
    // Manter expenseTime para compatibilidade
    this.expenseTime = `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
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
          `Lembrete de Despesa: ${this.expenseType}`,
          `Lembrete para ${this.expenseType} do veículo ${this.selectedVehiclePlate}`,
          notificationDate
        );
      } else {
        // Se a data calculada já passou (ex: lembrete 1 dia antes mas a data é amanhã cedo e agora é noite),
        // talvez devêssemos avisar ou não agendar. Por simplicidade, não agendamos se já passou.
        notificationId = undefined;
      }
    }

    const expense: OtherExpense = {
      date: dataAtual,
      time: this.expenseTime,
      type: this.expenseType,
      recurrence: this.recurrence,
      reminderEnabled: this.reminderEnabled,
      reminderTime: this.reminderEnabled ? this.reminderTime : undefined,
      location: this.local,
      odometer: this.odometer ?? undefined,
      cost: this.cost ?? undefined,
      notes: this.notes,
      nextDate: proximaData || undefined,
      notificationId: notificationId
    };

    const saved = this.vehicleService.addOtherExpense(this.selectedVehiclePlate, expense);
    if (!saved) {
      const alertError = await this.alertCtrl.create({
        header: 'Erro',
        message: 'Não foi possível salvar a despesa.',
        buttons: ['OK']
      });
      await alertError.present();
      return;
    }

    this.updateHistory();

    this.expenseType = '';
    this.expenseTypeError = false;
    this.vehicleError = false;
    this.costError = false;
    this.recurrence = 'Única';
    this.reminderEnabled = false;
    this.local = '';
    this.odometer = null;
    this.cost = null;
    this.costStr = '';
    this.notes = '';
    this.initDate();

    let toastMessage = 'Despesa salva.';
    if (this.reminderEnabled && proximaData) {
      const proximaDataStr = proximaData.toLocaleDateString('pt-BR');
      toastMessage = `Despesa salva. Você será lembrado em ${proximaDataStr}.`;
    }

    const toast = await this.toastCtrl.create({
      message: toastMessage,
      duration: 3000,
      position: 'bottom',
      color: 'success'
    });
    await toast.present();
  }

  editarDespesa(item: OtherExpense) {
    // Redireciona para a página de histórico onde pode editar
    this.abrirHistorico();
  }

  async removerDespesa(item: OtherExpense) {
    if (!item.id || !this.selectedVehiclePlate) {
      return;
    }

    const alerta = await this.alertCtrl.create({
      header: 'Confirmar exclusão',
      message: 'Deseja realmente excluir esta despesa?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Excluir',
          role: 'destructive',
          handler: () => {
            this.vehicleService.removerDespesa(this.selectedVehiclePlate, item.id!);
            this.updateHistory();
            this.toastCtrl.create({
              message: 'Despesa removida com sucesso.',
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
