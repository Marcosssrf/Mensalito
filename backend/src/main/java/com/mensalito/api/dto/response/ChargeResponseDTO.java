package com.mensalito.api.dto.response;

import com.mensalito.api.model.enums.ChargeStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record ChargeResponseDTO(
        UUID id,
        String studentName,
        BigDecimal amount,
        LocalDate dueDate,
        ChargeStatus status,
        LocalDate paymentDate,
        String pixCode,
        String boletoUrl,
        LocalDateTime createdAt

) {
}
