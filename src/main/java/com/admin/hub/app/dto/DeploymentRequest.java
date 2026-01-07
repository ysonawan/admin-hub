package com.admin.hub.app.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DeploymentRequest {
    private String applicationName;
    private String action; // checkout, build, verify, deploy, restart, status, logs, full-deploy
    private Integer lines; // For logs endpoint, default 100
}
