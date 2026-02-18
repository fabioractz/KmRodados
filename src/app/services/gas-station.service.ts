import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface PostoCombustivel {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

@Injectable({
  providedIn: 'root'
})
export class GasStationService {
  private readonly url_overpass = 'https://overpass-api.de/api/interpreter';
  private readonly raio_metros = 3000;
  private readonly limite_resultados = 10;

  constructor(private http: HttpClient) {}

  obterPostosProximos(latitude: number, longitude: number): Observable<PostoCombustivel[]> {
    const consulta = `[out:json][timeout:25];node["amenity"="fuel"](around:${this.raio_metros},${latitude},${longitude});out body ${this.limite_resultados};`;
    const parametros = new HttpParams().set('data', consulta);

    return this.http
      .get<{ elements?: any[] }>(this.url_overpass, { params: parametros })
      .pipe(map(resposta => this.mapearResposta(resposta)));
  }

  getNearbyStations(latitude: number, longitude: number): Observable<PostoCombustivel[]> {
    return this.obterPostosProximos(latitude, longitude);
  }

  private mapearResposta(resposta: { elements?: any[] } | null | undefined): PostoCombustivel[] {
    if (!resposta || !Array.isArray(resposta.elements)) {
      return [];
    }

    const postos = resposta.elements
      .filter(elemento => elemento && elemento.type === 'node')
      .map(elemento => {
        const etiquetas = elemento.tags || {};

        const partes_endereco_simples: string[] = [];
        if (etiquetas['addr:street']) {
          partes_endereco_simples.push(etiquetas['addr:street']);
        }
        if (etiquetas['addr:housenumber']) {
          partes_endereco_simples.push(etiquetas['addr:housenumber']);
        }

        const endereco = partes_endereco_simples.join(', ');
        const nome = etiquetas.name || 'Posto sem nome';

        return {
          name: nome,
          address: endereco,
          lat: elemento.lat,
          lng: elemento.lon
        } as PostoCombustivel;
      });

    return postos.slice(0, this.limite_resultados);
  }
}
