import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-outlet',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-outlet.component.html',
  styleUrls: ['./toast-outlet.component.css']
})
export class ToastOutletComponent {
  constructor(public toastService: ToastService) {}

  dismiss(id: number): void {
    this.toastService.dismiss(id);
  }
}
