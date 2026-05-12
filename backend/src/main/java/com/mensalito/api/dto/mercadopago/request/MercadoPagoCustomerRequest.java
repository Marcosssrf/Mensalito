package com.mensalito.api.dto.mercadopago.request;

import com.fasterxml.jackson.annotation.JsonProperty;

public record MercadoPagoCustomerRequest(
        String email,
        @JsonProperty("first_name") String firstName,
        @JsonProperty("last_name") String lastName,
        MercadoPagoPhoneRequest phone,
        MercadoPagoIdentificationRequest identification
) {
    public record MercadoPagoPhoneRequest(
            @JsonProperty("area_code") String areaCode,
            String number
    ) {}

    public record MercadoPagoIdentificationRequest(
            String type,
            String number
    ) {}
}