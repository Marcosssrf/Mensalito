package com.mensalito.api.dto.abacatepay.request;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;

public record AbacatePayProductRequest(
        @JsonProperty("externalId")
        String externalId,
        String name,
        String description,
        Integer quantity,
        Long price,
        String currency

) {

    public static AbacatePayProductRequest fromPlan(String planId, String name, BigDecimal amount) {
        return new AbacatePayProductRequest(
                planId,
                name,
                "Plano: " + name,
                1,
                amount.multiply(BigDecimal.valueOf(100)).longValue(),
                "BRL"
        );
    }

}
