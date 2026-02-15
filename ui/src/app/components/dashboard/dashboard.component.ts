import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { DeploymentService, ApplicationConfig, DeploymentResponse } from '../../services/deployment.service';
import { ServerService, RunningService, ServerHealthSummary } from '../../services/server.service';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.css'],
    standalone: false
})
export class DashboardComponent implements OnInit, OnDestroy {
  applications: ApplicationConfig[] = [];
  loading = true;
  selectedApp: ApplicationConfig | null = null;
  selectedAction: string = '';
  deploymentResponse: DeploymentResponse | null = null;
  showLogsModal = false;
  showStatusModal = false;
  logsContent = '';
  statusContent = '';
  activeActionMap: { [key: string]: boolean } = {};
  filterText = '';
  serviceStatus: string = 'Checking...';
  private healthCheckInterval: any;
  private appStatusCheckInterval: any;
  private serverHealthInterval: any;
  private previousServiceStatus: string = 'Checking...';
  appLiveStatus: { [key: string]: boolean | null } = {};
  private healthAndAppsSubscription: Subscription | null = null;
  private serverHealthSubscription: Subscription | null = null;

  // Server-related properties
  runningServices: RunningService[] = [];
  serverHealth: ServerHealthSummary | null = null;
  serverLoading = true;
  showRunningServices = false;

  actions = [
    { id: 'checkout', label: 'Checkout', icon: '🔄', color: 'purple' },
    { id: 'build', label: 'Build', icon: '🔨', color: 'yellow' },
    { id: 'verify', label: 'Verify', icon: '✓', color: 'green' },
    { id: 'deploy', label: 'Deploy', icon: '🚀', color: 'orange' },
    { id: 'stop', label: 'Stop', icon: '⏹️', color: 'red' },
    { id: 'restart', label: 'Restart', icon: '⚡', color: 'red' },
  ];

  constructor(
      private deploymentService: DeploymentService,
      private serverService: ServerService,
      private router: Router,
      private toastr: ToastrService
  ) {
  }

  ngOnInit(): void {
    this.loadApplications();
    this.loadServerData();
    this.checkDeployerHealth();

    // Subscribe to health and app status updates via SSE
    this.healthAndAppsSubscription = this.deploymentService.subscribeToHealthAndAppStatus().subscribe(
      (event: any) => {
        if (event.type === 'health') {
          const health = event.data;
          const newStatus = health.healthy ? 'Online' : 'Offline';

          // Check if status changed from Offline to Online
          if (this.previousServiceStatus === 'Offline' && newStatus === 'Online') {
            this.loadApplications();
          }

          this.previousServiceStatus = this.serviceStatus;
          this.serviceStatus = newStatus;
        } else if (event.type === 'appStatus') {
          const appStatuses = event.data.appStatuses;
          this.appLiveStatus = { ...appStatuses };
        }
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (error) => {
        console.error('Error subscribing to health updates', error);
        // Fallback to periodic polling if SSE fails
        this.healthCheckInterval = setInterval(() => {
          this.checkDeployerHealth();
          this.checkAllAppsLiveStatus();
        }, 10000);
      }
    );

    // Subscribe to server health updates via SSE
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    this.serverHealthSubscription = this.serverService.subscribeToServerHealth().subscribe(
      (event: any) => {
        if (event.type === 'serverHealth') {
          const serverHealthData = event.data;
          this.serverHealth = {
            cpuUsage: serverHealthData.cpuUsage,
            memoryUsage: serverHealthData.memoryUsage,
            diskUsage: serverHealthData.diskUsage,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            loadAverage: serverHealthData.loadAverage,
            totalMemory: serverHealthData.totalMemory,
            usedMemory: serverHealthData.usedMemory,
            uptime: serverHealthData.uptime,
            usedDisk: serverHealthData.usedDisk,
            totalDisk: serverHealthData.totalDisk
          };
          this.runningServices = serverHealthData.runningServices || [];
          this.serverLoading = false;
        }
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (error) => {
        console.error('Error subscribing to server health updates', error);
        // Fallback to periodic polling if SSE fails
        this.serverHealthInterval = setInterval(() => {
          this.loadServerData();
        }, 30000);
      }
    );
  }

  ngOnDestroy(): void {
    // Unsubscribe from SSE streams
    if (this.healthAndAppsSubscription) {
      this.healthAndAppsSubscription.unsubscribe();
    }
    if (this.serverHealthSubscription) {
      this.serverHealthSubscription.unsubscribe();
    }

    // Clean up the health check interval if it's set (fallback polling)
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    // Clean up the app status check interval if it's set
    if (this.appStatusCheckInterval) {
      clearInterval(this.appStatusCheckInterval);
    }
    // Clean up the server health interval if it's set (fallback polling)
    if (this.serverHealthInterval) {
      clearInterval(this.serverHealthInterval);
    }
  }

  checkDeployerHealth(): void {
    this.deploymentService.getHealth().subscribe(
      (health) => {
        const newStatus = health.healthy ? 'Online' : 'Offline';

        // Check if status changed from Offline to Online
        if (this.previousServiceStatus === 'Offline' && newStatus === 'Online') {
          // Service came back online, refresh applications
          this.loadApplications();
        }

        this.previousServiceStatus = this.serviceStatus;
        this.serviceStatus = newStatus;
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (error) => {
        this.previousServiceStatus = this.serviceStatus;
        this.serviceStatus = 'Error';
      }
    );
  }

  loadApplications(): void {
    this.loading = true;
    this.deploymentService.getApplications().subscribe(
      (apps) => {
        this.applications = apps;
        this.loading = false;
        this.checkAllAppsLiveStatus();
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (error) => {
        this.loading = false;
      }
    );
  }

  getFilteredApplications(): ApplicationConfig[] {
    if (!this.filterText) {
      return this.applications;
    }
    return this.applications.filter(app =>
      app.name.toLowerCase().includes(this.filterText.toLowerCase()) ||
      (app.git_url && app.git_url.toLowerCase().includes(this.filterText.toLowerCase())) ||
      (app.service_name && app.service_name.toLowerCase().includes(this.filterText.toLowerCase()))
    );
  }

  selectApp(app: ApplicationConfig): void {
    if(this.selectedApp && this.selectedApp.name === app.name) {
      this.selectedApp = null;
    } else {
      this.selectedApp = app;
      if (app.application_url) {
        this.checkAppLiveStatus(app.name);
      }
    }
    this.selectedAction = '';
    this.deploymentResponse = null;
  }

  getDescription(app: ApplicationConfig): string {
    if (!app) return 'No description';
    const parts = [];
    if (app.build_type) parts.push(`Build: ${app.build_type}`);
    if (app.service_name) parts.push(`Service: ${app.service_name}`);
    return parts.length > 0 ? parts.join(' | ') : 'No description';
  }

  executeAction(action: string): void {
    if (!this.selectedApp) return;

    const appName = this.selectedApp.name;
    const key = `${appName}-${action}`;

    this.activeActionMap[key] = true;

    const actionObservable = this.getActionObservable(action, appName);

    actionObservable.subscribe(
      (response) => {
        this.deploymentResponse = response;
        this.activeActionMap[key] = false;

        if (response.success) {
          this.toastr.success(response.message, `${action.charAt(0).toUpperCase() + action.slice(1)} Complete`);

          // Handle specific actions
          if (action === 'logs') {
            // Extract logs from nested response structure
            this.logsContent = this.extractLogsFromResponse(response);
            this.showLogsModal = true;
          } else if (action === 'status') {
            this.statusContent = JSON.stringify(response.data || response, null, 2);
            this.showStatusModal = true;
          }
        } else {
          this.toastr.error(response.message, `${action.charAt(0).toUpperCase() + action.slice(1)} Failed`);
        }
        this.checkAppLiveStatus(appName);
      },
      (error) => {
        this.activeActionMap[key] = false;
        const errorMsg = error.error?.message || error.message || 'Unknown error occurred';
        console.log(errorMsg);
        this.checkAppLiveStatus(appName);
      }
    );
  }

  private extractLogsFromResponse(response: DeploymentResponse): string {
    if (!response.data) {
      return 'No logs available';
    }

    // Handle nested structure: data.logs.stdout
    if (typeof response.data === 'object') {
      const dataObj = response.data as any;

      // Check for logs.stdout
      if (dataObj.logs && dataObj.logs.stdout) {
        return dataObj.logs.stdout;
      }

      // Check for logs string
      if (dataObj.logs && typeof dataObj.logs === 'string') {
        return dataObj.logs;
      }

      // Check for direct stdout
      if (dataObj.stdout) {
        return dataObj.stdout;
      }
    }

    return 'No logs available';
  }

  private getActionObservable(action: string, appName: string) {
    switch (action) {
      case 'status':
        return this.deploymentService.getStatus(appName);
      case 'logs':
        return this.deploymentService.getLogs(appName, 1000);
      case 'checkout':
        return this.deploymentService.checkout(appName);
      case 'build':
        return this.deploymentService.build(appName);
      case 'verify':
        return this.deploymentService.verify(appName);
      case 'deploy':
        return this.deploymentService.deploy(appName);
      case 'restart':
        return this.deploymentService.restart(appName);
      case 'full-deploy':
        return this.deploymentService.fullDeploy(appName);
      case 'stop':
        return this.deploymentService.stop(appName);
      default:
        return this.deploymentService.executeAction(appName, action);
    }
  }

  isActionActive(action: string): boolean {
    if (!this.selectedApp) return false;
    return this.activeActionMap[`${this.selectedApp.name}-${action}`] || false;
  }

  closeLogsModal(): void {
    this.showLogsModal = false;
  }

  closeStatusModal(): void {
    this.showStatusModal = false;
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.toastr.success('Copied to clipboard', 'Success');
    });
  }

  checkAppLiveStatus(appName: string): void {
    this.appLiveStatus[appName] = null; // Set to checking
    this.deploymentService.checkAppLiveStatus(appName).subscribe(
      (response) => {
        this.appLiveStatus[appName] = response.live || false;
      },
      (error) => {
        this.appLiveStatus[appName] = false;
      }
    );
  }

  checkAllAppsLiveStatus(): void {
    for (const app of this.applications) {
      if (app.application_url) {
        this.checkAppLiveStatus(app.name);
      }
    }
  }

  loadServerData(): void {
    this.serverLoading = true;
    this.serverService.getServerHealthSummary().subscribe(
      (health: ServerHealthSummary) => {
        this.serverHealth = health;
        this.serverLoading = false;
      },
      (error: any) => {
        this.serverLoading = false;
      }
    );

    this.serverService.getRunningServices().subscribe(
      (services: RunningService[]) => {
        this.runningServices = services;
      },
      (error: any) => {
        this.runningServices = [];
      }
    );
  }

  refreshDashboard(): void {
    this.loadApplications();
    this.loadServerData();
    this.checkDeployerHealth();
  }
}
