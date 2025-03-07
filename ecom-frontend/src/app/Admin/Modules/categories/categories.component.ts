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
    this.categoryService.getCategories().subscribe((categories) => {
      this.categories = categories.map(category => ({
        ...category,
        productCount: 0 
      }));
      this.categories.forEach((category, index) => {
        this.categoryService.getCategoryProductCount(category.name).subscribe((count) => {
          this.categories[index].productCount = count;
        });
      });
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
        this.categories.push({ ...category, productCount: 0 });
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Category added successfully' });
        this.dialogVisible = false;
        this.loadCategories();
      });
    } else if (this.dialogMode === 'edit' && this.currentCategory._id) {
      this.categoryService.updateCategory(this.currentCategory._id, this.currentCategory).subscribe(() => {
        const index = this.categories.findIndex((cat) => cat._id === this.currentCategory._id);
        if (index !== -1) {
          this.categories[index] = this.currentCategory;
        }
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
    this.categoryService.deleteCategory(this.currentCategory._id).subscribe(() => {
      this.categories = this.categories.filter((cat) => cat._id !== this.currentCategory._id);
      this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Category deleted successfully' });
      this.deleteDialogVisible = false;
      this.loadCategories();
    });
  }

  getSeverity(status: string): 'success' | 'danger' | 'warning' | 'info' | 'secondary' | undefined {
    return status === 'ACTIVE' ? 'success' : status === 'INACTIVE' ? 'danger' : status === 'PENDING' ? 'warning' : 'secondary';
  }
}
