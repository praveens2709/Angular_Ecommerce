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
    this.usersService.getUserById(this.userId!).subscribe((user) => {
      if (user) {
        this.user = user;
        this.profileForm.patchValue(user);
        this.initialFormValue = { ...this.profileForm.value };
      }
    });
  }

  hasFormChanged(): boolean {
    return JSON.stringify(this.profileForm.getRawValue()) !== JSON.stringify(this.initialFormValue);
  }

  selectGender(gender: string): void {
    this.profileForm.get('gender')?.setValue(gender);
  }

  showSaveDialog(): void {
    this.isDialogVisible = true;
  }

  confirmSave(): void {
    if (this.profileForm.valid) {
      this.usersService.editUser(this.userId!, this.profileForm.value).subscribe(() => {
        this.initialFormValue = { ...this.profileForm.value };
        this.isDialogVisible = false;
        this.router.navigate(['account/profile']);
      });
    }
  }

  handleBackToProfileClick(): void {
    this.router.navigate(['account/profile']);
  }
}
