import { Component, OnInit } from '@angular/core';
import { CartService } from '../cart/cart.service';
import { AddressesService } from '../account/addresses/addresses.service';
import { AuthService } from '../../../Admin/auth/Services/auth-service.service';

@Component({
  selector: 'app-address',
  standalone: false,
  templateUrl: './address.component.html',
  styleUrl: './address.component.css',
})
export class AddressComponent implements OnInit {
  addresses: any[] = [];
  selectedAddress: string | null = null;
  isDialogVisible = false;
  dialogTitle = 'Add Address';
  isEditMode = false;
  selectedAddressData: any = null;
  priceDetails: any = {};
  userId: string | null = null;

  constructor(
    private addressService: AddressesService,
    private cartService: CartService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const userData = this.authService.getUserRoleAndId();
    this.userId = userData.id;

    if (this.userId) {
      this.loadAddresses();
    }

    this.cartService.getPriceDetails().subscribe((details) => {
      this.priceDetails = details;
    });
  }

  loadAddresses(): void {
    if (!this.userId) return;

    this.addressService.getAddresses(this.userId).subscribe({
      next: (data) => {
        this.addresses = data;
        if (this.addresses.length > 0) {
          this.selectedAddress = this.addresses[0]._id;
        }
      },
      error: (err) => console.error('Error fetching addresses:', err),
    });
  }

  openAddDialog(): void {
    this.isEditMode = false;
    this.dialogTitle = 'Add New Address';
    this.selectedAddressData = null;
    this.isDialogVisible = true;
  }

  openEditDialog(address: any): void {
    console.log('Editing Address:', address);
    this.isEditMode = true;
    this.dialogTitle = 'Edit Address';
    this.selectedAddressData = { ...address };
    this.isDialogVisible = true;
  }

  handleAddressSave(address: any): void {
    if (!this.userId) return;

    if (this.isEditMode && this.selectedAddressData?._id) {
      this.addressService.updateAddress(this.selectedAddressData._id, address).subscribe({
        next: () => {
          this.loadAddresses();
          this.isDialogVisible = false;
        },
        error: (err) => console.error('Error updating address:', err),
      });
    } else {
      this.addressService.addAddress({ ...address, userId: this.userId }).subscribe({
        next: () => {
          this.loadAddresses();
          this.isDialogVisible = false;
        },
        error: (err) => console.error('Error adding address:', err),
      });
    }
  }

  removeAddress(id: string): void {
    this.addressService.deleteAddress(id).subscribe({
      next: () => this.loadAddresses(),
      error: (err) => console.error('Error deleting address:', err),
    });
  }

  handleDialogClose(): void {
    this.isDialogVisible = false;
  }
}
