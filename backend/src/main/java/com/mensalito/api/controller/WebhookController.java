package com.mensalito.api.controller;

import com.mensalito.api.dto.abacatepay.request.AbacatePayWebhookDTO;
import com.mensalito.api.service.ChargeService;
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

    @PostMapping("/abacatepay")
    public ResponseEntity<Void> handleAbacatePay(@RequestBody AbacatePayWebhookDTO dto) {
        log.info("Webhook recebido: event={} externalId={}", dto.event(), dto.data().checkout().externalId());
        chargeService.processWebhook(dto);
        return ResponseEntity.ok().build();
    }
}