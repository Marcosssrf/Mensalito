package com.mensalito.api.model;

import com.mensalito.api.model.enums.PaymentPreference;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "students")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Student {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String email;

    @Column
    private String phone;

    @Column
    private String document;

    @Embedded
    private Address address;

    @Column
    private String mercadoPagoCustomerId;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentPreference paymentPreference = PaymentPreference.BOLETO;

    /**
     * Data final do período de trial (inclusive).
     * Enquanto LocalDate.now() <= trialEndsAt, nenhuma cobrança é gerada para este aluno.
     * NULL = sem trial.
     */
    @Column(name = "trial_ends_at")
    private LocalDate trialEndsAt;

    @Builder.Default
    @Column(nullable = false)
    private Boolean active = true;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public boolean isInTrial(LocalDate referenceDate) {
        return trialEndsAt != null && !referenceDate.isAfter(trialEndsAt);
    }

    public boolean isInTrialToday() {
        return isInTrial(LocalDate.now());
    }
}
