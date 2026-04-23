import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// 🔥 بدل AuthService
import { CandidateService } from '../../core/services/candidate.service';

@Component({
  standalone: true,
  selector: 'app-candidate-setup',
  imports: [CommonModule, FormsModule],
  templateUrl: './candidate-setup.component.html',
  styleUrls: ['./candidate-setup.component.css']
})
export class CandidateSetupComponent {

  loading = false;
  success = false;
  submitted = false;
  errorMessage = '';

  // 🔥 skills system
  skills: string[] = [];
  skillInput = '';

  candidate = {
    specialization: '',
    experienceLevel: '',
    expectedSalary: '',
    workType: '',
    status: '',
    cvUrl: ''
  };

  constructor(
    private candidateService: CandidateService, // ✅ هنا التعديل
    private router: Router
  ) {}

  // ✅ validation helper
  isEmpty(value: any): boolean {
    return !value || value.toString().trim() === '';
  }

  // 🔥 ADD SKILL
  addSkill(event: any) {
    event.preventDefault();

    const value = this.skillInput.trim();

    if (value && !this.skills.includes(value)) {
      this.skills.push(value);
    }

    this.skillInput = '';
  }

  // 🔥 REMOVE SKILL
  removeSkill(index: number) {
    this.skills.splice(index, 1);
  }

  // 🔥 VALIDATION
  isValid(): boolean {
    return !(
      this.isEmpty(this.candidate.specialization) ||
      this.isEmpty(this.candidate.experienceLevel) ||
      this.isEmpty(this.candidate.expectedSalary) ||
      this.isEmpty(this.candidate.workType) ||
      this.isEmpty(this.candidate.cvUrl) ||
      this.skills.length === 0 ||
      this.isEmpty(this.candidate.status)
    );
  }

  // 🚀 SUBMIT
  submit() {

    this.submitted = true;
    this.errorMessage = '';

    if (!this.isValid()) {
      this.errorMessage = 'Please fill all fields ❌';
      return;
    }

    this.loading = true;

    const payload = {
      candidateProfile: {
        specialization: this.candidate.specialization,
        experienceLevel: this.candidate.experienceLevel,

        expectedSalary: Number(this.candidate.expectedSalary), // 🔥 number

        workType: this.candidate.workType,
        cvUrl: this.candidate.cvUrl,

        skills: this.skills, // 🔥 array

        status: this.candidate.status
      }
    };

    // 🔥 هنا التعديل
    this.candidateService.updateCandidateProfile(payload).subscribe({

      next: () => {
        this.loading = false;
        this.success = true;

        localStorage.removeItem('allowChooseRole');

        setTimeout(() => {
          this.router.navigate(['/dashboard'], { replaceUrl: true });
        }, 800);
      },

      error: (err: any) => {
        this.loading = false;

        this.errorMessage =
          err?.error?.message || 'Something went wrong ❌';
      }
    });
  }
}