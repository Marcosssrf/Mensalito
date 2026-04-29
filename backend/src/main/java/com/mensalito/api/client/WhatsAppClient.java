package com.mensalito.api.client;

import com.mensalito.api.config.EvolutionConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class WhatsAppClient {

    private final EvolutionConfig config;
    private final RestClient restClient = RestClient.create();

    public void sendText(String phone, String message) {
        try {
            String normalized = normalizePhone(phone);
            restClient.post()
                    .uri(config.getApiUrl() + "/message/sendText/" + config.getInstance())
                    .header("apikey", config.getApiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "number", normalized,
                            "textMessage", Map.of("text", message)
                    ))
                    .retrieve()
                    .toBodilessEntity();

            log.info("WhatsApp enviado para {}", normalized);
        } catch (Exception e) {
            log.error("Erro ao enviar WhatsApp para {}: {}", phone, e.getMessage());
        }
    }

    private String normalizePhone(String phone) {
        String normalized = phone
                .replaceAll("[^0-9]", "")
                .replaceAll("^0", "");

        if (!normalized.startsWith("55")) {
            normalized = "55" + normalized;
        }

        return normalized;
    }

}