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

/**
 * Serviço central de auditoria.
 *
 * <p>Use {@link #log} para eventos síncronos (dentro de um @Transactional do chamador)
 * ou {@link #logAsync} para eventos que não precisam participar da transação principal.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final SecurityUtils securityUtils;

    /**
     * Registra um evento de auditoria de forma síncrona, dentro da transação do chamador.
     *
     * @param action      ação realizada
     * @param entityType  nome da entidade ("Charge", "Student", etc.)
     * @param entityId    id da entidade afetada (pode ser null)
     * @param description descrição legível para o painel
     */
    public void log(AuditAction action, String entityType, UUID entityId, String description) {
        try {
            UUID tenantId  = securityUtils.getAuthenticatedTenantId();
            UUID userId    = securityUtils.getAuthenticatedUser().getId();
            String email   = securityUtils.getAuthenticatedUser().getEmail();

            persist(tenantId, userId, email, action, entityType, entityId, description);
        } catch (Exception e) {
            // Auditoria nunca deve quebrar o fluxo principal
            log.warn("[AuditService] Falha ao registrar evento {}: {}", action, e.getMessage());
        }
    }

    /**
     * Registra um evento de auditoria de forma assíncrona (ideal para schedulers/webhooks
     * onde não há usuário autenticado).
     */
    @Async
    public void logSystem(UUID tenantId, AuditAction action,
                          String entityType, UUID entityId, String description) {
        try {
            persist(tenantId, null, "system", action, entityType, entityId, description);
        } catch (Exception e) {
            log.warn("[AuditService] Falha ao registrar evento de sistema {}: {}", action, e.getMessage());
        }
    }

    // ------------------------------------------------------------------ //

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
