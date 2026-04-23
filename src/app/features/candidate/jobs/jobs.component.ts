import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { CandidateJob, JobsService } from '../../../core/services/job.service';

@Component({
  standalone: true,
  selector: 'app-candidate-jobs',
  imports: [CommonModule, FormsModule],
  templateUrl: './jobs.component.html',
  styleUrls: ['./jobs.component.css']
})
export class JobsComponent implements OnInit {
  loading = false;
  error = '';
  allJobs: CandidateJob[] = [];
  successMessage = '';
  searchTerm = '';
  statusFilter = 'all';
  locationFilter = 'all';
  applyingJobId: string | null = null;

  constructor(private jobsService: JobsService) {}

  ngOnInit() {
    this.loadJobs();
  }

  get filteredJobs(): CandidateJob[] {
    const search = this.searchTerm.toLowerCase().trim();
    const statusFilter = this.statusFilter.toLowerCase();
    const locationFilter = this.locationFilter.toLowerCase();

    return this.allJobs.filter(job => {
      const title = String(job.title || '').toLowerCase();
      const company = String(job.companyName || '').toLowerCase();
      const location = String(job.location || job.workType || '').toLowerCase();
      const status = String(job.status || 'active').toLowerCase();
      const matchesSearch = !search || title.includes(search) || company.includes(search) || location.includes(search);
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      const matchesLocation = locationFilter === 'all' || location.includes(locationFilter);
      return matchesSearch && matchesStatus && matchesLocation;
    });
  }

  get appliedCount(): number {
    return this.allJobs.filter(job => job.applied || String(job.status || '').toLowerCase() === 'applied').length;
  }

  get remoteCount(): number {
    return this.allJobs.filter(job => {
      const location = String(job.location || job.workType || '').toLowerCase();
      return location.includes('remote');
    }).length;
  }

  get activeCount(): number {
    return this.filteredJobs.filter(job => !job.applied).length;
  }

  getJobKey(job: CandidateJob) {
    return String(job.id || `${job.title}-${job.companyName}` || 'unknown');
  }

  reloadJobs() {
    this.loadJobs();
  }

  private loadJobs() {
    this.loading = true;
    this.error = '';
    this.successMessage = '';

    this.jobsService.getCandidateJobMatches().subscribe({
      next: jobs => {
        this.loading = false;
        this.allJobs = jobs;
      },
      error: () => {
        this.loading = false;
        this.error = 'Unable to fetch job matches';
      }
    });
  }

  apply(job: CandidateJob) {
    if (!job?.id || job.applied) {
      return;
    }

    this.successMessage = '';
    this.error = '';
    this.applyingJobId = this.getJobKey(job);

    this.jobsService.applyToJob(job.id).subscribe({
      next: () => {
        job.applied = true;
        job.status = 'applied';
        this.successMessage = 'Application submitted successfully.';
        this.applyingJobId = null;
      },
      error: () => {
        this.error = 'Unable to submit application';
        this.applyingJobId = null;
      }
    });
  }
}
