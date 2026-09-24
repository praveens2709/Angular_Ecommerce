import { Component, OnInit } from '@angular/core';
import { CategoriesService } from './categories.service';
import { MessageService } from 'primeng/api';

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

  constructor(
    private categoryService: CategoriesService,
    private messageService: MessageService
  ) {}

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
    this.dialogVisible = true;
  }

  saveCategory() {
    if (!this.currentCategory.name) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Category name is required' });
      return;
    }
    if (this.dialogMode === 'add') {
      this.categoryService.addCategory(this.currentCategory).subscribe((category) => {
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Category added successfully' });
        this.dialogVisible = false;
        this.loadCategories();
      });
    } else if (this.dialogMode === 'edit' && this.currentCategory._id) {
      this.categoryService.updateCategory(this.currentCategory._id, this.currentCategory).subscribe(() => {
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Category updated successfully' });
        this.dialogVisible = false;
        this.loadCategories();
      });
    }
  }

  openDeleteDialog(category: Category) {
    this.currentCategory = { ...category };
    this.deleteDialogVisible = true;
  }

  deleteCategory() {
    if (!this.currentCategory._id) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Invalid category ID' });
      return;
    }
    this.categoryService.deleteCategory(this.currentCategory._id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Category deleted successfully' });
        this.deleteDialogVisible = false;
        this.loadCategories();
      },
      error: (error) => {
        this.deleteDialogVisible = false;
        this.messageService.add({ severity: 'error', summary: 'Cannot delete', detail: error.error?.message || 'Please try again' });
      },
    });
  }

  getSeverity(status: string): 'success' | 'danger' | 'warn' | 'info' | 'secondary' | undefined {
    return status === 'ACTIVE' ? 'success' : status === 'INACTIVE' ? 'danger' : status === 'PENDING' ? 'warn' : 'secondary';
  }
}
