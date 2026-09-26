import { Component, ViewEncapsulation } from '@angular/core';

interface SideNavToggle {
  screenWidth: number;
  collapsed: boolean;
}

@Component({
  selector: 'app-admin',
  standalone: false,

  templateUrl: './admin.component.html',
  // The shared admin theme is global so it can style PrimeNG internals and every admin page;
  // all of its rules are scoped under .ds-admin, so nothing reaches the storefront.
  styleUrls: ['./admin.component.css', './admin-theme.css', './admin-controls.css'],
  encapsulation: ViewEncapsulation.None,

})
export class AdminComponent {

  isSideNavCollapsed = false;
  screenWidth = 0
  onToggleSidenav(data: SideNavToggle):void {
    this.screenWidth = data.screenWidth;
    this.isSideNavCollapsed = data.collapsed;
  }

}
