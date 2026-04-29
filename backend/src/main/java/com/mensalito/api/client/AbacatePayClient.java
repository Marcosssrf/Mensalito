package com.mensalito.api.client;

import com.mensalito.api.config.AbacatePayConfig;
import com.mensalito.api.dto.abacatepay.request.*;
import com.mensalito.api.dto.abacatepay.response.*;
import com.mensalito.api.exception.PaymentGatewayException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Slf4j
@Component
@RequiredArgsConstructor
public class AbacatePayClient {

    private final AbacatePayConfig config;
    private final RestClient restClient = RestClient.create();

    public AbacatePayCustomerResponse createCustomer(AbacatePayCustomerRequest request, String tenantApiKey) {
        try {
            AbacatePayResponse<AbacatePayCustomerResponse> response = restClient.post()
                    .uri(config.getBaseUrl() + "/customers/create")
                    .header("Authorization", "Bearer " + tenantApiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});

            if (response == null || response.data() == null){
                throw new PaymentGatewayException("Resposta vazia ao criar cliente no AbacatePay");
            }
            return response.data();
        } catch (PaymentGatewayException e) {
            throw e;
        } catch (Exception e) {
            log.error("Erro ao criar cliente no AbacatePay: {}", e.getMessage());
            throw new PaymentGatewayException("Falha ao criar cliente no AbacatePay: " + e.getMessage());
        }
    }

    public AbacatePayProductResponse createProduct(AbacatePayProductRequest request, String tenantApiKey) {
        try {
            AbacatePayResponse<AbacatePayProductResponse> response = restClient.post()
                    .uri(config.getBaseUrl() + "/products/create")
                    .header("Authorization", "Bearer " + tenantApiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});

            if (response == null || response.data() == null) {
                throw new PaymentGatewayException("Resposta vazia ao criar produto no AbacatePay");
            }
            return response.data();
        } catch (PaymentGatewayException e) {
            throw e;
        } catch (Exception e) {
            log.error("Erro ao criar produto no AbacatePay: {}", e.getMessage());
            throw new PaymentGatewayException("Falha ao criar produto no AbacatePay: " + e.getMessage());
        }
    }

    public AbacatePayCheckoutResponse createCheckout(AbacatePayCheckoutRequest request, String tenantApiKey) {
        try {
            AbacatePayResponse<AbacatePayCheckoutResponse> response = restClient.post()
                    .uri(config.getBaseUrl() + "/checkouts/create")
                    .header("Authorization", "Bearer " + tenantApiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});

            if (response == null || response.data() == null) {
                throw new PaymentGatewayException("Resposta vazia ao criar checkout no AbacatePay");
            }
            return response.data();
        } catch (PaymentGatewayException e) {
            throw e;
        } catch (Exception e) {
            log.error("Erro ao criar checkout no AbacatePay: {}", e.getMessage());
            throw new PaymentGatewayException("Falha ao criar checkout no AbacatePay: " + e.getMessage());
        }
    }

    public AbacatePayPixResponse createPix(AbacatePayPixRequest request, String tenantApiKey) {
        try {
            AbacatePayResponse<AbacatePayPixResponse> response = restClient.post()
                    .uri(config.getBaseUrl() + "/transparents/create")
                    .header("Authorization", "Bearer " + tenantApiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});

            if (response == null || response.data() == null) {
                throw new PaymentGatewayException("Resposta vazia ao criar PIX no AbacatePay");
            }
            return response.data();
        } catch (PaymentGatewayException e) {
            throw e;
        } catch (Exception e) {
            log.error("Erro ao criar PIX no AbacatePay: {}", e.getMessage());
            throw new PaymentGatewayException("Falha ao criar PIX no AbacatePay: " + e.getMessage());
        }
    }

    public AbacatePayPixResponse createBoleto(AbacatePayBoletoRequest request, String tenantApiKey) {
        try {
            AbacatePayResponse<AbacatePayPixResponse> response = restClient.post()
                    .uri(config.getBaseUrl() + "/transparents/create")
                    .header("Authorization", "Bearer " + tenantApiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(new ParameterizedTypeReference<AbacatePayResponse<AbacatePayPixResponse>>() {});

            return response != null ? response.data() : null;
        } catch (Exception e) {
            log.error("Erro ao criar boleto no AbacatePay: {}", e.getMessage());
            return null;
        }
    }

}