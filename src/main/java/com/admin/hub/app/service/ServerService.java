package com.admin.hub.app.service;

import com.admin.hub.app.config.DeployerProperties;
import com.admin.hub.app.dto.RunningService;
import com.admin.hub.app.dto.ServerHealthSummary;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.core.ParameterizedTypeReference;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class ServerService {

    private final RestTemplate restTemplate;
    private final DeployerProperties deployerProperties;

    /**
     * Get list of running systemd services
     */
    public List<RunningService> getRunningServices() {
        List<RunningService> services = new ArrayList<>();
        try {
            String url = deployerProperties.getBaseUrl() + "/api/v1/server/services/status";
            HttpEntity<String> entity = createRequestEntity();

            log.info("Fetching running services from: {}", url);
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url, HttpMethod.GET, entity, new ParameterizedTypeReference<Map<String, Object>>() {}
            );

            if (response.getBody() != null && Boolean.TRUE.equals(response.getBody().get("success"))) {
                Object dataObj = response.getBody().get("data");
                if (dataObj instanceof Map) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> dataMap = (Map<String, Object>) dataObj;
                    Object servicesObj = dataMap.get("running services");
                    if (servicesObj instanceof String) {
                        String servicesOutput = (String) servicesObj;
                        services = parseServiceOutput(servicesOutput);
                    }
                }
            }
        } catch (RestClientException e) {
            log.error("Error fetching running services", e);
        }

        return services;
    }

    private List<RunningService> parseServiceOutput(String output) {
        List<RunningService> services = new ArrayList<>();

        if (output == null || output.isEmpty()) {
            return services;
        }

        String[] lines = output.split("\n");
        boolean inLegend = false;

        for (String line : lines) {
            // Skip header, legend section, and empty lines
            if (line.isEmpty() ||
                line.startsWith("UNIT") ||
                line.startsWith("Legend:") ||
                line.startsWith("        ")) {
                inLegend = true;
                continue;
            }

            if (inLegend && !line.contains("loaded")) {
                continue;
            }

            inLegend = false;

            // Parse service line: "service-name.service loaded active running Description here"
            String trimmed = line.trim();
            if (trimmed.isEmpty() || !trimmed.contains(".service")) {
                continue;
            }

            String[] parts = trimmed.split("\\s+");
            if (parts.length >= 4) {
                RunningService service = new RunningService();

                // Extract service name
                String serviceName = parts[0];
                service.setName(serviceName);

                // Extract load status (parts[1]) - reserved for potential future use
                @SuppressWarnings("unused")
                String loadStatus = parts[1];

                // Extract active status (parts[2])
                String activeStatus = parts[2];

                // Extract sub status (parts[3])
                String subStatus = parts[3];

                // Status is active state combined with sub state
                service.setStatus(activeStatus + " " + subStatus);

                // Extract description (remaining parts joined together)
                StringBuilder description = new StringBuilder();
                for (int i = 4; i < parts.length; i++) {
                    if (i > 4) description.append(" ");
                    description.append(parts[i]);
                }
                service.setDescription(description.toString());

                services.add(service);
            }
        }

        return services;
    }

    /**
     * Get server health summary
     */
    public ServerHealthSummary getServerHealthSummary() {
        ServerHealthSummary summary = new ServerHealthSummary();

        try {
            String url = deployerProperties.getBaseUrl() + "/api/v1/server/health/summary";
            HttpEntity<String> entity = createRequestEntity();

            log.info("Fetching server health from: {}", url);
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url, HttpMethod.GET, entity, new ParameterizedTypeReference<Map<String, Object>>() {}
            );

            if (response.getBody() != null && Boolean.TRUE.equals(response.getBody().get("success"))) {
                @SuppressWarnings("unchecked")
                Map<String, Object> data = (Map<String, Object>) response.getBody().get("data");
                if (data != null) {
                    double cpu = parseCpuUsage((String) data.get("cpu"));
                    double memory = parseMemoryUsage((String) data.get("memory"), summary);
                    double disk = parseDiskUsage((String) data.get("disk"), summary);
                    parseUptime((String) data.get("load_average"), summary);

                    // Clamp values to valid ranges for UI display
                    summary.setCpuUsage(Math.max(0.0, cpu));
                    summary.setMemoryUsage(Math.max(0.0, Math.min(100.0, memory)));
                    summary.setDiskUsage(Math.max(0.0, Math.min(100.0, disk)));

                    log.info("Server health: CPU={}%, Memory={}% (Total: {}, Used: {}), Disk={}% (Used: {}, Available: {}), Uptime: {}",
                             cpu, memory, summary.getTotalMemory(), summary.getUsedMemory(), disk, summary.getUsedDisk(), summary.getTotalDisk(), summary.getUptime());
                }
            }
        } catch (RestClientException e) {
            log.error("Error fetching server health summary", e);
        } catch (Exception e) {
            log.error("Unexpected error fetching server health summary", e);
        }

        return summary;
    }

    private double parseCpuUsage(String cpuData) {
        if (cpuData == null) return 0.0;
        try {
            // Parse vmstat output for CPU usage
            // Format: r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st gu
            //         0  0      0 3720824 124728 2857108    0    0    19    34  434    1  1  0 99  0  0  0
            String[] lines = cpuData.split("\n");
            if (lines.length >= 3) {
                String[] parts = lines[3].trim().split("\\s+");
                if (parts.length >= 15) {
                    int idleIndex = parts.length - 4;
                    double user = Double.parseDouble(parts[idleIndex]);
                    return (100-user);  // CPU usage = 100 - idle
                }
            }
        } catch (Exception e) {
            log.error("Error parsing CPU usage", e);
        }
        return 0.0;
    }

    private double parseMemoryUsage(String memoryData, ServerHealthSummary summary) {
        if (memoryData == null) return 0.0;
        try {
            // Parse free output: "Mem:           7.8Gi       1.8Gi       3.5Gi       174Mi       2.8Gi       6.0Gi"
            String[] lines = memoryData.split("\n");
            for (String line : lines) {
                if (line.startsWith("Mem:")) {
                    String[] parts = line.trim().split("\\s+");
                    if (parts.length >= 3) {
                        // parts[0] = "Mem:"
                        // parts[1] = total
                        // parts[2] = used
                        String totalStr = parts[1];
                        String usedStr = parts[2];

                        // Store raw memory values for display
                        summary.setTotalMemory(totalStr);
                        summary.setUsedMemory(usedStr);

                        double total = parseSize(totalStr);
                        double used = parseSize(usedStr);
                        return (used / total) * 100;
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error parsing memory usage", e);
        }
        return 0.0;
    }

    private double parseDiskUsage(String diskData, ServerHealthSummary summary) {
        if (diskData == null) return 0.0;
        try {
            // Parse df output for root filesystem (/)
            // Example: /dev/sda        157G   12G  138G   8% /
            String[] lines = diskData.split("\n");
            for (String line : lines) {
                if (line.contains("/dev/") && line.trim().endsWith("/")) {
                    String[] parts = line.trim().split("\\s+");
                    if (parts.length >= 5) {
                        // Extract used and available disk values
                        // Format: Filesystem Size Used Avail Use% Mounted
                        // parts[1] = Size, parts[2] = Used, parts[3] = Available, parts[4] = Use%
                        String usedStr = parts[2];
                        String totalStr = parts[1];
                        summary.setUsedDisk(usedStr);
                        summary.setTotalDisk(totalStr);

                        // Find the percentage column (before the mount point)
                        for (int i = 0; i < parts.length - 1; i++) {
                            if (parts[i].endsWith("%")) {
                                String usageStr = parts[i].replace("%", "");
                                return Double.parseDouble(usageStr);
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error parsing disk usage", e);
        }
        return 0.0;
    }

    private void parseUptime(String uptimeData, ServerHealthSummary summary) {
        if (uptimeData == null) {
            summary.setUptime("Unknown");
            return;
        }
        try {
            // Parse uptime output: "21:00 up 5 days, 6:13, 6 users, load averages: 9.80 12.14 16.29"
            // Extract the part between "up" and the number of users/load
            Pattern pattern = Pattern.compile("up\\s+(.+?),\\s+\\d+\\s+user");
            Matcher matcher = pattern.matcher(uptimeData);
            if (matcher.find()) {
                String uptime = matcher.group(1).trim();
                summary.setUptime(uptime);
            } else {
                // Fallback: try to extract everything after "up"
                Pattern fallbackPattern = Pattern.compile("up\\s+(.+?)(?:,\\s+\\d+\\s+user|$)");
                Matcher fallbackMatcher = fallbackPattern.matcher(uptimeData);
                if (fallbackMatcher.find()) {
                    String uptime = fallbackMatcher.group(1).trim();
                    summary.setUptime(uptime);
                } else {
                    summary.setUptime("Unknown");
                }
            }
        } catch (Exception e) {
            log.error("Error parsing uptime", e);
            summary.setUptime("Unknown");
        }
    }

    private double parseSize(String sizeStr) {
        if (sizeStr.endsWith("Gi")) {
            return Double.parseDouble(sizeStr.replace("Gi", "")) * 1024 * 1024 * 1024;
        } else if (sizeStr.endsWith("Mi")) {
            return Double.parseDouble(sizeStr.replace("Mi", "")) * 1024 * 1024;
        } else if (sizeStr.endsWith("Ki")) {
            return Double.parseDouble(sizeStr.replace("Ki", "")) * 1024;
        } else {
            // Assume bytes
            return Double.parseDouble(sizeStr.replaceAll("[^\\d.]", ""));
        }
    }

    /**
     * Create HTTP headers with API key
     */
    private HttpEntity<String> createRequestEntity() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Content-Type", "application/json");
        if (deployerProperties.getApiKey() != null && !deployerProperties.getApiKey().isEmpty()) {
            headers.set("X-API-Key", deployerProperties.getApiKey());
        }
        return new HttpEntity<>(headers);
    }
}
