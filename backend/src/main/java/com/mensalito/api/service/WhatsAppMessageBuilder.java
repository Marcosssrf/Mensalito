package com.mensalito.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mensalito.api.dto.response.WhatsAppTemplatesResponseDTO;
import com.mensalito.api.model.Charge;
import com.mensalito.api.model.Student;
import com.mensalito.api.model.Tenant;
import com.mensalito.api.model.enums.PaymentPreference;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Slf4j
@Component

public class WhatsAppMessageBuilder {

    private static final DateTimeFormatter DATE_FORMAT      = DateTimeFormatter.ofPattern("dd/MM");
    private static final DateTimeFormatter DATE_FORMAT_FULL = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    // Templates padrão — usados quando o tenant não tem template customizado
    public static final String DEFAULT_PIX_CHARGE =
            "Olá, {aluno}! 👋\n\n"
                    + "Seu PIX de *R$ {valor}* vence {label_data}, *{data}*.\n\n"
                    + "👇 Te mando o código copia e cola na próxima mensagem.\n\n"
                    + "Qualquer dúvida é só chamar aqui. 😊";

    public static final String DEFAULT_BOLETO_CHARGE =
            "Olá, {aluno}! 👋\n\n"
                    + "Seu boleto de *R$ {valor}* vence {label_data}, *{data}*.\n\n"
                    + "👇 Te mando a linha digitável na próxima mensagem.\n\n"
                    + "Qualquer dúvida é só chamar aqui. 😊";

    public static final String DEFAULT_PIX_REMINDER =
            "Olá, {aluno}! ⚠️\n\n"
                    + "Seu PIX de *R$ {valor}* está em atraso há *{dias}*.\n\n"
                    + "Por favor, regularize o quanto antes para evitar suspensão. 🙏\n\n"
                    + "👇 Te mando o código copia e cola na próxima mensagem.\n\n"
                    + "Qualquer dúvida é só chamar aqui. 😊";

    public static final String DEFAULT_BOLETO_REMINDER =
            "Olá, {aluno}! ⚠️\n\n"
                    + "Seu boleto de *R$ {valor}* está em atraso há *{dias}*.\n\n"
                    + "Por favor, regularize o quanto antes para evitar suspensão. 🙏\n\n"
                    + "👇 Te mando a linha digitável na próxima mensagem.\n\n"
                    + "Qualquer dúvida é só chamar aqui. 😊";

    private final ObjectMapper objectMapper = new ObjectMapper();

    // ---------------------------------------------------------------
    // API pública — com suporte a templates customizados
    // ---------------------------------------------------------------

    public String buildChargeNotification(Charge charge) {
        Student student = charge.getEnrollment().getStudent();
        Tenant tenant   = charge.getEnrollment().getStudent().getTenant();
        PaymentPreference preference = resolvePreference(student);

        WhatsAppTemplatesResponseDTO custom = loadCustomTemplates(tenant);

        if (preference == PaymentPreference.PIX) {
            String template = (custom != null && notBlank(custom.chargeNotificationPix()))
                    ? custom.chargeNotificationPix()
                    : DEFAULT_PIX_CHARGE;
            return applyChargeVars(template, student, charge);
        } else {
            String template = (custom != null && notBlank(custom.chargeNotificationBoleto()))
                    ? custom.chargeNotificationBoleto()
                    : DEFAULT_BOLETO_CHARGE;
            return applyBoletoChargeVars(template, student, charge);
        }
    }

    public String buildReminderNotification(Charge charge, int daysOverdue) {
        Student student = charge.getEnrollment().getStudent();
        Tenant tenant   = charge.getEnrollment().getStudent().getTenant();
        PaymentPreference preference = resolvePreference(student);

        WhatsAppTemplatesResponseDTO custom = loadCustomTemplates(tenant);

        if (preference == PaymentPreference.PIX) {
            String template = (custom != null && notBlank(custom.reminderPix()))
                    ? custom.reminderPix()
                    : DEFAULT_PIX_REMINDER;
            return applyReminderVars(template, student, charge, daysOverdue);
        } else {
            String template = (custom != null && notBlank(custom.reminderBoleto()))
                    ? custom.reminderBoleto()
                    : DEFAULT_BOLETO_REMINDER;
            return applyReminderVars(template, student, charge, daysOverdue);
        }
    }

    // ---------------------------------------------------------------
    // Substituição de variáveis
    // Variáveis disponíveis: {aluno}, {valor}, {data}, {label_data}, {dias}
    // ---------------------------------------------------------------

    private String applyChargeVars(String template, Student student, Charge charge) {
        return template
                .replace("{aluno}",      firstName(student.getName()))
                .replace("{valor}",      formatAmount(charge))
                .replace("{label_data}", dueDateLabel(charge.getDueDate()))
                .replace("{data}",       charge.getDueDate().format(DATE_FORMAT));
    }

    private String applyBoletoChargeVars(String template, Student student, Charge charge) {
        return applyChargeVars(template, student, charge);
    }

    private String applyReminderVars(String template, Student student, Charge charge, int daysOverdue) {
        String daysLabel = daysOverdue == 1 ? "1 dia" : daysOverdue + " dias";
        return template
                .replace("{aluno}",      firstName(student.getName()))
                .replace("{valor}",      formatAmount(charge))
                .replace("{dias}",       daysLabel)
                .replace("{label_data}", dueDateLabel(charge.getDueDate()))
                .replace("{data}",       charge.getDueDate().format(DATE_FORMAT));
    }

    // ---------------------------------------------------------------
    // Helpers para verificação de preferência
    // ---------------------------------------------------------------

    public boolean isPixPreference(Student student) {
        return resolvePreference(student) == PaymentPreference.PIX;
    }

    public boolean isBoletoPreference(Student student) {
        return resolvePreference(student) == PaymentPreference.BOLETO;
    }

    public String buildBoletoLineMessage(Charge charge) {
        return boletoLine(charge);
    }

    public String buildPixCopyPasteMessage(Charge charge) {
        return pixCode(charge);
    }

    public String boletoDocumentUrl(Charge charge) {
        if (charge.getTicketUrl() != null && !charge.getTicketUrl().isBlank()) {
            return charge.getTicketUrl();
        }
        return null;
    }

    // ---------------------------------------------------------------
    // Carrega templates customizados do tenant (JSON armazenado na coluna)
    // ---------------------------------------------------------------

    public WhatsAppTemplatesResponseDTO loadCustomTemplates(Tenant tenant) {
        if (tenant == null || tenant.getWhatsappTemplates() == null || tenant.getWhatsappTemplates().isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(tenant.getWhatsappTemplates(), WhatsAppTemplatesResponseDTO.class);
        } catch (Exception e) {
            log.warn("[WhatsAppMessageBuilder] Erro ao desserializar templates do tenant {}: {}", tenant.getId(), e.getMessage());
            return null;
        }
    }

    // ---------------------------------------------------------------
    // Helpers internos
    // ---------------------------------------------------------------

    private PaymentPreference resolvePreference(Student student) {
        return student.getPaymentPreference() != null
                ? student.getPaymentPreference()
                : PaymentPreference.BOLETO;
    }

    private String firstName(String fullName) {
        if (fullName == null || fullName.isBlank()) return fullName;
        String[] parts = fullName.trim().split("\\s+");
        if (parts.length == 1) return parts[0];
        return parts[0] + (parts[1].length() <= 4 ? " " + parts[1] : "");
    }

    private String dueDateLabel(LocalDate dueDate) {
        LocalDate today = LocalDate.now();
        if (dueDate.isEqual(today))             return "hoje";
        if (dueDate.isEqual(today.plusDays(1))) return "amanhã";
        return "em " + dueDate.format(DATE_FORMAT_FULL);
    }

    private String formatAmount(Charge charge) {
        return String.format("%.2f", charge.getAmount()).replace(".", ",");
    }

    private String pixCode(Charge charge) {
        return charge.getPixCode() != null && !charge.getPixCode().isBlank()
                ? charge.getPixCode() : "Não disponível";
    }

    private String boletoLine(Charge charge) {
        return charge.getBoletoUrl() != null && !charge.getBoletoUrl().isBlank()
                ? charge.getBoletoUrl() : "Não disponível";
    }

    private boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}