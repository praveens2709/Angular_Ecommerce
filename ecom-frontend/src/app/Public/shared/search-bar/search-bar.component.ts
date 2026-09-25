import { Component, DestroyRef, ElementRef, HostListener, Input, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { ProductService } from '../../../Admin/Modules/products/product.service';

/** Search icon that opens a field with live product suggestions */
@Component({
  selector: 'app-search-bar',
  standalone: false,
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.css',
})
export class SearchBarComponent implements OnInit {
  /** White icon for dark backgrounds (home hero) */
  @Input() light = false;
  @ViewChild('input') input?: ElementRef<HTMLInputElement>;

  open = false;
  /** Field edges, in px from the nav row's left and right edges */
  panelLeft = 0;
  panelRight = 0;
  /** Vertical centre of the icons, so the field lines up with them rather than the row's padding box */
  panelTop = 0;
  /** Suggestions list edges relative to the field; on phones it spans the whole row so names fit */
  resultsLeft = 0;
  resultsRight = 0;
  query = '';
  suggestions: any[] = [];
  activeIndex = -1;
  searching = false;
  private query$ = new Subject<string>();

  constructor(
    private productService: ProductService,
    private router: Router,
    private host: ElementRef<HTMLElement>,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.query$
      .pipe(
        map((q) => q.trim()),
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((q) => {
          if (q.length < 2) return of([]);
          this.searching = true;
          return this.productService.getProductsPage({ q }, 1, 6).pipe(
            map((res) => res.items),
            catchError(() => of([]))
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((items) => {
        this.searching = false;
        this.suggestions = items;
        this.activeIndex = -1;
      });
  }

  toggle(): void {
    if (this.open) {
      this.close();
      return;
    }
    this.placePanel();
    this.open = true;
    setTimeout(() => this.input?.nativeElement.focus());
  }

  /** From the menu button (phones) or the row's start (desktop) up to just before this icon */
  private placePanel(): void {
    const host = this.host.nativeElement;
    const row = host.closest<HTMLElement>('.navbar');
    const icon = host.querySelector<HTMLElement>('.icon-btn');
    if (!row || !icon) return;
    const rowBox = row.getBoundingClientRect();
    const burger = row.querySelector<HTMLElement>('.burger');
    const start = burger && getComputedStyle(burger).display !== 'none' ? burger.getBoundingClientRect().right + 8 : rowBox.left;
    // The icon button's box (all nav icons share the same box height)
    const iconBox = icon.getBoundingClientRect();
    this.panelTop = Math.round(iconBox.top + iconBox.height / 2 - rowBox.top);
    this.panelLeft = Math.round(start - rowBox.left);
    this.panelRight = Math.round(rowBox.right - icon.getBoundingClientRect().left + 6);
    const narrow = this.panelLeft > 0; // the menu button is showing, i.e. a phone
    this.resultsLeft = narrow ? -this.panelLeft : 0;
    this.resultsRight = narrow ? -this.panelRight : 0;
  }

  @HostListener('window:resize')
  onResize(): void {
    if (this.open) this.placePanel();
  }

  onInput(): void {
    this.query$.next(this.query);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' && this.suggestions.length) {
      event.preventDefault();
      this.activeIndex = (this.activeIndex + 1) % this.suggestions.length;
    } else if (event.key === 'ArrowUp' && this.suggestions.length) {
      event.preventDefault();
      this.activeIndex = (this.activeIndex - 1 + this.suggestions.length) % this.suggestions.length;
    } else if (event.key === 'Escape') {
      this.close();
    }
  }

  submit(): void {
    if (this.activeIndex >= 0 && this.suggestions[this.activeIndex]) {
      this.goToProduct(this.suggestions[this.activeIndex]);
      return;
    }
    const q = this.query.trim();
    if (!q) return;
    this.router.navigate(['/shop'], { queryParams: { q } });
    this.close();
  }

  goToProduct(product: any): void {
    this.router.navigate(['/product-detail', product._id]);
    this.close();
  }

  private close(): void {
    this.open = false;
    this.query = '';
    this.suggestions = [];
    this.activeIndex = -1;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open && !this.host.nativeElement.contains(event.target as Node)) this.close();
  }
}
