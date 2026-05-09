package com.mensalito.api.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record ManualChargeRequestDTO(

        @NotNull(message = "Matrícula é obrigatória")
        UUID enrollmentId,
        @NotNull(message = "Data de vencimento é obrigatória")
        LocalDate dueDate,
        @DecimalMin(value = "0.01", message = "Valor deve ser maior que zero")
        BigDecimal amount,
        String description

) {}
