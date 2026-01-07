package com.admin.hub.app.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents the logs output from the deployment service
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class LogsData {
    private String service;
    private LogsContent logs;

    /**
     * Get combined logs (stdout + stderr)
     */
    public String getCombinedLogs() {
        if (logs == null) {
            return "No logs available";
        }

        StringBuilder combined = new StringBuilder();

        if (logs.getStdout() != null && !logs.getStdout().isEmpty()) {
            combined.append(logs.getStdout());
        }

        if (logs.getStderr() != null && !logs.getStderr().isEmpty()) {
            if (combined.length() > 0) {
                combined.append("\n\n=== STDERR ===\n");
            }
            combined.append(logs.getStderr());
        }

        return combined.length() > 0 ? combined.toString() : "No logs available";
    }
}

