package com.mensalito.api.dto.response;

public record WhatsAppStatusResponseDTO(
        boolean connected,
        String instanceName,
        String qrCodeBase64,
        String phoneNumber
) {
}
