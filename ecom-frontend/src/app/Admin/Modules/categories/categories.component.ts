import { Component, OnInit } from '@angular/core';
import { CategoriesService } from './categories.service';

interface Category {
  _id?: string;
  name: string;
  status: string;
  productCount: number;
}

@Component({
  selector: 'app-categories',
  standalone: false,
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.css',
})
export class CategoriesComponent implements OnInit {
  categories: Category[] = [];
  currentCategory: Category = { name: '', status: 'ACTIVE', productCount: 0 };
  dialogVisible = false;
  deleteDialogVisible = false;
  dialogMode: 'add' | 'edit' = 'add';

  saveError = '';
  deleteError = '';

  constructor(private categoryService: CategoriesService) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    // One request: every category (active or not) with its product count
    this.categoryService.getCategorySummary(true).subscribe((categories) => {
      this.categories = categories.map((category) => ({ ...category, productCount: category.count }));
    });
  }

  openDialog(mode: 'add' | 'edit', category?: Category) {
    this.dialogMode = mode;
    if (mode === 'edit' && category) {
      this.currentCategory = { ...category };
    } else {
      this.currentCategory = { name: '', status: 'ACTIVE', productCount: 0 };
    }
    this.saveError = '';
    this.dialogVisible = true;
  }

  saveCategory() {
    if (!this.currentCategory.name?.trim()) {
      this.saveError = 'Category name is required';
      return;
    }
    this.saveError = '';
    const request =
      this.dialogMode === 'edit' && this.currentCategory._id
        ? this.categoryService.updateCategory(this.currentCategory._id, this.currentCategory)
        : this.categoryService.addCategory(this.currentCategory);
    request.subscribe({
      next: () => {
        this.dialogVisible = false;
        this.loadCategories();
      },
      error: (error) => (this.saveError = error.error?.message || 'Could not save the category. Please try again.'),
    });
  }

  openDeleteDialog(category: Category) {
    this.currentCategory = { ...category };
    this.deleteError = '';
    this.deleteDialogVisible = true;
  }

  deleteCategory() {
    if (!this.currentCategory._id) return;
    this.deleteError = '';
    this.categoryService.deleteCategory(this.currentCategory._id).subscribe({
      next: () => {
        this.deleteDialogVisible = false;
        this.loadCategories();
      },
      // e.g. products still use this category; the dialog stays open with the reason
      error: (error) => (this.deleteError = error.error?.message || 'Could not delete the category. Please try again.'),
    });
  }

  getSeverity(status: string): 'success' | 'danger' | 'warn' | 'info' | 'secondary' | undefined {
    return status === 'ACTIVE' ? 'success' : status === 'INACTIVE' ? 'danger' : status === 'PENDING' ? 'warn' : 'secondary';
  }
}
