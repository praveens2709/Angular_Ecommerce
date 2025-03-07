import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UsersService } from '../../../Admin/Modules/users/users.service';
import { AuthService } from '../../../Admin/auth/Services/auth-service.service';

@Component({
  selector: 'app-account',
  standalone: false,
  templateUrl: './account.component.html',
  styleUrl: './account.component.css'
})
export class AccountComponent implements OnInit {
  currentRoute: string = '';
  userName: string | null = null;

  constructor(private router: Router, private usersService: UsersService, private authService: AuthService) {}

  ngOnInit(): void {
    this.currentRoute = this.router.url;
    this.router.events.subscribe(() => {
      this.currentRoute = this.router.url;
    });

    const userData = this.authService.getUserRoleAndId();
    if (userData.id) {
      this.usersService.getUserById(userData.id).subscribe((user) => {
        if (user) {
          this.userName = user.fullName || 'User';
        }
      });
    }
  }
}
