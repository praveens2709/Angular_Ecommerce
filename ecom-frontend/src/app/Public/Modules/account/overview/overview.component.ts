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
  email: string = 'Guest';
  userId: string | null = null;

  overviewOptions = [
    { section: 'orders', image: './assets/images/orders.png', altText: 'orders', title: 'Orders', description: 'Check your order status' },
    { section: 'addresses', image: './assets/images/address.png', altText: 'addresses', title: 'Addresses', description: 'Save addresses for a hassle-free checkout' },
    { section: 'cards', image: './assets/images/saved-cards.png', altText: 'cards', title: 'Saved Cards', description: 'Save your cards for faster checkout' },
    { section: 'profile', image: './assets/images/profile-details.png', altText: 'profile details', title: 'Profile', description: 'Change your profile details' },
  ];

  constructor(private router: Router, private usersService: UsersService, private authService: AuthService) {}

  ngOnInit(): void {
    const userData = this.authService.getUserRoleAndId();
    this.userId = userData.id;
    
    if (this.userId) {
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
