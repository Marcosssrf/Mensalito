package com.mensalito.api.dto.response;

public record WhatsAppTemplatesResponseDTO(
        String chargeNotificationPix,
        String chargeNotificationBoleto,
        String reminderPix,
        String reminderBoleto
) {}