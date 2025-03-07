import { Component, OnInit } from '@angular/core';
import { AddressesService } from './addresses.service';
import { AuthService } from '../../../../Admin/auth/Services/auth-service.service';
import { ToastService } from '../../../../Services/toast-service.service';

@Component({
  selector: 'app-addresses',
  standalone: false,
  templateUrl: './addresses.component.html',
  styleUrl: './addresses.component.css'
})
export class AddressesComponent implements OnInit {
  addresses: any[] = [];
  isDialogVisible = false;
  isDeleteDialogVisible = false;
  dialogTitle = 'Add Address';
  isEditMode = false;
  selectedAddress: any = null;
  userId: string | null = null;
  addressToDeleteId: string | null = null;

  constructor(
    private addressService: AddressesService,
    private authService: AuthService,
    private toastService: ToastService
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
    this.addressService.getAddresses(this.userId).subscribe({
      next: (data) => {
        this.addresses = data;
      },
      error: () => this.toastService.error('Error', 'Failed to load addresses'),
    });
  }

  openAddDialog(): void {
    this.isEditMode = false;
    this.dialogTitle = 'Add New Address';
    this.selectedAddress = null;
    this.isDialogVisible = true;
  }

  openEditDialog(address: any): void {
    this.isEditMode = true;
    this.dialogTitle = 'Edit Address';
    this.selectedAddress = { ...address };
    this.isDialogVisible = true;
  }

  handleAddressSave(address: any): void {
    if (!this.userId) return;

    if (this.isEditMode && this.selectedAddress?._id) {
      this.addressService.updateAddress(this.selectedAddress._id, address).subscribe({
        next: () => {
          this.toastService.success('Success', 'Address updated successfully!');
          this.loadAddresses();
          this.isDialogVisible = false;
        },
        error: () => this.toastService.error('Error', 'Failed to update address'),
      });
    } else {
      this.addressService.addAddress({ ...address, userId: this.userId }).subscribe({
        next: () => {
          this.toastService.success('Success', 'Address added successfully!');
          this.loadAddresses();
          this.isDialogVisible = false;
        },
        error: () => this.toastService.error('Error', 'Failed to add address'),
      });
    }
  }

  openDeleteDialog(addressId: string): void {
    this.addressToDeleteId = addressId;
    this.isDeleteDialogVisible = true;
  }

  confirmDeleteAddress(): void {
    if (!this.addressToDeleteId) return;

    this.addressService.deleteAddress(this.addressToDeleteId).subscribe({
      next: () => {
        this.toastService.success('Deleted', 'Address removed successfully!');
        this.loadAddresses();
        this.isDeleteDialogVisible = false;
        this.addressToDeleteId = null;
      },
      error: () => this.toastService.error('Error', 'Failed to delete address'),
    });
  }

  handleDialogClose(): void {
    this.isDialogVisible = false;
  }
}
