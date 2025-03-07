import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-address-form',
  standalone: false,
  
  templateUrl: './address-form.component.html',
  styleUrl: './address-form.component.css'
})
export class AddressFormComponent implements OnChanges {
  @Input() isDialogVisible: boolean = false;
  @Input() dialogTitle: string = 'Add Address';
  @Input() addressData: any;
  @Output() onSave = new EventEmitter<any>();
  @Output() onClose = new EventEmitter<void>();

  addressForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.addressForm = this.fb.group({
      fullName: ['', Validators.required],
      mobile: [
        '',
        [
          Validators.required,
          Validators.pattern(/^[6-9]\d{9}$/)
        ]
      ],
      postalCode: [
        '',
        [
          Validators.required,
          Validators.pattern(/^\d{6}$/)
        ]
      ],
      state: ['', Validators.required],
      street: ['', Validators.required],
      city: ['', Validators.required],
      type: ['Home', Validators.required]
    });
  }

  ngOnChanges(): void {
    if (this.addressData) {
      this.addressForm.patchValue({ ...this.addressData });
    } else {
      this.addressForm.reset();
      this.addressForm.patchValue({ type: 'Home' });
    }
  }

  onSubmit(): void {
    if (this.addressForm.valid) {
      this.onSave.emit(this.addressForm.value);
    }
  }

  closeDialog(): void {
    this.onClose.emit();
  }

  restrictToNumbers(event: any, maxLength: number): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^0-9]/g, '');
    if (input.value.length > maxLength) {
      input.value = input.value.slice(0, maxLength);
    }
    this.addressForm.get(input.getAttribute('formControlName')!)?.setValue(input.value);
  }
}