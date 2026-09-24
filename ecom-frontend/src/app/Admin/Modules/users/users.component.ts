import { Component } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { TableLazyLoadEvent } from 'primeng/table';
import { UsersService } from './users.service';

@Component({
  selector: 'app-users',
  standalone: false,
  templateUrl: './users.component.html',
  styleUrl: './users.component.css'
})

export class UsersComponent {
  users: any[] = [];
  totalRecords = 0;
  rows = 10;
  first = 0;
  loading: boolean = true;

  search = '';
  gender: string | null = null;
  genders = [
    { label: 'Male', value: 'Male' },
    { label: 'Female', value: 'Female' }
  ];
  private search$ = new Subject<void>();

  constructor(private usersService: UsersService) {
    this.search$.pipe(debounceTime(350)).subscribe(() => {
      this.first = 0;
      this.loadUsers();
    });
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.first = event.first ?? 0;
    this.rows = event.rows ?? this.rows;
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    const page = Math.floor(this.first / this.rows) + 1;
    this.usersService.getUsers(page, this.rows, { q: this.search.trim(), gender: this.gender || undefined }).subscribe({
      next: (res) => {
        this.users = res.items;
        this.totalRecords = res.total;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  onSearch(): void {
    this.search$.next();
  }

  onGenderChange(): void {
    this.first = 0;
    this.loadUsers();
  }

  /** Disabled users can't log in or place orders */
  toggleActive(user: any): void {
    const next = user.active === false;
    this.usersService.editUser(user._id, { active: next }).subscribe({
      next: () => (user.active = next),
    });
  }
}
