package com.mensalito.api.service;

import com.mensalito.api.dto.request.SchoolClassRequestDTO;
import com.mensalito.api.dto.response.SchoolClassResponseDTO;
import com.mensalito.api.exception.ResourceNotFoundException;
import com.mensalito.api.model.SchoolClass;
import com.mensalito.api.repository.SchoolClassRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SchoolClassService {

    private final SchoolClassRepository schoolClassRepository;

    public SchoolClassResponseDTO create(SchoolClassRequestDTO dto) {
        SchoolClass schoolClass = SchoolClass.builder()
                .name(dto.name())
                .description(dto.description())
                .build();

        SchoolClass saved = schoolClassRepository.save(schoolClass);

        return toResponse(saved);
    }

    public List<SchoolClassResponseDTO> findAll() {
        return schoolClassRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public SchoolClassResponseDTO findById(UUID id) {
        SchoolClass schoolClass = schoolClassRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Turma não encontrada"));
        return toResponse(schoolClass);
    }

    public SchoolClassResponseDTO update(UUID id, SchoolClassRequestDTO dto) {
        SchoolClass schoolClass = schoolClassRepository.findById(id)
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
        SchoolClass schoolClass = schoolClassRepository.findById(id)
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
