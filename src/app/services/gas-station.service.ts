import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, timeout, of, tap, throwError, defer } from 'rxjs';

export interface PostoCombustivel {
  name: string;
  address: string;
  lat: number;
  lng: number;
  distanceMeters: number;
}

interface OverpassElement {
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}
interface OverpassResponse { elements?: OverpassElement[]; remark?: string; }

@Injectable({ providedIn: 'root' })
export class GasStationService {
  private readonly url_overpass = 'https://overpass-api.de/api/interpreter';
  private readonly url_alternativa = 'https://overpass.private.coffee/api/interpreter';
  private readonly raio_metros = 3000;
  private readonly limite_resultados = 10;

  private cache?: { latitude: number; longitude: number; time: number; response: OverpassResponse };
  private indisponivelAte = new Map<string, number>();
  private preferredUrl = this.url_overpass;

  constructor(private http: HttpClient) {}

  obterPostosProximos(latitude: number, longitude: number): Observable<PostoCombustivel[]> {
    // Reuse map data nearby, but always recalculate distances from the new fix.
    if (this.cache && Date.now() - this.cache.time < 300000 &&
        this.distancia({ lat: this.cache.latitude, lng: this.cache.longitude }, latitude, longitude) <= 300) {
      return of(this.mapearResposta(this.cache.response, latitude, longitude));
    }
    const consulta = `[out:json][timeout:10];nwr["amenity"="fuel"](around:${this.raio_metros + 300},${latitude},${longitude});out center;`;
    const parametros = new HttpParams().set('data', consulta);
    const consultar = (url: string) => defer(() => {
      if ((this.indisponivelAte.get(url) || 0) > Date.now()) {
        return throwError(() => new Error('Serviço temporariamente indisponível. Aguarde 30 segundos.'));
      }
      return this.http.post<OverpassResponse>(url, parametros, { headers: { Accept: 'application/json' } });
    }).pipe(
      timeout(15000),
      map(resposta => ({ resposta, postos: this.mapearResposta(resposta, latitude, longitude) })),
      tap(({ resposta }) => {
        this.preferredUrl = url;
        this.cache = { latitude, longitude, time: Date.now(), response: resposta };
      }),
      map(({ postos }) => postos),
      catchError(erro => {
        if ((this.indisponivelAte.get(url) || 0) <= Date.now()) this.indisponivelAte.set(url, Date.now() + 30000);
        return throwError(() => erro);
      })
    );
    const alternativa = this.preferredUrl === this.url_overpass ? this.url_alternativa : this.url_overpass;
    return consultar(this.preferredUrl).pipe(catchError(() => consultar(alternativa)));
  }

  getNearbyStations(latitude: number, longitude: number): Observable<PostoCombustivel[]> {
    return this.obterPostosProximos(latitude, longitude);
  }

  private mapearResposta(resposta: OverpassResponse, latitude: number, longitude: number): PostoCombustivel[] {
    if (!Array.isArray(resposta?.elements) || resposta.remark) {
      throw new Error('Resposta inválida ou incompleta do serviço de postos.');
    }
    const postos: PostoCombustivel[] = [];
    for (const elemento of resposta.elements) {
      const lat = elemento.lat ?? elemento.center?.lat;
      const lng = elemento.lon ?? elemento.center?.lon;
      if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const tags = elemento.tags || {};
      postos.push({
        name: tags['name'] || tags['brand'] || tags['operator'] || 'Posto sem nome',
        address: tags['addr:full'] || [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(', '),
        lat, lng, distanceMeters: this.distancia({ lat, lng }, latitude, longitude)
      });
    }
    return postos.filter(posto => posto.distanceMeters <= this.raio_metros)
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, this.limite_resultados);
  }

  private distancia(posto: { lat: number; lng: number }, lat: number, lng: number): number {
    const rad = Math.PI / 180;
    const h = Math.sin((posto.lat - lat) * rad / 2) ** 2
      + Math.cos(lat * rad) * Math.cos(posto.lat * rad) * Math.sin((posto.lng - lng) * rad / 2) ** 2;
    return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
  }
}
