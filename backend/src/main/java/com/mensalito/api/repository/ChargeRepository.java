package com.mensalito.api.repository;

import com.mensalito.api.model.Charge;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ChargeRepository extends JpaRepository<Charge, UUID> {
}
