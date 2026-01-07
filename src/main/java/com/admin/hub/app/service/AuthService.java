package com.admin.hub.app.service;

import com.admin.hub.app.config.AdminCredentialsProperties;
import com.admin.hub.app.dto.AuthResponse;
import com.admin.hub.app.dto.LoginRequest;
import com.admin.hub.app.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AdminCredentialsProperties adminCredentials;
    private final JwtUtil jwtUtil;

    public AuthResponse login(LoginRequest request) {
        // Validate credentials against configured admin username and password
        if (!isValidCredentials(request.getEmail(), request.getPassword())) {
            throw new RuntimeException("Invalid username or password");
        }

        // Generate JWT token with admin info
        String token = jwtUtil.generateTokenForAdmin(
                adminCredentials.getEmail(),
                adminCredentials.getName()
        );

        return new AuthResponse(
                token,
                adminCredentials.getEmail(),
                adminCredentials.getName()
       );
    }

    private boolean isValidCredentials(String username, String password) {
        return username.equals(adminCredentials.getEmail()) &&
                password.equals(adminCredentials.getPassword());
    }
}

