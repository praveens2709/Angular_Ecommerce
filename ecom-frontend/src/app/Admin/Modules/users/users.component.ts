import { Component, OnInit, ViewChild } from '@angular/core';
import { Table } from 'primeng/table';
import { UsersService } from './users.service';

@Component({
  selector: 'app-users',
  standalone: false,
  templateUrl: './users.component.html',
  styleUrl: './users.component.css'
})

export class UsersComponent implements OnInit {
  @ViewChild('dt') dt!: Table;

  users: any[] = [];
  genders = [
    { label: 'Male', value: 'Male' },
    { label: 'Female', value: 'Female' }
  ];
  loading: boolean = true;

  constructor(private usersService: UsersService) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers(): void {
    this.usersService.getUsers().subscribe((data) => {
      this.users = data;
      this.loading = false;
    });
  }

  onGlobalFilter(event: Event) {
    const input = event.target as HTMLInputElement;
    this.dt.filterGlobal(input.value, 'contains');
  }
}
