package com.mensalito.api.service;

import com.mensalito.api.model.Charge;
import com.mensalito.api.model.Student;
import com.mensalito.api.model.enums.PaymentPreference;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Component
public class WhatsAppMessageBuilder {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM");
    private static final DateTimeFormatter DATE_FORMAT_FULL = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    // ---------------------------------------------------------------
    // Mensagens de cobrança
    // ---------------------------------------------------------------

    public String buildChargeNotification(Charge charge) {
        Student student = charge.getEnrollment().getStudent();
        PaymentPreference preference = resolvePreference(student);

        return preference == PaymentPreference.PIX
                ? buildPixMessage(student, charge)
                : buildBoletoMessage(student, charge);
    }

    public String buildReminderNotification(Charge charge, int daysOverdue) {
        Student student = charge.getEnrollment().getStudent();
        PaymentPreference preference = resolvePreference(student);

        return preference == PaymentPreference.PIX
                ? buildPixReminderMessage(student, charge, daysOverdue)
                : buildBoletoReminderMessage(student, charge, daysOverdue);
    }

    // ---------------------------------------------------------------
    // PIX
    // ---------------------------------------------------------------

    private String buildPixMessage(Student student, Charge charge) {
        String firstName = firstName(student.getName());
        String dueLabel  = dueDateLabel(charge.getDueDate());

        return ("Olá, %s! 👋\n\n"
                + "Seu PIX de *R$ %s* vence %s, *%s*.\n\n"
                + "👇 Te mando o código copia e cola na próxima mensagem.\n\n"
                + "Qualquer dúvida é só chamar aqui. 😊")
                .formatted(
                        firstName,
                        formatAmount(charge),
                        dueLabel,
                        charge.getDueDate().format(DATE_FORMAT)
                );
    }

    private String buildPixReminderMessage(Student student, Charge charge, int daysOverdue) {
        String firstName = firstName(student.getName());
        String daysLabel = daysOverdue == 1 ? "1 dia" : daysOverdue + " dias";

        return ("Olá, %s! ⚠️\n\n"
                + "Seu PIX de *R$ %s* está em atraso há *%s*.\n\n"
                + "Por favor, regularize o quanto antes para evitar suspensão. 🙏\n\n"
                + "👇 Te mando o código copia e cola na próxima mensagem.\n\n"
                + "Qualquer dúvida é só chamar aqui. 😊")
                .formatted(
                        firstName,
                        formatAmount(charge),
                        daysLabel
                );
    }

    // ---------------------------------------------------------------
    // Boleto
    // ---------------------------------------------------------------

    private String buildBoletoMessage(Student student, Charge charge) {
        String firstName = firstName(student.getName());
        String dueLabel  = dueDateLabel(charge.getDueDate());

        boolean hasPdf = boletoDocumentUrl(charge) != null;

        String base = "Olá, %s! 👋\n\n"
                + "Seu boleto de *R$ %s* vence %s, *%s*.\n\n"
                + "👇 Te mando a linha digitável na próxima mensagem.";

        if (!hasPdf) {
            base += "\n\n🔗 *Visualizar boleto:*\n%s";
        }

        base += "\n\nQualquer dúvida é só chamar aqui. 😊";

        return hasPdf
                ? base.formatted(firstName, formatAmount(charge), dueLabel,
                charge.getDueDate().format(DATE_FORMAT))
                : base.formatted(firstName, formatAmount(charge), dueLabel,
                charge.getDueDate().format(DATE_FORMAT), boletoLink(charge));
    }

    private String buildBoletoReminderMessage(Student student, Charge charge, int daysOverdue) {
        String firstName = firstName(student.getName());
        String daysLabel = daysOverdue == 1 ? "1 dia" : daysOverdue + " dias";

        boolean hasPdf = boletoDocumentUrl(charge) != null;

        String base = "Olá, %s! ⚠️\n\n"
                + "Seu boleto de *R$ %s* está em atraso há *%s*.\n\n"
                + "Por favor, regularize o quanto antes para evitar suspensão. 🙏\n\n"
                + "👇 Te mando a linha digitável na próxima mensagem.";

        if (!hasPdf) {
            base += "\n\n🔗 *Visualizar boleto:*\n%s";
        }

        base += "\n\nQualquer dúvida é só chamar aqui. 😊";

        return hasPdf
                ? base.formatted(firstName, formatAmount(charge), daysLabel)
                : base.formatted(firstName, formatAmount(charge), daysLabel, boletoLink(charge));
    }

    /**
     * Retorna true se a preferência de pagamento do aluno for PIX.
     * Usado para decidir se deve enviar a mensagem de copia e cola separada.
     */
    public boolean isPixPreference(Student student) {
        return resolvePreference(student) == PaymentPreference.PIX;
    }

    /**
     * Retorna true se a preferência de pagamento do aluno for Boleto.
     */
    public boolean isBoletoPreference(Student student) {
        return resolvePreference(student) == PaymentPreference.BOLETO;
    }

    /**
     * Mensagem separada contendo apenas a linha digitável do boleto.
     */
    public String buildBoletoLineMessage(Charge charge) {
        return boletoLine(charge);
    }

    /**
     * Mensagem separada contendo apenas o código PIX copia e cola,
     * para que o usuário possa copiá-lo facilmente.
     */
    public String buildPixCopyPasteMessage(Charge charge) {
        return pixCode(charge);
    }

    // ---------------------------------------------------------------
    // URL do PDF do boleto (para envio de documento pelo WhatsApp)
    // ---------------------------------------------------------------

    /**
     * Retorna a URL do PDF do boleto, se disponível.
     * Usado pelo WhatsAppClient para enviar o arquivo junto com a mensagem.
     */
    public String boletoDocumentUrl(Charge charge) {
        // ticketUrl é o PDF gerado pelo gateway (AbacatePay / MercadoPago)
        if (charge.getTicketUrl() != null && !charge.getTicketUrl().isBlank()) {
            return charge.getTicketUrl();
        }
        return null;
    }

    // ---------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------

    private PaymentPreference resolvePreference(Student student) {
        return student.getPaymentPreference() != null
                ? student.getPaymentPreference()
                : PaymentPreference.BOLETO;
    }

    /** Retorna apenas o primeiro nome: "Vitor Hugo Souza" → "Vitor Hugo" (primeiros dois tokens) */
    private String firstName(String fullName) {
        if (fullName == null || fullName.isBlank()) return fullName;
        String[] parts = fullName.trim().split("\\s+");
        if (parts.length == 1) return parts[0];
        // Mantém nome + sobrenome curto para soar natural, mas nunca mais de 2 palavras
        return parts[0] + (parts[1].length() <= 4 ? " " + parts[1] : "");
    }

    /** "amanhã" se vence amanhã, "hoje" se vence hoje, "em dd/MM" caso contrário */
    private String dueDateLabel(LocalDate dueDate) {
        LocalDate today = LocalDate.now();
        if (dueDate.isEqual(today))           return "hoje";
        if (dueDate.isEqual(today.plusDays(1))) return "amanhã";
        return "em " + dueDate.format(DATE_FORMAT_FULL);
    }

    /** Formata valor sem zeros desnecessários: 150.00 → "150,00" */
    private String formatAmount(Charge charge) {
        return String.format("%.2f", charge.getAmount()).replace(".", ",");
    }

    private String pixCode(Charge charge) {
        return charge.getPixCode() != null && !charge.getPixCode().isBlank()
                ? charge.getPixCode() : "Não disponível";
    }

    private String checkoutUrl(Charge charge) {
        return charge.getCheckoutUrl() != null && !charge.getCheckoutUrl().isBlank()
                ? charge.getCheckoutUrl() : "Não disponível";
    }

    private String boletoLine(Charge charge) {
        return charge.getBoletoUrl() != null && !charge.getBoletoUrl().isBlank()
                ? charge.getBoletoUrl() : "Não disponível";
    }

    private String boletoLink(Charge charge) {
        if (charge.getTicketUrl() != null && !charge.getTicketUrl().isBlank())   return charge.getTicketUrl();
        if (charge.getCheckoutUrl() != null && !charge.getCheckoutUrl().isBlank()) return charge.getCheckoutUrl();
        return "Não disponível";
    }
}