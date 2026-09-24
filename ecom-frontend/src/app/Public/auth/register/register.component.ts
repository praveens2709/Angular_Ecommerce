import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../Admin/auth/Services/auth-service.service';
import { CommonModule } from '@angular/common';
import { RadioButtonModule } from 'primeng/radiobutton';

@Component({
  selector: 'app-register',
  standalone: true,
  
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
  imports: [CommonModule, ReactiveFormsModule, RadioButtonModule]
})
export class RegisterComponent implements OnInit {
  @Output() switchToLogin = new EventEmitter<void>();

  registerForm!: FormGroup;
  error = '';
  submitting = false;

  constructor(
    private fb: FormBuilder, 
    private authService: AuthService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.registerFormFunction();
  }

  registerFormFunction() {
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: [''],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      mobile: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      gender: ['', [Validators.required]]
    });
    this.registerForm.valueChanges.subscribe(() => (this.error = ''));
  }

  formSubmit(): void {
    if (this.registerForm.invalid || this.submitting) return;
    const { firstName, lastName, email, password, mobile, gender } = this.registerForm.value;
    this.submitting = true;
    this.authService.register(firstName, lastName, email, password, mobile, gender).subscribe({
      next: () => this.router.navigate(['home']),
      error: (error) => {
        this.submitting = false;
        this.error = error.message;
      },
    });
  }

  goToLogin(): void {
    this.switchToLogin.emit();
  }
}