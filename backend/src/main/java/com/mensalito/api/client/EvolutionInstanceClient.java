package com.mensalito.api.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mensalito.api.config.EvolutionConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.*;

import java.text.Normalizer;
import java.util.Map;

/**
 * Cliente para gerenciamento de instâncias na Evolution API.
 * Cada escola (tenant) tem sua própria instância — isolamento total.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EvolutionInstanceClient {

    private final EvolutionConfig config;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestClient restClient = RestClient.create();

    /**
     * Cria uma instância na Evolution API com o nome sanitizado da escola.
     * Idempotente: se já existir (409), retorna o nome sem erro.
     *
     * NUNCA propaga exceção — falha de provisionamento não pode derrubar o cadastro.
     * Retorna o instanceName mesmo em caso de erro para que o tenant seja salvo
     * e a conexão possa ser feita posteriormente via Configurações → WhatsApp.
     */
    public String createInstance(String schoolName) {
        String instanceName = sanitizeInstanceName(schoolName);

        // Valida configuração antes de tentar a chamada
        if (config.getApiUrl() == null || config.getApiUrl().isBlank()) {
            log.warn("[Evolution] EVOLUTION_API_URL não configurada — instância '{}' será criada manualmente depois.", instanceName);
            return instanceName;
        }
        if (config.getApiKey() == null || config.getApiKey().isBlank()) {
            log.warn("[Evolution] EVOLUTION_API_KEY não configurada — instância '{}' será criada manualmente depois.", instanceName);
            return instanceName;
        }

        log.info("[Evolution] Criando instância '{}' para escola '{}'", instanceName, schoolName);

        try {
            String responseBody = restClient.post()
                    .uri(config.getApiUrl() + "/instance/create")
                    .header("apikey", config.getApiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "instanceName", instanceName,
                            "qrcode", true,
                            "integration", "WHATSAPP-BAILEYS"
                    ))
                    .retrieve()
                    .onStatus(status -> status.value() == 409, (req, res) -> {
                        // 409 = instância já existe — não é erro, ignora silenciosamente
                        log.info("[Evolution] Instância '{}' já existe (409), seguindo normalmente.", instanceName);
                    })
                    .body(String.class);

            log.info("[Evolution] Instância '{}' criada com sucesso.", instanceName);

        } catch (HttpClientErrorException e) {
            if (e.getStatusCode().value() == 409) {
                log.info("[Evolution] Instância '{}' já existe (409), seguindo normalmente.", instanceName);
            } else {
                log.error("[Evolution] Erro HTTP {} ao criar instância '{}': {} | body: {}",
                        e.getStatusCode(), instanceName, e.getMessage(), e.getResponseBodyAsString());
            }
        } catch (HttpServerErrorException e) {
            log.error("[Evolution] Erro de servidor {} ao criar instância '{}': {}",
                    e.getStatusCode(), instanceName, e.getMessage());
        } catch (ResourceAccessException e) {
            log.error("[Evolution] Sem conexão com Evolution API ao criar instância '{}': {}", instanceName, e.getMessage());
        } catch (RestClientException e) {
            log.error("[Evolution] Erro de cliente REST ao criar instância '{}': {}", instanceName, e.getMessage());
        } catch (Exception e) {
            log.error("[Evolution] Erro inesperado ao criar instância '{}': {}", instanceName, e.getMessage(), e);
        }

        // Sempre retorna o instanceName — o tenant será salvo e a conexão feita depois
        return instanceName;
    }

    /**
     * Verifica se a instância está conectada ao WhatsApp.
     */
    /**
     * Resultado da verificação de conexão — estado + número do dono (quando disponível).
     */
    public record ConnectionResult(boolean connected, String ownerJid) {}

    /**
     * Verifica se a instância está conectada e retorna o ownerJid quando disponível.
     * A Evolution API retorna ownerJid/owner no objeto instance quando state=open.
     */
    public ConnectionResult checkConnection(String instanceName) {
        try {
            String body = restClient.get()
                    .uri(config.getApiUrl() + "/instance/connectionState/" + instanceName)
                    .header("apikey", config.getApiKey())
                    .retrieve()
                    .body(String.class);

            if (body == null) return new ConnectionResult(false, null);

            // INFO para ver o JSON completo no log e diagnosticar campos disponíveis
            log.info("[Evolution] connectionState RAW '{}': {}", instanceName, body);

            @SuppressWarnings("unchecked")
            Map<String, Object> response = objectMapper.readValue(body, Map.class);

            // Formato: { "instance": { "instanceName": "...", "state": "open", "owner": "5511...@s.whatsapp.net" } }
            Object instanceObj = response.get("instance");
            if (instanceObj instanceof Map<?, ?> instanceMap) {
                String state = (String) instanceMap.get("state");
                boolean open = "open".equals(state);
                log.info("[Evolution] Estado de '{}': {} | campos: {}", instanceName, state, instanceMap.keySet());

                if (open) {
                    log.info("[Evolution] Valores do instance '{}': owner={} ownerJid={} ownerNumber={}",
                        instanceName, instanceMap.get("owner"), instanceMap.get("ownerJid"), instanceMap.get("ownerNumber"));
                    // Tenta owner, ownerJid, ownerNumber em ordem
                    String jid = firstNonNull(
                        (String) instanceMap.get("owner"),
                        (String) instanceMap.get("ownerJid"),
                        (String) instanceMap.get("ownerNumber")
                    );
                    return new ConnectionResult(true, jid);
                }
                return new ConnectionResult(false, null);
            }

            // Formato alternativo direto: { "state": "open", "owner": "..." }
            String directState = (String) response.get("state");
            if (directState != null) {
                boolean open = "open".equals(directState);
                log.info("[Evolution] Estado direto de '{}': {}", instanceName, directState);
                if (open) {
                    String jid = firstNonNull(
                        (String) response.get("owner"),
                        (String) response.get("ownerJid")
                    );
                    return new ConnectionResult(true, jid);
                }
            }

            return new ConnectionResult(false, null);

        } catch (HttpClientErrorException e) {
            log.warn("[Evolution] HTTP {} ao verificar estado de '{}': {}", e.getStatusCode(), instanceName, e.getResponseBodyAsString());
            return new ConnectionResult(false, null);
        } catch (Exception e) {
            log.error("[Evolution] Erro ao verificar conexão de '{}': {}", instanceName, e.getMessage());
            return new ConnectionResult(false, null);
        }
    }

    /**
     * Compatibilidade retroativa — delega ao novo checkConnection.
     */
    public boolean isConnected(String instanceName) {
        return checkConnection(instanceName).connected();
    }

    /**
     * Obtém o QR Code (base64 ou string) da instância para conexão com WhatsApp.
     * Retorna null se já estiver conectado ou em caso de erro.
     */
    public String getQrCode(String instanceName) {
        try {
            String body = restClient.get()
                    .uri(config.getApiUrl() + "/instance/connect/" + instanceName)
                    .header("apikey", config.getApiKey())
                    .retrieve()
                    .body(String.class);

            if (body == null) {
                log.warn("[Evolution] Resposta nula ao solicitar QR Code de '{}'", instanceName);
                return null;
            }

            log.debug("[Evolution] Resposta connect de '{}': {}",
                    instanceName, body.length() > 300 ? body.substring(0, 300) + "..." : body);

            @SuppressWarnings("unchecked")
            Map<String, Object> response = objectMapper.readValue(body, Map.class);

            String base64 = extractBase64(response);
            if (base64 != null) {
                log.info("[Evolution] QR Code obtido para '{}' ({} chars)", instanceName, base64.length());
            } else {
                log.warn("[Evolution] QR Code não encontrado na resposta de '{}'. Campos presentes: {}", instanceName, response.keySet());
            }
            return base64;

        } catch (HttpClientErrorException e) {
            log.error("[Evolution] HTTP {} ao obter QR Code de '{}': {}", e.getStatusCode(), instanceName, e.getResponseBodyAsString());
            return null;
        } catch (Exception e) {
            log.error("[Evolution] Erro ao obter QR Code de '{}': {}", instanceName, e.getMessage(), e);
            return null;
        }
    }

    /** Formata um ownerJid (ex: "5511999998888@s.whatsapp.net") para exibição. */
    public String formatOwnerJid(String ownerJid) {
        if (ownerJid == null || ownerJid.isBlank()) return null;
        String number = ownerJid.replace("@s.whatsapp.net", "").replace("@c.us", "").replace("@g.us", "");
        return formatPhoneNumber(number);
    }

    /**
     * Obtém o número de telefone conectado à instância via Evolution API.
     * Retorna null se não estiver conectado ou em caso de erro.
     */
    public String getPhoneNumber(String instanceName) {
        try {
            String body = restClient.get()
                    .uri(config.getApiUrl() + "/instance/fetchInstances/" + instanceName)
                    .header("apikey", config.getApiKey())
                    .retrieve()
                    .body(String.class);

            if (body == null) return null;

            log.info("[Evolution] fetchInstances RAW '{}': {}", instanceName, body);

            @SuppressWarnings("unchecked")
            Object parsed = objectMapper.readValue(body, Object.class);

            // Resposta pode ser objeto ou array com um elemento
            Map<String, Object> data = null;
            if (parsed instanceof java.util.List<?> list && !list.isEmpty()) {
                if (list.get(0) instanceof Map<?, ?> m) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> cast = (Map<String, Object>) m;
                    data = cast;
                }
            } else if (parsed instanceof Map<?, ?> m) {
                @SuppressWarnings("unchecked")
                Map<String, Object> cast = (Map<String, Object>) m;
                data = cast;
            }

            if (data == null) return null;

            // Tenta owner.id (formato "5511999998888@s.whatsapp.net")
            Object ownerObj = data.get("owner");
            if (ownerObj instanceof String owner && !owner.isBlank()) {
                String number = owner.replace("@s.whatsapp.net", "").replace("@c.us", "");
                return formatPhoneNumber(number);
            }

            // Tenta ownerJid
            Object ownerJid = data.get("ownerJid");
            if (ownerJid instanceof String jid && !jid.isBlank()) {
                String number = jid.replace("@s.whatsapp.net", "").replace("@c.us", "");
                return formatPhoneNumber(number);
            }

            return null;
        } catch (Exception e) {
            log.warn("[Evolution] Erro ao buscar número de '{}': {}", instanceName, e.getMessage());
            return null;
        }
    }

    /**
     * Formata número E.164 para exibição (+55 11 99999-8888).
     */
    private String formatPhoneNumber(String raw) {
        if (raw == null) return null;
        String digits = raw.replaceAll("\\D", "");
        // Formato BR: 55 + DDD (2) + número (8 ou 9)
        if (digits.startsWith("55") && digits.length() >= 12) {
            String ddd = digits.substring(2, 4);
            String num = digits.substring(4);
            if (num.length() == 9) {
                return "+" + digits.substring(0, 2) + " (" + ddd + ") " + num.substring(0, 5) + "-" + num.substring(5);
            } else if (num.length() == 8) {
                return "+" + digits.substring(0, 2) + " (" + ddd + ") " + num.substring(0, 4) + "-" + num.substring(4);
            }
        }
        return "+" + digits;
    }

    /**
     * Sanitiza o nome da escola para nome de instância válido na Evolution API.
     * Remove acentos, caracteres especiais; converte espaços em hífens. Máx 50 chars.
     */
    public String sanitizeInstanceName(String schoolName) {
        if (schoolName == null || schoolName.isBlank()) {
            return "escola-" + System.currentTimeMillis();
        }

        String normalized = Normalizer.normalize(schoolName, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");

        String result = normalized
                .toLowerCase()
                .replaceAll("[^a-z0-9\\s-]", "")
                .trim()
                .replaceAll("\\s+", "-")
                .replaceAll("-{2,}", "-")
                .replaceAll("^-|-$", "");

        if (result.isBlank()) result = "escola";

        return result.length() > 50 ? result.substring(0, 50) : result;
    }

    @SuppressWarnings("unchecked")
    private String extractBase64(Map<String, Object> response) {
        if (response.containsKey("base64")) return (String) response.get("base64");

        Object code = response.get("code");
        if (code instanceof String s && !s.isBlank()) return s;

        Object qrcode = response.get("qrcode");
        if (qrcode instanceof Map<?, ?> qrMap) {
            if (qrMap.containsKey("base64")) return (String) qrMap.get("base64");
            if (qrMap.containsKey("code")) return (String) qrMap.get("code");
        }

        return null;
    }

    /** Retorna o primeiro valor não-nulo e não-vazio da lista. */
    private String firstNonNull(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) return v;
        }
        return null;
    }
}
