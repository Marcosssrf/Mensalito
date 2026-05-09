package com.mensalito.api.service;

import com.mensalito.api.client.AbacatePayClient;
import com.mensalito.api.client.WhatsAppClient;
import com.mensalito.api.config.AbacatePayConfig;
import com.mensalito.api.dto.abacatepay.request.AbacatePayCheckoutRequest;
import com.mensalito.api.dto.abacatepay.request.AbacatePayPixRequest;
import com.mensalito.api.dto.abacatepay.request.AbacatePayWebhookDTO;
import com.mensalito.api.dto.abacatepay.response.AbacatePayCheckoutResponse;
import com.mensalito.api.dto.abacatepay.response.AbacatePayPixResponse;
import com.mensalito.api.dto.request.ChargeRequestDTO;
import com.mensalito.api.dto.request.ManualChargeRequestDTO;
import com.mensalito.api.dto.request.ManualPaymentRequestDTO;
import com.mensalito.api.dto.response.ChargeResponseDTO;
import com.mensalito.api.exception.ResourceNotFoundException;
import com.mensalito.api.model.*;
import com.mensalito.api.model.enums.ChargeStatus;
import com.mensalito.api.repository.ChargeRepository;
import com.mensalito.api.repository.EnrollmentRepository;
import com.mensalito.api.repository.TenantRepository;
import com.mensalito.api.security.SecurityUtils;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class ChargeService {

    private final ChargeRepository chargeRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final TenantRepository tenantRepository;
    private final SecurityUtils securityUtils;
    private final AbacatePayClient abacatePayClient;
    private final AbacatePayConfig abacatePayConfig;
    private final EncryptionService encryptionService;
    private final WhatsAppClient whatsAppClient;
    private final WhatsAppMessageBuilder messageBuilder;
    private final StringRedisTemplate redisTemplate;

    private static final String SCHEDULER_KEY_PREFIX = "scheduler:charges:";

    public ChargeResponseDTO create(ChargeRequestDTO dto) {
        UUID tenantId = securityUtils.getAuthenticatedTenantId();

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant não encontrado"));

        Enrollment enrollment = enrollmentRepository.findByIdAndTenantId(dto.enrollmentId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Matrícula não encontrada"));

        if (!Boolean.TRUE.equals(enrollment.getActive())) {
            throw new IllegalStateException("Não é possível criar cobrança para uma matrícula inativa");
        }

        Charge charge = Charge.builder()
                .enrollment(enrollment)
                .dueDate(dto.dueDate())
                .amount(enrollment.getPlan().getAmount())
                .tenant(tenant)
                .createdAt(LocalDateTime.now())
                .build();

        charge = chargeRepository.save(charge);

        generatePayment(charge);

        return toResponse(charge);
    }

    public ChargeResponseDTO createManual(ManualChargeRequestDTO dto) {
        UUID tenantId = securityUtils.getAuthenticatedTenantId();

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant não encontrado"));

        Enrollment enrollment = enrollmentRepository.findByIdAndTenantId(dto.enrollmentId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Matrícula não encontrada"));

        if (!Boolean.TRUE.equals(enrollment.getActive())) {
            throw new IllegalStateException("Não é possível criar cobrança para uma matrícula inativa");
        }

        BigDecimal amount = dto.amount() != null ? dto.amount() : enrollment.getPlan().getAmount();

        Charge charge = Charge.builder()
                .enrollment(enrollment)
                .dueDate(dto.dueDate())
                .amount(amount)
                .tenant(tenant)
                .createdAt(LocalDateTime.now())
                // Cobranças manuais ficam PENDING até confirmação explícita
                .status(ChargeStatus.PENDING)
                .build();

        charge = chargeRepository.save(charge);

        log.info("Cobrança manual criada: chargeId={}, enrollmentId={}, amount={}, dueDate={}",
                charge.getId(), enrollment.getId(), amount, dto.dueDate());

        return toResponse(charge);
    }

    public ChargeResponseDTO confirmManualPayment(UUID id, ManualPaymentRequestDTO dto) {
        UUID tenantId = securityUtils.getAuthenticatedTenantId();

        Charge charge = chargeRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Cobrança não encontrada"));

        if (charge.getStatus() == ChargeStatus.PAID) {
            throw new IllegalStateException("Cobrança já está marcada como paga");
        }
        if (charge.getStatus() == ChargeStatus.CANCELLED) {
            throw new IllegalStateException("Não é possível confirmar pagamento de uma cobrança cancelada");
        }

        charge.setStatus(ChargeStatus.PAID);
        charge.setPaymentDate(dto.paymentDate() != null ? dto.paymentDate() : LocalDate.now());

        // Armazena método de pagamento no campo pixCode para auditoria
        // (campo reutilizado para evitar migration — prefixado com "MANUAL:")
        charge.setPixCode("MANUAL:" + dto.paymentMethod()
                + (dto.notes() != null && !dto.notes().isBlank() ? " | " + dto.notes() : ""));

        charge = chargeRepository.save(charge);

        log.info("Pagamento manual confirmado: chargeId={}, method={}, date={}",
                charge.getId(), dto.paymentMethod(), charge.getPaymentDate());

        return toResponse(charge);
    }

    public ChargeResponseDTO cancel(UUID id) {
        UUID tenantId = securityUtils.getAuthenticatedTenantId();

        Charge charge = chargeRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Cobrança não encontrada"));

        if (charge.getStatus() == ChargeStatus.PAID) {
            throw new IllegalStateException(
                    "Não é possível cancelar uma cobrança já paga. Use reembolso se necessário.");
        }
        if (charge.getStatus() == ChargeStatus.CANCELLED) {
            throw new IllegalStateException("Cobrança já está cancelada");
        }

        charge.setStatus(ChargeStatus.CANCELLED);
        charge = chargeRepository.save(charge);

        log.info("Cobrança cancelada: chargeId={}", charge.getId());

        return toResponse(charge);
    }

    public Page<ChargeResponseDTO> findAll(UUID enrollmentId, ChargeStatus status, LocalDate dueDate, Pageable pageable) {
        UUID tenantId = securityUtils.getAuthenticatedTenantId();

        if (enrollmentId != null) {
            return chargeRepository.findByTenantIdAndEnrollmentId(tenantId, enrollmentId, pageable)
                    .map(this::toResponse);
        }
        if (status != null) {
            return chargeRepository.findByTenantIdAndStatus(tenantId, status, pageable)
                    .map(this::toResponse);
        }
        if (dueDate != null) {
            return chargeRepository.findByTenantIdAndDueDate(tenantId, dueDate, pageable)
                    .map(this::toResponse);
        }
        return chargeRepository.findByTenantId(tenantId, pageable)
                .map(this::toResponse);
    }

    public ChargeResponseDTO updateStatus(UUID id, ChargeStatus status) {
        UUID tenantId = securityUtils.getAuthenticatedTenantId();
        Charge charge = chargeRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Cobrança não encontrada"));
        charge.setStatus(status);
        return toResponse(chargeRepository.save(charge));
    }

    public void generateMonthlyCharges() {
        generateMonthlyCharges(false);
    }

    public void generateMonthlyCharges(boolean force) {
        String redisKey = SCHEDULER_KEY_PREFIX + LocalDate.now();

        if (!force && Boolean.TRUE.equals(redisTemplate.hasKey(redisKey))) {
            log.info("Cobranças do dia já foram geradas. Use force=true para forçar.");
            return;
        }

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

                    charge = chargeRepository.save(charge);
                    generatePayment(charge);
                    generated++;
                }
            } catch (Exception e) {
                log.error("Erro ao gerar cobrança para matrícula {}: {}", enrollment.getId(), e.getMessage());
            }
        }

        log.info("Cobranças geradas: {}", generated);
        redisTemplate.opsForValue().set(redisKey, String.valueOf(generated), 23, TimeUnit.HOURS);
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

    public void generatePayment(Charge charge) {
        Enrollment enrollment = charge.getEnrollment();
        String encryptedKey = enrollment.getTenant().getAbacatePayApiKey();

        if (encryptedKey == null) {
            log.warn("Tenant {} sem API key — pagamento não gerado para charge {}",
                    enrollment.getTenant().getId(), charge.getId());
            return;
        }

        String tenantApiKey = encryptionService.decrypt(encryptedKey);
        Student student = enrollment.getStudent();
        Plan plan = enrollment.getPlan();

        generateCheckout(charge, student, plan, tenantApiKey);
        generatePix(charge, student, plan, tenantApiKey);
        sendWhatsAppNotification(charge);
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
            case "checkout.refunded"  -> ChargeStatus.REFUNDED;
            case "checkout.lost"      -> ChargeStatus.LOST;
            case "checkout.disputed"  -> ChargeStatus.DISPUTED;
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

    private void sendWhatsAppNotification(Charge charge) {
        Student student = charge.getEnrollment().getStudent();
        if (student.getPhone() == null) {
            log.warn("Aluno {} sem telefone, WhatsApp não enviado", student.getId());
            return;
        }
        String instanceName = charge.getTenant().getEvolutionInstanceName();
        if (instanceName == null || instanceName.isBlank()) {
            log.warn("Tenant {} sem instância Evolution configurada, WhatsApp não enviado para aluno {}",
                    charge.getTenant().getId(), student.getId());
            return;
        }
        whatsAppClient.sendText(instanceName, student.getPhone(), messageBuilder.buildChargeNotification(charge));
    }

    private void sendReminderNotification(Charge charge, int daysOverdue) {
        Student student = charge.getEnrollment().getStudent();
        if (student.getPhone() == null) return;
        String instanceName = charge.getTenant().getEvolutionInstanceName();
        if (instanceName == null || instanceName.isBlank()) {
            log.warn("Tenant {} sem instância Evolution — lembrete D+{} não enviado para {}",
                    charge.getTenant().getId(), daysOverdue, student.getName());
            return;
        }
        whatsAppClient.sendText(instanceName, student.getPhone(), messageBuilder.buildReminderNotification(charge, daysOverdue));
        log.info("Lembrete D+{} enviado para {} via instância '{}'", daysOverdue, student.getName(), instanceName);
    }

    public void sendOverdueReminders() {
        LocalDate today = LocalDate.now();
        LocalDate threeDaysAgo = today.minusDays(3);
        LocalDate sevenDaysAgo = today.minusDays(7);

        markAllOverdue(today);

        List<Charge> overdue3 = chargeRepository.findByStatusAndDueDate(ChargeStatus.OVERDUE, threeDaysAgo);
        List<Charge> overdue7 = chargeRepository.findByStatusAndDueDate(ChargeStatus.OVERDUE, sevenDaysAgo);

        overdue3.forEach(charge -> sendReminderNotification(charge, 3));
        overdue7.forEach(charge -> sendReminderNotification(charge, 7));
    }

    public void markAllOverdue(LocalDate referenceDate) {
        List<Charge> pendingOverdue = chargeRepository.findAllByStatusAndDueDateBefore(
                ChargeStatus.PENDING, referenceDate);

        if (pendingOverdue.isEmpty()) return;

        pendingOverdue.forEach(c -> c.setStatus(ChargeStatus.OVERDUE));
        chargeRepository.saveAll(pendingOverdue);
        log.info("Cobranças marcadas como OVERDUE: {}", pendingOverdue.size());
    }
}
