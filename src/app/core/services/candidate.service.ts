import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, shareReplay, startWith, tap } from 'rxjs/operators';

import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class CandidateService {
  private baseUrl = 'http://localhost:3004';
  private profileCache$: Observable<any> | null = null;
  private profileSnapshot: any = null;

  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) {}

  getCandidateProfile(forceRefresh = false): Observable<any> {
    if (!forceRefresh && this.profileCache$) {
      return this.profileCache$;
    }

    const fallback = this.profileSnapshot || this.getTokenUserFallback();

    this.profileCache$ = this.http.get(`${this.baseUrl}/candidate/candidate-profile`).pipe(
      tap(response => {
        this.profileSnapshot = response;
      }),
      startWith(fallback),
      catchError(() => of(this.profileSnapshot || fallback)),
      shareReplay(1)
    );

    return this.profileCache$;
  }

  updateCandidateProfile(data: any) {
    return this.http.put(`${this.baseUrl}/user/updateCandidateProfile`, data);
  }

  getProfile() {
    return this.http.get(`${this.baseUrl}/user/profile`);
  }

  private getTokenUserFallback(): any {
    const user = this.auth.getUserFromToken();
    return user ? { user } : {};
  }
}
