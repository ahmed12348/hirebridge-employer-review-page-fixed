import { Component } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-job-details',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './job-details.component.html',
  styleUrls: ['./job-details.component.css']
})
export class JobDetailsComponent {

  jobId: number = 0;
  job: any;

  jobs = [
    {
      id: 1,
      title: 'Frontend Developer',
      company: 'Tech Corp',
      location: 'Cairo',
      salary: 10000,
      type: 'Full-time',
      description: 'We are looking for a skilled frontend developer with Angular experience.',
      skills: ['Angular', 'TypeScript', 'HTML', 'CSS']
    },
    {
      id: 2,
      title: 'Backend Developer',
      company: 'Smart',
      location: 'Remote',
      salary: 15000,
      type: 'Remote',
      description: 'Build scalable backend services using Node.js.',
      skills: ['Node.js', 'Express', 'MongoDB']
    }
  ];

  favorites: number[] = [];

  showApplyModal = false;

  applyData = {
    name: '',
    email: '',
    message: ''
  };

  file: File | null = null;
  fileName: string = '';

  // 🔥 validation + success
  submitted = false;
  showSuccess = false;

  constructor(private route: ActivatedRoute) {
    this.jobId = +this.route.snapshot.paramMap.get('id')!;
    this.job = this.jobs.find(j => j.id === this.jobId);

    const saved = localStorage.getItem('favorites');
    if (saved) {
      this.favorites = JSON.parse(saved);
    }
  }

  toggleFavorite(id: number) {
    const index = this.favorites.indexOf(id);

    if (index > -1) {
      this.favorites.splice(index, 1);
    } else {
      this.favorites.push(id);
    }

    localStorage.setItem('favorites', JSON.stringify(this.favorites));
  }

  isFavorite(id: number) {
    return this.favorites.includes(id);
  }

  openApply() {
    this.showApplyModal = true;
  }

  closeApply() {
    this.showApplyModal = false;
    this.submitted = false;
  }

  // 📎 Upload
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.file = file;
      this.fileName = file.name;
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onDrop(event: DragEvent) {
    event.preventDefault();

    if (event.dataTransfer?.files.length) {
      const file = event.dataTransfer.files[0];
      this.file = file;
      this.fileName = file.name;
    }
  }

  submitApplication() {
    this.submitted = true;

    if (!this.applyData.name || !this.applyData.email || !this.file) {
      return;
    }

    this.showSuccess = true;

    setTimeout(() => {
      this.showSuccess = false;
      this.closeApply();

      this.applyData = { name: '', email: '', message: '' };
      this.file = null;
      this.fileName = '';
      this.submitted = false;
    }, 2000);
  }
}