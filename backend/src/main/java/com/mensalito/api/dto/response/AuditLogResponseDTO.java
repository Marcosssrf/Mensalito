package com.mensalito.api.dto.response;

import com.mensalito.api.model.enums.AuditAction;

import java.time.LocalDateTime;
import java.util.UUID;

public record AuditLogResponseDTO(
        UUID id,
        String userEmail,
        AuditAction action,
        String entityType,
        UUID entityId,
        String description,
        LocalDateTime createdAt
) {}
