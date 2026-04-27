package com.mensalito.api.service;

import com.mensalito.api.dto.request.ChargeRequestDTO;
import com.mensalito.api.dto.response.ChargeResponseDTO;
import com.mensalito.api.model.Charge;
import com.mensalito.api.model.Enrollment;
import com.mensalito.api.repository.ChargeRepository;
import com.mensalito.api.repository.EnrollmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChargeService {

    private final ChargeRepository chargeRepository;
    private final EnrollmentRepository enrollmentRepository;

    public ChargeResponseDTO create(ChargeRequestDTO dto) {

        Enrollment enrollment = enrollmentRepository.findById(dto.enrollmentId())
                .orElseThrow(() -> new RuntimeException("Matrícula não encontrada"));

        Charge charge = Charge.builder()
                .enrollment(enrollment)
                .dueDate(dto.dueDate())
                .amount(dto.amount())
                .build();

        Charge saved = chargeRepository.save(charge);

        return toResponse(saved);
    }

    public List<ChargeResponseDTO> findAll(UUID enrollmentId, String status, LocalDate dueDate) {
        if (enrollmentId != null) {
            return chargeRepository.findByEnrollmentId(enrollmentId)
                    .stream().map(this::toResponse).toList();
        }
        if (status != null) {
            return chargeRepository.findByStatus(status)
                    .stream().map(this::toResponse).toList();
        }
        if (dueDate != null) {
            return chargeRepository.findByDueDate(dueDate)
                    .stream().map(this::toResponse).toList();
        }
        return chargeRepository.findAll()
                .stream().map(this::toResponse).toList();
    }

    public ChargeResponseDTO updateStatus(UUID id, ChargeRequestDTO dto) {
        Charge charge = chargeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cobrança não encontrada"));
        charge.setStatus("PENDING");
        Charge saved = chargeRepository.save(charge);

        return toResponse(saved);
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
