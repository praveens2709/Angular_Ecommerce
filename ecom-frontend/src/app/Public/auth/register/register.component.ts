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
  }

  formSubmit(): void {
    if (this.registerForm.valid) {
      const { firstName, lastName, email, password, mobile, gender } = this.registerForm.value;
  
      console.log('🔹 Registration Attempt:', { firstName, lastName, email, password, mobile, gender });
  
      this.authService.register(firstName, lastName, email, password, mobile, gender).subscribe({
        next: () => {
          console.log('Registration Successful for:', email);
          this.router.navigate(['home']);
        },
        error: (error) => {
          console.error('Registration failed:', error);
        }
      });
    } else {
      console.warn('Registration form is invalid:', this.registerForm.value);
    }
  }  

  goToLogin(): void {
    this.switchToLogin.emit();
  }
}