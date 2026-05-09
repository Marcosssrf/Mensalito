package com.mensalito.api.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StreamUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * Valida a assinatura HMAC-SHA256 do webhook do AbacatePay.
 * O AbacatePay envia o header "abacatepay-webhook-token" com o HMAC do body
 * usando o webhook secret configurado no painel.
 */
@Slf4j
@Component
public class WebhookAuthFilter extends OncePerRequestFilter {

    @Value("${abacatepay.webhook-secret:}")
    private String webhookSecret;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/webhooks/abacatepay");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        if (webhookSecret == null || webhookSecret.isBlank()) {
            log.warn("WEBHOOK_SECRET não configurado — requisições de webhook NÃO estão autenticadas!");
            filterChain.doFilter(request, response);
            return;
        }

        String signature = request.getHeader("abacatepay-webhook-token");
        if (signature == null || signature.isBlank()) {
            log.warn("Webhook recebido sem header de assinatura");
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write("{\"error\":\"Missing webhook signature\"}");
            return;
        }

        // Lê o body via CachedBodyHttpServletRequest (configurado no SecurityConfig)
        byte[] body = StreamUtils.copyToByteArray(request.getInputStream());
        String expectedSignature = computeHmac(body);

        if (!constantTimeEquals(signature, expectedSignature)) {
            log.warn("Assinatura de webhook inválida — requisição rejeitada");
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write("{\"error\":\"Invalid webhook signature\"}");
            return;
        }

        // Envolve o request para que o body possa ser relido pelo controller
        filterChain.doFilter(new CachedBodyServletRequest(request, body), response);
    }

    private String computeHmac(byte[] body) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(body));
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException("Falha ao calcular HMAC", e);
        }
    }

    /** Comparação em tempo constante para evitar timing attacks */
    private boolean constantTimeEquals(String a, String b) {
        if (a.length() != b.length()) return false;
        int result = 0;
        for (int i = 0; i < a.length(); i++) {
            result |= a.charAt(i) ^ b.charAt(i);
        }
        return result == 0;
    }
}
