package com.mensalito.api.dto.response;

import com.mensalito.api.dto.request.AddressDTO;
import com.mensalito.api.model.enums.PaymentPreference;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record StudentResponseDTO(
        UUID id,
        String name,
        String email,
        String phone,
        String document,
        Boolean active,
        PaymentPreference paymentPreference,
        AddressDTO address,
        LocalDateTime createdAt,
        LocalDate trialEndsAt,
        Boolean inTrial
) {}
