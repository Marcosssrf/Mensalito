package com.mensalito.api.service;

import com.mensalito.api.client.AbacatePayClient;
import com.mensalito.api.config.AbacatePayConfig;
import com.mensalito.api.dto.abacatepay.request.AbacatePayCheckoutRequest;
import com.mensalito.api.dto.abacatepay.request.AbacatePayPixRequest;
import com.mensalito.api.dto.abacatepay.request.AbacatePayWebhookDTO;
import com.mensalito.api.dto.abacatepay.response.AbacatePayCheckoutResponse;
import com.mensalito.api.dto.abacatepay.response.AbacatePayPixResponse;
import com.mensalito.api.dto.request.ChargeRequestDTO;
import com.mensalito.api.dto.response.ChargeResponseDTO;
import com.mensalito.api.exception.ResourceNotFoundException;
import com.mensalito.api.model.Charge;
import com.mensalito.api.model.Enrollment;
import com.mensalito.api.model.Plan;
import com.mensalito.api.model.Student;
import com.mensalito.api.model.enums.ChargeStatus;
import com.mensalito.api.repository.ChargeRepository;
import com.mensalito.api.repository.EnrollmentRepository;
import com.mensalito.api.security.SecurityUtils;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class ChargeService {

    private final ChargeRepository chargeRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final SecurityUtils securityUtils;
    private final AbacatePayClient abacatePayClient;
    private final AbacatePayConfig abacatePayConfig;
    private final EncryptionService encryptionService;

    public ChargeResponseDTO create(ChargeRequestDTO dto) {
        UUID tenantId = securityUtils.getAuthenticatedTenantId();
        Enrollment enrollment = enrollmentRepository.findByIdAndTenantId(dto.enrollmentId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Matrícula não encontrada"));

        Charge charge = Charge.builder()
                .enrollment(enrollment)
                .dueDate(dto.dueDate())
                .amount(enrollment.getPlan().getAmount())
                .tenant(securityUtils.getAuthenticatedTenant())
                .createdAt(LocalDateTime.now())
                .build();

        Charge saved = chargeRepository.save(charge);

        generatePayment(saved);

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

    public void generateMonthlyCharges() {
        int today = LocalDate.now().getDayOfMonth();
        log.info("Gerando cobranças para vencimento dia {}", today);

        List<Enrollment> enrollments = enrollmentRepository.findActiveByPlanDueDay(today);

        int generated = 0;
        for (Enrollment enrollment : enrollments) {
            try {
                LocalDate dueDate = LocalDate.now()
                        .withDayOfMonth(enrollment.getPlan().getDueDay());

                boolean alreadyExists = chargeRepository
                        .existsByEnrollmentIdAndDueDate(enrollment.getId(), dueDate);

                if (!alreadyExists) {
                    Charge charge = Charge.builder()
                            .enrollment(enrollment)
                            .tenant(enrollment.getTenant())
                            .amount(enrollment.getPlan().getAmount())
                            .dueDate(dueDate)
                            .build();

                    Charge saved = chargeRepository.save(charge);
                    generatePayment(saved);
                    generated++;
                }
            } catch (Exception e) {
                log.error("Erro ao gerar cobrança para matrícula {}: {}", enrollment.getId(), e.getMessage());
            }
        }

        log.info("Cobranças geradas: {}", generated);
    }

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
                charge.getCheckoutUrl(),
                charge.getCreatedAt()
        );
    }

    public void generatePayment(Charge saved) {
        Enrollment enrollment = saved.getEnrollment();
        Student student = enrollment.getStudent();
        Plan plan = enrollment.getPlan();
        String encryptedKey = enrollment.getTenant().getAbacatePayApiKey();
        if (encryptedKey == null) {
            log.warn("Tenant {} sem API key do AbacatePay — pagamento não gerado para charge {}",
                    enrollment.getTenant().getId(), saved.getId());
            return;
        }
        String tenantApiKey = encryptionService.decrypt(encryptedKey);

        generateCheckout(saved, student, plan, tenantApiKey);
        generatePix(saved, student, plan, tenantApiKey);
    }

    private void generateCheckout(Charge charge, Student student, Plan plan, String tenantApiKey) {
        String customerId = student.getAbacatePayCustomerId();
        String productId = plan.getAbacatePayProductId();

        if (customerId == null || productId == null) {
            log.warn("Charge {} sem customerId ou productId do AbacatePay — checkout ignorado",
                    charge.getId());
            return;
        }

        AbacatePayCheckoutRequest request = new AbacatePayCheckoutRequest(
                List.of(new AbacatePayCheckoutRequest.Item(productId, 1)),
                customerId,
                charge.getId().toString(),
                abacatePayConfig.getReturnUrl(),
                abacatePayConfig.getCompletionUrl(),
                List.of("PIX")
        );

        AbacatePayCheckoutResponse response = abacatePayClient.createCheckout(request, tenantApiKey);

        if (response != null) {
            charge.setAbacatePayCheckoutId(response.id());
            charge.setCheckoutUrl(response.url());
            chargeRepository.save(charge);
            log.info("Checkout gerado para charge {}: {}", charge.getId(), response.url());
        }
    }

    private void generatePix(Charge charge, Student student, Plan plan, String tenantApiKey) {
        AbacatePayPixRequest request = new AbacatePayPixRequest(
                "PIX",
                new AbacatePayPixRequest.PixData(
                        plan.getAmount().multiply(BigDecimal.valueOf(100)).intValue(),
                        "Mensalidade - " + charge.getEnrollment().getSchoolClass().getName(),
                        3600L * 24 * 3,
                        new AbacatePayPixRequest.PixCustomer(
                                student.getName(),
                                student.getEmail(),
                                student.getDocument(),
                                student.getPhone()
                        )
                )
        );

        AbacatePayPixResponse response = abacatePayClient.createPix(request, tenantApiKey);

        if (response != null) {
            charge.setPixCode(response.brCode());
            chargeRepository.save(charge);
            log.info("PIX gerado para charge {}", charge.getId());
        }
    }

    public void processWebhook(AbacatePayWebhookDTO dto) {
        String event = dto.event();
        log.info("Webhook recebido: event={}", event);

        String externalId = dto.data().checkout().externalId();
        if (externalId == null) {
            log.warn("Webhook sem externalId, ignorado!");
            return;
        }

        ChargeStatus newStatus = switch (event) {
            case "checkout.completed" -> ChargeStatus.PAID;
            case "checkout.refunded" -> ChargeStatus.REFUNDED;
            case "checkout.lost" -> ChargeStatus.LOST;
            case "checkout.disputed" -> ChargeStatus.DISPUTED;
            default -> {
                log.info("Evento ignorado: event={}", event);
                yield null;
            }
        };

        if (newStatus == null) return;

        ChargeStatus finalNewStatus = newStatus;
        chargeRepository.findById(UUID.fromString(externalId)).ifPresentOrElse(
                charge -> {
                    charge.setStatus(finalNewStatus);
                    if (finalNewStatus == ChargeStatus.PAID) {
                        charge.setPaymentDate(LocalDate.now());
                    }
                    chargeRepository.save(charge);
                    log.info("Cobrança {} atualizada para {}", externalId, finalNewStatus);
                },
                () -> log.warn("Cobrança não encontrada para externalId {}", externalId)
        );
    }
}
