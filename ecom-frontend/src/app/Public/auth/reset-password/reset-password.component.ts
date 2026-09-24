import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../Admin/auth/Services/auth-service.service';

const matchPasswords = (group: AbstractControl): ValidationErrors | null =>
  group.get('password')?.value === group.get('confirm')?.value ? null : { mismatch: true };

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['../auth.component.css', '../login/login.component.css'],
})
export class ResetPasswordComponent implements OnInit {
  token = '';
  form: FormGroup;
  saving = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {
    this.form = this.fb.group(
      {
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirm: ['', Validators.required],
      },
      { validators: matchPasswords }
    );
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
  }

  submit(): void {
    if (this.form.invalid || this.saving || !this.token) return;
    this.saving = true;
    this.error = '';
    this.authService.resetPassword(this.token, this.form.value.password).subscribe({
      next: () => this.router.navigate(['/public/auth']),
      error: (err) => {
        this.saving = false;
        this.error = err.message;
      },
    });
  }
}
