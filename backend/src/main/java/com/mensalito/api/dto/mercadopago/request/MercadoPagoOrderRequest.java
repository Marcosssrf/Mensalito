package com.mensalito.api.dto.mercadopago.request;

import com.fasterxml.jackson.annotation.JsonInclude;
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

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record MercadoPagoOrderPayer(
            String email,
            @JsonProperty("first_name") String firstName,
            @JsonProperty("last_name") String lastName,
            MercadoPagoOrderPayerIdentification identification,
            MercadoPagoOrderPayerAddress address
    ) {
        // Construtor simplificado para PIX (só email)
        public MercadoPagoOrderPayer(String email) {
            this(email, null, null, null, null);
        }
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record MercadoPagoOrderPayerIdentification(
            String type,
            String number
    ) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record MercadoPagoOrderPayerAddress(
            @JsonProperty("zip_code") String zipCode,
            @JsonProperty("street_name") String streetName,
            @JsonProperty("street_number") String streetNumber,
            String neighborhood,
            String city,
            String state
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
