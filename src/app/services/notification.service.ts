import { Injectable } from '@angular/core';
import { LocalNotifications } from '@capacitor/local-notifications';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  constructor() { }

  async requestPermissions(): Promise<boolean> {
    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted';
  }

  async scheduleReminder(id: number, title: string, body: string, date: Date) {
    // Garantir permissões antes de agendar
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.warn('Permissão para notificações negada.');
      return;
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          title,
          body,
          id,
          schedule: { at: date },
          sound: undefined, // Som padrão
          attachments: undefined,
          actionTypeId: '',
          extra: null
        }
      ]
    });
  }

  async cancelReminder(id: number) {
    await LocalNotifications.cancel({ notifications: [{ id }] });
  }

  /**
   * Calcula a data de disparo com base na data do evento e no tempo de antecedência escolhido.
   * @param eventDate Data do evento (Date object)
   * @param reminderTimeOption String como '15 minutos antes', '1 dia antes', etc.
   */
  calculateNotificationDate(eventDate: Date, reminderTimeOption: string): Date {
    const notificationDate = new Date(eventDate.getTime());
    
    // Normalizar string para lowercase para facilitar comparação
    const option = reminderTimeOption.toLowerCase();

    if (option === 'na hora') {
      return notificationDate;
    }

    if (option.includes('minutos antes')) {
      const minutes = parseInt(option.split(' ')[0], 10);
      notificationDate.setMinutes(notificationDate.getMinutes() - minutes);
    } else if (option.includes('hora antes') || option.includes('horas antes')) {
      const hours = parseInt(option.split(' ')[0], 10);
      notificationDate.setHours(notificationDate.getHours() - hours);
    } else if (option.includes('dia antes') || option.includes('dias antes')) {
      const days = parseInt(option.split(' ')[0], 10);
      notificationDate.setDate(notificationDate.getDate() - days);
    } else if (option.includes('semana antes') || option.includes('semanas antes')) {
      const weeks = parseInt(option.split(' ')[0], 10);
      notificationDate.setDate(notificationDate.getDate() - (weeks * 7));
    } else if (option.includes('mês antes')) {
      const months = parseInt(option.split(' ')[0], 10);
      notificationDate.setMonth(notificationDate.getMonth() - months);
    }

    return notificationDate;
  }
}
