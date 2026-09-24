import { Component, OnInit } from '@angular/core';
import { StoreService } from '../../../Services/store.service';
import { ToastService } from '../../../Services/toast-service.service';

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

  constructor(private storeService: StoreService, private toastService: ToastService) {}

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

  setStatus(message: any, status: 'New' | 'Resolved'): void {
    this.storeService.updateMessage(message._id, status).subscribe({
      next: () => {
        this.toastService.success('Updated', status === 'Resolved' ? 'Marked as resolved' : 'Moved back to new');
        this.load();
      },
    });
  }

  replyLink(message: any): string {
    const subject = encodeURIComponent(`Re: ${message.subject || 'Your message'}`);
    return `mailto:${message.email}?subject=${subject}`;
  }
}
