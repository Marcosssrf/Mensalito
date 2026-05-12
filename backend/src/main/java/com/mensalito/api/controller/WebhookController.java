package com.mensalito.api.controller;

import com.mensalito.api.dto.mercadopago.request.MercadoPagoWebhookDTO;
import com.mensalito.api.service.ChargeService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/webhooks")
@RequiredArgsConstructor
@Slf4j
public class WebhookController {

    private final ChargeService chargeService;

    @PostMapping("/mercadopago")
    public ResponseEntity<Void> handleMercadoPago(
            @RequestBody MercadoPagoWebhookDTO dto,
            HttpServletRequest request) {
        log.info("Webhook MP recebido: type={} dataId={}", dto.type(), dto.data() != null ? dto.data().id() : "null");
        chargeService.processWebhookMercadoPago(dto);
        return ResponseEntity.ok().build();
    }

}