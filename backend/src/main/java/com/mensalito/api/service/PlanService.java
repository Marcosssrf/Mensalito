package com.mensalito.api.service;

import com.mensalito.api.dto.request.PlanRequestDTO;
import com.mensalito.api.dto.response.PlanResponseDTO;
import com.mensalito.api.exception.ResourceNotFoundException;
import com.mensalito.api.model.Plan;
import com.mensalito.api.repository.PlanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PlanService {

    private final PlanRepository planRepository;

    public PlanResponseDTO create(PlanRequestDTO dto) {
        Plan plan = Plan.builder()
                .name(dto.name())
                .amount(dto.amount())
                .dueDay(dto.dueDay())
                .build();

        Plan saved = planRepository.save(plan);

        return toResponse(saved);
    }

    public List<PlanResponseDTO> findAll() {
        return planRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public PlanResponseDTO findById(UUID id) {
        Plan plan = planRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Plano não encontrado"));
        return toResponse(plan);
    }

    public PlanResponseDTO update(UUID id, PlanRequestDTO dto) {
        Plan plan = planRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Plano não encontrado"));

        if (dto.name() != null) {
            plan.setName(dto.name());
        }

        if (dto.amount() != null) {
            plan.setAmount(dto.amount());
        }

        if (dto.dueDay() != null) {
            plan.setDueDay(dto.dueDay());
        }

        plan = planRepository.save(plan);

        return toResponse(plan);
    }

    public PlanResponseDTO deactivate(UUID id) {
        Plan plan = planRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Plano não encontrado"));
        plan.setActive(false);
        plan = planRepository.save(plan);
        return toResponse(plan);
    }

    private PlanResponseDTO toResponse(Plan plan) {
        return new PlanResponseDTO(
                plan.getId(),
                plan.getName(),
                plan.getAmount(),
                plan.getDueDay(),
                plan.getActive(),
                plan.getCreatedAt()
        );
    }
}
