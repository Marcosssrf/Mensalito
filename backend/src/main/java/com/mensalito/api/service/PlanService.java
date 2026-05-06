package com.mensalito.api.service;

import com.mensalito.api.client.AbacatePayClient;
import com.mensalito.api.dto.abacatepay.request.AbacatePayProductRequest;
import com.mensalito.api.dto.abacatepay.response.AbacatePayProductResponse;
import com.mensalito.api.dto.request.PlanRequestDTO;
import com.mensalito.api.dto.response.PlanResponseDTO;
import com.mensalito.api.exception.ResourceNotFoundException;
import com.mensalito.api.model.Plan;
import com.mensalito.api.model.Tenant;
import com.mensalito.api.repository.PlanRepository;
import com.mensalito.api.repository.TenantRepository;
import com.mensalito.api.security.SecurityUtils;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class PlanService {

    private final PlanRepository planRepository;
    private final TenantRepository tenantRepository;
    private final SecurityUtils securityUtils;
    private final AbacatePayClient abacatePayClient;
    private final EncryptionService encryptionService;

    public PlanResponseDTO create(PlanRequestDTO dto) {
        Tenant tenant = tenantRepository.findById(securityUtils.getAuthenticatedTenantId())
                .orElseThrow(() -> new ResourceNotFoundException("Tenant não encontrado"));

        Plan plan = Plan.builder()
                .name(dto.name())
                .amount(dto.amount())
                .dueDay(dto.dueDay())
                .tenant(tenant)
                .build();

        plan = planRepository.save(plan);

        String encryptedKey = tenant.getAbacatePayApiKey();
        if (encryptedKey != null) {
            AbacatePayProductRequest abacateRequest = AbacatePayProductRequest.fromPlan(
                    plan.getId().toString(), plan.getName(), plan.getAmount()
            );
            AbacatePayProductResponse response = abacatePayClient.createProduct(abacateRequest, encryptionService.decrypt(encryptedKey));
            if (response != null) {
                plan.setAbacatePayProductId(response.id());
                plan = planRepository.save(plan);
            }
        } else {
            log.warn("Tenant {} sem API key do AbacatePay", tenant.getId());
        }

        return toResponse(plan);
    }

    public List<PlanResponseDTO> findAll() {
        UUID tenantId = securityUtils.getAuthenticatedTenantId();
        return planRepository.findByTenantId(tenantId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public PlanResponseDTO findById(UUID id) {
        UUID tenantId = securityUtils.getAuthenticatedTenantId();
        Plan plan = planRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Plano não encontrado"));
        return toResponse(plan);
    }

    public PlanResponseDTO update(UUID id, PlanRequestDTO dto) {
        UUID tenantId = securityUtils.getAuthenticatedTenantId();
        Plan plan = planRepository.findByIdAndTenantId(id, tenantId)
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
        UUID tenantId = securityUtils.getAuthenticatedTenantId();
        Plan plan = planRepository.findByIdAndTenantId(id, tenantId)
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