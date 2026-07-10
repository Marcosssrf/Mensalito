package com.mensalito.api.service;

import com.mensalito.api.model.AuditLog;
import com.mensalito.api.model.enums.AuditAction;
import com.mensalito.api.repository.AuditLogRepository;
import com.mensalito.api.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final SecurityUtils securityUtils;

    public void log(AuditAction action, String entityType, UUID entityId, String description) {
        try {
            UUID tenantId  = securityUtils.getAuthenticatedTenantId();
            UUID userId    = securityUtils.getAuthenticatedUser().getId();
            String email   = securityUtils.getAuthenticatedUser().getEmail();

            persist(tenantId, userId, email, action, entityType, entityId, description);
        } catch (Exception e) {
            log.warn("[AuditService] Falha ao registrar evento {}: {}", action, e.getMessage());
        }
    }

    @Async
    public void logSystem(UUID tenantId, AuditAction action,
                          String entityType, UUID entityId, String description) {
        try {
            persist(tenantId, null, "system", action, entityType, entityId, description);
        } catch (Exception e) {
            log.warn("[AuditService] Falha ao registrar evento de sistema {}: {}", action, e.getMessage());
        }
    }


    private void persist(UUID tenantId, UUID userId, String userEmail,
                         AuditAction action, String entityType, UUID entityId, String description) {
        AuditLog entry = AuditLog.builder()
                .tenantId(tenantId)
                .userId(userId)
                .userEmail(userEmail)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .description(description)
                .build();

        auditLogRepository.save(entry);
    }
}
