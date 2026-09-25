import { buildConsumptionChart } from './consumption-chart';
import { Supply, Vehicle, VehicleService } from '../services/vehicle.service';
import { HomePage } from './home.page';

describe('Gráfico de consumo da página inicial', () => {
  const service = Object.create(VehicleService.prototype) as VehicleService;
  const supply = (hour: number, odometer: number, liters: number, full = true): Supply => ({
    date: new Date(2026, 8, 23, hour), initialOdometer: odometer, liters, tanqueCompleto: full
  });
  const vehicle = (supplies: Supply[]): Vehicle => ({ model: 'Teste', plate: 'AAA1111', type: 'car', supplies });

  it('preserves compact axis formatting and tooltip callbacks when changing theme', () => {
    const page = Object.create(HomePage.prototype) as HomePage;
    page.consumptionChartData = { datasets: [] };
    const callback = () => '30/07';
    page.consumptionChartOptions = { scales: { x: { ticks: { callback } } } };
    page.maintenanceChartOptions = { plugins: { tooltip: { callbacks: { title: callback } } } };
    page.updateChartColors(true);
    page.updateChartColors(false);
    expect(page.consumptionChartOptions?.scales?.['x']?.ticks?.callback).toBe(callback);
    expect(page.maintenanceChartOptions?.plugins?.tooltip?.callbacks?.title).toBe(callback);
  });

  it('uses the selected theme color for new and already rendered chart data', () => {
    const car = vehicle([supply(1, 1000, 20), supply(2, 1200, 20)]);
    const data = buildConsumptionChart(car, service, '#7a49a5');
    expect(data.datasets[0].borderColor).toBe('#7a49a5');
    const page = Object.create(HomePage.prototype) as HomePage;
    page.consumptionChartData = data;
    page.consumptionChartOptions = {};
    page.maintenanceChartOptions = {};
    spyOn(window, 'getComputedStyle').and.returnValue({ getPropertyValue: () => '#2dd36f' } as any);
    page.updateChartColors(true);
    expect(page.consumptionChartData.datasets[0].borderColor).toBe('#2dd36f');
    expect(page.consumptionChartData.datasets[0].data).toEqual([10]);
  });

  it('flags an unusual cycle for review without removing it or changing records', () => {
    const car = vehicle([0, 200, 400, 600, 800, 2000].map((km, i) => supply(i + 1, 1000 + km, 20)));
    const warnings = service.identificarCiclosAtipicos(car);
    expect(warnings.length).toBe(1);
    expect(warnings[0].consumoKmPorLitro).toBe(60);
    expect(warnings[0].motivo).toContain('continua no gráfico');
    expect(buildConsumptionChart(car, service).datasets[0].data).toEqual([10, 10, 10, 10, 60]);
  });

  it('does not infer a pattern from too few measurements or flag ordinary variation', () => {
    expect(service.identificarCiclosAtipicos(vehicle([supply(1, 1000, 20), supply(2, 2200, 20)]))).toEqual([]);
    const car = vehicle([1000, 1200, 1420, 1620, 1860, 2040].map((km, i) => supply(i + 1, km, 20)));
    expect(service.identificarCiclosAtipicos(car)).toEqual([]);
  });

  it('preserves the variation and every cycle on the same day in chronological order', () => {
    const data = buildConsumptionChart(vehicle([
      supply(12, 1600, 25), supply(8, 1000, 40), supply(10, 1200, 20), supply(11, 1400, 20)
    ]), service);
    expect(data.datasets[0].data).toEqual([10, 10, 8]);
    expect(data.labels?.length).toBe(3);
  });

  it('includes partial fill liters only in the completed cycle', () => {
    const data = buildConsumptionChart(vehicle([
      supply(8, 1000, 40), supply(9, 1100, 10, false), supply(10, 1300, 20), supply(11, 1400, 10, false)
    ]), service);
    expect(data.datasets[0].data).toEqual([10]);
  });

  it('excludes inconsistent cycles, even if an old average was saved', () => {
    const data = buildConsumptionChart(vehicle([
      supply(8, 1000, 40), {...supply(9, 900, 20), average: 500}
    ]), service);
    expect(data.datasets).toEqual([]);
    expect(data.labels).toEqual([]);
  });

  it('keeps manual measurements separate and ignores invalid values and dates', () => {
    const car = vehicle([supply(8, 1000, 40), supply(10, 1200, 20)]);
    car.consumptionHistory = [12, 0, NaN, Infinity, -1].map(result => ({
      date: new Date(2026, 8, 23, 11), distance: 120, liters: 10, result
    }));
    car.consumptionHistory.push({date: new Date('invalid'), distance: 120, liters: 10, result: 12});
    const data = buildConsumptionChart(car, service);
    expect(data.datasets[0].data).toEqual([10, null]);
    expect(data.datasets[1].data).toEqual([null, 12]);
    expect(data.labels?.length).toBe(2);
  });

  it('rejects both cycles touching a backwards odometer, without hiding later valid cycles', () => {
    const car = vehicle([
      supply(8, 89568, 49.521), supply(9, 9004, 34.02),
      supply(10, 90805, 14.306, false), supply(11, 90980, 48.41),
      supply(12, 91616, 41.44)
    ]);
    const analysis = service.analisarCiclosConsumoPorTanqueCheio(car);
    expect(analysis.ciclosRejeitados.length).toBe(2);
    expect(analysis.ciclosRejeitados[1].motivo).toContain('início do ciclo');
    expect(analysis.ciclosValidos.length).toBe(1);
    expect(analysis.mediaConsumoKmPorLitro).toBeCloseTo(636 / 41.44, 6);
    expect(buildConsumptionChart(car, service).datasets[0].data).toEqual([636 / 41.44]);
    expect(car.supplies![1].initialOdometer).toBe(9004);

    // A user correction restores both cycles without special chart filtering.
    car.supplies![1].initialOdometer = 90004;
    const corrected = service.analisarCiclosConsumoPorTanqueCheio(car);
    expect(corrected.ciclosRejeitados.length).toBe(0);
    expect(corrected.ciclosValidos.length).toBe(3);
    expect(corrected.ciclosValidos[1].consumoKmPorLitro).toBeCloseTo(976 / 62.716, 6);
  });
});
