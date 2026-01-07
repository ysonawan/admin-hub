package com.admin.hub.app.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class ServerHealthSummary {
    private double cpuUsage = 0.0;
    private double memoryUsage = 0.0;
    private double diskUsage = 0.0;
    private double loadAverage = 0.0;
}
