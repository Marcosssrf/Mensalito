package com.mensalito.api.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;

public record SchoolClassResponseDTO(
        UUID id,
        String name,
        String description,
        Boolean active,
        LocalDateTime createdAt
) {
}
