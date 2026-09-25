import { HomePage } from './home.page';
import { CalculatorPage } from '../calculator/calculator.page';
import { SupplyHistoryPage } from '../supply-history/supply-history.page';
import { ConsumptionModalComponent } from './modals/consumption-modal/consumption-modal.component';
import { VehicleService } from '../services/vehicle.service';

describe('Navegação do gráfico e média', () => {
  it('shows point information first and navigates only through Ver mais', () => {
    spyOn(HomePage.prototype, 'checkDarkMode');
    const service = Object.create(VehicleService.prototype) as VehicleService;
    const car = {plate:'AAA1111',model:'Teste',type:'car',supplies:[
      {id:'a',date:new Date(2026,0,1),initialOdometer:1000,liters:20},
      {id:'b',date:new Date(2026,0,2),initialOdometer:1200,liters:20}
    ]};
    spyOn(service, 'getVehiclesSnapshot').and.returnValue([car]);
    const router = {navigate:jasmine.createSpy()};
    const page = new HomePage(service, {} as any, {} as any, {} as any, {} as any, router as any, {} as any, {run:(fn:Function)=>fn()} as any);
    page.summaryVehiclePlate = car.plate;
    (page.consumptionChartOptions as any).onClick({x:100,y:100},[{index:0}],{width:400});
    expect(page.pontoConsumo?.value).toBe(10);
    expect(router.navigate).not.toHaveBeenCalled();
    page.abrirCicloDoGrafico(0);
    expect(router.navigate).toHaveBeenCalled();
    expect(page.pontoConsumo).toBeNull();
  });

  it('clears both the visible cycle filter and the URL parameter', () => {
    const router = {navigate:jasmine.createSpy()};
    const page = new SupplyHistoryPage({} as any, {} as any, {} as any, {} as any, {} as any, router as any);
    page.cicloSelecionado = 'selected';
    page.verTodosOsCiclos();
    expect(page.cicloSelecionado).toBeNull();
    expect(router.navigate.calls.mostRecent().args[1].queryParams).toEqual({cycle:null,view:'cycles'});
  });

  it('uses the shared consumption form from the calculator menu', async () => {
    const page = Object.create(CalculatorPage.prototype) as CalculatorPage;
    page.vehicles = [{plate:'AAA1111',model:'Teste',type:'car'}];
    const create = jasmine.createSpy().and.resolveTo({present:async()=>{},onDidDismiss:async()=>({})});
    (page as any).modalCtrl = {create};
    await page.setView('consumption');
    expect(create.calls.mostRecent().args[0].component).toBe(ConsumptionModalComponent);
  });
});
