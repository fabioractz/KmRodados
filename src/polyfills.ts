/**
 * This file includes polyfills needed by Angular and is loaded before the app.
 * You can add your own extra polyfills to this file.
 *
 * This file is divided into 2 sections:
 *   1. Browser polyfills. These are applied before loading ZoneJS and are sorted by browsers.
 *   2. Application imports. Files imported after ZoneJS that should be loaded before your main
 *      file.
 *
 * The current setup is for so-called "evergreen" browsers; the last versions of browsers that
 * automatically update themselves. This includes recent versions of Safari, Chrome (including
 * Opera), Edge on the desktop, and iOS and Chrome on mobile.
 *
 * Learn more in https://angular.io/guide/browser-support
 */

if (typeof (globalThis as any) === 'undefined') {
  (window as any).globalThis = window;
}

if (!(Array.prototype as any).flat) {
  Object.defineProperty(Array.prototype, 'flat', {
    configurable: true,
    writable: true,
    value: function (this: any[], depth?: number): any[] {
      const nivel = depth === undefined ? 1 : Number(depth) || 0;
      const resultado: any[] = [];
      (function achatar(arr: any[], d: number) {
        for (const item of arr) {
          if (Array.isArray(item) && d > 0) {
            achatar(item, d - 1);
          } else {
            resultado.push(item);
          }
        }
      })(this, nivel);
      return resultado;
    }
  });
}

import './zone-flags';

/***************************************************************************************************
 * Zone JS is required by default for Angular itself.
 */
import 'zone.js';  // Included with Angular CLI.


/***************************************************************************************************
 * APPLICATION IMPORTS
 */
