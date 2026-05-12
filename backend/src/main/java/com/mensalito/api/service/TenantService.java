package com.mensalito.api.service;

import com.mensalito.api.client.EvolutionInstanceClient;
import com.mensalito.api.dto.request.TenantRequestDTO;
import com.mensalito.api.dto.response.TenantResponseDTO;
import com.mensalito.api.dto.response.WhatsAppStatusResponseDTO;
import com.mensalito.api.exception.ResourceNotFoundException;
import com.mensalito.api.model.Tenant;
import com.mensalito.api.repository.TenantRepository;
import com.mensalito.api.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TenantService {

    private final TenantRepository tenantRepository;
    private final SecurityUtils securityUtils;
    private final EncryptionService encryptionService;
    private final EvolutionInstanceClient evolutionInstanceClient;

    public TenantResponseDTO create(TenantRequestDTO dto) {
        Tenant tenant = Tenant.builder()
                .name(dto.name())
                .email(dto.email())
                .phone(dto.phone())
                .document(dto.document())
                .build();

        Tenant saved = tenantRepository.save(tenant);

        try {
            String instanceKey = evolutionInstanceClient.createInstanceWithKey(saved.getId(), dto.name());
            saved.setEvolutionInstanceKey(instanceKey);
            saved.setEvolutionInstanceName(instanceKey); // mantém em sync para compatibilidade
            saved = tenantRepository.save(saved);
            log.info("Instância Evolution '{}' associada ao tenant {}", instanceKey, saved.getId());
        } catch (Exception e) {
            log.error("Falha ao criar instância Evolution para tenant {}: {}", saved.getId(), e.getMessage());
        }

        return toResponse(saved);
    }

    public TenantResponseDTO findById(UUID id) {
        return toResponse(findByIdInternal(id));
    }

    public TenantResponseDTO getAuthenticatedTenant() {
        UUID tenantId = securityUtils.getAuthenticatedTenantId();
        return toResponse(findByIdInternal(tenantId));
    }

    public TenantResponseDTO findByIdForOwner(UUID id) {
        UUID authenticatedTenantId = securityUtils.getAuthenticatedTenantId();
        if (!authenticatedTenantId.equals(id)) {
            throw new AccessDeniedException("Acesso negado");
        }
        return toResponse(findByIdInternal(id));
    }

    public TenantResponseDTO findByIdResponse(UUID id) {
        return findByIdForOwner(id);
    }

    public com.mensalito.api.model.Tenant findByIdInternal(UUID id) {
        return tenantRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant não encontrado"));
    }

    public TenantResponseDTO update(UUID id, TenantRequestDTO dto) {
        UUID authenticatedTenantId = securityUtils.getAuthenticatedTenantId();
        if (!authenticatedTenantId.equals(id)) {
            throw new AccessDeniedException("Acesso negado");
        }

        Tenant tenant = tenantRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant não encontrado"));

        if (dto.name() != null) tenant.setName(dto.name());
        if (dto.email() != null) tenant.setEmail(dto.email());
        if (dto.phone() != null) tenant.setPhone(dto.phone());
        if (dto.document() != null) tenant.setDocument(dto.document());

        Tenant saved = tenantRepository.save(tenant);
        return toResponse(saved);
    }

    public void saveApiKey(String apiKey) {
        UUID tenantId = securityUtils.getAuthenticatedTenantId();
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant não encontrado"));
        tenant.setMercadoPagoApiKey(encryptionService.encrypt(apiKey));
        tenantRepository.save(tenant);
    }

    public WhatsAppStatusResponseDTO reprovisionWhatsApp() {
        UUID tenantId = securityUtils.getAuthenticatedTenantId();
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant não encontrado"));

        log.info("[TenantService] Re-provisionando instância Evolution para tenant '{}' ({})", tenant.getName(), tenantId);

        try {
            String instanceKey = evolutionInstanceClient.createInstanceWithKey(tenantId, tenant.getName());
            tenant.setEvolutionInstanceKey(instanceKey);
            tenant.setEvolutionInstanceName(instanceKey);
            tenantRepository.save(tenant);
            log.info("[TenantService] Instância '{}' re-provisionada para tenant {}", instanceKey, tenantId);

            var conn = evolutionInstanceClient.checkConnection(instanceKey);
            if (conn.connected()) {
                String phoneNumber = extractPhone(conn.ownerJid(), instanceKey);
                return new WhatsAppStatusResponseDTO(true, instanceKey, null, phoneNumber);
            }
            String qrCode = evolutionInstanceClient.getQrCode(instanceKey);
            return new WhatsAppStatusResponseDTO(false, instanceKey, qrCode, null);

        } catch (Exception e) {
            log.error("[TenantService] Falha ao re-provisionar Evolution para tenant {}: {}", tenantId, e.getMessage());
            throw new RuntimeException("Falha ao criar instância WhatsApp: " + e.getMessage(), e);
        }
    }

    public WhatsAppStatusResponseDTO getWhatsAppStatus() {
        UUID tenantId = securityUtils.getAuthenticatedTenantId();
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant não encontrado"));

        String instanceName = tenant.getEvolutionInstanceKey();

        // Fallback para tenants antigos que ainda não têm a key
        if (instanceName == null || instanceName.isBlank()) {
            instanceName = tenant.getEvolutionInstanceName();
        }

        // Se não tem instância ainda, tenta criar
        if (instanceName == null || instanceName.isBlank()) {
            try {
                instanceName = evolutionInstanceClient.createInstanceWithKey(tenantId, tenant.getName());
                tenant.setEvolutionInstanceKey(instanceName);
                tenant.setEvolutionInstanceName(instanceName);
                tenantRepository.save(tenant);
            } catch (Exception e) {
                log.error("Erro ao criar instância Evolution tardiamente para tenant {}: {}", tenantId, e.getMessage());
                return new WhatsAppStatusResponseDTO(false, null, null, null);
            }
        }

        // Verifica conexão e obtém ownerJid numa única chamada
        EvolutionInstanceClient.ConnectionResult conn = null;
        try {
            conn = evolutionInstanceClient.checkConnection(instanceName);
        } catch (Exception e) {
            log.warn("[TenantService] Erro ao verificar conexão de '{}': {}", instanceName, e.getMessage());
        }

        if (conn != null && conn.connected()) {
            String phoneNumber = extractPhone(conn.ownerJid(), instanceName);
            return new WhatsAppStatusResponseDTO(true, instanceName, null, phoneNumber);
        }

        // Busca QR Code — nunca deixa estourar
        String qrCode = null;
        try {
            qrCode = evolutionInstanceClient.getQrCode(instanceName);
        } catch (Exception e) {
            log.warn("[TenantService] Erro ao buscar QR Code de '{}': {}", instanceName, e.getMessage());
        }

        return new WhatsAppStatusResponseDTO(false, instanceName, qrCode, null);
    }

    private String extractPhone(String ownerJid, String instanceName) {
        if (ownerJid != null && !ownerJid.isBlank()) {
            String formatted = evolutionInstanceClient.formatOwnerJid(ownerJid);
            if (formatted != null) {
                log.info("[TenantService] Número extraído do connectionState para '{}': {}", instanceName, formatted);
                return formatted;
            }
        }
        // Fallback: tenta fetchInstances
        try {
            String phone = evolutionInstanceClient.getPhoneNumber(instanceName);
            if (phone != null) {
                log.info("[TenantService] Número extraído via fetchInstances para '{}': {}", instanceName, phone);
            }
            return phone;
        } catch (Exception e) {
            log.warn("[TenantService] Fallback getPhoneNumber falhou para '{}': {}", instanceName, e.getMessage());
            return null;
        }
    }

    private TenantResponseDTO toResponse(Tenant tenant) {
        return new TenantResponseDTO(
                tenant.getId(),
                tenant.getName(),
                tenant.getEmail(),
                tenant.getPhone(),
                tenant.getDocument(),
                tenant.getActive(),
                tenant.getCreatedAt(),
                tenant.getMercadoPagoApiKey() != null && !tenant.getMercadoPagoApiKey().isBlank()
        );
    }
}