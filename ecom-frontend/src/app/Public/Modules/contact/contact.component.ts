import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { StoreInfo, StoreService } from '../../../Services/store.service';
import { AuthService } from '../../../Admin/auth/Services/auth-service.service';
import { UsersService } from '../../../Admin/Modules/users/users.service';

@Component({
  selector: 'app-contact',
  standalone: false,
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css',
})
export class ContactComponent implements OnInit {
  readonly store$: Observable<StoreInfo>;
  readonly subjects = ['Order help', 'Returns & exchanges', 'Product question', 'Payment', 'Feedback', 'Other'];
  form: FormGroup;
  sending = false;
  sent = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    private storeService: StoreService,
    private authService: AuthService,
    private usersService: UsersService
  ) {
    this.store$ = storeService.info$;
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      subject: ['Order help', Validators.required],
      orderId: ['', Validators.maxLength(40)],
      message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(3000)]],
      // Hidden from people; bots fill it in
      website: [''],
    });
  }

  ngOnInit(): void {
    const { id } = this.authService.getUserRoleAndId();
    if (id) {
      this.usersService.getUserById(id).subscribe((user) => this.form.patchValue({ name: user.fullName, email: user.email }));
    }
  }

  cityLine(store: StoreInfo): string {
    return `${[store.city, store.state].filter(Boolean).join(', ')} ${store.pincode || ''}`.trim();
  }

  get needsOrderId(): boolean {
    return ['Order help', 'Returns & exchanges', 'Payment'].includes(this.form.value.subject);
  }

  submit(): void {
    if (this.form.invalid || this.sending) {
      this.form.markAllAsTouched();
      return;
    }
    this.sending = true;
    this.error = '';
    this.storeService.sendContact(this.form.value).subscribe({
      next: () => {
        this.sending = false;
        this.sent = true;
      },
      error: (err) => {
        this.sending = false;
        this.error = err.error?.message || 'Could not send your message. Please try again.';
      },
    });
  }
}
