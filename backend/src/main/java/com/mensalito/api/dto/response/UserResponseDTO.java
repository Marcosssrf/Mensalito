package com.mensalito.api.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;

public record UserResponseDTO(
        UUID id,
        String name,
        String email,
        String role,
        Boolean active,
        LocalDateTime createdAt
) {
}
