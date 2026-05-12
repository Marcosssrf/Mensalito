package com.mensalito.api.dto.mercadopago.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record MercadoPagoCustomerResponse(
        String id,
        String email,
        @JsonProperty("first_name") String firstName,
        @JsonProperty("last_name") String lastName
) {}