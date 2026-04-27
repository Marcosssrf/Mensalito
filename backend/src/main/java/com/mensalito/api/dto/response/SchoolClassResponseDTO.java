package com.mensalito.api.dto.response;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDateTime;
import java.util.UUID;

public record SchoolClassResponseDTO(
        UUID id,
        @NotBlank(message = "Nome é obrigatório")
        String name,
        String description,
        Boolean active,
        LocalDateTime createdAt
) {
}
