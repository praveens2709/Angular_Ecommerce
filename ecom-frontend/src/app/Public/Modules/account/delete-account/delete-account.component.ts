import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UsersService } from '../../../../Admin/Modules/users/users.service';
import { AuthService } from '../../../../Admin/auth/Services/auth-service.service';

@Component({
  selector: 'app-delete-account',
  standalone: false,
  
  templateUrl: './delete-account.component.html',
  styleUrl: './delete-account.component.css'
})
export class DeleteAccountComponent {
  isAgreed: boolean = false;
  isDialogVisible: boolean = false;
  error = '';

  constructor(
    private usersService: UsersService,
    private authService: AuthService,
    private router: Router
  ) {}

  get isLoggedIn(): boolean {
    return this.authService.isUserLoggedIn();
  }

  scrollUp(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  confirmDelete(): void {
    const { id } = this.authService.getUserRoleAndId();
    if (!id) return;
    this.error = '';
    this.usersService.deleteUser(id).subscribe({
      next: () => {
        this.isDialogVisible = false;
        this.authService.clearUserSession();
        this.router.navigate(['/home']);
      },
      error: (err) => (this.error = err.message),
    });
  }
}
