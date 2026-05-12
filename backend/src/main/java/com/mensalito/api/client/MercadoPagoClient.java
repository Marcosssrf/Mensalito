package com.mensalito.api.client;

import com.mensalito.api.config.MercadoPagoConfig;
import com.mensalito.api.dto.mercadopago.request.MercadoPagoCustomerRequest;
import com.mensalito.api.dto.mercadopago.request.MercadoPagoOrderRequest;
import com.mensalito.api.dto.mercadopago.response.MercadoPagoCustomerResponse;
import com.mensalito.api.dto.mercadopago.response.MercadoPagoOrderResponse;
import com.mensalito.api.exception.PaymentGatewayException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class MercadoPagoClient {

    private final MercadoPagoConfig config;
    private final RestClient restClient = RestClient.create();

    public MercadoPagoCustomerResponse createCustomer(MercadoPagoCustomerRequest request, String tenantApiKey) {
        try {
            MercadoPagoCustomerResponse response = restClient.post()
                    .uri(config.getBaseUrl() + "/v1/customers")
                    .header("Authorization", "Bearer " + tenantApiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(MercadoPagoCustomerResponse.class);

            if (response == null || response.id() == null) {
                throw new PaymentGatewayException("Resposta vazia ao criar cliente no Mercado Pago");
            }
            return response;
        } catch (PaymentGatewayException e) {
            throw e;
        } catch (Exception e) {
            log.error("Erro ao criar cliente no Mercado Pago: {}", e.getMessage());
            throw new PaymentGatewayException("Falha ao criar cliente no Mercado Pago: " + e.getMessage());
        }
    }

    public MercadoPagoOrderResponse createOrder(MercadoPagoOrderRequest request, String tenantApiKey) {
        try {
            MercadoPagoOrderResponse response = restClient.post()
                    .uri(config.getBaseUrl() + "/v1/orders")
                    .header("Authorization", "Bearer " + tenantApiKey)
                    .header("X-Idempotency-Key", UUID.randomUUID().toString())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(MercadoPagoOrderResponse.class);

            if (response == null || response.id() == null) {
                throw new PaymentGatewayException("Resposta vazia ao criar order no Mercado Pago");
            }
            return response;
        } catch (PaymentGatewayException e) {
            throw e;
        } catch (Exception e) {
            log.error("Erro ao criar order no Mercado Pago: {}", e.getMessage());
            throw new PaymentGatewayException("Falha ao criar order no Mercado Pago: " + e.getMessage());
        }
    }

    public MercadoPagoOrderResponse getOrder(String orderId, String tenantApiKey) {
        try {
            return restClient.get()
                    .uri(config.getBaseUrl() + "/v1/orders/" + orderId)
                    .header("Authorization", "Bearer " + tenantApiKey)
                    .retrieve()
                    .body(MercadoPagoOrderResponse.class);
        } catch (Exception e) {
            log.error("Erro ao consultar order MP: {}", e.getMessage());
            return null;
        }
    }

    public MercadoPagoOrderResponse getOrderByPaymentId(String paymentId, String tenantApiKey) {
        try {
            return restClient.get()
                    .uri(config.getBaseUrl() + "/v1/payments/" + paymentId)
                    .header("Authorization", "Bearer " + tenantApiKey)
                    .retrieve()
                    .body(MercadoPagoOrderResponse.class);
        } catch (Exception e) {
            log.error("Erro ao buscar payment por paymentId {}: {}", paymentId, e.getMessage());
            return null;
        }
    }

}