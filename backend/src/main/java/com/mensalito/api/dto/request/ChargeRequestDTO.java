package com.mensalito.api.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record ChargeRequestDTO(
        @NotNull(message = "Matrícula é obrigatória")
        UUID enrollmentId,
        @NotNull(message = "Data de vencimento é obrigatória")
        @FutureOrPresent(message = "Data de vencimento não pode ser no passado")
        LocalDate dueDate,
        @NotNull(message = "Valor é obrigatório")
        @DecimalMin(value = "0.01", message = "Valor deve ser maior que zero")
        BigDecimal amount
) {
}
