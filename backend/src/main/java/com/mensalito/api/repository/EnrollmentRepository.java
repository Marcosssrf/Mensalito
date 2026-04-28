package com.mensalito.api.repository;

import com.mensalito.api.model.Enrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EnrollmentRepository extends JpaRepository<Enrollment, UUID> {

    List<Enrollment> findByTenantId(UUID tenantId);

    Optional<Enrollment> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<Enrollment> findByStudentIdAndTenantId(UUID studentId, UUID tenantId);

    @Query("SELECT e FROM Enrollment e JOIN FETCH e.plan JOIN FETCH e.tenant WHERE e.active = true AND e.plan.dueDay = :dueDay")
    List<Enrollment> findActiveByPlanDueDay(@Param("dueDay") int dueDay);

}
