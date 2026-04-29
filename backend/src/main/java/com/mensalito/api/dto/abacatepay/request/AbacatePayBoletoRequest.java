package com.mensalito.api.dto.abacatepay.request;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AbacatePayBoletoRequest(
        String method,
        BoletoData data
) {
    public record BoletoData(
            Integer amount,
            String description,
            BoletoCustomer customer
    ) {}

    public record BoletoCustomer(
            String name,
            String email,
            @JsonProperty("taxId") String taxId,
            String cellphone
    ) {}
}

