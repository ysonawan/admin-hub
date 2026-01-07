import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';

export interface ApplicationConfig {
  name: string;
  git_url?: string;
  branch?: string;
  build_type?: string;
  artifact_path?: string;
  service_name?: string;
  deploy_path?: string;
  application_url?: string;
  symlink?: string;
}

export interface DeploymentResponse {
  applicationName: string;
  action: string;
  success: boolean;
  message: string;
  data?: any;
  status?: string;
  logs?: string;
  details?: any;
}

@Injectable({
  providedIn: 'root'
})
export class DeploymentService {
  private apiUrl = environment.apiUrl || 'http://localhost:8089/api';
  private deploymentBaseUrl = `${this.apiUrl}/deployment`;

  constructor(private http: HttpClient) { }

  /**
   * Check health of deployment service
   */
  getHealth(): Observable<any> {
    return this.http.get(`${this.deploymentBaseUrl}/health`);
  }

  /**
   * Get all configured applications
   */
  getApplications(): Observable<ApplicationConfig[]> {
    return this.http.get<ApplicationConfig[]>(`${this.deploymentBaseUrl}/applications`);
  }

  /**
   * Checkout application repository
   */
  checkout(applicationName: string): Observable<DeploymentResponse> {
    return this.http.post<DeploymentResponse>(
      `${this.deploymentBaseUrl}/checkout/${applicationName}`,
      {}
    );
  }

  /**
   * Build application
   */
  build(applicationName: string): Observable<DeploymentResponse> {
    return this.http.post<DeploymentResponse>(
      `${this.deploymentBaseUrl}/build/${applicationName}`,
      {}
    );
  }

  /**
   * Verify build artifact
   */
  verify(applicationName: string): Observable<DeploymentResponse> {
    return this.http.post<DeploymentResponse>(
      `${this.deploymentBaseUrl}/verify/${applicationName}`,
      {}
    );
  }

  /**
   * Deploy application
   */
  deploy(applicationName: string): Observable<DeploymentResponse> {
    return this.http.post<DeploymentResponse>(
      `${this.deploymentBaseUrl}/deploy/${applicationName}`,
      {}
    );
  }

  /**
   * Restart application service
   */
  restart(applicationName: string): Observable<DeploymentResponse> {
    return this.http.post<DeploymentResponse>(
      `${this.deploymentBaseUrl}/restart/${applicationName}`,
      {}
    );
  }

  /**
   * Stop application service
   */
  stop(applicationName: string): Observable<DeploymentResponse> {
    return this.http.post<DeploymentResponse>(
      `${this.deploymentBaseUrl}/stop/${applicationName}`,
      {}
    );
  }

  /**
   * Get application status
   */
  getStatus(applicationName: string): Observable<DeploymentResponse> {
    return this.http.get<DeploymentResponse>(
      `${this.deploymentBaseUrl}/status/${applicationName}`
    );
  }

  /**
   * Get application logs
   */
  getLogs(applicationName: string, lines: number = 100): Observable<DeploymentResponse> {
    let params = new HttpParams();
    params = params.set('lines', lines.toString());
    return this.http.get<DeploymentResponse>(
      `${this.deploymentBaseUrl}/logs/${applicationName}`,
      { params }
    );
  }

  /**
   * Execute full deployment workflow
   */
  fullDeploy(applicationName: string): Observable<DeploymentResponse> {
    return this.http.post<DeploymentResponse>(
      `${this.deploymentBaseUrl}/full-deploy/${applicationName}`,
      {}
    );
  }

  /**
   * Execute custom action
   */
  executeAction(applicationName: string, action: string, lines?: number): Observable<DeploymentResponse> {
    return this.http.post<DeploymentResponse>(
      `${this.deploymentBaseUrl}/execute`,
      { applicationName, action, lines }
    );
  }

  /**
   * Check if application is live by testing the application URL
   */
  checkAppLiveStatus(appName: string): Observable<any> {
    return this.http.get(`${this.deploymentBaseUrl}/applications/${appName}/health`);
  }
}
