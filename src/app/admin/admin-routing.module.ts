import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LayoutComponent } from '../layout/layout-component/layout-component';
import { AdminDashboardComponent } from './pages/dashboard/dashboard.component';
import { AdminJobsComponent } from './pages/jobs/jobs.component';
import { AdminJobDetailsComponent } from './pages/job-details/job-details.component';
import { AdminCandidatesComponent } from './pages/candidates/candidates.component';
import { AdminCompaniesComponent } from './pages/companies/companies.component';
import { AdminInterviewsComponent } from './pages/interviews/interviews.component';

const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        component: AdminDashboardComponent
      },
      {
        path: 'jobs',
        component: AdminJobsComponent
      },
      {
        path: 'jobs/:id',
        component: AdminJobDetailsComponent
      },
      {
        path: 'candidates',
        component: AdminCandidatesComponent
      },
      {
        path: 'companies',
        component: AdminCompaniesComponent
      },
      {
        path: 'interviews',
        component: AdminInterviewsComponent
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule {}
