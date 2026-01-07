import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

export interface ErrorNotification {
  message: string;
  errorCode?: string;
  title?: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  constructor(private toastr: ToastrService) { }

  /**
   * Show success message
   */
  success(message: string, title: string = 'Success', duration: number = 5000): void {
    this.toastr.success(message, title, {
      timeOut: duration,
      progressBar: true,
      closeButton: true
    });
  }

  /**
   * Show error message
   */
  error(message: string, title: string = 'Error', duration: number = 5000): void {
    this.toastr.error(message, title, {
      timeOut: duration,
      progressBar: true,
      closeButton: true
    });
  }

  /**
   * Show warning message
   */
  warning(message: string, title: string = 'Warning', duration: number = 5000): void {
    this.toastr.warning(message, title, {
      timeOut: duration,
      progressBar: true,
      closeButton: true
    });
  }

  /**
   * Show info message
   */
  info(message: string, title: string = 'Info', duration: number = 5000): void {
    this.toastr.info(message, title, {
      timeOut: duration,
      progressBar: true,
      closeButton: true
    });
  }

  /**
   * Handle error notification with optional custom title and error code handling
   */
  handleError(error: ErrorNotification | string): void {
    if (typeof error === 'string') {
      this.error(error);
    } else {
      const title = error.title || 'Error';
      const message = error.message;
      this.error(message, title);
    }
  }

  /**
   * Handle HTTP error response
   */
  handleHttpError(response: any): void {
    let message = 'An unexpected error occurred. Please try again.';
    let title = 'Error';

    if (response?.error?.message) {
      message = response.error.message;
    } else if (response?.message) {
      message = response.message;
    } else if (response?.status === 0) {
      message = 'Unable to connect to the server. Please check your network connection.';
      title = 'Connection Error';
    } else if (response?.status === 401) {
      message = 'Your session has expired. Please login again.';
      title = 'Session Expired';
    } else if (response?.status === 403) {
      message = 'You do not have permission to perform this action.';
      title = 'Access Denied';
    } else if (response?.status === 404) {
      message = 'The requested resource was not found.';
      title = 'Not Found';
    } else if (response?.status === 500) {
      message = 'An error occurred on the server. Please try again later.';
      title = 'Server Error';
    }

    this.error(message, title);
  }
}

