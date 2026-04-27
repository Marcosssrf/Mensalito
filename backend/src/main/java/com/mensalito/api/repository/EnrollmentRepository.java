package com.mensalito.api.repository;

import com.mensalito.api.model.Enrollment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EnrollmentRepository extends JpaRepository<Enrollment, UUID> {

    List<Enrollment> findByStudentId(UUID studentId);

    List<Enrollment> findByTenantId(UUID tenantId);

    Optional<Enrollment> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<Enrollment> findByStudentIdAndTenantId(UUID studentId, UUID tenantId);
}
