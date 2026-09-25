import { ChartConfiguration } from 'chart.js';
import { Vehicle, VehicleService } from '../services/vehicle.service';

/** One point per measurement, including multiple measurements on the same day. */
export function consumptionChartPoints(vehicle: Vehicle, service: VehicleService) {
  const supplies = service.ordenarAbastecimentosParaCiclos(vehicle);
  const cycles = service.analisarCiclosConsumoPorTanqueCheio(vehicle).ciclosValidos;
  const points = [
    ...cycles.map(cycle => ({
      date: new Date(supplies[cycle.indiceFim].date),
      value: cycle.consumoKmPorLitro,
      source: 'cycle',
      cycleKey: service.chaveAvisoConsumo(vehicle, cycle),
      order: supplies[cycle.indiceFim].createdAt ?? 0
    })),
    ...(vehicle.consumptionHistory || []).map(record => ({
      date: new Date(record.date), value: record.result, source: 'manual', cycleKey: null, order: record.createdAt ?? 0
    }))
  ].filter(point => Number.isFinite(point.date.getTime()) && Number.isFinite(point.value) && point.value > 0)
    .sort((a, b) => a.date.getTime() - b.date.getTime() || a.order - b.order);

  return points;
}

export function buildConsumptionChart(vehicle: Vehicle, service: VehicleService, primaryColor = '#3880ff'): ChartConfiguration['data'] {
  const points = consumptionChartPoints(vehicle, service);
  return {
    labels: points.map(point => point.date.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })),
    datasets: [
      { source: 'cycle', label: 'Ciclos de abastecimento (km/L)', color: primaryColor },
      { source: 'manual', label: 'Fazer Média (km/L)', color: '#17a398' }
    ].filter(series => points.some(point => point.source === series.source)).map(series => ({
      label: series.label,
      data: points.map(point => point.source === series.source ? point.value : null),
      borderColor: series.color,
      pointBackgroundColor: series.color,
      pointRadius: 4,
      pointHitRadius: 12,
      borderWidth: 2,
      fill: false,
      tension: 0,
      spanGaps: true
    }))
  };
}
