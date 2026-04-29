package com.mensalito.api.dto.response;

import java.math.BigDecimal;

public record DashboardResponseDTO(
        BigDecimal expectedRevenue,
        BigDecimal receivedRevenue,
        BigDecimal overdueRevenue,
        Long totalActiveStudents,
        Long totalPendingCharges,
        Long totalPaidCharges,
        Long totalOverdueCharges
) {
}
