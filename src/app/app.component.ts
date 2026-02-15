import { Component } from '@angular/core';
import { addIcons } from 'ionicons';
import { AdsService } from './services/ads.service';
import { App } from '@capacitor/app';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor(private ads: AdsService) {
    addIcons({
      'truck-outline': 'assets/icon/truck-outline.svg',
      'truck-heavy': 'assets/icon/truck-heavy.svg',
      'moto-custom': 'assets/icon/moto-custom.svg'
    });
    this.checkDarkMode();
    this.checkColor();
    this.ads.init();
    this.ads.preloadInterstitial();
    try {
      App.addListener('appStateChange', (state: any) => {
        if (state?.isActive) {
          this.ads.preloadInterstitial();
        }
      });
    } catch {}
  }

  checkColor() {
    const storedColor = localStorage.getItem('primaryColor');
    const storedContrast = localStorage.getItem('primaryColorContrast');
    const storedShade = localStorage.getItem('primaryColorShade');
    const storedTint = localStorage.getItem('primaryColorTint');

    const setProperty = (name: string, value: string) => {
      document.documentElement.style.setProperty(name, value);
      document.body.style.setProperty(name, value);
    };

    if (storedColor) {
      setProperty('--ion-color-primary', storedColor);
    }
    if (storedContrast) {
      setProperty('--ion-color-primary-contrast', storedContrast);
    }
    if (storedShade) {
      setProperty('--ion-color-primary-shade', storedShade);
    }
    if (storedTint) {
      setProperty('--ion-color-primary-tint', storedTint);
    }
  }

  checkDarkMode() {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    const storedThemeMode = localStorage.getItem('themeMode');
    const oldStoredTheme = localStorage.getItem('darkMode');

    const applySystem = () => {
      document.body.classList.remove('light');
      if (prefersDark.matches) {
        document.body.classList.add('dark');
      } else {
        document.body.classList.remove('dark');
      }
    };

    if (storedThemeMode === 'dark') {
      document.body.classList.add('dark');
      document.body.classList.remove('light');
    } else if (storedThemeMode === 'light') {
      document.body.classList.remove('dark');
      document.body.classList.add('light');
    } else if (storedThemeMode === 'system') {
      applySystem();
    } else if (oldStoredTheme === 'true') {
      // Legacy support
      document.body.classList.add('dark');
    } else if (oldStoredTheme === 'false') {
      // Legacy support
      document.body.classList.remove('dark');
      document.body.classList.add('light');
    } else {
      // Default to system
      applySystem();
    }

    // Listen for system changes if in system mode
    prefersDark.addEventListener('change', (mediaQuery) => {
      const currentMode = localStorage.getItem('themeMode') || 'system';
      if (currentMode === 'system') {
        document.body.classList.remove('light');
        if (mediaQuery.matches) {
          document.body.classList.add('dark');
        } else {
          document.body.classList.remove('dark');
        }
      }
    });
  }

  // No external control paths; ad behavior is code-only via environment flags
}
