import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { CardsService } from './cards.service';
import { AuthService } from '../../../../Admin/auth/Services/auth-service.service';

type CardType = 'VISA' | 'MasterCard' | 'RuPay' | 'Amex' | 'Discover';

/** Luhn checksum: catches mistyped card numbers */
export const luhnValidator = (control: AbstractControl): ValidationErrors | null => {
  const digits = String(control.value || '');
  if (!/^\d{13,19}$/.test(digits)) return null; // pattern validator reports length problems
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0 ? null : { luhn: true };
};

export const detectCardType = (digits: string): CardType | null => {
  if (/^4/.test(digits)) return 'VISA';
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(digits)) return 'MasterCard';
  if (/^3[47]/.test(digits)) return 'Amex';
  if (/^(60|65|81|82|508)/.test(digits)) return 'RuPay';
  if (/^(6011|64[4-9])/.test(digits)) return 'Discover';
  return null;
};

@Component({
  selector: 'app-cards',
  standalone: false,
  templateUrl: './cards.component.html',
  styleUrl: './cards.component.css'
})
export class CardsComponent implements OnInit {
  cards: any[] = [];
  /** True only until the first response when nothing is remembered yet */
  loading = false;
  isDialogVisible = false;
  isDeleteDialogVisible = false;
  dialogTitle = 'Add Card';
  cardForm: FormGroup;
  editingCardId: string | null = null;
  editingLast4 = '';
  userId: string | null = null;
  cardToDeleteId: string | null = null;
  readonly cardTypes: CardType[] = ['VISA', 'MasterCard', 'RuPay', 'Amex', 'Discover'];

  constructor(
    private fb: FormBuilder,
    private cardsService: CardsService,
    private authService: AuthService
  ) {
    this.cardForm = this.fb.group({
      cardHolderName: ['', Validators.required],
      cardNumber: ['', [Validators.required, Validators.pattern(/^\d{13,19}$/), luhnValidator]],
      expiryMonth: ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])$/)]],
      expiryYear: ['', [Validators.required, Validators.pattern(/^\d{2}$/)]],
      cardType: ['', Validators.required],
    }, { validators: (group) => this.expiryValidator(group) });
  }

  private expiryValidator(group: AbstractControl): ValidationErrors | null {
    const month = group.get('expiryMonth')?.value;
    const year = group.get('expiryYear')?.value;
    if (!/^(0[1-9]|1[0-2])$/.test(month || '') || !/^\d{2}$/.test(year || '')) return null;
    const firstDayAfterExpiry = new Date(2000 + Number(year), Number(month), 1);
    return firstDayAfterExpiry <= new Date() ? { expired: true } : null;
  }

  cardIcon(type: string): string {
    return type === 'VISA' || type === 'MasterCard' ? `assets/images/${type.toLowerCase()}.png` : 'assets/images/credit-card.png';
  }

  restrictToNumbers(event: any, maxLength: number): void {
    const input = event.target;
    input.value = input.value.replace(/\D/g, '').slice(0, maxLength);
    const controlName = input.getAttribute('formControlName');
    this.cardForm.controls[controlName].setValue(input.value);

    if (controlName === 'cardNumber') {
      const detected = detectCardType(input.value);
      if (detected) this.cardForm.controls['cardType'].setValue(detected);
    }
  }

  ngOnInit(): void {
    const userData = this.authService.getUserRoleAndId();
    this.userId = userData.id;
    if (this.userId) {
      this.loadCards();
    }
  }

  loadCards() {
    const cached = this.cardsService.lists.peek(this.userId);
    if (cached) this.cards = cached;
    this.loading = !cached;
    this.cardsService.getCards(this.userId).subscribe({
      next: (data) => {
        this.cards = data;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  onSubmit() {
    if (this.cardForm.invalid) {
      this.cardForm.markAllAsTouched();
      return;
    }
    const { cardHolderName, cardNumber, expiryMonth, expiryYear, cardType } = this.cardForm.getRawValue();

    const request = this.editingCardId
      ? this.cardsService.updateCard(this.editingCardId, { cardHolderName, expiryMonth, expiryYear })
      : this.cardsService.addCard({ cardHolderName, cardNumber, expiryMonth, expiryYear, cardType });

    request.subscribe({
      next: () => {
        this.loadCards();
        this.isDialogVisible = false;
        this.cardForm.reset();
      },
      error: (error) => console.error('Error saving card:', error),
    });
  }

  openAddCardDialog(): void {
    this.dialogTitle = 'Add Card';
    this.editingCardId = null;
    this.cardForm.reset();
    this.cardForm.get('cardNumber')?.enable();
    this.cardForm.get('cardType')?.enable();
    this.isDialogVisible = true;
  }

  // The number can't change (it isn't stored); only name and expiry are editable
  openEditCardDialog(card: any): void {
    this.dialogTitle = 'Edit Card Details';
    this.editingCardId = card._id;
    this.editingLast4 = card.last4;
    this.cardForm.reset({
      cardHolderName: card.cardHolderName,
      cardNumber: '',
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
      cardType: card.cardType,
    });
    this.cardForm.get('cardNumber')?.disable();
    this.cardForm.get('cardType')?.disable();
    this.isDialogVisible = true;
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
