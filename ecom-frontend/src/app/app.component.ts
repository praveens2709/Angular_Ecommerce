import { Component } from '@angular/core';
import { AccountCacheReset } from './Services/account-cache-reset';
import { ScrollManager } from './Services/scroll-manager';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: false,
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Ecom';

  // Injected once so they start listening (sign-out, navigation scroll)
  constructor(_cacheReset: AccountCacheReset, _scroll: ScrollManager) {}
}
