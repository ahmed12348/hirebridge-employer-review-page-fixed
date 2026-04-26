import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, delay, map, startWith, shareReplay } from 'rxjs/operators';

export interface CompanyProfile {
  name: string;
  industry: string;
  companyEmail: string;
  website: string;
  logo?: string;
}

export interface CompanyEmployerActionPayload {
  applicantId: string;
  action: 'accept' | 'reject';
}

@Injectable({
  providedIn: 'root'
})
export class CompanyService {
  private readonly baseUrl = 'http://localhost:3004';
  private readonly companyProfileSubject = new BehaviorSubject<CompanyProfile>({
    name: '',
    industry: '',
    companyEmail: '',
    website: '',
    logo: ''
  });
  private companyProfileCache$: Observable<CompanyProfile> | null = null;

  constructor(private http: HttpClient) {}

  createCompanyProfile(data: unknown): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/company/companyProfile`, data);
  }

  verifyCompanyOtp(email: string, otp: string): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/company/verifyCompanyEmail`, {
      email,
      otp
    });
  }

  getPendingForCompany(companyId: string): Observable<unknown> {
    return this.http.get(
      `${this.baseUrl}/company/getAllPendingForCompany/${companyId}`,
      this.getAuthOptions()
    );
  }

  acceptOrRejectEmployer(
    companyId: string,
    payload: CompanyEmployerActionPayload
  ): Observable<unknown> {
    return this.http.put(
      `${this.baseUrl}/company/acceptOrRejectEmp/${companyId}`,
      payload,
      this.getAuthOptions()
    );
  }

  getCompanyProfile(): Observable<CompanyProfile> {
    // Return cached result if available
    if (this.companyProfileCache$) {
      return this.companyProfileCache$;
    }

    const companyId = this.extractObjectId(localStorage.getItem('companyId'));

    if (!companyId) {
      this.companyProfileCache$ = of(this.companyProfileSubject.value).pipe(shareReplay(1));
      return this.companyProfileCache$;
    }

    // 🔥 First try new endpoint with company ID
    let request$ = this.http.get<unknown>(
      `${this.baseUrl}/company/getCompanyProfile/${companyId}`,
      this.getAuthOptions()
    ).pipe(
      map(response => {
        const mapped = this.mapCompanyProfile(response);
        this.companyProfileSubject.next(mapped); // Update cache
        return mapped;
      }),
      catchError(err => {
        // Fallback to myCompany endpoint if getCompanyProfile fails
        return this.http.get<unknown>(`${this.baseUrl}/company/myCompany`, this.getAuthOptions()).pipe(
          map(response => {
            const mapped = this.mapCompanyProfile(response);
            this.companyProfileSubject.next(mapped);
            return mapped;
          })
        );
      }),
      startWith(this.companyProfileSubject.value), // Return cached value immediately
      catchError(() => {
        // On error, return cached value and continue
        return of(this.companyProfileSubject.value);
      }),
      shareReplay(1)
    );

    this.companyProfileCache$ = request$;
    return request$;
  }

  updateCompanyProfile(profile: CompanyProfile): Observable<CompanyProfile> {
    const companyId = this.extractObjectId(localStorage.getItem('companyId'));
    const token = String(localStorage.getItem('token') || localStorage.getItem('authToken') || '').trim();

    if (!companyId) {
      this.companyProfileSubject.next(profile);
      this.companyProfileCache$ = null;
      return of(profile);
    }

    // Send update to API
    return this.http.put<unknown>(
      `${this.baseUrl}/company/updateCompanyProfile/${companyId}`,
      profile,
      { headers: new HttpHeaders({ auth: token }) }
    ).pipe(
      map(response => {
        const mapped = this.mapCompanyProfile(response);
        this.companyProfileSubject.next(mapped);
        this.companyProfileCache$ = null; // Reset cache
        return mapped;
      }),
      catchError(() => {
        // On error, still update locally and return
        this.companyProfileSubject.next(profile);
        this.companyProfileCache$ = null;
        return of(profile);
      })
    );
  }

  private getAuthOptions(): { headers: HttpHeaders } {
    const token = String(localStorage.getItem('token') || localStorage.getItem('authToken') || '').trim();

    return {
      headers: new HttpHeaders({ auth: token })
    };
  }

  private mapCompanyProfile(response: unknown): CompanyProfile {
    const root = this.asRecord(response);
    const data = this.asRecord(root?.['data']);
    
    // Try to find company data in different locations
    let company = this.asRecord(root?.['company']) || data || root;
    
    // If the entire response is the company object (flat structure)
    const flatProfile: CompanyProfile = {
      name: this.asString(root?.['name']) || '',
      industry: this.asString(root?.['industry']) || '',
      companyEmail:
        this.asString(root?.['companyEmail']) ||
        this.asString(root?.['CompanyEmail']) ||
        '',
      website: this.asString(root?.['website']) || this.asString(root?.['Website']) || '',
      logo: this.asString(root?.['logo']) || this.asString(root?.['Logo']) || ''
    };

    // If flat structure has data, use it
    if (flatProfile.name || flatProfile.industry) {
      return flatProfile;
    }

    // Otherwise extract from nested company object
    return {
      name: this.asString(company?.['name']) || '',
      industry: this.asString(company?.['industry']) || '',
      companyEmail:
        this.asString(company?.['companyEmail']) ||
        this.asString(company?.['CompanyEmail']) ||
        '',
      website: this.asString(company?.['website']) || this.asString(company?.['Website']) || '',
      logo: this.asString(company?.['logo']) || this.asString(company?.['Logo']) || ''
    };
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    return null;
  }

  private asString(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private extractObjectId(value: unknown): string {
    const normalized = String(value || '').trim();
    return /^[a-fA-F0-9]{24}$/.test(normalized) ? normalized : '';
  }
}
