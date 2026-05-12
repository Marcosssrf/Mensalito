package com.mensalito.api.dto.mercadopago.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record MercadoPagoOrderResponse(
        String id,
        String status,
        @JsonProperty("status_detail") String statusDetail,
        @JsonProperty("external_reference") String externalReference,
        @JsonProperty("total_amount") String totalAmount,
        MercadoPagoOrderTransactionsResponse transactions
) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record MercadoPagoOrderTransactionsResponse(
            List<MercadoPagoOrderPaymentResponse> payments
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record MercadoPagoOrderPaymentResponse(
            String id,
            String status,
            @JsonProperty("status_detail") String statusDetail,
            @JsonProperty("payment_method") MercadoPagoOrderPaymentMethodResponse paymentMethod
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record MercadoPagoOrderPaymentMethodResponse(
            String id,
            String type,
            @JsonProperty("qr_code") String qrCode,
            @JsonProperty("qr_code_base64") String qrCodeBase64
    ) {}
}