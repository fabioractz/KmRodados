import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-more',
  templateUrl: './more.page.html',
  styleUrls: ['./more.page.scss'],
  standalone: false
})
export class MorePage {

  constructor(
    private router: Router
  ) {}

  abrirConfiguracoes() {
    this.router.navigate(['/tabs/settings']);
  }

  abrirDespesas() {
    this.router.navigate(['/tabs/expenses']);
  }

  abrirReceitas() {
    this.router.navigate(['/tabs/income']);
  }
}
