package com.mensalito.api.client;

import com.mensalito.api.config.EvolutionConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class WhatsAppClient {

    private final EvolutionConfig config;
    private final RestClient restClient = buildRestClient();

    private static RestClient buildRestClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);  // 5s para conectar
        factory.setReadTimeout(10000);    // 10s para ler resposta
        return RestClient.builder()
                .requestFactory(factory)
                .build();
    }

    public void sendText(String instanceName, String phone, String message) {
        if (instanceName == null || instanceName.isBlank()) {
            log.warn("WhatsApp não enviado para {}: instanceName do tenant está vazio", phone);
            return;
        }
        try {
            String normalized = normalizePhone(phone);
            restClient.post()
                    .uri(config.getApiUrl() + "/message/sendText/" + instanceName)
                    .header("apikey", config.getApiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "number", normalized,
                            "text", message
                    ))
                    .retrieve()
                    .toBodilessEntity();

            log.info("WhatsApp enviado via instância '{}' para {}", instanceName, normalized);
        } catch (Exception e) {
            log.error("Erro ao enviar WhatsApp via instância '{}' para {}: {}", instanceName, phone, e.getMessage());
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