import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css'],
  standalone: true,
  imports: [CommonModule, LoginComponent, RegisterComponent],
})
export class AuthComponent {
  isLogin = true;

  toggleForm() {
    this.isLogin = !this.isLogin;
  }
}
