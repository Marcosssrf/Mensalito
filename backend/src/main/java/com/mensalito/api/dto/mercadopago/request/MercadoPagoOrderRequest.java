package com.mensalito.api.dto.mercadopago.request;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record MercadoPagoOrderRequest(
        String type,
        @JsonProperty("processing_mode") String processingMode,
        @JsonProperty("external_reference") String externalReference,
        @JsonProperty("total_amount") String totalAmount,
        MercadoPagoOrderPayer payer,
        MercadoPagoOrderTransactions transactions
) {

    public record MercadoPagoOrderPayer(
            String email
    ) {}

    public record MercadoPagoOrderTransactions(
            List<MercadoPagoOrderPayment> payments
    ) {}

    public record MercadoPagoOrderPayment(
            String amount,
            @JsonProperty("payment_method") MercadoPagoOrderPaymentMethod paymentMethod
    ) {}

    public record MercadoPagoOrderPaymentMethod(
            String id,
            String type
    ) {}
}