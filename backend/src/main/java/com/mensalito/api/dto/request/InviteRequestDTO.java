package com.mensalito.api.dto.request;

import com.mensalito.api.model.enums.Role;
import jakarta.validation.constraints.Email;

public record InviteRequestDTO(

        @Email(message = "Email inválido")
        String email,
        Role role
) {
}
