package com.mensalito.api.service;

import com.mensalito.api.dto.request.SchoolClassRequestDTO;
import com.mensalito.api.dto.response.SchoolClassResponseDTO;
import com.mensalito.api.exception.ResourceNotFoundException;
import com.mensalito.api.model.SchoolClass;
import com.mensalito.api.repository.SchoolClassRepository;
import com.mensalito.api.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SchoolClassService {

    private final SchoolClassRepository schoolClassRepository;
    private final SecurityUtils securityUtils;

    public SchoolClassResponseDTO create(SchoolClassRequestDTO dto) {
        SchoolClass schoolClass = SchoolClass.builder()
                .name(dto.name())
                .description(dto.description())
                .tenant(securityUtils.getAuthenticatedTenant())
                .build();

        SchoolClass saved = schoolClassRepository.save(schoolClass);

        return toResponse(saved);
    }

    public List<SchoolClassResponseDTO> findAll() {
        UUID tenantId = securityUtils.getAuthenticatedTenantId();
        return schoolClassRepository.findByTenantId(tenantId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public SchoolClassResponseDTO findById(UUID id) {
        UUID tenantId = securityUtils.getAuthenticatedTenantId();
        SchoolClass schoolClass = schoolClassRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Turma não encontrada"));
        return toResponse(schoolClass);
    }

    public SchoolClassResponseDTO update(UUID id, SchoolClassRequestDTO dto) {
        UUID tenantId = securityUtils.getAuthenticatedTenantId();
        SchoolClass schoolClass = schoolClassRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Turma não encontrada"));

        if (dto.name() != null) {
            schoolClass.setName(dto.name());
        }
        if (dto.description() != null) {
            schoolClass.setDescription(dto.description());
        }

        schoolClass = schoolClassRepository.save(schoolClass);

        return toResponse(schoolClass);
    }

    public SchoolClassResponseDTO deactivate(UUID id) {
        UUID tenantId = securityUtils.getAuthenticatedTenantId();
        SchoolClass schoolClass = schoolClassRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Turma não encontrada"));
        schoolClass.setActive(false);
        schoolClass = schoolClassRepository.save(schoolClass);
        return toResponse(schoolClass);
    }

    private SchoolClassResponseDTO toResponse(SchoolClass schoolClass) {
        return new SchoolClassResponseDTO(
                schoolClass.getId(),
                schoolClass.getName(),
                schoolClass.getDescription(),
                schoolClass.getActive(),
                schoolClass.getCreatedAt()
        );
    }

}
