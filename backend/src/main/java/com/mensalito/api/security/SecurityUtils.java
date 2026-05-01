package com.mensalito.api.security;

import com.mensalito.api.model.Tenant;
import com.mensalito.api.model.User;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class SecurityUtils {

    public User getAuthenticatedUser() {
        return (User) SecurityContextHolder.getContext()
                .getAuthentication()
                .getPrincipal();
    }

    public UUID getAuthenticatedTenantId() {
        return getAuthenticatedUser().getTenant().getId();
    }

    public Tenant getAuthenticatedTenant() {
        return getAuthenticatedUser().getTenant();
    }
}