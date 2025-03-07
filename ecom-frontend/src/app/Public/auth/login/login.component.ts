import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../Admin/auth/Services/auth-service.service';
import { ToastService } from '../../../Services/toast-service.service';
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

  loginForm!: FormGroup;

  constructor(
    private fb: FormBuilder, 
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService,
  ) { }

  ngOnInit(): void {
    this.loginFormFunction();
  }

  loginFormFunction() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  formSubmit(): void {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
  
      this.authService.publicLogin(email, password).subscribe({
        next: (user) => {
          console.log('Login Successful:', user);
          this.toastService.success('Login Successful', 'Welcome Back');
          this.router.navigate(['home']);
        },
        error: (error) => {
          console.error('Login failed:', error);
          this.toastService.error('Login failed', 'User not found');
        }
      });
    } else {
      console.warn('Login form is invalid:', this.loginForm.value);
    }
  }  

  goToRegister(): void {
    this.switchToRegister.emit();
  }
}