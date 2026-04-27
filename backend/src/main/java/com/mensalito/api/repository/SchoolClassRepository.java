package com.mensalito.api.repository;

import com.mensalito.api.model.SchoolClass;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SchoolClassRepository extends JpaRepository<SchoolClass, UUID> {

    List<SchoolClass> findByTenantId(UUID tenantId);

    Optional<SchoolClass> findByIdAndTenantId(UUID id, UUID tenantId);

}
