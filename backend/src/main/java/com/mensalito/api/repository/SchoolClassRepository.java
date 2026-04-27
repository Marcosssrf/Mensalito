package com.mensalito.api.repository;

import com.mensalito.api.model.SchoolClass;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface SchoolClassRepository extends JpaRepository<SchoolClass, UUID> {
}
