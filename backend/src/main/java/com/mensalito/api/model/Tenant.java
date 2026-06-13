package com.mensalito.api.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "tenants")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Tenant {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column
    private String phone;

    @Column
    private String document;

    @Builder.Default
    @Column(nullable = false)
    private Boolean active = true;

    @Column
    private String mercadoPagoApiKey;

    @Column
    private String evolutionInstanceName;

    @Column(unique = true)
    private String evolutionInstanceKey;

    /**
     * Templates de mensagem WhatsApp personalizados por tenant.
     * Armazenado como JSON string com os 4 templates (pix, boleto, reminder_pix, reminder_boleto).
     * NULL = usa os templates padrão do WhatsAppMessageBuilder.
     */
    @Column(columnDefinition = "TEXT")
    private String whatsappTemplates;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}