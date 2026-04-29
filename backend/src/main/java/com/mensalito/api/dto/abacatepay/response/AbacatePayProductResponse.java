package com.mensalito.api.dto.abacatepay.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AbacatePayProductResponse(
        String id,
        @JsonProperty("externalId") String externalId,
        String name,
        String description,
        Integer quantity,
        Long price
) {}