package com.mensalito.api.service;

import com.mensalito.api.client.MercadoPagoClient;
import com.mensalito.api.client.WhatsAppClient;
import com.mensalito.api.dto.mercadopago.request.MercadoPagoOrderRequest;
import com.mensalito.api.dto.mercadopago.request.MercadoPagoOrderRequest.*;
import com.mensalito.api.dto.mercadopago.request.MercadoPagoWebhookDTO;
import com.mensalito.api.dto.mercadopago.response.MercadoPagoOrderResponse;
import com.mensalito.api.dto.request.ChargeRequestDTO;
import com.mensalito.api.dto.request.ManualChargeRequestDTO;
import com.mensalito.api.dto.request.ManualPaymentRequestDTO;
import com.mensalito.api.dto.response.ChargeResponseDTO;
import com.mensalito.api.exception.ResourceNotFoundException;
import com.mensalito.api.model.Charge;
import com.mensalito.api.model.Enrollment;
import com.mensalito.api.model.Student;
import com.mensalito.api.model.Tenant;
import com.mensalito.api.model.enums.ChargeStatus;
import com.mensalito.api.model.enums.PaymentPreference;
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
import java.util.Optional;
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
    private final MercadoPagoClient mercadoPagoClient;
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

        assertNoDuplicateInMonth(enrollment.getId(), dto.dueDate());

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

        assertNoDuplicateInMonth(enrollment.getId(), dto.dueDate());

        Charge charge = Charge.builder()
                .enrollment(enrollment)
                .dueDate(dto.dueDate())
                .amount(amount)
                .tenant(tenant)
                .createdAt(LocalDateTime.now())
                // Cobranças manuais ficam PENDING até confirmação explícita
                .status(ChargeStatus.PENDING)
                .manual(true)
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

        // Armazena métod de pagamento no campo pixCode para auditoria
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

                // Checa duplicata no mês inteiro (cobre cobranças manuais com data diferente)
                LocalDate monthStart = dueDate.withDayOfMonth(1);
                LocalDate monthEnd   = dueDate.withDayOfMonth(dueDate.lengthOfMonth());
                boolean alreadyExists = chargeRepository
                        .existsByEnrollmentIdAndDueDateBetweenAndStatusNot(
                                enrollment.getId(), monthStart, monthEnd, ChargeStatus.CANCELLED);

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

    /**
     * Lança exceção se já existe cobrança ativa (qualquer tipo: manual ou normal) para a
     * matrícula no mesmo mês/ano da {@code dueDate}. Cobranças CANCELLED são ignoradas.
     */
    private void assertNoDuplicateInMonth(UUID enrollmentId, LocalDate dueDate) {
        LocalDate monthStart = dueDate.withDayOfMonth(1);
        LocalDate monthEnd   = dueDate.withDayOfMonth(dueDate.lengthOfMonth());

        boolean exists = chargeRepository.existsByEnrollmentIdAndDueDateBetweenAndStatusNot(
                enrollmentId, monthStart, monthEnd, ChargeStatus.CANCELLED);

        if (exists) {
            throw new IllegalStateException(
                    "Já existe uma cobrança para esta matrícula em "
                    + dueDate.getMonth().getDisplayName(
                            java.time.format.TextStyle.FULL,
                            new java.util.Locale("pt", "BR"))
                    + "/" + dueDate.getYear()
                    + ". Cancele a cobrança existente antes de criar uma nova."
            );
        }
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
                charge.getTicketUrl(),
                charge.getCheckoutUrl(),
                charge.getCreatedAt(),
                charge.getManual(),
                charge.getWhatsappSentAt()
        );
    }

    public void generatePayment(Charge charge) {
        Enrollment enrollment = charge.getEnrollment();
        String encryptedKey = enrollment.getTenant().getMercadoPagoApiKey();

        if (encryptedKey == null) {
            log.warn("Tenant {} sem API key — pagamento não gerado para charge {}",
                    enrollment.getTenant().getId(), charge.getId());
            return;
        }

        String tenantApiKey = encryptionService.decrypt(encryptedKey);
        Student student = enrollment.getStudent();

        PaymentPreference preference = student.getPaymentPreference() != null
                ? student.getPaymentPreference()
                : PaymentPreference.BOLETO;

        if (preference == PaymentPreference.PIX) {
            generatePixOrder(charge, student, tenantApiKey);
        } else {
            generateBoletoOrder(charge, student, tenantApiKey);
        }

        sendWhatsAppNotification(charge);
    }

    private void generatePixOrder(Charge charge, Student student, String tenantApiKey) {
        if (student.getEmail() == null) {
            log.warn("Charge {} sem email do aluno — PIX via order ignorado", charge.getId());
            return;
        }

        String amountStr = charge.getAmount().toPlainString();

        MercadoPagoOrderRequest request = new MercadoPagoOrderRequest(
                "online",
                "automatic",
                charge.getId().toString(),
                amountStr,
                new MercadoPagoOrderPayer(student.getEmail()),
                new MercadoPagoOrderTransactions(
                        List.of(new MercadoPagoOrderPayment(
                                amountStr,
                                new MercadoPagoOrderPaymentMethod("pix", "bank_transfer")
                        ))
                )
        );

        MercadoPagoOrderResponse response = mercadoPagoClient.createOrder(request, tenantApiKey);

        if (response != null) {
            charge.setMercadoPagoOrderId(response.id());

            // Extrai qr_code do primeiro pagamento, se disponível
            if (response.transactions() != null
                    && response.transactions().payments() != null
                    && !response.transactions().payments().isEmpty()) {
                MercadoPagoOrderResponse.MercadoPagoOrderPaymentMethodResponse pm =
                        response.transactions().payments().get(0).paymentMethod();
                if (pm != null && pm.qrCode() != null) {
                    charge.setPixCode(pm.qrCode());
                }
            }

            chargeRepository.save(charge);
            log.info("Order PIX gerado para charge {}: orderId={}", charge.getId(), response.id());
        }
    }

    private void generateBoletoOrder(Charge charge, Student student, String tenantApiKey) {
        if (student.getEmail() == null) {
            log.warn("Charge {} sem email do aluno — boleto via order ignorado", charge.getId());
            return;
        }

        String amountStr = charge.getAmount().toPlainString();

        // Divide nome do aluno em first/last name
        String fullName = student.getName() != null ? student.getName().trim() : "Aluno";
        int spaceIdx = fullName.indexOf(' ');
        String firstName = spaceIdx > 0 ? fullName.substring(0, spaceIdx) : fullName;
        String lastName  = spaceIdx > 0 ? fullName.substring(spaceIdx + 1) : "-";

        // Monta identification — CPF ou CNPJ dependendo do tamanho do documento
        MercadoPagoOrderPayerIdentification identification = null;
        if (student.getDocument() != null && !student.getDocument().isBlank()) {
            String doc = student.getDocument().replaceAll("\\D", "");
            String docType = doc.length() == 14 ? "CNPJ" : "CPF";
            identification = new MercadoPagoOrderPayerIdentification(docType, doc);
        }

        // Endereço do aluno — usa dados cadastrados ou fallbacks mínimos exigidos pelo MP
        com.mensalito.api.model.Address studentAddress = student.getAddress();
        String zipCode      = (studentAddress != null && studentAddress.getZipCode()      != null) ? studentAddress.getZipCode().replaceAll("\\D", "")  : "01310100";
        String streetName   = (studentAddress != null && studentAddress.getStreet()        != null) ? studentAddress.getStreet()        : "Av. Paulista";
        String streetNumber = (studentAddress != null && studentAddress.getNumber()        != null) ? studentAddress.getNumber()        : "1";
        String neighborhood = (studentAddress != null && studentAddress.getNeighborhood()  != null) ? studentAddress.getNeighborhood()  : "Centro";
        String city         = (studentAddress != null && studentAddress.getCity()          != null) ? studentAddress.getCity()          : "Sao Paulo";
        String state        = (studentAddress != null && studentAddress.getState()         != null) ? studentAddress.getState()         : "SP";

        MercadoPagoOrderPayerAddress address = new MercadoPagoOrderPayerAddress(
                zipCode, streetName, streetNumber, neighborhood, city, state
        );

        MercadoPagoOrderPayer payer = new MercadoPagoOrderPayer(
                student.getEmail(),
                firstName,
                lastName,
                identification,
                address
        );

        MercadoPagoOrderRequest request = new MercadoPagoOrderRequest(
                "online",
                "automatic",
                charge.getId().toString(),
                amountStr,
                payer,
                new MercadoPagoOrderTransactions(
                        List.of(new MercadoPagoOrderPayment(
                                amountStr,
                                new MercadoPagoOrderPaymentMethod("bolbradesco", "ticket")
                        ))
                )
        );

        MercadoPagoOrderResponse response = mercadoPagoClient.createOrder(request, tenantApiKey);

        if (response != null) {
            charge.setMercadoPagoOrderId(response.id());

            // Extrai barcode e URL do boleto do primeiro pagamento, se disponível
            if (response.transactions() != null
                    && response.transactions().payments() != null
                    && !response.transactions().payments().isEmpty()) {
                MercadoPagoOrderResponse.MercadoPagoOrderPaymentMethodResponse pm =
                        response.transactions().payments().get(0).paymentMethod();
                if (pm != null) {
                    if (pm.digitable_line() != null) {
                        charge.setBoletoUrl(pm.digitable_line());
                    }
                    if (pm.ticketUrl() != null) {
                        charge.setTicketUrl(pm.ticketUrl());
                    }
                    if (pm.externalResourceUrl() != null) {
                        charge.setCheckoutUrl(pm.externalResourceUrl());
                    }
                }
            }

            chargeRepository.save(charge);
            log.info("Order boleto gerado para charge {}: orderId={}", charge.getId(), response.id());
        }
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
        boolean sent = whatsAppClient.sendText(instanceName, student.getPhone(),
                messageBuilder.buildChargeNotification(charge));
        if (sent) {
            charge.setWhatsappSentAt(LocalDateTime.now());
            chargeRepository.save(charge);
        }
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
        boolean sent = whatsAppClient.sendText(instanceName, student.getPhone(),
                messageBuilder.buildReminderNotification(charge, daysOverdue));
        if (sent) {
            charge.setWhatsappSentAt(LocalDateTime.now());
            chargeRepository.save(charge);
            log.info("Lembrete D+{} enviado para {} via instância '{}'", daysOverdue, student.getName(), instanceName);
        }
    }

    /**
     * Reenvia a notificação WhatsApp de uma cobrança específica.
     * Pode ser chamado manualmente quando o envio original falhou (whatsappSentAt == null)
     * ou para forçar reenvio independente.
     *
     * @return true se o envio foi bem-sucedido
     */
    public ChargeResponseDTO resendAndReturn(UUID chargeId) {
        UUID tenantId = securityUtils.getAuthenticatedTenantId();
        Charge charge = chargeRepository.findByIdAndTenantId(chargeId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Cobrança não encontrada"));

        Student student = charge.getEnrollment().getStudent();
        if (student.getPhone() == null) {
            throw new IllegalStateException("Aluno sem número de telefone cadastrado");
        }
        String instanceName = charge.getTenant().getEvolutionInstanceName();
        if (instanceName == null || instanceName.isBlank()) {
            throw new IllegalStateException("WhatsApp não configurado para esta escola");
        }

        boolean sent = whatsAppClient.sendText(instanceName, student.getPhone(),
                messageBuilder.buildChargeNotification(charge));
        if (sent) {
            charge.setWhatsappSentAt(LocalDateTime.now());
            charge = chargeRepository.save(charge);
            log.info("[ChargeService] Reenvio de notificação para charge {} bem-sucedido", chargeId);
        } else {
            // Erro já logado no WhatsAppClient com o detalhe da resposta da Evolution API
            throw new IllegalStateException(
                "Falha ao enviar WhatsApp para o número " + student.getPhone()
                + ". Verifique se o número tem WhatsApp e se a instância está conectada.");
        }
        return toResponse(charge);
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
        List<Charge> pendingOverdue = chargeRepository.findAllByStatusAndDueDateBeforeAndManualFalse(
                ChargeStatus.PENDING, referenceDate);

        if (pendingOverdue.isEmpty()) return;

        pendingOverdue.forEach(c -> c.setStatus(ChargeStatus.OVERDUE));
        chargeRepository.saveAll(pendingOverdue);
        log.info("Cobranças marcadas como OVERDUE: {}", pendingOverdue.size());
    }

    public void processWebhookMercadoPago(MercadoPagoWebhookDTO dto) {
        if (!"payment".equals(dto.type()) && !"order".equals(dto.type())) {
            log.info("Evento MP ignorado: type={}", dto.type());
            return;
        }

        String resourceId = dto.data().id();
        if (resourceId == null) {
            log.warn("Webhook MP sem data.id, ignorado");
            return;
        }

        Optional<Charge> chargeOpt = chargeRepository.findByMercadoPagoOrderId(resourceId);

        if (chargeOpt.isEmpty()) {
            log.info("Nao achou por orderId, tentando buscar order pelo paymentId={}", resourceId);
            MercadoPagoOrderResponse orderByPayment = findOrderByPaymentId(resourceId);
            if (orderByPayment != null && orderByPayment.externalReference() != null) {
                try {
                    UUID chargeId = UUID.fromString(orderByPayment.externalReference());
                    chargeOpt = chargeRepository.findById(chargeId);
                } catch (Exception e) {
                    log.warn("externalReference nao e UUID valido: {}", orderByPayment.externalReference());
                }
            }
        }

        if (chargeOpt.isEmpty()) {
            log.warn("Nenhuma charge encontrada para resourceId={}", resourceId);
            return;
        }

        Charge charge = chargeOpt.get();

        String tenantKey = encryptionService.decrypt(
                charge.getEnrollment().getTenant().getMercadoPagoApiKey()
        );

        String orderId = charge.getMercadoPagoOrderId() != null ? charge.getMercadoPagoOrderId() : resourceId;
        MercadoPagoOrderResponse order = mercadoPagoClient.getOrder(orderId, tenantKey);

        if (order == null) {
            log.warn("Webhook MP: order {} nao encontrada na API", orderId);
            return;
        }

        ChargeStatus newStatus = switch (order.status()) {
            case "paid", "processed"     -> ChargeStatus.PAID;
            case "canceled" -> ChargeStatus.CANCELLED;
            case "expired"  -> ChargeStatus.LOST;
            default -> {
                if (order.transactions() != null && order.transactions().payments() != null) {
                    boolean approved = order.transactions().payments().stream()
                            .anyMatch(p -> "approved".equals(p.status()));
                    yield approved ? ChargeStatus.PAID : null;
                }
                yield null;
            }
        };

        if (newStatus != null) {
            charge.setStatus(newStatus);
            if (newStatus == ChargeStatus.PAID) {
                charge.setPaymentDate(LocalDate.now());
            }
            chargeRepository.save(charge);
            log.info("Charge {} atualizada via webhook MP para {}", charge.getId(), newStatus);
        } else {
            log.warn("Webhook MP: status '{}' da order {} nao mapeado", order.status(), orderId);
        }
    }

    private MercadoPagoOrderResponse findOrderByPaymentId(String paymentId) {
        return chargeRepository.findAll().stream()
                .map(c -> c.getEnrollment().getTenant().getMercadoPagoApiKey())
                .filter(key -> key != null && !key.isBlank())
                .findFirst()
                .map(encryptedKey -> {
                    String apiKey = encryptionService.decrypt(encryptedKey);
                    return mercadoPagoClient.getOrderByPaymentId(paymentId, apiKey);
                })
                .orElse(null);
    }

}