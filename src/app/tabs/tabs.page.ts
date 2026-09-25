import { Component } from '@angular/core';
import { addIcons } from 'ionicons';
import { homeOutline, speedometerOutline, timeOutline, carOutline, ellipsisHorizontal } from 'ionicons/icons';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: false,
})
export class TabsPage {

  constructor() {
    addIcons({ homeOutline, speedometerOutline, timeOutline, carOutline, ellipsisHorizontal });
  }

}
