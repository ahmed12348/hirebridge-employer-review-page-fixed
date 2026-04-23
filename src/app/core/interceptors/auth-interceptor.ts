import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler
} from '@angular/common/http';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  intercept(req: HttpRequest<any>, next: HttpHandler) {

    const token = localStorage.getItem('authToken');

    // لو مفيش token سيب الريكوست زي ما هو
    if (!token) {
      return next.handle(req);
    }

    // 🔥 ضيف التوكن في الهيدر
    const cloned = req.clone({
      setHeaders: {
        auth: token
      }
    });

    return next.handle(cloned);
  }
}