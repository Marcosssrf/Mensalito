package com.mensalito.api.dto.response;

import com.mensalito.api.model.enums.Role;

public record InvitePreviewResponseDTO(
        String schoolName,
        String email,
        Role role
) {
}
