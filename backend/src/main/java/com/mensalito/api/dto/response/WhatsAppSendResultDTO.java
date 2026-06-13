package com.mensalito.api.dto.response;

public record WhatsAppSendResultDTO(
        boolean sent,
        String message
) {}