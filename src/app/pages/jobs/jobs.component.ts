import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './jobs.component.html',
  styleUrls: ['./jobs.component.css']
})
export class JobsComponent implements OnInit {

  searchTerm: string = '';

  selectedTypes: string[] = [];
  selectedLocations: string[] = [];

  maxSalary: number = 20000;

  showFavoritesOnly = false;

  favorites: number[] = [];

  jobs = [
    { id: 1, title: 'Frontend Developer', company: 'Tech Corp', location: 'Cairo', salary: 10000, type: 'Full-time' },
    { id: 2, title: 'Backend Developer', company: 'Smart', location: 'Remote', salary: 15000, type: 'Remote' },
    { id: 3, title: 'UI Designer', company: 'Creative', location: 'Alex', salary: 8000, type: 'Part-time' }
  ];

  // 🔥 تحميل الفيفوريت
  ngOnInit() {
    const saved = localStorage.getItem('favorites');

    if (saved) {
      this.favorites = JSON.parse(saved);
    }
  }

  // ⭐ Favorite Toggle + Save
  toggleFavorite(id: number) {
    const index = this.favorites.indexOf(id);

    if (index > -1) {
      this.favorites.splice(index, 1);
    } else {
      this.favorites.push(id);
    }

    // 💾 حفظ
    localStorage.setItem('favorites', JSON.stringify(this.favorites));
  }

  isFavorite(id: number) {
    return this.favorites.includes(id);
  }

  // 🔁 Multi-select
  toggleSelection(value: string, list: string[]) {
    const index = list.indexOf(value);

    if (index > -1) {
      list.splice(index, 1);
    } else {
      list.push(value);
    }
  }

  // 🔍 Filtering
  get filteredJobs() {
    return this.jobs.filter(job => {

      const matchesSearch =
        job.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        job.company.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesType =
        this.selectedTypes.length
          ? this.selectedTypes.includes(job.type)
          : true;

      const matchesLocation =
        this.selectedLocations.length
          ? this.selectedLocations.includes(job.location)
          : true;

      const matchesSalary =
        job.salary <= this.maxSalary;

      const matchesFavorites =
        this.showFavoritesOnly
          ? this.favorites.includes(job.id)
          : true;

      return matchesSearch && matchesType && matchesLocation && matchesSalary && matchesFavorites;
    });
  }
}