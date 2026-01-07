import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NotificationService } from '../services/notification.service';

/**
 * HTTP Error Interceptor - Catches all HTTP errors and displays them globally
 * This interceptor is applied to all HTTP requests
 */
@Injectable()
export class HttpErrorInterceptor implements HttpInterceptor {

  constructor(private notificationService: NotificationService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Handle different error types
        this.handleError(error);
        return throwError(() => error);
      })
    );
  }

  private handleError(error: HttpErrorResponse): void {
    let message = 'An unexpected error occurred. Please try again.';
    let title = 'Error';

    // Log error for debugging
    console.error('HTTP Error:', error);

    if (error.error instanceof ErrorEvent) {
      // Client-side error occurred
      console.error('Client-side error:', error.error.message);
      message = error.error.message || 'An error occurred. Please try again.';
    } else {
      // Server responded with an error status
      const errorResponse = error.error;

      // Use error message from server response if available
      if (errorResponse?.message) {
        message = errorResponse.message;
      } else if (errorResponse?.error) {
        message = errorResponse.error;
      }

      // Handle specific HTTP status codes
      switch (error.status) {
        case 0:
          message = 'Unable to connect to the server. Please check your network connection.';
          title = 'Connection Error';
          break;

        case 400:
          message = message || 'Invalid request. Please check your input.';
          title = 'Bad Request';
          break;

        case 401:
          message = message || 'Your session has expired. Please login again.';
          title = 'Unauthorized';
          break;

        case 403:
          message = message || 'You do not have permission to perform this action.';
          title = 'Access Denied';
          break;

        case 404:
          message = message || 'The requested resource was not found.';
          title = 'Not Found';
          break;

        case 409:
          message = message || 'A conflict occurred. Please refresh and try again.';
          title = 'Conflict';
          break;

        case 422:
          message = message || 'Validation error. Please check your input.';
          title = 'Validation Error';
          break;

        case 500:
          message = 'An error occurred on the server. Please try again later.';
          title = 'Server Error';
          break;

        case 502:
        case 503:
        case 504:
          message = 'Server is temporarily unavailable. Please try again later.';
          title = 'Service Unavailable';
          break;

        default:
          if (error.status >= 400 && error.status < 500) {
            title = 'Client Error';
          } else if (error.status >= 500) {
            title = 'Server Error';
          }
      }
    }

    // Display the error notification
    this.notificationService.error(message, title);
  }
}

