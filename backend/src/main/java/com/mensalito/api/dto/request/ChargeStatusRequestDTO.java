package com.mensalito.api.dto.request;

import com.mensalito.api.model.enums.ChargeStatus;

public record ChargeStatusRequestDTO(
        ChargeStatus status
) {
}
