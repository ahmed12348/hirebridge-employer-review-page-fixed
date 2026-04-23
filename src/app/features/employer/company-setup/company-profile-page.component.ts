import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { startWith, shareReplay, switchMap } from 'rxjs';

import { CompanyProfile, CompanyService } from '../../../core/services/company.service';
import { EmployerJobsService } from '../../../core/services/employer-jobs.service';

@Component({
  standalone: true,
  selector: 'app-employer-company-profile-page',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './company-profile-page.component.html',
  styleUrls: ['./company-profile-page.component.css']
})
export class EmployerCompanyProfilePageComponent implements OnInit {
  profile: CompanyProfile | null = null;
  saving = false;
  message = '';

  constructor(private companyService: CompanyService, private jobsService: EmployerJobsService) {}

  ngOnInit(): void {
    // Ensure company ID is fetched first, then load profile
    this.jobsService.getOrFetchCompanyId().pipe(
      switchMap(() => {
        return this.companyService.getCompanyProfile();
      }),
      shareReplay(1)
    ).subscribe({
      next: (profile) => {
        this.profile = { ...profile };
      },
      error: (err) => {
        // Profile loading error
      }
    });
  }

  save(): void {
    if (!this.profile || this.saving) return;
    
    this.saving = true;
    this.message = '';
    this.companyService.updateCompanyProfile(this.profile).subscribe({
      next: (updated) => {
        this.profile = { ...updated };
        this.saving = false;
        this.message = 'Company profile updated successfully.';
      },
      error: (err) => {
        this.saving = false;
        this.message = 'Failed to save profile.';
      }
    });
  }
}
