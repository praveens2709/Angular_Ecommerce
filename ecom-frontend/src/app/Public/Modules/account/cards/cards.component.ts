import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CardsService } from './cards.service';
import { AuthService } from '../../../../Admin/auth/Services/auth-service.service';

@Component({
  selector: 'app-cards',
  standalone: false,
  templateUrl: './cards.component.html',
  styleUrl: './cards.component.css'
})
export class CardsComponent implements OnInit {
  cards: any[] = [];
  isDialogVisible = false;
  isDeleteDialogVisible = false;
  dialogTitle = 'Add Card';
  cardForm: FormGroup;
  editingCardId: string | null = null;
  userId: string | null = null;
  cardToDeleteId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private cardsService: CardsService,
    private authService: AuthService
  ) {
    this.cardForm = this.fb.group({
      cardHolderName: ['', Validators.required],
      cardNumber: [
        '',
        [Validators.required, Validators.pattern(/^\d{16}$/)],
      ],
      expiryMonth: [
        '',
        [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])$/)],
      ],
      expiryYear: [
        '',
        [Validators.required, Validators.pattern(/^\d{2}$/)],
      ],
      cardType: ['', Validators.required],
    });
  }

  restrictToNumbers(event: any, maxLength: number): void {
    const input = event.target;
    input.value = input.value.replace(/\D/g, '');
    if (input.value.length > maxLength) {
      input.value = input.value.slice(0, maxLength);
    }
    const controlName = input.getAttribute('formControlName');
    this.cardForm.controls[controlName].setValue(input.value);
  }

  ngOnInit(): void {
    const userData = this.authService.getUserRoleAndId();
    this.userId = userData.id;
    if (this.userId) {
      this.loadCards();
    }
  }

  loadCards() {
    if (!this.userId) return;
    this.cardsService.getCards(this.userId).subscribe({
      next: (data) => {
        this.cards = data;
      },
      error: (error) => {
        console.error('Error fetching cards:', error);
      },
    });
  }

  onSubmit() {
    if (this.cardForm.valid) {
      const formValue = { ...this.cardForm.value, userId: this.userId };

      if (this.editingCardId) {
        this.cardsService.updateCard(this.editingCardId, formValue).subscribe({
          next: () => {
            this.loadCards();
            this.isDialogVisible = false;
          },
          error: (error) => {
            console.error('Error updating card:', error);
          },
        });
      } else {
        this.cardsService.addCard(formValue).subscribe({
          next: () => {
            this.loadCards();
            this.isDialogVisible = false;
          },
          error: (error) => {
            console.error('Error adding card:', error);
          },
        });
      }
    } else {
      console.warn('Form validation failed');
    }
  }

  openAddCardDialog(): void {
    this.dialogTitle = 'Add Card';
    this.isDialogVisible = true;
    this.editingCardId = null;
    this.cardForm.reset();
  }

  openEditCardDialog(card: any): void {
    this.dialogTitle = 'Edit Card Details';
    this.isDialogVisible = true;
    this.editingCardId = card._id;

    this.cardForm.patchValue({
      cardHolderName: card.cardHolderName,
      cardNumber: card.cardNumber,
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
      cardType: card.cardType,
    });
  }

  openDeleteDialog(cardId: string): void {
    this.cardToDeleteId = cardId;
    this.isDeleteDialogVisible = true;
  }

  confirmDeleteCard(): void {
    if (!this.cardToDeleteId) {
      return;
    }
    this.cardsService.deleteCard(this.cardToDeleteId).subscribe({
      next: () => {
        this.loadCards();
        this.isDeleteDialogVisible = false;
        this.cardToDeleteId = null;
      },
      error: (err) => console.error('Error deleting card', err),
    });
  }
}
