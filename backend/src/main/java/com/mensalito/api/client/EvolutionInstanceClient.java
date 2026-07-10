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
import java.util.UUID;


@Slf4j
@Component
@RequiredArgsConstructor
public class EvolutionInstanceClient {

    private final EvolutionConfig config;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestClient restClient = RestClient.create();

    public String createInstance(String schoolName) {
        String instanceName = sanitizeInstanceName(schoolName);
        return doCreateInstance(instanceName);
    }

    public String createInstanceWithKey(UUID tenantId, String schoolName) {
        String prefix = sanitizeInstanceName(schoolName);
        String suffix = tenantId.toString().replace("-", "").substring(0, 8);
        String key = (prefix + "-" + suffix);
        key = key.length() > 50 ? key.substring(0, 50) : key;
        return doCreateInstance(key);
    }

    private String doCreateInstance(String instanceName) {

        if (config.getApiUrl() == null || config.getApiUrl().isBlank()) {
            log.warn("[Evolution] EVOLUTION_API_URL não configurada — instância '{}' será criada manualmente depois.", instanceName);
            return instanceName;
        }
        if (config.getApiKey() == null || config.getApiKey().isBlank()) {
            log.warn("[Evolution] EVOLUTION_API_KEY não configurada — instância '{}' será criada manualmente depois.", instanceName);
            return instanceName;
        }

        log.info("[Evolution] Criando instância '{}'", instanceName);

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

        return instanceName;
    }

    public record ConnectionResult(boolean connected, String ownerJid) {}

    public ConnectionResult checkConnection(String instanceName) {
        try {
            String body = restClient.get()
                    .uri(config.getApiUrl() + "/instance/connectionState/" + instanceName)
                    .header("apikey", config.getApiKey())
                    .retrieve()
                    .body(String.class);

            if (body == null) return new ConnectionResult(false, null);

            log.info("[Evolution] connectionState RAW '{}': {}", instanceName, body);

            @SuppressWarnings("unchecked")
            Map<String, Object> response = objectMapper.readValue(body, Map.class);

            Object instanceObj = response.get("instance");
            if (instanceObj instanceof Map<?, ?> instanceMap) {
                String state = (String) instanceMap.get("state");
                boolean open = "open".equals(state);
                log.info("[Evolution] Estado de '{}': {} | campos: {}", instanceName, state, instanceMap.keySet());

                if (open) {
                    log.info("[Evolution] Valores do instance '{}': owner={} ownerJid={} ownerNumber={}",
                            instanceName, instanceMap.get("owner"), instanceMap.get("ownerJid"), instanceMap.get("ownerNumber"));
                    String jid = firstNonNull(
                            (String) instanceMap.get("owner"),
                            (String) instanceMap.get("ownerJid"),
                            (String) instanceMap.get("ownerNumber")
                    );
                    return new ConnectionResult(true, jid);
                }
                return new ConnectionResult(false, null);
            }

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

    public boolean isConnected(String instanceName) {
        return checkConnection(instanceName).connected();
    }

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

    public String formatOwnerJid(String ownerJid) {
        if (ownerJid == null || ownerJid.isBlank()) return null;
        String number = ownerJid.replace("@s.whatsapp.net", "").replace("@c.us", "").replace("@g.us", "");
        return formatPhoneNumber(number);
    }

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

            Object ownerObj = data.get("owner");
            if (ownerObj instanceof String owner && !owner.isBlank()) {
                String number = owner.replace("@s.whatsapp.net", "").replace("@c.us", "");
                return formatPhoneNumber(number);
            }

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

    private String formatPhoneNumber(String raw) {
        if (raw == null) return null;
        String digits = raw.replaceAll("\\D", "");
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

    private String firstNonNull(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) return v;
        }
        return null;
    }
}