import { Capacitor } from '@capacitor/core';
import { of, Subject, throwError } from 'rxjs';
import { SupplyModalComponent } from './supply-modal.component';

describe('SupplyModalComponent: busca de postos', () => {
  let component: SupplyModalComponent;
  let stations: { getNearbyStations: jasmine.Spy };
  let position: jasmine.Spy;
  let permission: jasmine.Spy;
  beforeEach(() => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);
    position = spyOn(navigator.geolocation, 'getCurrentPosition').and.callFake(success => success({coords:{latitude:0,longitude:0,accuracy:20}} as any));
    permission = spyOn(navigator.permissions, 'query').and.rejectWith(new Error('Permissions API not available'));
    stations = {getNearbyStations:jasmine.createSpy().and.returnValue(of([{name:'Posto A',address:'',lat:0,lng:0,distanceMeters:10}]))};
    component = new SupplyModalComponent({} as any, {} as any, {} as any, {} as any, {} as any, {} as any, stations as any);
  });
  it('uses browser geolocation directly without native permission methods', async () => {
    await component.aoFocarCampoPosto();
    expect(permission).not.toHaveBeenCalled();
    expect(stations.getNearbyStations).toHaveBeenCalledWith(0,0);
    expect(component.exibindoListaPostos).toBeTrue();
    expect(component.mensagemErroPostos).toBeNull();
  });
  it('shows a permission message instead of a connection error', async () => {
    position.and.callFake((_success, error) => error!({code:1} as any));
    await component.aoFocarCampoPosto();
    expect(component.mensagemErroPostos).toContain('Permita o acesso');
    expect(stations.getNearbyStations).not.toHaveBeenCalled();
    expect(component.exibindoCarregandoPostos).toBeFalse();
  });
  it('distinguishes provider failure and allows retry', async () => {
    stations.getNearbyStations.and.returnValue(throwError(() => new Error('503')));
    await component.aoFocarCampoPosto();
    expect(component.mensagemErroPostos).toContain('servidores de postos');
    stations.getNearbyStations.and.returnValue(of([]));
    await component.aoFocarCampoPosto();
    expect(component.mensagemErroPostos).toContain('Nenhum posto cadastrado');
  });
  it('shares concurrent automatic and focused searches without overwriting typed text', async () => {
    const automatic = (component as any).preencherPostoMaisProximo();
    component.gasStation = 'Digitado manualmente';
    await Promise.all([automatic, component.aoFocarCampoPosto()]);
    expect(position).toHaveBeenCalledTimes(1);
    expect(stations.getNearbyStations).toHaveBeenCalledTimes(1);
    expect(component.gasStation).toBe('Digitado manualmente');
  });
  it('prefetches without opening suggestions or choosing a station', async () => {
    await (component as any).preencherPostoMaisProximo();
    expect(component.exibindoListaPostos).toBeFalse();
    expect(component.gasStation).toBe('');
    await component.aoFocarCampoPosto();
    expect(position).toHaveBeenCalledTimes(1);
  });
  it('only suggests presence when both proximity and accuracy are sufficient', () => {
    const station = {name:'A', address:'', lat:0, lng:0, distanceMeters:40};
    component.precisaoLocalizacao = 20;
    expect(component.possivelmenteNoPosto(station)).toBeTrue();
    component.precisaoLocalizacao = 1500;
    expect(component.possivelmenteNoPosto(station)).toBeFalse();
    component.precisaoLocalizacao = 20;
    expect(component.possivelmenteNoPosto({...station, distanceMeters:200})).toBeFalse();
  });

  it('keeps late results closed after clicking outside and leaves an unselected field empty', async () => {
    const response = new Subject<any[]>();
    stations.getNearbyStations.and.returnValue(response);
    const pending = component.aoFocarCampoPosto();
    // Let the browser location promise resolve before completing the HTTP request.
    await new Promise(resolve => setTimeout(resolve, 0));
    component.aoInteragirForaDoPosto(new Event('pointerdown'));
    response.next([{name:'A',address:'',lat:0,lng:0,distanceMeters:20}]);
    response.complete();
    await pending;
    expect(component.exibindoListaPostos).toBeFalse();
    expect(component.gasStation).toBe('');
  });
  it('keeps the selected station when dismissing and does not dismiss clicks inside', async () => {
    await component.aoFocarCampoPosto();
    const element = document.createElement('div');
    component.campoPosto = {nativeElement: element};
    component.aoInteragirForaDoPosto({composedPath: () => [element]} as any);
    expect(component.exibindoListaPostos).toBeTrue();
    component.selecionarPosto(component.postosProximos[0]);
    await component.aoFocarCampoPosto();
    component.aoInteragirForaDoPosto(new Event('pointerdown'));
    expect(component.exibindoListaPostos).toBeFalse();
    expect(component.gasStation).toBe('Posto A');
  });

});
