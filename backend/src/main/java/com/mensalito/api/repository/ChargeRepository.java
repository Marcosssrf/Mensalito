package com.mensalito.api.repository;

import com.mensalito.api.model.Charge;
import com.mensalito.api.model.enums.ChargeStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChargeRepository extends JpaRepository<Charge, UUID> {

    List<Charge> findByTenantIdAndEnrollmentId(UUID tenantId, UUID enrollmentId);

    List<Charge> findByTenantIdAndDueDate(UUID tenantId, LocalDate dueDate);

    List<Charge> findByTenantIdAndStatus(UUID tenantId, ChargeStatus status);

    List<Charge> findByTenantId(UUID tenantId);

    Optional<Charge> findByIdAndTenantId(UUID id, UUID tenantId);

    boolean existsByEnrollmentIdAndDueDate(UUID enrollmentId, LocalDate dueDate);

}
