import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from './auth-service.service';
import { authInterceptor } from './auth.intercepter';
import { userAuthGuard } from './user-auth.guard';
import { environment } from '../../../../environments/environment';
import { fakeToken, inSeconds } from '../../../testing/test-helpers';

describe('auth', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let router: Router;
  let auth: AuthService;
  const userToken = fakeToken({ id: 'u1', role: 'user', exp: inSeconds(3600) });
  const adminToken = fakeToken({ id: 'a1', role: 'admin', exp: inSeconds(3600) });

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => {
    backend.verify();
    localStorage.clear();
  });

  it('drops expired and malformed tokens', () => {
    localStorage.setItem('userAuthToken', fakeToken({ id: 'u1', role: 'user', exp: inSeconds(-60) }));
    expect(auth.getUserToken()).toBeNull();
    expect(localStorage.getItem('userAuthToken')).toBeNull();

    localStorage.setItem('userAuthToken', 'not-a-jwt');
    expect(auth.isUserLoggedIn()).toBeFalse();
  });

  it('attaches the shopper token to API requests only', () => {
    localStorage.setItem('userAuthToken', userToken);
    http.get(`${environment.apiUrl}/cart`).subscribe();
    http.get('https://checkout.razorpay.com/v1/x').subscribe();
    expect(backend.expectOne(`${environment.apiUrl}/cart`).request.headers.get('Authorization')).toBe(`Bearer ${userToken}`);
    expect(backend.expectOne('https://checkout.razorpay.com/v1/x').request.headers.has('Authorization')).toBeFalse();
  });

  it('uses the admin token on admin pages', async () => {
    localStorage.setItem('userAuthToken', userToken);
    localStorage.setItem('adminAuthToken', adminToken);
    spyOnProperty(router, 'url', 'get').and.returnValue('/admin/orders');
    http.get(`${environment.apiUrl}/orders`).subscribe();
    expect(backend.expectOne(`${environment.apiUrl}/orders`).request.headers.get('Authorization')).toBe(`Bearer ${adminToken}`);
  });

  it('clears the shopper session when the API rejects the token', () => {
    localStorage.setItem('userAuthToken', userToken);
    http.get(`${environment.apiUrl}/cart`).subscribe({ error: () => {} });
    backend.expectOne(`${environment.apiUrl}/cart`).flush({ message: 'expired' }, { status: 401, statusText: 'Unauthorized' });
    expect(localStorage.getItem('userAuthToken')).toBeNull();
  });

  it('sends guests from checkout pages to the login page', () => {
    const result = TestBed.runInInjectionContext(() => userAuthGuard({} as any, {} as any));
    expect(router.serializeUrl(result as any)).toBe('/public/auth');

    localStorage.setItem('userAuthToken', userToken);
    expect(TestBed.runInInjectionContext(() => userAuthGuard({} as any, {} as any))).toBeTrue();
  });
});
