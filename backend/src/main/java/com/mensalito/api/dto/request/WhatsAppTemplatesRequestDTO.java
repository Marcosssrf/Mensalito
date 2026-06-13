package com.mensalito.api.dto.request;

public record WhatsAppTemplatesRequestDTO(
        String chargeNotificationPix,
        String chargeNotificationBoleto,
        String reminderPix,
        String reminderBoleto
) {}