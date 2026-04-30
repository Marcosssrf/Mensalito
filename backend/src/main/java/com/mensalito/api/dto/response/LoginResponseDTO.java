package com.mensalito.api.dto.response;

import com.mensalito.api.model.enums.Role;

import java.util.UUID;

public record LoginResponseDTO(
        String token,
        String name,
        UUID tenantId,
        Role role
) {
}
