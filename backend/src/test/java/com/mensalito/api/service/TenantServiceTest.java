package com.mensalito.api.service;

import com.mensalito.api.dto.request.TenantRequestDTO;
import com.mensalito.api.dto.response.TenantResponseDTO;
import com.mensalito.api.exception.ResourceNotFoundException;
import com.mensalito.api.model.Tenant;
import com.mensalito.api.repository.TenantRepository;
import com.mensalito.api.security.SecurityUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TenantServiceTest {

    @Mock
    private TenantRepository tenantRepository;

    @Mock
    private EncryptionService encryptionService;

    @Mock
    private SecurityUtils securityUtils;

    @InjectMocks
    private TenantService tenantService;

    private Tenant tenant;
    private TenantRequestDTO requestDTO;
    private UUID tenantId;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();

        tenant = Tenant.builder()
                .id(tenantId)
                .name("Escola de Inglês do João")
                .email("joao@escola.com")
                .phone("34999999999")
                .document("12345678000199")
                .active(true)
                .abacatePayApiKey(null)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        requestDTO = new TenantRequestDTO(
                "Escola de Inglês do João",
                "joao@escola.com",
                "34999999999",
                "12345678000199"
        );
    }

    @Test
    @DisplayName("Deve criar um tenant com sucesso")
    void create_success() {
        when(tenantRepository.save(any(Tenant.class))).thenReturn(tenant);

        TenantResponseDTO response = tenantService.create(requestDTO);

        assertNotNull(response);
        assertEquals("Escola de Inglês do João", response.name());
        assertEquals("joao@escola.com", response.email());
        assertEquals("34999999999", response.phone());
        assertEquals("12345678000199", response.document());
        assertEquals(true, response.active());
        verify(tenantRepository, times(1)).save(any(Tenant.class));
    }

    @Test
    @DisplayName("Deve buscar tenant por ID com sucesso")
    void findById_success() {
        when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));

        TenantResponseDTO result = tenantService.findById(tenantId);

        assertNotNull(result);
        assertEquals(tenantId, result.id());
        assertEquals("Escola de Inglês do João", result.name());
    }

    @Test
    @DisplayName("Deve lançar exceção quando tenant não encontrado")
    void findById_notFound() {
        when(tenantRepository.findById(tenantId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> tenantService.findById(tenantId));
    }

    @Test
    @DisplayName("Deve atualizar tenant com sucesso")
    void update_success() {
        TenantRequestDTO updateDTO = new TenantRequestDTO(
                "Escola Atualizada",
                "joao@escola.com",
                "34999999999",
                "12345678000199"
        );

        // mock do securityUtils para simular OWNER do tenant correto
        when(securityUtils.getAuthenticatedTenantId()).thenReturn(tenantId);
        when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));
        when(tenantRepository.save(any(Tenant.class))).thenReturn(tenant);

        TenantResponseDTO response = tenantService.update(tenantId, updateDTO);

        assertNotNull(response);
        verify(tenantRepository, times(1)).save(any(Tenant.class));
    }

    @Test
    @DisplayName("Deve lançar exceção ao atualizar tenant de outro owner")
    void update_differentTenant() {
        UUID otherTenantId = UUID.randomUUID();
        when(securityUtils.getAuthenticatedTenantId()).thenReturn(otherTenantId);

        assertThrows(org.springframework.security.access.AccessDeniedException.class,
                () -> tenantService.update(tenantId, requestDTO));

        verify(tenantRepository, never()).findById(any());
        verify(tenantRepository, never()).save(any());
    }

    @Test
    @DisplayName("Deve lançar exceção ao atualizar tenant inexistente")
    void update_notFound() {
        when(securityUtils.getAuthenticatedTenantId()).thenReturn(tenantId);
        when(tenantRepository.findById(tenantId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> tenantService.update(tenantId, requestDTO));

        verify(tenantRepository, never()).save(any(Tenant.class));
    }

    @Test
    @DisplayName("Deve salvar a API key criptografada com sucesso")
    void generateApiKey_success() {
        String rawApiKey = "minha-api-key-secreta";
        String encryptedKey = "encrypted-abc123";

        when(securityUtils.getAuthenticatedTenantId()).thenReturn(tenantId);
        when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));
        when(encryptionService.encrypt(rawApiKey)).thenReturn(encryptedKey);

        tenantService.saveApiKey(rawApiKey);

        assertEquals(encryptedKey, tenant.getAbacatePayApiKey());
        verify(encryptionService).encrypt(rawApiKey);
        verify(tenantRepository).save(tenant);
    }

    @Test
    @DisplayName("Deve lançar exceção ao salvar API key quando tenant não encontrado")
    void generateApiKey_tenantNotFound() {
        when(securityUtils.getAuthenticatedTenantId()).thenReturn(tenantId);
        when(tenantRepository.findById(tenantId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                tenantService.saveApiKey("qualquer-key")
        );

        verify(encryptionService, never()).encrypt(any());
        verify(tenantRepository, never()).save(any());
    }
}