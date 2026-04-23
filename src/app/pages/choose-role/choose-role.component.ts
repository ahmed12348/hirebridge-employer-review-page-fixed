import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-choose-role',
  imports: [CommonModule],
  templateUrl: './choose-role.component.html',
  styleUrl: './choose-role.component.css'
})
export class ChooseRoleComponent {
  selectedRole: 'candidate' | 'employer' | null = null;

  error = false;
  loading = false;

  constructor(private router: Router) {}

  selectRole(role: 'candidate' | 'employer'): void {
    this.selectedRole = role;
    this.error = false;
  }

  continue(): void {
    if (!this.selectedRole) {
      this.error = true;
      return;
    }

    this.loading = true;

    setTimeout(() => {
      const user = JSON.parse(localStorage.getItem('user') || '{}');

      if (this.selectedRole === 'candidate') {
        user.role = 'candidate';
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('role', 'candidate');

        this.router.navigate(['/candidate-setup'], { replaceUrl: true });
        return;
      }

      user.role = 'employer';
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('role', 'employer');

      this.router.navigate(['/company-setup'], { replaceUrl: true });
    }, 300);
  }
}