import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  // Default redirect to public home page
  {
    path: '',
    redirectTo: '/home', // Redirect to home for public users
    pathMatch: 'full',
  },
  
  // Admin routes are prefixed with 'admin'
  {
    path: 'admin',
    loadChildren: () => import('./Admin/admin-routing.module').then(m => m.AdminRoutingModule),
  },

  // Public routes
  {
    path: '',
    loadChildren: () => import('./Public/public-routing.module').then(m => m.PublicRoutingModule),
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)], // Use forRoot since it's the main routing
  exports: [RouterModule]
})
export class AppRoutingModule {}
