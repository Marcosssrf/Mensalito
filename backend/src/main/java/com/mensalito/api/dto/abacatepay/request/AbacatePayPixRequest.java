package com.mensalito.api.dto.abacatepay.request;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AbacatePayPixRequest(
        String method,
        PixData data
) {
    public record PixData(
            Integer amount,
            String description,
            Long expiresIn,
            PixCustomer customer
    ) {}

    public record PixCustomer(
            String name,
            String email,
            @JsonProperty("taxId") String taxId,
            String cellphone
    ) {}
}
