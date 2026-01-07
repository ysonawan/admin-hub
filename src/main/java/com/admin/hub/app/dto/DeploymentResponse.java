package com.admin.hub.app.dto;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashMap;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class DeploymentResponse {
    private String applicationName;
    private String action;
    private boolean success;
    private String message;
    private Object data; // Flexible field for various response types
    private String status; // For application status endpoint
    private String logs; // For logs endpoint
    @Builder.Default
    private Map<String, Object> details = new HashMap<>();

    @JsonAnySetter
    public void add(String key, Object value) {
        details.put(key, value);
    }

    /**
     * Extract logs from data object
     * Handles nested structure: data.logs.stdout
     */
    public String extractLogs() {
        if (data == null) {
            return logs != null ? logs : "No logs available";
        }

        if (data instanceof Map) {
            Map<String, Object> dataMap = (Map<String, Object>) data;

            // Check for logs in data
            Object logsObj = dataMap.get("logs");
            if (logsObj instanceof Map) {
                Map<String, Object> logsMap = (Map<String, Object>) logsObj;
                String stdout = (String) logsMap.get("stdout");
                if (stdout != null && !stdout.isEmpty()) {
                    return stdout;
                }
                String stderr = (String) logsMap.get("stderr");
                if (stderr != null && !stderr.isEmpty()) {
                    return "STDERR:\n" + stderr;
                }
            }
        }

        return logs != null ? logs : "No logs available";
    }
}

