package com.mensalito.api.dto.abacatepay.request;

public record AbacatePayCustomerRequest(
        String name,
        String email,
        String cellphone,
        String taxId
) {
}
