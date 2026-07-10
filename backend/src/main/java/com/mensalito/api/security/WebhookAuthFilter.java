package com.mensalito.api.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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


@Slf4j
@Component
public class WebhookAuthFilter extends OncePerRequestFilter {

    @Value("${mercadopago.webhook-secret:}")
    private String webhookSecret;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/webhooks/mercadopago");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        if (webhookSecret == null || webhookSecret.isBlank()) {
            log.warn("MERCADOPAGO_WEBHOOK_SECRET não configurado — requisições de webhook NÃO estão autenticadas!");
            filterChain.doFilter(request, response);
            return;
        }

        String xSignature = request.getHeader("x-signature");
        String xRequestId = request.getHeader("x-request-id");

        if (xSignature == null || xSignature.isBlank()) {
            log.warn("Webhook MP recebido sem header x-signature");
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write("{\"error\":\"Missing webhook signature\"}");
            return;
        }

        String ts = null, v1 = null;
        for (String part : xSignature.split(",")) {
            if (part.startsWith("ts=")) ts = part.substring(3).trim();
            if (part.startsWith("v1=")) v1 = part.substring(3).trim();
        }

        if (ts == null || v1 == null) {
            log.warn("Header x-signature mal formatado: {}", xSignature);
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write("{\"error\":\"Invalid signature format\"}");
            return;
        }

        byte[] body = StreamUtils.copyToByteArray(request.getInputStream());
        String dataId = extractDataId(body);

        if (dataId == null) {
            log.warn("Webhook MP sem data.id no body — rejeitado");
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            response.getWriter().write("{\"error\":\"Missing data.id\"}");
            return;
        }

        String manifest = "id:" + dataId + ";request-id:" + xRequestId + ";ts:" + ts + ";";
        String expected = computeHmac(manifest);

        if (!constantTimeEquals(v1, expected)) {
            log.warn("Assinatura MP inválida — requisição rejeitada");
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write("{\"error\":\"Invalid webhook signature\"}");
            return;
        }

        filterChain.doFilter(new CachedBodyServletRequest(request, body), response);
    }

    private String extractDataId(byte[] body) {
        try {
            JsonNode root = objectMapper.readTree(body);
            JsonNode dataId = root.path("data").path("id");
            return dataId.isMissingNode() ? null : dataId.asText();
        } catch (Exception e) {
            log.error("Erro ao parsear body do webhook MP: {}", e.getMessage());
            return null;
        }
    }

    private String computeHmac(String manifest) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(manifest.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException("Falha ao calcular HMAC", e);
        }
    }

    private boolean constantTimeEquals(String a, String b) {
        if (a.length() != b.length()) return false;
        int result = 0;
        for (int i = 0; i < a.length(); i++) {
            result |= a.charAt(i) ^ b.charAt(i);
        }
        return result == 0;
    }
}