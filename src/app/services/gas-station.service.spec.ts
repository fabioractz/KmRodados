import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { GasStationService } from './gas-station.service';

describe('GasStationService', () => {
  let service: GasStationService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(GasStationService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('includes mapped areas and sorts by proximity before limiting results', () => {
    let result: any[] = [];
    service.getNearbyStations(0, 0).subscribe(data => result = data);
    const request = http.expectOne(r => r.url.includes('overpass-api.de'));
    expect(request.request.body.get('data')).toContain('nwr[');
    expect(request.request.body.get('data')).toContain('out center;');
    request.flush({ elements: [
      ...Array.from({length: 11}, (_, i) => ({type:'node',lat:0.02+i/10000,lon:0,tags:{name:'Distante'}})),
      {type:'way',center:{lat:0.001,lon:0},tags:{brand:'Próximo', 'addr:street':'Rua A'}},
      {type:'relation',center:{lat:0.002,lon:0},tags:{name:'Área'}},
      {type:'way',tags:{name:'Sem coordenadas'}}
    ] });
    expect(request.request.method).toBe('POST');
    expect(result[0].distanceMeters).toBeCloseTo(111.19, 0);
    expect(result.length).toBe(10);
    expect(result[0].name).toBe('Próximo');
    expect(result[1].name).toBe('Área');
  });
  it('distinguishes an empty map result from a failed query', () => {
    let failed = false;
    service.getNearbyStations(0, 0).subscribe({ error: () => failed = true });
    http.expectOne(r => r.url.includes('overpass-api.de')).flush({elements:[],remark:'runtime error: Query timed out'});
    http.expectOne(r => r.url.includes('private.coffee')).flush({elements:[],remark:'runtime error'});
    expect(failed).toBeTrue();
  });
  it('uses the alternate server after an HTTP failure', () => {
    let result: any[] | undefined;
    service.getNearbyStations(0, 0).subscribe(data => result = data);
    http.expectOne(r => r.url.includes('overpass-api.de')).flush('Unavailable', {status:406,statusText:'Not Acceptable'});
    http.expectOne(r => r.url.includes('private.coffee')).flush({elements:[]});
    expect(result).toEqual([]);
  });

  it('reuses nearby map data but recalculates the distance after movement', () => {
    service.getNearbyStations(0, 0).subscribe();
    http.expectOne(r => r.url.includes('overpass-api.de')).flush({elements:[{type:'node',lat:0.001,lon:0,tags:{name:'A'}}]});
    let distance = 0;
    service.getNearbyStations(0.001, 0).subscribe(result => distance = result[0].distanceMeters);
    http.expectNone(r => r.url.includes('interpreter'));
    expect(distance).toBe(0);
  });
  it('refreshes expired data and does not cache provider errors', () => {
    const now = Date.now();
    const clock = spyOn(Date, 'now').and.returnValue(now);
    service.getNearbyStations(0, 0).subscribe();
    http.expectOne(r => r.url.includes('overpass-api.de')).flush({elements:[]});
    clock.and.returnValue(now + 300001);
    service.getNearbyStations(0, 0).subscribe({error: () => {}});
    http.expectOne(r => r.url.includes('overpass-api.de')).flush('', {status:503,statusText:'Unavailable'});
    http.expectOne(r => r.url.includes('private.coffee')).flush('', {status:503,statusText:'Unavailable'});
    clock.and.returnValue(now + 330002);
    service.getNearbyStations(0, 0).subscribe();
    http.expectOne(r => r.url.includes('overpass-api.de')).flush({elements:[]});
  });

});
