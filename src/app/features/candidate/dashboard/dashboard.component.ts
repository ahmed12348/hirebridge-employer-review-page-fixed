import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CandidateService } from '../../../core/services/candidate.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-candidate-dashboard',
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class CandidateDashboardComponent implements OnInit {
  loading = false;
  error = '';
  userName = 'Candidate';
  stats = {
    total: 0,
    accepted: 0,
    pending: 0,
    rejected: 0
  };
  recentApplications: any[] = [];

  constructor(
    private candidateService: CandidateService,
    private auth: AuthService
  ) {
    const tokenUser = this.auth.getUserFromToken();
    if (tokenUser) {
      this.userName = this.extractName(tokenUser);
    }
  }

  ngOnInit() {
    this.loadDashboard();
  }

  private loadDashboard() {
    this.loading = true;
    this.candidateService.getCandidateProfile().subscribe({
      next: (res: any) => {
        this.loading = false;
        const user = this.extractResponseUser(res);
        this.userName = this.extractName(user);

        const applications =
          user?.applications ||
          res?.applications ||
          user?.candidateProfile?.applications ||
          [];

        this.stats.total = applications.length;
        this.stats.accepted = applications.filter((app: any) => {
          const status = this.normalizeStatus(app.status);
          return status === 'accepted' || status === 'hired';
        }).length;
        this.stats.pending = applications.filter((app: any) => this.normalizeStatus(app.status) === 'pending').length;
        this.stats.rejected = applications.filter((app: any) => this.normalizeStatus(app.status) === 'rejected').length;

        this.recentApplications = applications.slice(0, 5);
      },
      error: (err: any) => {
        this.loading = false;
        this.error = err?.error?.message || 'Unable to load dashboard data';
      }
    });
  }

  public normalizeStatus(value: any): string {
    return String(value || '').trim().toLowerCase();
  }

  public getStatusBadgeClass(value: any): string {
    const status = this.normalizeStatus(value) || 'pending';
    if (status === 'accepted' || status === 'hired') return 'bg-success';
    if (status === 'rejected') return 'bg-danger';
    return 'bg-warning text-dark';
  }

  private extractResponseUser(res: any): any {
    return (
      res?.data?.user ||
      res?.data ||
      res?.user ||
      res?.userDetails ||
      res
    );
  }

  private extractName(user: any): string {
    if (!user) return 'Candidate';
    return (
      user?.firstName ||
      user?.fullName ||
      user?.username ||
      user?.email?.split('@')[0] ||
      'Candidate'
    );
  }
}
