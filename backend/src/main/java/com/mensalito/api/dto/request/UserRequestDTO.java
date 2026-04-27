package com.mensalito.api.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

public record UserRequestDTO(
        @NotBlank(message = "Nome é obrigatório")
        String name,
        @Email(message = "Email inválido")
        @NotBlank
        String email,
        @NotBlank(message = "Senha é obrigatória")
        String password,
        UUID tenantId
) {
}
