import { BehaviorSubject } from 'rxjs';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { SupplyHistoryPage } from './supply-history.page';
import { Supply, Vehicle, VehicleService } from '../services/vehicle.service';

describe('SupplyHistoryPage: ciclos e correções', () => {
  const supply = (id: string, day: number, odometer: number, full = true, createdAt = day): Supply => ({
    id, date: new Date(2026, 8, day), initialOdometer: odometer,
    liters: 20, totalValue: 100, tanqueCompleto: full, createdAt
  });
  let vehicles$: BehaviorSubject<Vehicle[]>;
  let params$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let page: SupplyHistoryPage;
  let modal: { create: jasmine.Spy };
  let vehicle: Vehicle;

  beforeEach(() => {
    vehicle = { type: 'car', model: 'Teste', plate: 'AAA1111', supplies: [
      supply('end', 3, 150), supply('start', 1, 100), supply('partial', 2, 200, false)
    ] };
    vehicles$ = new BehaviorSubject([vehicle]);
    params$ = new BehaviorSubject(convertToParamMap({ plate: vehicle.plate, view: 'issues' }));
    // Exercise the real analyzer without loading or writing browser storage.
    const service = Object.create(VehicleService.prototype) as VehicleService;
    spyOn(service, 'getVehicles').and.returnValue(vehicles$.asObservable());
    modal = { create: jasmine.createSpy().and.resolveTo({ present: async () => {}, onWillDismiss: async () => ({ data: { saved: true } }) }) };
    page = new SupplyHistoryPage(service, {} as any, { queryParamMap: params$ } as unknown as ActivatedRoute, {} as any, modal as unknown as ModalController);
    page.ngOnInit();
  });

  afterEach(() => page.ngOnDestroy());

  it('maps rejected indices to the correct original records including partial fills', () => {
    expect(page.view).toBe('issues');
    expect(page.issues[0].supplies.map(s => s.id)).toEqual(['start', 'partial', 'end']);
    expect(page.issues[0].reason).toContain('menor que leituras anteriores');
    expect(vehicle.supplies!.map(s => s.id)).toEqual(['end', 'start', 'partial']);
  });

  it('recalculates after correction without resetting the selected section', () => {
    page.view = 'cycles';
    vehicle.supplies![0] = supply('end', 3, 500);
    vehicles$.next([vehicle]);
    expect(page.issues.length).toBe(0);
    expect(page.cycles[0].distance).toBe(400);
    expect(page.cycles[0].liters).toBe(40);
    expect(page.view).toBe('cycles');
  });

  it('filters cycles to the vehicle in the route and handles empty results', () => {
    params$.next(convertToParamMap({ plate: 'OTHER', view: 'cycles' }));
    expect(page.cycles).toEqual([]);
    expect(page.issues).toEqual([]);
    expect(page.supplies).toEqual([]);
  });

  it('opens the existing editor with the chosen supply identity', async () => {
    await page.editar_abastecimento(page.issues[0].supplies[1]);
    expect(modal.create.calls.mostRecent().args[0].componentProps.editingSupply.id).toBe('partial');
    expect(modal.create.calls.mostRecent().args[0].componentProps.editingVehiclePlate).toBe('AAA1111');
  });

  it('uses creation order for supplies on the same date', () => {
    vehicle.supplies = [supply('end', 1, 500, true, 3), supply('partial', 1, 200, false, 2), supply('start', 1, 100, true, 1)];
    vehicles$.next([vehicle]);
    expect(page.cycles[0].supplies.map(s => s.id)).toEqual(['start', 'partial', 'end']);
  });

  it('opens the exact cycle linked by the chart even when its review notice was dismissed', () => {
    vehicle.supplies![0] = supply('end', 3, 500);
    vehicles$.next([vehicle]);
    const key = page.cycles[0].reviewKey!;
    vehicle.avisosConsumoDispensados = [key];
    params$.next(convertToParamMap({plate: vehicle.plate, view:'cycles', cycle:key}));
    expect(page.ciclosExibidos.length).toBe(1);
    expect(page.ciclosExibidos[0].distance).toBe(400);
    expect(page.ciclosExibidos[0].supplies.map(s => s.id)).toEqual(['start', 'partial', 'end']);
    page.cicloSelecionado = 'missing';
    expect(page.ciclosExibidos).toEqual([]);
  });
});
