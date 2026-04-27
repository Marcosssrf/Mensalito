package com.mensalito.api.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record TenantRequestDTO(
        @NotBlank
        String name,
        @Email(message = "Email inválido")
        @Pattern(
                regexp = "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$",
                message = "Email deve conter domínio válido (.com, .br, etc)"
        )
        @NotBlank
        String email,
        String phone,
        String document
) {
}
