import { Component, EventEmitter, HostListener, OnInit, Output } from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';
import { navbarData } from './nav-data';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/Services/auth-service.service';

interface SideNavToggle {
  screenWidth: number;
  collapsed: boolean;
}

@Component({
  selector: 'app-sidenav',
  standalone: false,
  
  templateUrl: './sidenav.component.html',
  styleUrl: './sidenav.component.css',
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms',
          style({ opacity: 1 })
        )
      ]),
      transition(':leave', [
        style({ opacity: 1 }),
        animate('200ms',
          style({ opacity: 0 })
        )
      ])
    ]),
  ]
})
export class SidenavComponent implements OnInit {
  // @ViewChild('sidebarRef') sidebarRef!: Sidebar;

  // sidebarVisible: boolean = false;

  // closeCallback(e:any): void {
  //   this.sidebarRef.close(e);
  // }

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.screenWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
  }

  logout(): void {
    this.authService.logoutAdmin();
    this.router.navigate(['/admin/auth']);
  }

  @Output() onToggleSidenav: EventEmitter<SideNavToggle> = new EventEmitter();
  collapsed = false;
  screenWidth = 0;
  navData = navbarData;

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.screenWidth = window.innerWidth;
    if (this.screenWidth <= 768) {
      this.collapsed = false;
      this.onToggleSidenav.emit({ collapsed: this.collapsed, screenWidth: this.screenWidth });
    }
  }

  toggleCollapse(): void {
    this.collapsed = !this.collapsed;
    this.onToggleSidenav.emit({ screenWidth: this.screenWidth, collapsed: this.collapsed });
  }

  closeSidenav(): void {
    this.collapsed = false
    this.onToggleSidenav.emit({ screenWidth: this.screenWidth, collapsed: this.collapsed });
  }
}
