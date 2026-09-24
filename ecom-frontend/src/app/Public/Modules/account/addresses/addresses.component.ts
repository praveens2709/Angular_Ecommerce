import { Component, OnInit } from '@angular/core';
import { AddressesService } from './addresses.service';
import { AuthService } from '../../../../Admin/auth/Services/auth-service.service';

@Component({
  selector: 'app-addresses',
  standalone: false,
  templateUrl: './addresses.component.html',
  styleUrl: './addresses.component.css'
})
export class AddressesComponent implements OnInit {
  addresses: any[] = [];
  /** True only until the first response when nothing is remembered yet */
  loading = false;
  isDialogVisible = false;
  isDeleteDialogVisible = false;
  dialogTitle = 'Add Address';
  isEditMode = false;
  selectedAddress: any = null;
  userId: string | null = null;
  addressToDeleteId: string | null = null;

  constructor(
    private addressService: AddressesService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const userData = this.authService.getUserRoleAndId();
    this.userId = userData.id;
    if (this.userId) {
      this.loadAddresses();
    }
  }

  loadAddresses(): void {
    if (!this.userId) return;
    const cached = this.addressService.lists.peek(this.userId);
    if (cached) this.addresses = cached;
    this.loading = !cached;
    this.addressService.getAddresses(this.userId).subscribe({
      next: (data) => {
        this.addresses = data;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }


  saveError = '';
  deleteError = '';

  openAddDialog(): void {
    this.isEditMode = false;
    this.saveError = '';
    this.dialogTitle = 'Add New Address';
    this.selectedAddress = null;
    this.isDialogVisible = true;
  }

  openEditDialog(address: any): void {
    this.isEditMode = true;
    this.saveError = '';
    this.dialogTitle = 'Edit Address';
    this.selectedAddress = { ...address };
    this.isDialogVisible = true;
  }

  handleAddressSave(address: any): void {
    if (!this.userId) return;

    if (this.isEditMode && this.selectedAddress?._id) {
      this.addressService.updateAddress(this.selectedAddress._id, address).subscribe({
        next: () => {
          this.loadAddresses();
          this.isDialogVisible = false;
        },
        error: (err) => (this.saveError = err.message),
      });
    } else {
      this.addressService.addAddress(address).subscribe({
        next: () => {
          this.loadAddresses();
          this.isDialogVisible = false;
        },
        error: (err) => (this.saveError = err.message),
      });
    }
  }

  openDeleteDialog(addressId: string): void {
    this.addressToDeleteId = addressId;
    this.deleteError = '';
    this.isDeleteDialogVisible = true;
  }

  confirmDeleteAddress(): void {
    if (!this.addressToDeleteId) return;

    this.addressService.deleteAddress(this.addressToDeleteId).subscribe({
      next: () => {
        this.loadAddresses();
        this.isDeleteDialogVisible = false;
        this.addressToDeleteId = null;
      },
      error: (err) => (this.deleteError = err.message),
    });
  }

  handleDialogClose(): void {
    this.isDialogVisible = false;
  }
}
