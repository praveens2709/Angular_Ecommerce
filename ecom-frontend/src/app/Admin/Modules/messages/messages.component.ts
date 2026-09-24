import { Component, OnInit } from '@angular/core';
import { StoreService } from '../../../Services/store.service';

/** Contact-form messages from shoppers */
@Component({
  selector: 'app-messages',
  standalone: false,
  templateUrl: './messages.component.html',
  styleUrl: './messages.component.css',
})
export class MessagesComponent implements OnInit {
  messages: any[] = [];
  unread = 0;
  filter: '' | 'New' | 'Resolved' = 'New';
  loading = true;
  expanded: string | null = null;

  constructor(private storeService: StoreService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.storeService.listMessages(this.filter || undefined).subscribe({
      next: (res) => {
        this.messages = res.items;
        this.unread = res.unread;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  setFilter(filter: '' | 'New' | 'Resolved'): void {
    this.filter = filter;
    this.load();
  }

  toggle(message: any): void {
    this.expanded = this.expanded === message._id ? null : message._id;
  }

  rowError: { id: string; message: string } | null = null;

  setStatus(message: any, status: 'New' | 'Resolved'): void {
    this.rowError = null;
    this.storeService.updateMessage(message._id, status).subscribe({
      next: () => this.load(),
      error: (err) => (this.rowError = { id: message._id, message: err.error?.message || 'Could not update. Please try again.' }),
    });
  }

  replyLink(message: any): string {
    const subject = encodeURIComponent(`Re: ${message.subject || 'Your message'}`);
    return `mailto:${message.email}?subject=${subject}`;
  }
}
