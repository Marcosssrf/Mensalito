package com.mensalito.api.dto.request;

import jakarta.validation.constraints.NotBlank;

public record SchoolClassRequestDTO(
        @NotBlank(message = "Nome é obrigatório")
        String name,
        String description
) {
}
