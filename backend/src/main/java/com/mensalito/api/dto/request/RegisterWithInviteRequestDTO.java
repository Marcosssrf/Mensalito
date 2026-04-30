package com.mensalito.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterWithInviteRequestDTO(

        @NotBlank(message = "Token é obrigatório")
        String token,
        @NotBlank(message = "Nome é obrigatório")
        String name,
        @NotBlank(message = "Senha é obrigatória")
        @Size(min = 6, message = "Senha deve ter no mínimo 6 caracteres")
        String password
) {
}
