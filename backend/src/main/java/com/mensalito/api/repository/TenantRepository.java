package com.mensalito.api.repository;

import com.mensalito.api.model.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface TenantRepository extends JpaRepository<Tenant, UUID> {
    boolean existsByEmail(String email);
}
