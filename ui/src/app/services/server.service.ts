import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {environment} from "../../environments/environment.development";
import { AuthService } from './auth.service';

export interface RunningService {
  name: string;
  status: string;
  description?: string;
}

export interface ServerHealthSummary {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  loadAverage: number;
  totalMemory?: string;
  usedMemory?: string;
  uptime?: string;
  usedDisk?: string;
  totalDisk?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ServerService {

  private apiUrl = environment.apiUrl || 'http://localhost:8089/api';
  private deploymentBaseUrl = `${this.apiUrl}/server`;

  constructor(private http: HttpClient, private authService: AuthService) { }

  getRunningServices(): Observable<RunningService[]> {
    return this.http.get<RunningService[]>(`${this.deploymentBaseUrl}/services/status`);
  }

  getServerHealthSummary(): Observable<ServerHealthSummary> {
    return this.http.get<ServerHealthSummary>(`${this.deploymentBaseUrl}/health/summary`);
  }

  /**
   * Subscribe to server health and services updates via SSE
   */
  /**
   * Subscribe to server health and services updates via SSE
   */
  subscribeToServerHealth(): Observable<any> {
    return new Observable(observer => {
      const token = this.authService.token;
      const url = `${this.deploymentBaseUrl}/health/stream`;
      let abortController: AbortController | null = null;

      if (!token) {
        observer.error(new Error('No authentication token available'));
        return () => {};
      }

      abortController = new AbortController();

      fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        signal: abortController.signal
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.body;
        })
        .then(body => {
          if (!body) {
            throw new Error('No response body');
          }

          const reader = body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          const processStream = async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();

                if (done) {
                  if (buffer.trim()) {
                    this.parseSSEEvent(buffer, observer);
                  }
                  observer.complete();
                  break;
                }

                buffer += decoder.decode(value, { stream: true });
                const parts = buffer.split('\n\n');

                for (let i = 0; i < parts.length - 1; i++) {
                  if (parts[i].trim()) {
                    this.parseSSEEvent(parts[i], observer);
                  }
                }

                buffer = parts[parts.length - 1];
              }
            } catch (error: any) {
              if (error.name !== 'AbortError') {
                observer.error(error);
              }
            }
          };

          processStream();
        })
        .catch((error: any) => {
          if (error.name !== 'AbortError') {
            observer.error(error);
          }
        });

      return () => {
        if (abortController) {
          abortController.abort();
        }
      };
    });
  }

  /**
   * Parse Server-Sent Events format
   */
  private parseSSEEvent(eventString: string, observer: any): void {
    const lines = eventString.split('\n');
    const event: { [key: string]: string } = {};

    for (const line of lines) {
      if (line.startsWith('event:')) {
        event['event'] = line.substring(6).trim();
      } else if (line.startsWith('data:')) {
        event['data'] = line.substring(5).trim();
      } else if (line.startsWith('id:')) {
        event['id'] = line.substring(3).trim();
      }
    }

    if (event['data'] && event['event']) {
      try {
        observer.next({
          type: event['event'],
          data: JSON.parse(event['data'])
        });
      } catch (error) {
        console.error('Error parsing SSE event data:', error);
      }
    }
  }
}
