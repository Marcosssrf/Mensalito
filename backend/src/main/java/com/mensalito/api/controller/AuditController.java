package com.mensalito.api.controller;

import com.mensalito.api.dto.response.AuditLogResponseDTO;
import com.mensalito.api.model.AuditLog;
import com.mensalito.api.model.enums.AuditAction;
import com.mensalito.api.repository.AuditLogRepository;
import com.mensalito.api.security.SecurityUtils;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/audit")
@RequiredArgsConstructor
@PreAuthorize("hasRole('OWNER')")
public class AuditController {

    private final AuditLogRepository auditLogRepository;
    private final SecurityUtils securityUtils;

    @GetMapping
    public ResponseEntity<Page<AuditLogResponseDTO>> search(
            @RequestParam(required = false) AuditAction action,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) UUID entityId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @PageableDefault(size = 50, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        UUID tenantId = securityUtils.getAuthenticatedTenantId();

        Specification<AuditLog> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            predicates.add(cb.equal(root.get("tenantId"), tenantId));

            if (action != null) {
                predicates.add(cb.equal(root.get("action"), action));
            }
            if (entityType != null && !entityType.isBlank()) {
                predicates.add(cb.equal(root.get("entityType"), entityType));
            }
            if (entityId != null) {
                predicates.add(cb.equal(root.get("entityId"), entityId));
            }
            if (from != null) {
                LocalDateTime fromDT = from.atStartOfDay();
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), fromDT));
            }
            if (to != null) {
                LocalDateTime toDT = to.atTime(23, 59, 59);
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), toDT));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<AuditLogResponseDTO> result = auditLogRepository.findAll(spec, pageable)
                .map(this::toResponse);

        return ResponseEntity.ok(result);
    }

    private AuditLogResponseDTO toResponse(AuditLog log) {
        return new AuditLogResponseDTO(
                log.getId(),
                log.getUserEmail(),
                log.getAction(),
                log.getEntityType(),
                log.getEntityId(),
                log.getDescription(),
                log.getCreatedAt()
        );
    }
}