package com.mensalito.api.dto.abacatepay.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AbacatePayCustomerResponse(
        String id,
        String name,
        String email,
        String cellphone,
        String taxId
) {
}
