package com.mensalito.api.dto.request;

import com.mensalito.api.model.enums.PaymentPreference;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record StudentRequestDTO(
        @NotBlank
        String name,
        @Email(message = "Email inválido", regexp = ".*@.*\\..*")
        String email,
        String phone,
        String document,
        PaymentPreference paymentPreference,
        @Valid
        AddressDTO address
) {
}
