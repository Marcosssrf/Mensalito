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

    /**
     * Envia mensagem de texto via Evolution API.
     * @return true se o envio foi aceito pela API; false em caso de erro ou configuração ausente.
     */
    public boolean sendText(String instanceName, String phone, String message) {
        if (instanceName == null || instanceName.isBlank()) {
            log.warn("WhatsApp não enviado para {}: instanceName do tenant está vazio", phone);
            return false;
        }
        try {
            String normalized = normalizePhone(phone);
            log.info("[WhatsApp] Enviando para número normalizado: '{}' (original: '{}')", normalized, phone);

            String responseBody = restClient.post()
                    .uri(config.getApiUrl() + "/message/sendText/" + instanceName)
                    .header("apikey", config.getApiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "number", normalized,
                            "text", message
                    ))
                    .retrieve()
                    .body(String.class);

            log.info("[WhatsApp] Enviado via '{}' para {} | resposta: {}", instanceName, normalized, responseBody);
            return true;
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            log.error("[WhatsApp] HTTP {} ao enviar para {} via '{}': {}",
                    e.getStatusCode(), phone, instanceName, e.getResponseBodyAsString());
            return false;
        } catch (Exception e) {
            log.error("[WhatsApp] Erro ao enviar para {} via '{}': {}", phone, instanceName, e.getMessage());
            return false;
        }
    }

    /**
     * Envia um documento (PDF) via Evolution API.
     * A Evolution baixa o arquivo da {@code documentUrl} e o entrega como attachment no WhatsApp.
     *
     * @param caption legenda exibida junto ao documento (pode ser null)
     * @return true se aceito pela API
     */
    /**
     * Envia um PDF como arquivo no WhatsApp.
     * O backend baixa o PDF (com o Bearer token do MercadoPago, se necessário)
     * e envia como base64 para a Evolution API — evitando o erro de URL protegida.
     *
     * @param pdfUrl      URL do PDF (pode ser protegida por autenticação)
     * @param bearerToken Access token para baixar o PDF (null se URL for pública)
     */
    public boolean sendDocument(String instanceName, String phone, String pdfUrl,
                                String fileName, String caption, String bearerToken) {
        if (instanceName == null || instanceName.isBlank()) {
            log.warn("[WhatsApp] sendDocument ignorado para {}: instanceName vazio", phone);
            return false;
        }
        try {
            String normalized = normalizePhone(phone);
            log.info("[WhatsApp] Baixando PDF '{}' para envio ao número '{}'", fileName, normalized);

            // Baixa o PDF no backend (com auth se necessário) e converte para base64
            String base64Pdf = downloadAsBase64(pdfUrl, bearerToken);

            log.info("[WhatsApp] Enviando documento '{}' para '{}' via instância '{}'",
                    fileName, normalized, instanceName);

            Map<String, Object> body = new java.util.LinkedHashMap<>();
            body.put("number", normalized);
            body.put("mediatype", "document");
            body.put("mimetype", "application/pdf");
            body.put("caption", caption != null ? caption : "");
            body.put("media", base64Pdf);
            body.put("fileName", fileName);

            String responseBody = restClient.post()
                    .uri(config.getApiUrl() + "/message/sendMedia/" + instanceName)
                    .header("apikey", config.getApiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);

            log.info("[WhatsApp] Documento enviado para {} | resposta: {}", normalized, responseBody);
            return true;
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            log.error("[WhatsApp] HTTP {} ao enviar documento para {} via '{}': {}",
                    e.getStatusCode(), phone, instanceName, e.getResponseBodyAsString());
            return false;
        } catch (Exception e) {
            log.error("[WhatsApp] Erro ao enviar documento para {} via '{}': {}", phone, instanceName, e.getMessage());
            return false;
        }
    }

    /** Baixa um arquivo como base64. Passa Bearer token se a URL exigir autenticação. */
    private String downloadAsBase64(String url, String bearerToken) {
        try {
            var request = restClient.get().uri(url);
            if (bearerToken != null && !bearerToken.isBlank()) {
                request = request.header("Authorization", "Bearer " + bearerToken);
            }
            byte[] bytes = request.retrieve().body(byte[].class);
            if (bytes == null || bytes.length == 0) {
                throw new IllegalStateException("PDF baixado está vazio");
            }
            return java.util.Base64.getEncoder().encodeToString(bytes);
        } catch (Exception e) {
            throw new RuntimeException("Falha ao baixar PDF de '" + url + "': " + e.getMessage(), e);
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