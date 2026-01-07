package com.admin.hub.app.security;

import com.admin.hub.app.config.AdminCredentialsProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final AdminCredentialsProperties adminCredentials;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        if (username.equals(adminCredentials.getEmail())) {
            return new org.springframework.security.core.userdetails.User(
                    adminCredentials.getEmail(),
                    adminCredentials.getPassword(),
                    new ArrayList<>()
            );
        }
        throw new UsernameNotFoundException("User not found with username: " + username);
    }
}

