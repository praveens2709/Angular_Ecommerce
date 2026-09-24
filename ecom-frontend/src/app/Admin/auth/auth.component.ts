import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from './Services/auth-service.service';

@Component({
  selector: 'app-auth',
  standalone: false,
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css',
})
export class AuthComponent implements OnInit {
  authForm!: FormGroup;
  isLogin = true;
  error = '';
  submitting = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
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
    this.error = '';
    this.authForm.valueChanges.subscribe(() => (this.error = ''));
  }

  toggleAuth() {
    this.isLogin = !this.isLogin;
    this.initAuthForm(); // Reset form when toggling
  }

  formSubmit(): void {
    if (this.authForm.invalid || this.submitting) return;

    const { name, email, password } = this.authForm.value;
  
    const authMethod = this.isLogin
      ? this.authService.adminLogin(email, password)
      : this.authService.adminRegister(name, email, password);
  
    this.submitting = true;
    authMethod.subscribe({
      next: () => this.router.navigate(['/admin/dashboard']),
      error: (error) => {
        this.submitting = false;
        this.error = error.message;
      },
    });
  }     
  
}