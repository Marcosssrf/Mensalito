package com.mensalito.api.dto.abacatepay.request;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record AbacatePayCheckoutRequest(
        List<Item> items,
        @JsonProperty("customerId") String customerId,
        @JsonProperty("externalId") String externalId,
        @JsonProperty("returnUrl") String returnUrl,
        @JsonProperty("completionUrl") String completionUrl,
        List<String> methods
) {
    public record Item(
            String id,
            Integer quantity
    ) {}
}
