import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UsersService } from '../../../../Admin/Modules/users/users.service';
import { AuthService } from '../../../../Admin/auth/Services/auth-service.service';

@Component({
  selector: 'app-overview',
  standalone: false,
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.css'
})
export class OverviewComponent implements OnInit {
  email = '';
  userId: string | null = null;

  overviewOptions = [
    { section: 'orders', icon: 'pi-box', title: 'Orders', description: 'Track, cancel or return your orders' },
    { section: 'wishlist', icon: 'pi-heart', title: 'Wishlist', description: 'Products you saved for later' },
    { section: 'addresses', icon: 'pi-map-marker', title: 'Addresses', description: 'Save addresses for a faster checkout' },
    { section: 'cards', icon: 'pi-credit-card', title: 'Saved Cards', description: 'Manage your saved cards' },
    { section: 'profile', icon: 'pi-user-edit', title: 'Profile', description: 'Update your name, email and phone' },
    { section: 'contact', icon: 'pi-comments', title: 'Help & Support', description: 'Questions? We are happy to help' },
  ];

  constructor(private router: Router, private usersService: UsersService, private authService: AuthService) {}

  ngOnInit(): void {
    const userData = this.authService.getUserRoleAndId();
    this.userId = userData.id;
    
    if (this.userId) {
      this.email = this.usersService.profiles.peek(this.userId)?.email ?? '';
      this.usersService.getUserById(this.userId).subscribe((user) => {
        if (user) {
          this.email = user.email;
        }
      });
    }
  }

  navigateToSection(section: string): void {
    const routeMapping: { [key: string]: string } = {
      orders: '/account/orders',
      wishlist: '/account/wishlist',
      contact: '/contact',
      addresses: '/account/addresses',
      cards: '/account/cards',
      profile: '/account/profile',
    };

    const route = routeMapping[section];
    if (route) {
      this.router.navigate([route]);
    }
  }
}
