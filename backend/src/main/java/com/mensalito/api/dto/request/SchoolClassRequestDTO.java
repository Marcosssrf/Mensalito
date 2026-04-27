package com.mensalito.api.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record SchoolClassRequestDTO(
        @NotBlank(message = "Nome é obrigatório")
        String name,
        @Email(message = "Email inválido")
        String email,
        String phone,
        String document
) {
}
