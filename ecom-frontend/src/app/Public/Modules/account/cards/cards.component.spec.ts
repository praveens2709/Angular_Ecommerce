import { FormControl } from '@angular/forms';
import { detectCardType, luhnValidator } from './cards.component';

describe('card validation', () => {
  it('accepts numbers that pass the Luhn checksum', () => {
    expect(luhnValidator(new FormControl('4111111111111111'))).toBeNull();
    expect(luhnValidator(new FormControl('5555555555554444'))).toBeNull();
  });

  it('rejects mistyped numbers', () => {
    expect(luhnValidator(new FormControl('4111111111111112'))).toEqual({ luhn: true });
  });

  it('leaves length problems to the pattern validator', () => {
    expect(luhnValidator(new FormControl('4111'))).toBeNull();
  });

  it('detects the card brand from the number', () => {
    expect(detectCardType('4111111111111111')).toBe('VISA');
    expect(detectCardType('5555555555554444')).toBe('MasterCard');
    expect(detectCardType('2221000000000009')).toBe('MasterCard');
    expect(detectCardType('378282246310005')).toBe('Amex');
    expect(detectCardType('6071000000000000')).toBe('RuPay');
    expect(detectCardType('9999')).toBeNull();
  });
});
