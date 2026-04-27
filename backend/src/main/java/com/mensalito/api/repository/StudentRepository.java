package com.mensalito.api.repository;

import com.mensalito.api.model.Student;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StudentRepository extends JpaRepository<Student, UUID> {

    List<Student> findByTenantId(UUID tenantId);

    Optional<Student> findByIdAndTenantId(UUID id, UUID tenantId);

}
