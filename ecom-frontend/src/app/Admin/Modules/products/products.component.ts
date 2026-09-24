import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TableLazyLoadEvent } from 'primeng/table';
import { ProductService, SIZES, isStockTracked } from './product.service';
import { CategoriesService } from '../categories/categories.service';
import { UploadService } from '../../../Services/upload.service';

const MAX_IMAGE_MB = 5;

@Component({
  selector: 'app-products',
  standalone: false,
  templateUrl: './products.component.html',
  styleUrl: './products.component.css'
})
export class ProductsComponent implements OnInit, OnDestroy {
  products: any[] = [];
  categories: any[] = [];
  totalRecords = 0;
  rows = 5;
  first = 0;
  loading = true;
  search = '';
  categoryFilter: string | null = null;

  dialogVisible = false;
  deleteDialogVisible = false;
  dialogMode: 'add' | 'edit' = 'add';
  currentProduct: any = {};
  productForm: FormGroup;
  trackStock = true;
  gallery: string[] = [];
  uploading = false;
  isSaving = false;

  readonly sizes = SIZES;
  readonly isStockTracked = isStockTracked;
  private destroy$ = new Subject<void>();
  private search$ = new Subject<void>();

  constructor(
    private productService: ProductService,
    private categoriesService: CategoriesService,
    private uploadService: UploadService,
    private fb: FormBuilder
  ) {
    this.productForm = this.fb.group({
      name: ['', Validators.required],
      category: ['', Validators.required],
      price: [0, [Validators.required, Validators.min(1)]],
      inventoryStatus: ['INSTOCK', Validators.required],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
      image: ['', Validators.required],
      color: [''],
      brand: ['', Validators.required],
      seller: ['', Validators.required],
      stock: this.fb.group(Object.fromEntries(SIZES.map((s) => [s, [0, [Validators.min(0)]]]))),
    });
    this.search$.pipe(debounceTime(350), takeUntil(this.destroy$)).subscribe(() => {
      this.first = 0;
      this.loadProducts();
    });
  }

  ngOnInit(): void {
    this.loadCategories();
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.first = event.first ?? 0;
    this.rows = event.rows ?? this.rows;
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading = true;
    const page = Math.floor(this.first / this.rows) + 1;
    this.productService
      .getProductsPage({ q: this.search, category: this.categoryFilter ? [this.categoryFilter] : [] }, page, this.rows)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.products = res.items;
          this.totalRecords = res.total;
          this.loading = false;
        },
        error: () => (this.loading = false),
      });
  }

  onSearch(): void {
    this.search$.next();
  }

  onCategoryFilter(): void {
    this.first = 0;
    this.loadProducts();
  }

  loadCategories(): void {
    this.categoriesService
      .getCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.categories = data.filter((category) => category.status === 'ACTIVE');
      });
  }

  totalStock(product: any): number {
    return SIZES.reduce((sum, size) => sum + (Number(product.stock?.[size]) || 0), 0);
  }

  getSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' {
    switch (status) {
      case 'INSTOCK':
        return 'success';
      case 'LOWSTOCK':
        return 'warn';
      case 'OUTOFSTOCK':
        return 'danger';
      default:
        return 'info';
    }
  }

  pageError = '';
  saveError = '';
  deleteError = '';
  uploadError = '';

  openDialog(mode: 'add' | 'edit', product?: any): void {
    this.pageError = '';
    if (this.categories.length === 0) {
      this.pageError = 'Add an active category first (Admin → Categories), then add products.';
      return;
    }
    this.dialogMode = mode;
    this.saveError = '';
    this.uploadError = '';

    if (mode === 'edit' && product) {
      this.currentProduct = { ...product };
      this.trackStock = isStockTracked(product);
      this.gallery = [...(product.images || [])];
      this.productForm.reset({
        ...product,
        color: product.color || '',
        stock: Object.fromEntries(SIZES.map((s) => [s, Number(product.stock?.[s]) || 0])),
      });
    } else {
      this.currentProduct = {};
      this.trackStock = true;
      this.gallery = [];
      this.productForm.reset({
        name: '',
        category: '',
        price: 0,
        inventoryStatus: 'INSTOCK',
        description: '',
        image: '',
        color: '',
        brand: 'DopeShope',
        seller: 'dopeshope pvt. ltd.',
        stock: Object.fromEntries(SIZES.map((s) => [s, 0])),
      });
    }

    this.dialogVisible = true;
  }

  /** Status shown in the form: derived from stock when tracked */
  get derivedStatus(): string {
    const stock = this.productForm.get('stock')?.value || {};
    const total = SIZES.reduce((sum, s) => sum + (Number(stock[s]) || 0), 0);
    if (total === 0) return 'OUTOFSTOCK';
    return total <= 10 ? 'LOWSTOCK' : 'INSTOCK';
  }

  saveProduct(): void {
    if (this.productForm.invalid || this.isSaving) {
      this.productForm.markAllAsTouched();
      return;
    }

    const { stock, ...fields } = this.productForm.value;
    const productData: any = {
      ...fields,
      images: this.gallery,
      // Empty object means "not tracked" to the API
      stock: this.trackStock ? stock : {},
    };
    if (this.currentProduct._id) productData._id = this.currentProduct._id;

    const request = this.dialogMode === 'edit' ? this.productService.editProduct(productData) : this.productService.addProduct(productData);
    this.isSaving = true;
    this.saveError = '';
    request.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isSaving = false;
        this.dialogVisible = false;
        this.loadProducts();
      },
      error: (error) => {
        this.isSaving = false;
        this.saveError = error.error?.message || 'Could not save. Please check the form and try again.';
      },
    });
  }

  openDeleteDialog(product: any): void {
    this.currentProduct = product;
    this.deleteError = '';
    this.deleteDialogVisible = true;
  }

  deleteProduct(): void {
    this.productService.deleteProduct(this.currentProduct._id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.deleteDialogVisible = false;
        this.loadProducts();
      },
      error: (err) => (this.deleteError = err.error?.message || 'Could not delete. Please try again.'),
    });
  }

  private pickImages(event: Event): File[] {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    input.value = '';
    this.uploadError = '';
    const tooBig = files.find((f) => f.size > MAX_IMAGE_MB * 1024 * 1024);
    if (tooBig) {
      this.uploadError = `${tooBig.name} is over ${MAX_IMAGE_MB} MB. Please pick a smaller image.`;
      return [];
    }
    return files;
  }

  /** Main image: uploaded to the API, which returns its URL */
  onImageUpload(event: Event): void {
    const files = this.pickImages(event).slice(0, 1);
    if (!files.length) return;
    this.upload(files, (urls) => this.productForm.patchValue({ image: urls[0] }));
  }

  onGalleryUpload(event: Event): void {
    const room = 7 - this.gallery.length;
    const files = this.pickImages(event).slice(0, room);
    if (!files.length) return;
    this.upload(files, (urls) => (this.gallery = [...this.gallery, ...urls]));
  }

  removeGalleryImage(index: number): void {
    this.gallery = this.gallery.filter((_, i) => i !== index);
  }

  private upload(files: File[], done: (urls: string[]) => void): void {
    this.uploading = true;
    this.uploadService.uploadImages(files).pipe(takeUntil(this.destroy$)).subscribe({
      next: (urls) => {
        this.uploading = false;
        done(urls);
      },
      error: (err) => {
        this.uploading = false;
        this.uploadError = err.error?.message || 'Upload failed. Please try another image.';
      },
    });
  }

  cancel(): void {
    this.dialogVisible = false;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
