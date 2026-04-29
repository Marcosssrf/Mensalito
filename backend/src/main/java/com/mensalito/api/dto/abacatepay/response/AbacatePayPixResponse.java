package com.mensalito.api.dto.abacatepay.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AbacatePayPixResponse(
        String id,
        String status,
        @JsonProperty("brCode") String brCode,
        @JsonProperty("brCodeBase64") String brCodeBase64,
        @JsonProperty("barCode") String barCode, // boleto
        String url                                // boleto
) {}