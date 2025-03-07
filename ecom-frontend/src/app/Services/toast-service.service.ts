import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

@Injectable({
  providedIn: 'root'
})
export class ToastService {

  constructor(private toastService: MessageService) { }

  success( summary: string, detail: string ) {
    this.toastService.add({
      severity: 'success',
      summary: summary,
      detail: detail,
      life: 3000,
    });
  }
  error(summary: string, detail: string) {
    this.toastService.add({
      severity: 'error',
      summary: summary,
      detail: detail,
      life: 3000,
    });
  }
}
