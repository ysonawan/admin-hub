import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {environment} from "../../environments/environment.development";

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

  constructor(private http: HttpClient) { }

  getRunningServices(): Observable<RunningService[]> {
    return this.http.get<RunningService[]>(`${this.deploymentBaseUrl}/services/status`);
  }

  getServerHealthSummary(): Observable<ServerHealthSummary> {
    return this.http.get<ServerHealthSummary>(`${this.deploymentBaseUrl}/health/summary`);
  }
}
