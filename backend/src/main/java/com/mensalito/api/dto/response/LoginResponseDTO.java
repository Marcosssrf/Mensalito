package com.mensalito.api.dto.response;

import java.util.UUID;

public record LoginResponseDTO(
        String token,
        String name,
        UUID tenantId
) {
}
