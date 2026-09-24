import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StoreService } from '../../../Services/store.service';

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
  pincodeHint = '';
  pincodeInvalid = false;

  constructor(private fb: FormBuilder, private storeService: StoreService) {
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

  /** Fills city/state from India Post when a full pincode is typed */
  private onPincode(pincode: string): void {
    this.pincodeHint = '';
    this.pincodeInvalid = false;
    if (!/^[1-9]\d{5}$/.test(pincode)) return;
    this.storeService.checkPincode(pincode).subscribe((result) => {
      if (this.addressForm.value.postalCode !== pincode) return; // user kept typing
      if (!result.valid) {
        this.pincodeInvalid = true;
        this.pincodeHint = result.message || "We couldn't find this pincode";
        return;
      }
      if (result.city && result.state) {
        this.addressForm.patchValue({
          city: this.addressForm.value.city || result.city,
          state: result.state,
        });
        this.pincodeHint = result.deliverable ? `${result.city}, ${result.state}` : result.message || "We don't deliver here yet";
        this.pincodeInvalid = !result.deliverable;
      }
    });
  }

  onSubmit(): void {
    if (this.pincodeInvalid) return;
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
    const name = input.getAttribute('formControlName')!;
    this.addressForm.get(name)?.setValue(input.value);
    if (name === 'postalCode') this.onPincode(input.value);
  }
}