import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'info';
  text: string;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private readonly messagesSubject = new BehaviorSubject<ToastMessage[]>([]);
  private nextId = 1;

  readonly messages$ = this.messagesSubject.asObservable();

  show(type: ToastMessage['type'], text: string, duration = 3000): void {
    const message: ToastMessage = {
      id: this.nextId++,
      type,
      text
    };

    this.messagesSubject.next([...this.messagesSubject.value, message]);

    setTimeout(() => {
      this.dismiss(message.id);
    }, duration);
  }

  success(text: string, duration?: number): void {
    this.show('success', text, duration);
  }

  error(text: string, duration?: number): void {
    this.show('error', text, duration);
  }

  info(text: string, duration?: number): void {
    this.show('info', text, duration);
  }

  dismiss(id: number): void {
    this.messagesSubject.next(this.messagesSubject.value.filter(message => message.id !== id));
  }
}
