import { Injectable, inject } from '@angular/core';
import { Platform } from '@ionic/angular';
import { AdMob, AdOptions, InterstitialAdPluginEvents } from '@capacitor-community/admob';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdsService {
  private isInitialized = false;
  private isPreloaded = false;
  private listenersReady = false;
  private platform = inject(Platform);
  private adsEnabled = (environment as any).ads?.enabled ?? true;
  private testMode = (environment as any).ads?.testMode ?? !environment.production;
  private ultimo_erro_carregamento: string | null = null;
  private falhas_consecutivas = 0;
  private modo_diagnostico = false;
  private diagnostico_ate = 0;
  private ultimo_anuncio_exibido_ms = 0;
  private readonly intervalo_minimo_entre_anuncios_ms = 60000;

  private readonly iosAppId = 'ca-app-pub-1236052583132522~4949483732';
  private readonly androidAppId = 'ca-app-pub-1236052583132522~1313491055';
  private readonly iosInterstitialUnit = 'ca-app-pub-1236052583132522/1414387819';
  private readonly androidInterstitialUnit = 'ca-app-pub-1236052583132522/5060222420';
  private readonly iosTestInterstitialUnit = 'ca-app-pub-3940256099942544/5135589807';
  private readonly androidTestInterstitialUnit = 'ca-app-pub-3940256099942544/1033173712';

  private emTeste(): boolean {
    return this.testMode || (this.modo_diagnostico && Date.now() < this.diagnostico_ate);
  }

  async init() {
    if (this.isInitialized) return;
    try {
      try {
        if (this.platform.is('ios')) {
          // Solicitar autorização de rastreamento no iOS (quando disponível)
          // Não falha se a API não existir na versão do plugin
          // @ts-ignore
          await (AdMob as any).trackingAuthorizationStatus?.();
          // @ts-ignore
          await (AdMob as any).requestTrackingAuthorization?.();
        }
      } catch {}
      await AdMob.initialize();
      this.isInitialized = true;
      this.registerListeners();
    } catch {
      this.isInitialized = false;
    }
  }

  // Code-only configuration: adsEnabled and testMode are taken from environment

  private getInterstitialId(): string {
    if (this.emTeste()) {
      return this.platform.is('ios') ? this.iosTestInterstitialUnit : this.androidTestInterstitialUnit;
    }
    return this.platform.is('ios') ? this.iosInterstitialUnit : this.androidInterstitialUnit;
  }

  private registerListeners() {
    if (this.listenersReady) return;
    try {
      AdMob.addListener(InterstitialAdPluginEvents.Loaded, () => {
        this.isPreloaded = true;
        this.ultimo_erro_carregamento = null;
        this.falhas_consecutivas = 0;
      });
      AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, (info: any) => {
        this.isPreloaded = false;
        const msg = (info && (info.message || info.code || info.error)) ? String(info.message || info.code || info.error) : 'failed';
        this.ultimo_erro_carregamento = msg;
        this.falhas_consecutivas++;
      });
      AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
        this.isPreloaded = false;
      });
      this.listenersReady = true;
    } catch {
      // ignore listener setup failures
    }
  }

  private async waitForInterstitialLoaded(timeoutMs = 12000): Promise<boolean> {
    if (this.isPreloaded) return true;
    return new Promise<boolean>((resolve) => {
      const start = Date.now();
      const tick = () => {
        if (this.isPreloaded) return resolve(true);
        if (Date.now() - start >= timeoutMs) return resolve(false);
        setTimeout(tick, 100);
      };
      tick();
    });
  }

  private async waitForLoadOnce(timeoutMs = 20000): Promise<'loaded' | 'failed' | 'timeout'> {
    return new Promise(async (resolve) => {
      let resolved = false;
      let l1: any;
      let l2: any;
      const cleanup = async () => {
        try { (await l1)?.remove?.(); } catch {}
        try { (await l2)?.remove?.(); } catch {}
      };
      l1 = AdMob.addListener(InterstitialAdPluginEvents.Loaded, async () => {
        if (!resolved) {
          resolved = true;
          this.isPreloaded = true;
          await cleanup();
          resolve('loaded');
        }
      });
      l2 = AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, async (info: any) => {
        if (!resolved) {
          resolved = true;
          this.isPreloaded = false;
          const msg = (info && (info.message || info.code || info.error)) ? String(info.message || info.code || info.error) : 'failed';
          this.ultimo_erro_carregamento = msg;
          await cleanup();
          resolve('failed');
        }
      });
      setTimeout(async () => {
        if (!resolved) {
          resolved = true;
          await cleanup();
          resolve('timeout');
        }
      }, timeoutMs);
    });
  }

  private async prepareAndAwaitLoaded(timeoutMs = 20000): Promise<'loaded' | 'failed' | 'timeout'> {
    try {
      const options: AdOptions = {
        adId: this.getInterstitialId(),
        isTesting: this.emTeste()
      };
      this.isPreloaded = false;
      this.ultimo_erro_carregamento = null;
      await AdMob.prepareInterstitial(options);
      const status = await this.waitForLoadOnce(timeoutMs);
      if (status === 'loaded') {
        await new Promise(r => setTimeout(r, 700));
      }
      if (status === 'loaded') {
        this.falhas_consecutivas = 0;
      } else {
        this.falhas_consecutivas++;
        if (!this.testMode && this.falhas_consecutivas >= 2) {
          this.modo_diagnostico = true;
          this.diagnostico_ate = Date.now() + 5 * 60 * 1000;
        }
      }
      return status;
    } catch {
      this.ultimo_erro_carregamento = 'exception_prepare';
      this.falhas_consecutivas++;
      if (!this.testMode && this.falhas_consecutivas >= 2) {
        this.modo_diagnostico = true;
        this.diagnostico_ate = Date.now() + 5 * 60 * 1000;
      }
      return 'failed';
    }
  }

  async preloadInterstitial() {
    if (!this.adsEnabled) return;
    if (!this.isInitialized) {
      await this.init();
    }
    this.registerListeners();
    try {
      const options: AdOptions = {
        adId: this.getInterstitialId(),
        isTesting: this.emTeste()
      };
      await AdMob.prepareInterstitial(options);
      const status = await this.waitForLoadOnce(15000);
      this.isPreloaded = status === 'loaded';
      this.ultimo_erro_carregamento = status === 'loaded' ? null : status;
      if (status === 'loaded') {
        this.falhas_consecutivas = 0;
      } else {
        this.falhas_consecutivas++;
        if (!this.testMode && this.falhas_consecutivas >= 2) {
          this.modo_diagnostico = true;
          this.diagnostico_ate = Date.now() + 5 * 60 * 1000;
        }
      }
    } catch {
      this.isPreloaded = false;
      this.ultimo_erro_carregamento = 'exception_preload';
      this.falhas_consecutivas++;
      if (!this.testMode && this.falhas_consecutivas >= 2) {
        this.modo_diagnostico = true;
        this.diagnostico_ate = Date.now() + 5 * 60 * 1000;
      }
    }
  }

  async showInterstitialIfAvailable() {
    if (!this.adsEnabled) return;
    const agora = Date.now();
    if (this.ultimo_anuncio_exibido_ms && (agora - this.ultimo_anuncio_exibido_ms) < this.intervalo_minimo_entre_anuncios_ms) {
      return;
    }
    if (!this.isInitialized) {
      await this.init();
    }
    if (!this.isPreloaded) {
      await this.preloadInterstitial();
    }
    try {
      await AdMob.showInterstitial();
      this.ultimo_anuncio_exibido_ms = Date.now();
    } catch {
    } finally {
      this.isPreloaded = false;
      this.preloadInterstitial();
    }
  }

  async showInterstitialWithResult(): Promise<{ ok: boolean; shown: boolean; reason?: string; error?: string }> {
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).onLine === false) {
        return { ok: false, shown: false, reason: 'offline', error: 'device_offline' };
      }
    } catch {}
    if (!this.adsEnabled) {
      return { ok: false, shown: false, reason: 'disabled' };
    }
    const agora = Date.now();
    if (this.ultimo_anuncio_exibido_ms && (agora - this.ultimo_anuncio_exibido_ms) < this.intervalo_minimo_entre_anuncios_ms) {
      return { ok: false, shown: false, reason: 'throttled', error: 'min_interval_not_reached' };
    }
    if (!this.isInitialized) {
      await this.init();
    }
    this.registerListeners();
    for (let attempt = 1; attempt <= 3; attempt++) {
      let ready = this.isPreloaded;
      let status: 'loaded' | 'failed' | 'timeout' = 'failed';
      if (!ready) {
        status = await this.prepareAndAwaitLoaded(attempt === 1 ? 20000 : attempt === 2 ? 24000 : 28000);
        ready = status === 'loaded';
      }
      if (!ready) {
        if (attempt === 3) {
          if (!this.emTeste() && this.ultimo_erro_carregamento === 'exception_prepare') {
            try {
              const optionsTeste: AdOptions = {
                adId: this.platform.is('ios') ? this.iosTestInterstitialUnit : this.androidTestInterstitialUnit,
                isTesting: true
              };
              this.isPreloaded = false;
              await AdMob.prepareInterstitial(optionsTeste);
              const statusTeste = await this.waitForLoadOnce(15000);
              if (statusTeste === 'loaded') {
                await AdMob.showInterstitial();
                this.modo_diagnostico = true;
                this.diagnostico_ate = Date.now() + 5 * 60 * 1000;
                return { ok: true, shown: true };
              }
              return { ok: false, shown: false, reason: 'failed_load', error: 'fallback_test_failed' };
            } catch {
              return { ok: false, shown: false, reason: 'failed_load', error: 'fallback_test_exception' };
            }
          }
          return { ok: false, shown: false, reason: status === 'timeout' ? 'timeout' : 'failed_load', error: this.ultimo_erro_carregamento || status };
        }
        await new Promise(r => setTimeout(r, attempt * 2000));
        continue;
      }
      try {
        await AdMob.showInterstitial();
        this.ultimo_anuncio_exibido_ms = Date.now();
        return { ok: true, shown: true };
      } catch (e: any) {
        const msg = e?.message ? String(e.message) : 'unknown_error';
        if (attempt < 3 && /ready/i.test(msg)) {
          // espera e tenta novamente
          await new Promise(r => setTimeout(r, attempt * 1500));
          this.isPreloaded = false;
          continue;
        }
        return { ok: false, shown: false, reason: 'show_failed', error: msg };
      } finally {
        this.isPreloaded = false;
        this.preloadInterstitial();
      }
    }
    return { ok: false, shown: false, reason: 'unknown' };
  }

  public obterDiagnostico(): { adId: string; testMode: boolean; plataforma: 'ios' | 'android' | 'web'; ultimoErro?: string; diagnosticoAtivo: boolean } {
    const adId = this.getInterstitialId();
    const plataforma: 'ios' | 'android' | 'web' = this.platform.is('ios') ? 'ios' : this.platform.is('android') ? 'android' : 'web';
    const diagnosticoAtivo = this.modo_diagnostico && Date.now() < this.diagnostico_ate;
    return { adId, testMode: this.emTeste(), plataforma, ultimoErro: this.ultimo_erro_carregamento || undefined, diagnosticoAtivo };
  }
}
