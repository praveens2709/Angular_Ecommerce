import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../Admin/auth/Services/auth-service.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: '../login/login.component.css',
})
export class ForgotPasswordComponent {
  @Output() backToLogin = new EventEmitter<void>();

  form: FormGroup;
  sent = false;
  sending = false;
  error = '';

  constructor(private fb: FormBuilder, private authService: AuthService) {
    this.form = this.fb.group({ email: ['', [Validators.required, Validators.email]] });
  }

  submit(): void {
    if (this.form.invalid || this.sending) return;
    this.sending = true;
    this.error = '';
    this.authService.forgotPassword(this.form.value.email).subscribe({
      next: () => {
        this.sending = false;
        this.sent = true;
      },
      error: (err) => {
        this.sending = false;
        this.error = err.message;
      },
    });
  }
}
