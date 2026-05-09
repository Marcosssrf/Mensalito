package com.mensalito.api.dto.request;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

public record ManualPaymentRequestDTO(

        @NotBlank(message = "Método de pagamento é obrigatório")
        String paymentMethod,
        LocalDate paymentDate,
        String notes

) {}
