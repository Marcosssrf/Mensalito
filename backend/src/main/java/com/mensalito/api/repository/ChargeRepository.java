package com.mensalito.api.repository;

import com.mensalito.api.model.Charge;
import com.mensalito.api.model.enums.ChargeStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChargeRepository extends JpaRepository<Charge, UUID> {

    // Paginated queries (preferred for API responses)
    Page<Charge> findByTenantId(UUID tenantId, Pageable pageable);
    Page<Charge> findByTenantIdAndEnrollmentId(UUID tenantId, UUID enrollmentId, Pageable pageable);
    Page<Charge> findByTenantIdAndStatus(UUID tenantId, ChargeStatus status, Pageable pageable);
    Page<Charge> findByTenantIdAndDueDate(UUID tenantId, LocalDate dueDate, Pageable pageable);

    // Non-paginated (used internally by scheduler)
    List<Charge> findByTenantIdAndEnrollmentId(UUID tenantId, UUID enrollmentId);
    List<Charge> findByTenantIdAndDueDate(UUID tenantId, LocalDate dueDate);
    List<Charge> findByTenantIdAndStatus(UUID tenantId, ChargeStatus status);
    List<Charge> findByTenantId(UUID tenantId);

    Optional<Charge> findByIdAndTenantId(UUID id, UUID tenantId);

    boolean existsByEnrollmentIdAndDueDate(UUID enrollmentId, LocalDate dueDate);

    List<Charge> findByStatusAndDueDate(ChargeStatus status, LocalDate dueDate);

    List<Charge> findAllByStatusAndDueDateBefore(ChargeStatus status, LocalDate date);

    List<Charge> findByTenantIdAndDueDateBetween(UUID tenantId, LocalDate start, LocalDate end);

    List<Charge> findByTenantIdAndStatusAndDueDateBefore(UUID tenantId, ChargeStatus status, LocalDate date);

    Long countByTenantIdAndStatusAndDueDateBefore(UUID tenantId, ChargeStatus status, LocalDate date);

}
