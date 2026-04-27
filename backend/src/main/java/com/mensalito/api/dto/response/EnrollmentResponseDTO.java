package com.mensalito.api.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record EnrollmentResponseDTO(
        UUID id,
        String studentName,
        String className,
        String planName,
        BigDecimal amount,
        LocalDate startDate,
        LocalDate endDate,
        Boolean active,
        LocalDateTime createdAt
) {
}
