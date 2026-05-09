package com.mensalito.api.repository;

import com.mensalito.api.model.Student;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StudentRepository extends JpaRepository<Student, UUID> {

    Page<Student> findByTenantId(UUID tenantId, Pageable pageable);

    List<Student> findByTenantId(UUID tenantId);

    Optional<Student> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<Student> findByDocumentAndTenantId(String document, UUID tenantId);

    Optional<Student> findByEmailAndTenantId(String email, UUID tenantId);

    Long countByTenantIdAndActiveTrue(UUID tenantId);

}
