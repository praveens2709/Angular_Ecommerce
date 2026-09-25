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
  isDeleteDialogVisible = false;
  dialogTitle = 'Add Address';
  isEditMode = false;
  selectedAddressData: any = null;
  priceDetails: any = {};
  userId: string | null = null;
  addressToDeleteId: string | null = null;

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

  /** False until the first list arrives, so the empty state doesn't flash while loading */
  addressesLoaded = false;

  loadAddresses(): void {
    if (!this.userId) return;

    this.addressService.getAddresses().subscribe({
      next: (data) => {
        this.addresses = data;
        this.addressesLoaded = true;
        // Keep the current choice if it still exists, else default to the first address
        if (!this.addresses.some((a) => a._id === this.selectedAddress)) {
          this.selectedAddress = this.addresses[0]?._id ?? null;
        }
      },
      error: () => (this.addressesLoaded = true),
    });
  }

  saveError = '';
  deleteError = '';

  openAddDialog(): void {
    this.isEditMode = false;
    this.saveError = '';
    this.dialogTitle = 'Add New Address';
    this.selectedAddressData = null;
    this.isDialogVisible = true;
  }

  openEditDialog(address: any): void {
    this.isEditMode = true;
    this.saveError = '';
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

  saveCheckoutAddress(): void {
    this.cartService.checkoutAddress = this.addresses.find((a) => a._id === this.selectedAddress) ?? null;
  }

  handleDialogClose(): void {
    this.isDialogVisible = false;
  }
}
