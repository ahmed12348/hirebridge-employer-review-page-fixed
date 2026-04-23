import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-job-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './job-card.component.html',
  styleUrls: ['./job-card.component.css']
})
export class JobCardComponent {
  @Input() title = '';
  @Input() company = '';
  @Input() salary = '';
  @Input() match = 0;
  @Input() location = '';
  @Input() status = '';
  @Input() canApply = false;
  @Output() apply = new EventEmitter<void>();
}
