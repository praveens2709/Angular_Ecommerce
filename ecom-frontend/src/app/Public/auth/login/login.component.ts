import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../Admin/auth/Services/auth-service.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  imports: [CommonModule, ReactiveFormsModule]
})
export class LoginComponent implements OnInit {
  @Output() switchToRegister = new EventEmitter<void>()
  @Output() forgotPassword = new EventEmitter<void>();

  loginForm!: FormGroup;
  error = '';
  submitting = false;

  constructor(
    private fb: FormBuilder, 
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loginFormFunction();
  }

  loginFormFunction() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
    // A new attempt clears the previous server error
    this.loginForm.valueChanges.subscribe(() => (this.error = ''));
  }

  formSubmit(): void {
    if (this.loginForm.invalid || this.submitting) return;
    const { email, password } = this.loginForm.value;
    this.submitting = true;
    this.authService.publicLogin(email, password).subscribe({
      next: () => this.router.navigate(['home']),
      error: (error) => {
        this.submitting = false;
        this.error = error.message;
      },
    });
  }

  goToRegister(): void {
    this.switchToRegister.emit();
  }
}