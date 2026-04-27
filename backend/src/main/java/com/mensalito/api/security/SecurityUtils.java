package com.mensalito.api.security;

import com.mensalito.api.model.Tenant;
import com.mensalito.api.model.User;
import com.mensalito.api.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
@Transactional
public class SecurityUtils {

    private final UserRepository userRepository;

    public User getAuthenticatedUser() {
        String email = SecurityContextHolder.getContext()
                .getAuthentication()
                .getName();

        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

    }

    public UUID getAuthenticatedTenantId() {
        return getAuthenticatedUser().getTenant().getId();
    }

    public Tenant getAuthenticatedTenant() {
        return getAuthenticatedUser().getTenant();
    }
}
