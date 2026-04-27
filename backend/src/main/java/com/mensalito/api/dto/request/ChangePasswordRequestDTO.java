package com.mensalito.api.dto.request;

import jakarta.validation.constraints.NotBlank;

public record ChangePasswordRequestDTO(
        @NotBlank(message = "Senha é obrigatória")
        String password
) {
}