import { Component, OnInit } from '@angular/core';
import { UsersService } from '../../../../Admin/Modules/users/users.service';
import { Router } from '@angular/router';
import { AuthService } from '../../../../Admin/auth/Services/auth-service.service';

@Component({
  selector: 'app-profile-details',
  standalone: false,
  templateUrl: './profile-details.component.html',
  styleUrl: './profile-details.component.css'
})
export class ProfileDetailsComponent implements OnInit {
  user: any = null;
  
  constructor(private usersService: UsersService, private authService: AuthService) {}

  ngOnInit(): void {
    const userData = this.authService.getUserRoleAndId();
    const userId = userData.id;

    if (userId) {
      this.usersService.getUserById(userId).subscribe((user) => {
        this.user = user;
      });
    }
  }
}
