package com.mensalito.api.dto.abacatepay.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AbacatePayCheckoutResponse(
        String id,
        String url,
        String status
) {}
