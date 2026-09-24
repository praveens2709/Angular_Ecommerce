import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UsersService } from '../../../../Admin/Modules/users/users.service';
import { AuthService } from '../../../../Admin/auth/Services/auth-service.service';

@Component({
  selector: 'app-edit-profile',
  standalone: false,
  templateUrl: './edit-profile.component.html',
  styleUrl: './edit-profile.component.css'
})
export class EditProfileComponent implements OnInit {
  profileForm!: FormGroup;
  user: any = {};
  initialFormValue: any = {};
  userId: string | null = null;
  isDialogVisible: boolean = false;
  editingMobile = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private usersService: UsersService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const userData = this.authService.getUserRoleAndId();
    this.userId = userData.id;

    this.initializeForm();

    if (this.userId) {
      this.loadUserData();
    } else {
      console.warn('No user logged in. Displaying default content.');
    }
  }

  initializeForm(): void {
    this.profileForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      birthday: [''],
      gender: [''],
      mobile: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]]
    });
  }

  loadUserData(): void {
    const cached = this.usersService.profiles.peek(this.userId);
    if (cached) this.applyUser(cached);
    this.usersService.getUserById(this.userId!).subscribe((user) => {
      // Don't overwrite what the shopper has already started editing
      if (user && (!cached || !this.hasFormChanged())) this.applyUser(user);
    });
  }

  private applyUser(user: any): void {
    this.user = user;
    this.profileForm.patchValue({
      ...user,
      birthday: user.dateOfBirth ? new Date(user.dateOfBirth) : null,
    });
    this.initialFormValue = { ...this.profileForm.value };
  }

  hasFormChanged(): boolean {
    return JSON.stringify(this.profileForm.getRawValue()) !== JSON.stringify(this.initialFormValue);
  }

  selectGender(gender: string): void {
    this.profileForm.get('gender')?.setValue(gender);
  }

  saveError = '';

  showSaveDialog(): void {
    this.saveError = '';
    this.isDialogVisible = true;
  }

  confirmSave(): void {
    if (this.profileForm.valid) {
      const { birthday, ...rest } = this.profileForm.value;
      this.usersService.editUser(this.userId!, { ...rest, dateOfBirth: birthday || null }).subscribe({
        next: () => {
          this.initialFormValue = { ...this.profileForm.value };
          this.isDialogVisible = false;
          this.router.navigate(['account/profile']);
        },
        // e.g. the email or mobile is already used by another account
        error: (err) => (this.saveError = err.message),
      });
    }
  }

  handleBackToProfileClick(): void {
    this.router.navigate(['account/profile']);
  }
}
