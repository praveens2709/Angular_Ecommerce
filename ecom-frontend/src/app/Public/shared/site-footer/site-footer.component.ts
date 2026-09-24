import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { StoreInfo, StoreService } from '../../../Services/store.service';
import { CategoriesService } from '../../../Admin/Modules/categories/categories.service';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-site-footer',
  standalone: false,
  templateUrl: './site-footer.component.html',
  styleUrl: './site-footer.component.css',
})
export class SiteFooterComponent {
  readonly store$: Observable<StoreInfo>;
  readonly categories$: Observable<string[]>;
  readonly year = new Date().getFullYear();

  constructor(storeService: StoreService, categoriesService: CategoriesService) {
    this.store$ = storeService.info$;
    this.categories$ = categoriesService.getCategorySummary().pipe(
      map((cats) => cats.sort((a, b) => b.count - a.count).slice(0, 4).map((c) => c.name)),
      catchError(() => of([]))
    );
  }
}
