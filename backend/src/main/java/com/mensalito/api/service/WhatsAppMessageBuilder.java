package com.mensalito.api.service;

import com.mensalito.api.model.Charge;
import com.mensalito.api.model.Student;
import com.mensalito.api.model.enums.PaymentPreference;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;

@Component
public class WhatsAppMessageBuilder {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public String buildChargeNotification(Charge charge) {
        Student student = charge.getEnrollment().getStudent();

        PaymentPreference preference = student.getPaymentPreference() != null
                ? student.getPaymentPreference()
                : PaymentPreference.BOLETO;

        if (preference == PaymentPreference.PIX) {
            return buildPixMessage(student, charge);
        } else {
            return buildBoletoMessage(student, charge);
        }
    }

    public String buildReminderNotification(Charge charge, int daysOverdue) {
        Student student = charge.getEnrollment().getStudent();

        PaymentPreference preference = student.getPaymentPreference() != null
                ? student.getPaymentPreference()
                : PaymentPreference.BOLETO;

        if (preference == PaymentPreference.PIX) {
            return buildPixReminderMessage(student, charge, daysOverdue);
        } else {
            return buildBoletoReminderMessage(student, charge, daysOverdue);
        }
    }

    // PIX

    private String buildPixMessage(Student student, Charge charge) {
        return """
                Olá, %s! 👋

                Sua mensalidade de *R$ %.2f* vence em *%s*.

                Pague com PIX (copia e cola):
                `%s`

                Ou acesse o link de pagamento:
                %s

                Qualquer dúvida, entre em contato conosco!
                """.formatted(
                student.getName(),
                charge.getAmount(),
                charge.getDueDate().format(DATE_FORMAT),
                pixCode(charge),
                checkoutUrl(charge)
        );
    }

    private String buildPixReminderMessage(Student student, Charge charge, int daysOverdue) {
        return """
                Olá, %s! ⚠️

                Sua mensalidade de *R$ %.2f* está em atraso há *%d dias*.

                Por favor, regularize o quanto antes!

                PIX (copia e cola):
                `%s`

                Ou acesse: %s
                """.formatted(
                student.getName(),
                charge.getAmount(),
                daysOverdue,
                pixCode(charge),
                checkoutUrl(charge)
        );
    }

    // BOLETO

    private String buildBoletoMessage(Student student, Charge charge) {
        return """
                Olá, %s! 👋

                Sua mensalidade de *R$ %.2f* vence em *%s*.

                Pague com boleto — linha digitável:
                `%s`

                Ou visualize/imprima o boleto:
                %s

                Qualquer dúvida, entre em contato conosco!
                """.formatted(
                student.getName(),
                charge.getAmount(),
                charge.getDueDate().format(DATE_FORMAT),
                boletoLine(charge),
                boletoLink(charge)
        );
    }

    private String buildBoletoReminderMessage(Student student, Charge charge, int daysOverdue) {
        return """
                Olá, %s! ⚠️

                Sua mensalidade de *R$ %.2f* está em atraso há *%d dias*.

                Por favor, regularize o quanto antes!

                Boleto — linha digitável:
                `%s`

                Ou acesse: %s
                """.formatted(
                student.getName(),
                charge.getAmount(),
                daysOverdue,
                boletoLine(charge),
                boletoLink(charge)
        );
    }


    private String pixCode(Charge charge) {
        return charge.getPixCode() != null ? charge.getPixCode() : "Não disponível";
    }

    private String checkoutUrl(Charge charge) {
        return charge.getCheckoutUrl() != null ? charge.getCheckoutUrl() : "Não disponível";
    }

    private String boletoLine(Charge charge) {
        if (charge.getBoletoUrl() != null && !charge.getBoletoUrl().isBlank()) {
            return charge.getBoletoUrl();
        }
        return "Não disponível";
    }

    private String boletoLink(Charge charge) {
        if (charge.getTicketUrl() != null && !charge.getTicketUrl().isBlank()) {
            return charge.getTicketUrl();
        }
        if (charge.getCheckoutUrl() != null && !charge.getCheckoutUrl().isBlank()) {
            return charge.getCheckoutUrl();
        }
        return "Não disponível";
    }
}