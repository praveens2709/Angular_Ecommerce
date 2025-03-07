import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from './Services/auth-service.service';
import { ToastService } from '../../Services/toast-service.service';

@Component({
  selector: 'app-auth',
  standalone: false,
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css',
})
export class AuthComponent implements OnInit {
  authForm!: FormGroup;
  isLogin = true;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.initAuthForm();
  }

  initAuthForm() {
    this.authForm = this.fb.group({
      name: [''],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });

    if (this.isLogin) {
      this.authForm.removeControl('name');
    }
  }

  toggleAuth() {
    this.isLogin = !this.isLogin;
    this.initAuthForm(); // Reset form when toggling
  }

  formSubmit(): void {
    if (this.authForm.invalid) {
      console.error('Form is invalid');
      return;
    }
  
    const { name, email, password } = this.authForm.value;
  
    const authMethod = this.isLogin
      ? this.authService.adminLogin(email, password)
      : this.authService.adminRegister(name, email, password);
  
    authMethod.subscribe({
      next: (response) => {
        this.toastService.success(`${this.isLogin ? 'Login' : 'Registration'} Successful`, 'Welcome');
        this.router.navigate(['/admin/dashboard']);    
      },
      error: (error) => {
        console.error(`${this.isLogin ? 'Login' : 'Registration'} failed:`, error.message);
        this.toastService.error(`${this.isLogin ? 'Login' : 'Registration'} failed`, 'Invalid credentials');
      },
    });
  }     
  
}