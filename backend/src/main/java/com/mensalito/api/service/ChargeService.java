package com.mensalito.api.service;

import com.mensalito.api.dto.request.ChargeRequestDTO;
import com.mensalito.api.dto.response.ChargeResponseDTO;
import com.mensalito.api.exception.ResourceNotFoundException;
import com.mensalito.api.model.Charge;
import com.mensalito.api.model.Enrollment;
import com.mensalito.api.model.enums.ChargeStatus;
import com.mensalito.api.repository.ChargeRepository;
import com.mensalito.api.repository.EnrollmentRepository;
import com.mensalito.api.security.SecurityUtils;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class ChargeService {

    private final ChargeRepository chargeRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final SecurityUtils securityUtils;

    public ChargeResponseDTO create(ChargeRequestDTO dto) {

        Enrollment enrollment = enrollmentRepository.findById(dto.enrollmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Matrícula não encontrada"));

        Charge charge = Charge.builder()
                .enrollment(enrollment)
                .dueDate(dto.dueDate())
                .amount(dto.amount())
                .tenant(securityUtils.getAuthenticatedTenant())
                .createdAt(LocalDateTime.now())
                .build();

        Charge saved = chargeRepository.save(charge);

        return toResponse(saved);
    }

    public List<ChargeResponseDTO> findAll(UUID enrollmentId, ChargeStatus status, LocalDate dueDate) {
        UUID tenantId = securityUtils.getAuthenticatedTenantId();

        if (enrollmentId != null) {
            return chargeRepository.findByTenantIdAndEnrollmentId(tenantId, enrollmentId)
                    .stream().map(this::toResponse).toList();
        }
        if (status != null) {
            return chargeRepository.findByTenantIdAndStatus(tenantId, status)
                    .stream().map(this::toResponse).toList();
        }
        if (dueDate != null) {
            return chargeRepository.findByTenantIdAndDueDate(tenantId, dueDate)
                    .stream().map(this::toResponse).toList();
        }
        return chargeRepository.findByTenantId(tenantId)
                .stream().map(this::toResponse).toList();
    }

    public ChargeResponseDTO updateStatus(UUID id, ChargeStatus status) {
        UUID tenantId = securityUtils.getAuthenticatedTenantId();
        Charge charge = chargeRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Cobrança não encontrada"));
        charge.setStatus(status);
        return toResponse(chargeRepository.save(charge));
    }

    //generateMonthlyCharges

    public ChargeResponseDTO toResponse(Charge charge) {
        return new ChargeResponseDTO(
                charge.getId(),
                charge.getEnrollment().getStudent().getName(),
                charge.getAmount(),
                charge.getDueDate(),
                charge.getStatus(),
                charge.getPaymentDate(),
                charge.getPixCode(),
                charge.getBoletoUrl(),
                charge.getCreatedAt()
        );
    }
}
