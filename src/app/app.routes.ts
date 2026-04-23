import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout-component/layout-component';
import { authGuard } from './core/guards/auth-guard';
import { RoleGuard } from './core/guards/role-guard';
import { emailVerificationGuard } from './core/guards/email-verification-guard';

export const routes: Routes = [
  // 🔄 Default redirect to login
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },

  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'admin-login',
    loadComponent: () =>
      import('./features/auth/admin-login/admin-login.component').then(m => m.AdminLoginComponent)
  },
  {
    path: 'admin-signup',
    loadComponent: () =>
      import('./features/auth/admin-sign-up/admin-sign-up.component').then(
        m => m.AdminSignUpComponent
      )
  },
  {
    path: 'signup',
    loadComponent: () =>
      import('./features/auth/sign-up/sign-up.component').then(m => m.SignupComponent)
  },
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./pages/verify-email/verify-email.component').then(m => m.VerifyEmailComponent)
  },
  {
    path: 'company-verify-email',
    loadComponent: () =>
      import('./pages/company-verify-email/company-verify-email').then(
        m => m.CompanyVerifyEmailComponent
      )
  },
  {
    path: 'choose-role',
    canActivate: [emailVerificationGuard],
    loadComponent: () =>
      import('./pages/choose-role/choose-role.component').then(m => m.ChooseRoleComponent)
  },
  {
    path: 'candidate-setup',
    canActivate: [emailVerificationGuard],
    loadComponent: () =>
      import('./pages/candidate-setup/candidate-setup.component').then(
        m => m.CandidateSetupComponent
      )
  },
  {
    path: 'company-setup',
    canActivate: [emailVerificationGuard],
    loadComponent: () =>
      import('./features/employer/company-setup/company-setup.component').then(
        m => m.CompanySetupComponent
      )
  },

  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule)
  },

  // ===== Candidate =====
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard, RoleGuard],
    data: { role: 'candidate' },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/candidate/dashboard/dashboard.component').then(
            m => m.CandidateDashboardComponent
          )
      },
      {
        path: 'jobs',
        redirectTo: 'applications',
        pathMatch: 'full'
      },
      {
        path: 'applications',
        loadComponent: () =>
          import('./features/candidate/applications/applications.component').then(
            m => m.ApplicationsComponent
          )
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/candidate/profile/profile.component').then(
            m => m.ProfileComponent
          )
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/candidate/settings/settings.component').then(
            m => m.SettingsComponent
          )
      }
    ]
  },

  // ===== Employer =====
  {
    path: 'employer',
    component: LayoutComponent,
    canActivate: [authGuard, RoleGuard],
    data: { role: 'employer' },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/employer/dashboard/dashboard-page.component').then(
            m => m.EmployerDashboardPageComponent
          )
      },

      {
        path: 'jobs',
        loadComponent: () =>
          import('./features/employer/jobs/posted-jobs-page.component').then(
            m => m.EmployerPostedJobsPageComponent
          )
      },

      // ⚠️ مهم: خليها نفس الصفحة مؤقتًا عشان تمنع errors
      {
        path: 'jobs/new',
        loadComponent: () =>
          import('./features/employer/jobs/create-job-page.component').then(
            m => m.EmployerCreateJobPageComponent
          )
      },

      {
        path: 'jobs/new/:companyId',
        loadComponent: () =>
          import('./features/employer/jobs/create-job-page.component').then(
            m => m.EmployerCreateJobPageComponent
          )
      },

      // 🔥 صفحة Review Candidates
      {
        path: 'jobs/:id/review-candidates',
        loadComponent: () =>
          import('./features/employer/review-candidates/review-candidates-page.component').then(
            m => m.EmployerReviewCandidatesPageComponent
          )
      },

      // ⚠️ مهم: خليها آخر حاجة
      {
        path: 'jobs/:id',
        loadComponent: () =>
          import('./features/employer/job-details/job-details-page.component').then(
            m => m.EmployerJobDetailsPageComponent
          )
      },

      {
        path: 'company-profile',
        loadComponent: () =>
          import('./features/employer/company-setup/company-profile-page.component').then(
            m => m.EmployerCompanyProfilePageComponent
          )
      },

      {
        path: 'interviews',
        loadComponent: () =>
          import('./features/employer/interviews/interviews.component').then(
            m => m.EmployerInterviewsComponent
          )
      }
    ]
  },

  { path: '**', redirectTo: 'login' }
];
