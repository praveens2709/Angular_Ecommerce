import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface AddedToBag {
  product: any;
  size?: string | null;
}

/** Opens the slide-in mini bag after something is added (product page, quick add) */
@Injectable({ providedIn: 'root' })
export class BagDrawerService {
  private readonly state = new BehaviorSubject<AddedToBag | null>(null);
  readonly added$ = this.state.asObservable();

  open(added: AddedToBag): void {
    this.state.next(added);
  }

  close(): void {
    this.state.next(null);
  }
}
