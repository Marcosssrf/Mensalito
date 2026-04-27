package com.mensalito.api.repository;

import com.mensalito.api.model.Plan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PlanRepository extends JpaRepository<Plan, UUID> {

    List<Plan> findByTenantId(UUID tenantId);

    Optional<Plan> findByIdAndTenantId(UUID id, UUID tenantId);

}
