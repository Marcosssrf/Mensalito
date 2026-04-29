package com.mensalito.api.dto.abacatepay.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AbacatePayResponse<T>(
        boolean success,
        T data,
        String error
) {}