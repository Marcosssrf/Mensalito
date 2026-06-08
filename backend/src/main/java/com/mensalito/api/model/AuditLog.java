package com.mensalito.api.model;

import com.mensalito.api.model.enums.AuditAction;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "audit_logs", indexes = {
        @Index(name = "idx_audit_tenant_id",    columnList = "tenant_id"),
        @Index(name = "idx_audit_entity",       columnList = "entity_type, entity_id"),
        @Index(name = "idx_audit_created_at",   columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Tenant ao qual o evento pertence (nunca nulo). */
    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    /** ID do usuário autenticado que disparou a ação (nulo p/ eventos de sistema/scheduler). */
    @Column(name = "user_id")
    private UUID userId;

    /** E-mail do usuário no momento do evento (desnormalizado para evitar JOIN). */
    @Column(name = "user_email")
    private String userEmail;

    /** Ação realizada. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 60)
    private AuditAction action;

    /** Tipo da entidade afetada: "Charge", "Student", "Enrollment", etc. */
    @Column(name = "entity_type", nullable = false, length = 50)
    private String entityType;

    /** ID da entidade afetada. */
    @Column(name = "entity_id")
    private UUID entityId;

    /** Descrição legível do evento para exibição no painel. */
    @Column(nullable = false, length = 500)
    private String description;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
