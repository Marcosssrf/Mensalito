package com.mensalito.api.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequestDTO(

        @NotBlank(message = "Nome é obrigatório")
        String name,
        @Email(message = "Email inválido")
        @NotBlank(message = "Email é obrigatório")
        String email,
        @NotBlank(message = "Senha é obrigatória")
        @Size(min = 6, message = "Senha deve ter no mínimo 6 caracteres")
        String password,
        @NotBlank(message = "Nome da escola é obrigatório")
        String schoolName,
        String schoolPhone,
        //??
        String schoolDocument
) {
}
