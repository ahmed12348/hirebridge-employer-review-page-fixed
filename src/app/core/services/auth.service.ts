import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private baseUrl = 'http://localhost:3004';

  constructor(private http: HttpClient) {}

  // 🔐 AUTH
  register(data: any) {
    return this.http.post(`${this.baseUrl}/auth/signUp`, data);
  }

  login(data: any) {
    return this.http.post(`${this.baseUrl}/auth/login`, data);
  }

  loginSystemAdmin(data: { email: string; password: string }) {
    return this.http.post(`${this.baseUrl}/system/log-in-admins`, data);
  }

  getMyCompany() {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token') || '';
    return this.http.get(`${this.baseUrl}/company/myCompany`, {
      headers: new HttpHeaders({
        auth: token
      })
    });
  }

  verifyOtp(email: string, otp: string) {
    return this.http.post(
      `${this.baseUrl}/auth/verifyOTPofPersonalEmail`,
      { email, otp }
    );
  }

  // 🔥 NEW 👉 get company by admin (الحل الأساسي)
  getCompanyByAdmin(userId: string) {
    return this.http.get(`${this.baseUrl}/company/getAllCompany/${userId}`);
  }

  // 💾 TOKEN
  saveToken(token: string) {
    localStorage.setItem('authToken', token);
  }

  getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  logout() {
    localStorage.removeItem('authToken');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // 🔥 decode token
  getUserFromToken(): any {
    const token = this.getToken();

    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload;
    } catch {
      return null;
    }
  }

  getRole(): string | null {
    const tokenRole = this.getUserFromToken()?.role;
    const storedRole = localStorage.getItem('role');
    return tokenRole || storedRole || null;
  }

  fetchAndStoreCompanyId(): Observable<string | null> {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token') || '';
    const storedCompanyId = this.extractCompanyId(localStorage.getItem('companyId'));

    if (storedCompanyId) {
      return of(storedCompanyId);
    }

    if (!token) {
      return of(null);
    }

    return this.fetchCompanyIdFromApi(token)
      .pipe(
        map(companyId => {
          localStorage.setItem('companyId', companyId);
          return companyId;
        }),
        catchError(() => {
          localStorage.removeItem('companyId');
          return of(null);
        })
      );
  }

  private fetchCompanyIdFromApi(token: string, index = 0): Observable<string> {
    const endpoints = [
      `${this.baseUrl}/job/get-company-to-store-id`
    ];

    if (index >= endpoints.length) {
      const tokenCompanyId = this.extractCompanyIdFromToken(token);

    if (tokenCompanyId) {
      localStorage.setItem('companyId', tokenCompanyId);
      return of(tokenCompanyId);
    }

    return of(null);
  }

  private extractCompanyId(response: unknown): string {
    const objectIdPattern = /^[a-fA-F0-9]{24}$/;

    const toObjectId = (value: unknown): string => {
      const normalized = String(value || '').trim();
      return objectIdPattern.test(normalized) ? normalized : '';
    };

    const asRecord = (value: unknown): Record<string, unknown> | null => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, unknown>;
      }

      return null;
    };

    const directId = toObjectId(response);

    if (directId) {
      return directId;
    }

    const root = asRecord(response);
    const data = asRecord(root?.['data']);
    const company = asRecord(root?.['company']) || asRecord(data?.['company']);

    return (
      toObjectId(root?.['_id']) ||
      toObjectId(root?.['id']) ||
      toObjectId(root?.['companyId']) ||
      toObjectId(data?.['companyId']) ||
      toObjectId(company?.['_id']) ||
      toObjectId(company?.['id'])
    );
  }

  private extractCompanyIdFromToken(token: string): string {
    try {
      const payload = JSON.parse(atob(token.split('.')[1] || '')) as Record<string, unknown>;

      return this.extractCompanyId(payload);
    } catch {
      return '';
    }
  }
}
