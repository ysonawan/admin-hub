package com.admin.hub.app.controller;

import com.admin.hub.app.dto.RunningService;
import com.admin.hub.app.dto.ServerHealthSummary;
import com.admin.hub.app.service.ServerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/server")
@RequiredArgsConstructor
@Slf4j
public class ServerController {

    private final ServerService serverService;

    /**
     * Get list of running systemd services
     */
    @GetMapping("/services/status")
    public ResponseEntity<List<RunningService>> getRunningServices() {
        try {
            List<RunningService> services = serverService.getRunningServices();
            return ResponseEntity.ok(services);
        } catch (Exception e) {
            log.error("Error fetching running services", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get server health summary
     */
    @GetMapping("/health/summary")
    public ResponseEntity<ServerHealthSummary> getServerHealthSummary() {
        try {
            ServerHealthSummary summary = serverService.getServerHealthSummary();
            return ResponseEntity.ok(summary);
        } catch (Exception e) {
            log.error("Error fetching server health summary", e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
