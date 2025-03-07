import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-common-dialog',
  standalone: false,
  
  templateUrl: './common-dialog.component.html',
  styleUrl: './common-dialog.component.css'
})
export class CommonDialogComponent {
  @Input() visible: boolean = false;
  @Input() title: string = 'Confirmation';
  @Input() message: string = 'Are you sure you want to proceed?';
  @Input() confirmButtonText: string = 'Confirm';
  @Input() cancelButtonText: string = 'Cancel';

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  onConfirm() {
    this.confirm.emit();
  }

  onCancel() {
    this.cancel.emit();
    this.closeDialog();
  }

  closeDialog() {
    this.close.emit();
  }
}