import { Vehicle, VehicleService } from './vehicle.service';

describe('Dispensar avisos de consumo', () => {
  it('persists each dismissal separately without changing calculations or supplies', () => {
    const vehicle: Vehicle = {
      plate: 'AAA1111', model: 'Teste', type: 'car',
      supplies: [1000, 900, 1300].map((km, i) => ({
        id: String(i), date: new Date(2026, 0, i + 1), initialOdometer: km,
        liters: 20, tanqueCompleto: true
      }))
    };
    let stored = JSON.stringify([vehicle]);
    spyOn(localStorage, 'getItem').and.callFake(() => stored);
    spyOn(localStorage, 'setItem').and.callFake((_key, value) => { stored = value; });
    const service = new VehicleService();
    const before = service.analisarCiclosConsumoPorTanqueCheio(vehicle);
    const key = service.chaveAvisoConsumo(vehicle, before.ciclosRejeitados[0]);
    service.dispensarAvisoConsumo(vehicle.plate, key);
    const reloaded = new VehicleService();
    const saved = reloaded.getVehiclesSnapshot()[0];
    expect(reloaded.avisoConsumoDispensado(saved, before.ciclosRejeitados[0])).toBeTrue();
    expect(reloaded.avisoConsumoDispensado(saved, before.ciclosRejeitados[1])).toBeFalse();
    expect(reloaded.analisarCiclosConsumoPorTanqueCheio(saved)).toEqual(before);
    expect(saved.supplies?.map(s => s.initialOdometer)).toEqual([1000, 900, 1300]);
    // Array indices can change when an older record is inserted.
    saved.supplies!.unshift({id:'older', date:new Date(2025, 0, 1), initialOdometer:800, liters:20});
    expect(reloaded.avisoConsumoDispensado(saved, {indiceInicio:1, indiceFim:2})).toBeTrue();
  });
});
