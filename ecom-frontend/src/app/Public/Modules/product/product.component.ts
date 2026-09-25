import { Component, DestroyRef, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { debounceTime, switchMap, tap } from 'rxjs/operators';
import { ProductQuery, ProductService } from '../../../Admin/Modules/products/product.service';
import { CategoriesService } from '../../../Admin/Modules/categories/categories.service';
import { WishlistService } from '../../../Services/wishlist.service';
import { PrerenderRefreshService } from '../../../Services/prerender-refresh.service';

interface PriceFilter {
  min: number;
  max: number;
}

@Component({
  selector: 'app-product',
  standalone: false,

  templateUrl: './product.component.html',
  styleUrl: './product.component.css'
})
export class ProductComponent implements OnInit {
  categories: any[] = [];
  paginatedProducts: any[] = [];
  selectedCategories: string[] = [];
  selectedPriceFilters: PriceFilter[] = [];
  searchQuery: string = '';
  maxPrice: number = Infinity;
  loading = true;
  mobileFiltersOpen: boolean = false;

  priceFilters: PriceFilter[] = [
    { min: 0, max: 500 },
    { min: 500, max: 1000 },
    { min: 1000, max: 5000 },
    { min: 5000, max: 10000 },
    { min: 10000, max: this.maxPrice },
  ];

  sortOptions = [
    { label: 'Price: Low to High', value: 'price_asc' },
    { label: 'Price: High to Low', value: 'price_desc' },
    { label: 'Newest', value: 'newest' },
    { label: 'Top Rated', value: 'rating' },
    { label: 'Biggest Discount', value: 'discount' },
  ];
  selectedSort: ProductQuery['sort'] = 'price_asc';

  rowsPerPage: number = 12;
  currentPage: number = 0;
  totalProducts: number = 0;
  private load$ = new Subject<void>();

  constructor(
    private productService: ProductService,
    private categoriesService: CategoriesService,
    private wishlistService: WishlistService,
    private route: ActivatedRoute,
    private router: Router,
    private destroyRef: DestroyRef,
    private prerenderRefresh: PrerenderRefreshService
  ) { }

  ngOnInit(): void {
    this.fetchCategories();

    // One request per change; a newer request cancels an older one
    this.load$
      .pipe(
        debounceTime(50),
        tap(() => (this.loading = true)),
        switchMap(() => this.productService.getProductsPage(this.query, this.currentPage + 1, this.rowsPerPage)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res) => {
          this.paginatedProducts = res.items;
          this.totalProducts = res.total;
          this.loading = false;
          // A pre-rendered list's stock labels and prices are from build time: swap in live ones quietly
          this.prerenderRefresh.afterStartup(() =>
            this.productService.getProductsPage(this.query, this.currentPage + 1, this.rowsPerPage).subscribe({
              next: (live) => {
                this.paginatedProducts = live.items;
                this.totalProducts = live.total;
              },
            })
          );
        },
        error: () => (this.loading = false),
      });

    // /shop?category=Jeans (home page) and /shop?q=tee (header search) preset the filters
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const category = params.get('category');
      this.selectedCategories = category ? [category] : [];
      this.searchQuery = params.get('q') ?? '';
      this.applyFilters();
    });
  }

  private get query(): ProductQuery {
    return {
      q: this.searchQuery,
      category: this.selectedCategories,
      price: this.selectedPriceFilters.map((f) => `${f.min}-${f.max === Infinity ? '' : f.max}`),
      sort: this.selectedSort,
    };
  }

  fetchCategories(): void {
    this.categoriesService.getCategories().subscribe((data) => {
      this.categories = data
        .filter((category) => category.status === 'ACTIVE')
        .map((category) => ({ ...category, selected: false }));
    });
  }

  /** Any filter change goes back to page 1 */
  applyFilters(): void {
    this.currentPage = 0;
    this.load$.next();
  }

  getDisplayedRange(): string {
    if (this.totalProducts === 0) {
      return 'Showing 0 of 0 results';
    }
    const start = this.currentPage * this.rowsPerPage + 1;
    const end = Math.min((this.currentPage + 1) * this.rowsPerPage, this.totalProducts);
    return `Showing ${start}-${end} of ${this.totalProducts} results`;
  }

  onPageChange(event: any): void {
    this.currentPage = event.page;
    this.rowsPerPage = event.rows;
    this.load$.next();
    window.scrollTo({ top: 300, behavior: 'smooth' });
  }

  toggleCategory(category: string): void {
    const index = this.selectedCategories.indexOf(category);
    if (index === -1) {
      this.selectedCategories.push(category);
    } else {
      this.selectedCategories.splice(index, 1);
    }
    this.applyFilters();
  }

  togglePriceFilter(filter: PriceFilter): void {
    const index = this.selectedPriceFilters.findIndex(
      (selectedFilter) =>
        selectedFilter.min === filter.min && selectedFilter.max === filter.max
    );
    if (index === -1) {
      this.selectedPriceFilters.push(filter);
    } else {
      this.selectedPriceFilters.splice(index, 1);
    }
    this.applyFilters();
  }

  isCategorySelected(category: string): boolean {
    return this.selectedCategories.includes(category);
  }

  isPriceFilterSelected(filter: PriceFilter): boolean {
    return this.selectedPriceFilters.some(
      (selectedFilter) =>
        selectedFilter.min === filter.min && selectedFilter.max === filter.max
    );
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedCategories = [];
    this.selectedPriceFilters = [];
    // Drop ?q= / ?category= so a refresh doesn't bring them back
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
    this.applyFilters();
  }

  onSearchClick(): void {
    this.applyFilters();
  }

  isWishlisted(product: any): boolean {
    return this.wishlistService.has(product._id);
  }

  toggleWishlist(event: MouseEvent, product: any): void {
    event.preventDefault();
    event.stopPropagation();
    this.wishlistService.toggle(product);
  }
}
