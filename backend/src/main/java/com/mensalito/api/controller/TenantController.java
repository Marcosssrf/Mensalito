package com.mensalito.api.controller;

import com.mensalito.api.dto.request.TenantApiKeyRequestDTO;
import com.mensalito.api.dto.request.TenantRequestDTO;
import com.mensalito.api.dto.response.TenantResponseDTO;
import com.mensalito.api.dto.response.WhatsAppStatusResponseDTO;
import com.mensalito.api.service.TenantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.UUID;

@RestController
@RequestMapping(value = "/api/tenants")
@RequiredArgsConstructor
public class TenantController {

    private final TenantService tenantService;

    @GetMapping(value = "/{id}")
    public ResponseEntity<TenantResponseDTO> findById(@PathVariable UUID id) {
        TenantResponseDTO tenant = tenantService.findByIdResponse(id);
        return ResponseEntity.ok(tenant);
    }

    @PostMapping
    public ResponseEntity<TenantResponseDTO> create(@RequestBody @Valid TenantRequestDTO dto) {
        TenantResponseDTO tenant = tenantService.create(dto);
        URI uri = ServletUriComponentsBuilder
                .fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(tenant.id())
                .toUri();
        return ResponseEntity.created(uri).body(tenant);
    }

    @PatchMapping(value = "/{id}")
    public ResponseEntity<TenantResponseDTO> update(@PathVariable UUID id, @RequestBody @Valid TenantRequestDTO dto) {
        return ResponseEntity.ok(tenantService.update(id, dto));
    }

    @PutMapping(value = "/me/api-key")
    public ResponseEntity<Void> saveApiKey(@RequestBody TenantApiKeyRequestDTO dto) {
        tenantService.saveApiKey(dto.abacatePayApiKey());
        return ResponseEntity.noContent().build();
    }

    /**
     * Retorna o status de conexão WhatsApp da escola autenticada.
     * Se não estiver conectada, inclui o QR Code base64 para escaneamento.
     * GET /api/tenants/me/whatsapp
     */
    @GetMapping(value = "/me/whatsapp")
    public ResponseEntity<WhatsAppStatusResponseDTO> getWhatsAppStatus() {
        return ResponseEntity.ok(tenantService.getWhatsAppStatus());
    }

    /**
     * Cria (ou recria) a instância WhatsApp para a escola autenticada.
     * Útil para escolas criadas antes da integração com a Evolution API.
     * POST /api/tenants/me/whatsapp/provision
     */
    @PostMapping(value = "/me/whatsapp/provision")
    public ResponseEntity<WhatsAppStatusResponseDTO> provisionWhatsApp() {
        return ResponseEntity.ok(tenantService.reprovisionWhatsApp());
    }
}
