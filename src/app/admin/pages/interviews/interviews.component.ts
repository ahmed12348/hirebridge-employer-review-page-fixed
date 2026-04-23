import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AdminMockService } from '../../services/admin-mock.service';

@Component({
  selector: 'app-admin-interviews-page',
  imports: [CommonModule],
  templateUrl: './interviews.component.html',
  styleUrl: './interviews.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminInterviewsComponent {
  private readonly adminMockService = inject(AdminMockService);
  readonly interviews = computed(() => this.adminMockService.getInterviews());
  readonly scheduledCount = computed(
    () => this.interviews().filter(interview => interview.status === 'Scheduled').length
  );
  readonly pendingCount = computed(
    () => this.interviews().filter(interview => interview.status === 'Pending').length
  );
  readonly completedCount = computed(
    () => this.interviews().filter(interview => interview.status === 'Completed').length
  );

  getStatusClass(status: string): string {
    if (status === 'Scheduled') {
      return 'status-pill scheduled';
    }

    if (status === 'Completed') {
      return 'status-pill completed';
    }

    return 'status-pill pending';
  }
}
