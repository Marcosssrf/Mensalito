package com.mensalito.api.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;

public record StudentResponseDTO(
        UUID id,
        String name,
        String email,
        String phone,
        String document,
        Boolean active,
        LocalDateTime createdAt
) {
}
