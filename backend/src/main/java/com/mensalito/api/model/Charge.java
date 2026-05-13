package com.mensalito.api.model;

import com.mensalito.api.model.enums.ChargeStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "charges")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Charge {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enrollment_id", nullable = false)
    private Enrollment enrollment;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    private LocalDate dueDate;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ChargeStatus status = ChargeStatus.PENDING;

    @Builder.Default
    @Column(nullable = false)
    private Boolean manual = false;

    @Column
    private LocalDate paymentDate;

    @Column
    private String mercadoPagoOrderId;

    @Column
    private String checkoutUrl;

    @Column
    private String pixCode;

    @Column
    private String boletoUrl;

    @Column(length = 512)
    private String ticketUrl;

    /**
     * Data/hora em que a notificação WhatsApp foi enviada com sucesso.
     * Null indica que o envio ainda não ocorreu ou falhou.
     */
    @Column
    private LocalDateTime whatsappSentAt;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

}