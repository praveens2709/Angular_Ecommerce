import { Component } from '@angular/core';

@Component({
  selector: 'app-delete-account',
  standalone: false,
  
  templateUrl: './delete-account.component.html',
  styleUrl: './delete-account.component.css'
})
export class DeleteAccountComponent {
  isAgreed: boolean = false;

  scrollUp(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
