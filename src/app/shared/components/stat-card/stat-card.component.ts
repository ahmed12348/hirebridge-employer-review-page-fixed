import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stat-card.component.html',
  styleUrls: ['./stat-card.component.css']
})
export class StatCardComponent {
  @Input() title = '';
  @Input() value: number | string = 0;
  @Input() description = '';
  @Input() variant: 'blue' | 'green' | 'orange' | 'red' = 'blue';

  get colorClass(): string {
    return this.variant;
  }

  get iconClass(): string {
    switch (this.variant) {
      case 'green':
        return 'fas fa-check-circle';
      case 'orange':
        return 'fas fa-hourglass-half';
      case 'red':
        return 'fas fa-xmark-circle';
      default:
        return 'fas fa-rocket';
    }
  }
}
