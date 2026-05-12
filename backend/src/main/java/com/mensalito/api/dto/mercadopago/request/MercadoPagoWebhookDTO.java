package com.mensalito.api.dto.mercadopago.request;

public record MercadoPagoWebhookDTO(
        String type,
        MercadoPagoWebhookData data
) {
    public record MercadoPagoWebhookData(String id) {}
}