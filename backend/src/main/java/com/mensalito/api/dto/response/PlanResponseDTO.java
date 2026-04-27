package com.mensalito.api.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record PlanResponseDTO(
        UUID id,
        String name,
        BigDecimal amount,
        Integer dueDay,
        Boolean active,
        LocalDateTime createdAt
) {
}
