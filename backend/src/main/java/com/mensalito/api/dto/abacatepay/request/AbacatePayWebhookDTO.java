package com.mensalito.api.dto.abacatepay.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AbacatePayWebhookDTO(
        String id,
        String event,
        WebhookData data
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record WebhookData(
            CheckoutData checkout
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CheckoutData(
            String id,
            String externalId,   // ← ID da sua Charge
            String status,
            Long amount,
            Long paidAmount,
            String customerId
    ) {}
}