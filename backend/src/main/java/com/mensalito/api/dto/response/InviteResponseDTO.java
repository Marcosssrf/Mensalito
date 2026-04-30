package com.mensalito.api.dto.response;

import com.mensalito.api.model.enums.Role;

import java.time.LocalDateTime;
import java.util.UUID;

public record InviteResponseDTO(
        UUID id,
        String email,
        Role role,
        String inviteUrl,
        LocalDateTime expiresAt
) {
}
