package com.mensalito.api.dto.request;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;

public record PlanRequestDTO(
        @NotBlank(message = "Nome é obrigatório")
        String name,
        @NotNull(message = "Valor é obrigatório")
        @DecimalMin(value = "0.01", message = "Valor deve ser maior que zero")
        BigDecimal amount,
        @NotNull(message = "Dia de vencimento é obrigatório")
        @Min(value = 1, message = "Dia de vencimento deve ser entre 1 e 28")
        @Max(value = 28, message = "Dia de vencimento deve ser entre 1 e 28")
        Integer dueDay
) {
}
