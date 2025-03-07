import { Component, OnInit } from '@angular/core';
import { ProductService } from '../../../Admin/Modules/products/product.service';
import { CategoriesService } from '../../../Admin/Modules/categories/categories.service';
import { CartService } from '../cart/cart.service';

@Component({
  selector: 'app-product',
  standalone: false,

  templateUrl: './product.component.html',
  styleUrl: './product.component.css'
})
export class ProductComponent implements OnInit {
  cartCount: number = 0;
  cartItems: any[] = [];
  products: any[] = [];
  categories: any[] = [];
  filteredProducts: any[] = [];
  paginatedProducts: any[] = [];
  selectedCategories: string[] = [];
  selectedPriceFilters: { min: number; max: number }[] = [];
  searchQuery: string = '';
  maxPrice: number = Infinity;

  priceFilters: { min: number; max: number }[] = [
    { min: 0, max: 500 },
    { min: 500, max: 1000 },
    { min: 1000, max: 5000 },
    { min: 5000, max: 10000 },
    { min: 10000, max: this.maxPrice },
  ];

  sortOptions = [
    { label: 'Low to High', value: 'low-to-high' },
    { label: 'High to Low', value: 'high-to-low' },
  ];
  selectedSort: string = 'low-to-high';

  rowsPerPage: number = 12;
  currentPage: number = 0;
  totalProducts: number = 0;

  constructor(
    private productService: ProductService,
    private categoriesService: CategoriesService,
    private cartService: CartService
  ) { }

  ngOnInit(): void {
    this.fetchProducts();
    this.fetchCategories();
    this.initializeCart();
    this.applyFilters();
  }

  initializeCart(): void {
    this.cartService.getCartCount().subscribe((count) => {
      this.cartCount = count;
    });
  }

  fetchProducts(): void {
    this.productService.getProducts().subscribe((data) => {
      this.products = data;
      this.applyFilters();
    });
  }

  fetchCategories(): void {
    this.categoriesService.getCategories().subscribe((data) => {
      this.categories = data
        .filter((category) => category.status === 'ACTIVE')
        .map((category) => ({ ...category, selected: false }));
    });
  }

  applyFilters(): void {
    this.filteredProducts = this.products
      .filter((product) => {
        const matchesCategory =
          this.selectedCategories.length === 0 ||
          this.selectedCategories.includes(product.category);

        const matchesPrice =
          this.selectedPriceFilters.length === 0 ||
          this.selectedPriceFilters.some(
            (filter) =>
              product.price >= filter.min && product.price <= filter.max
          );

        const normalizeText = (text: string) =>
          text.toLowerCase().replace(/[^a-z0-9]/g, '');

        const normalizedSearchQuery = normalizeText(this.searchQuery);
        const matchesSearch =
          normalizedSearchQuery === '' ||
          normalizeText(product.name).includes(normalizedSearchQuery) ||
          normalizeText(product.category).includes(normalizedSearchQuery);

        return matchesCategory && matchesPrice && matchesSearch;
      })
      .sort((a, b) =>
        this.selectedSort === 'low-to-high' ? a.price - b.price : b.price - a.price
      );

    this.totalProducts = this.filteredProducts.length;
    this.currentPage = 0;
    this.updatePaginatedProducts();
  }

  getDisplayedRange(): string {
    if (this.totalProducts === 0) {
      return 'Showing 0 of 0 results';
    }
    const start = this.currentPage * this.rowsPerPage + 1;
    const end = Math.min((this.currentPage + 1) * this.rowsPerPage, this.totalProducts);
    return `Showing ${start}-${end} of ${this.totalProducts} results`;
  }

  updatePaginatedProducts(): void {
    const start = this.currentPage * this.rowsPerPage;
    const end = start + this.rowsPerPage;
    this.paginatedProducts = this.filteredProducts.slice(start, end);
  }

  onPageChange(event: any): void {
    this.currentPage = event.page;
    this.rowsPerPage = event.rows;
    this.updatePaginatedProducts();
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

  togglePriceFilter(filter: { min: number; max: number }): void {
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

  isPriceFilterSelected(filter: { min: number; max: number }): boolean {
    return this.selectedPriceFilters.some(
      (selectedFilter) =>
        selectedFilter.min === filter.min && selectedFilter.max === filter.max
    );
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedCategories = [];
    this.selectedPriceFilters = [];
    this.applyFilters();
  }

  onSearchClick(): void {
    this.applyFilters();
  }

  addToCart(event: MouseEvent, product: any): void {
    event.preventDefault();
    event.stopPropagation();
    this.cartService.addToCart(product);
  }

}