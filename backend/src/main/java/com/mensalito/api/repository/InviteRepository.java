package com.mensalito.api.repository;

import com.mensalito.api.model.Invite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface InviteRepository extends JpaRepository<Invite, UUID> {

    Optional<Invite> findByToken(String token);

    /**
     * Marca em batch todos os convites não-usados cujo expiresAt já passou.
     * Retorna o número de registros afetados.
     */
    @Modifying
    @Query("UPDATE Invite i SET i.used = true WHERE i.used = false AND i.expiresAt < :now")
    int markExpiredInvites(@Param("now") LocalDateTime now);
}

