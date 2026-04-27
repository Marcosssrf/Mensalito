package com.mensalito.api.repository;

import com.mensalito.api.model.Charge;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChargeRepository extends JpaRepository<Charge, UUID> {

    List<Charge> findByEnrollmentId(UUID enrollmentId);

    List<Charge> findByStatus(String status);

    List<Charge> findByDueDate(LocalDate dueDate);

    List<Charge> findByTenantIdAndStatus(UUID tenantId, String status);

}
