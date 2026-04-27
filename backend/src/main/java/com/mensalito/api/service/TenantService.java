package com.mensalito.api.service;

import com.mensalito.api.dto.request.TenantRequestDTO;
import com.mensalito.api.dto.response.TenantResponseDTO;
import com.mensalito.api.model.Tenant;
import com.mensalito.api.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TenantService {

    private final TenantRepository tenantRepository;

    public TenantResponseDTO create(TenantRequestDTO dto) {
        Tenant tenant = Tenant.builder()
                .name(dto.name())
                .email(dto.email())
                .phone(dto.phone())
                .document(dto.document())
                .build();

        Tenant saved = tenantRepository.save(tenant);

        return toResponse(saved);
    }

    public Tenant findById(UUID id) {
        return tenantRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tenant não encontrado"));
    }

    public TenantResponseDTO findByIdResponse(UUID id) {
        return toResponse(findById(id));
    }

    public TenantResponseDTO update(UUID id, TenantRequestDTO dto) {

        Tenant tenant = tenantRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tenant não encontrado"));

        if (dto.name() != null) {
            tenant.setName(dto.name());
        }

        if (dto.email() != null) {
            tenant.setEmail(dto.email());
        }

        if (dto.phone() != null) {
            tenant.setPhone(dto.phone());
        }

        if (dto.document() != null) {
            tenant.setDocument(dto.document());
        }

        Tenant saved = tenantRepository.save(tenant);

        return toResponse(saved);
    }

    private TenantResponseDTO toResponse(Tenant tenant) {
        return new TenantResponseDTO(
                tenant.getId(),
                tenant.getName(),
                tenant.getEmail(),
                tenant.getPhone(),
                tenant.getDocument(),
                tenant.getActive(),
                tenant.getCreatedAt()
        );
    }

}
