package com.mensalito.api.service;

import com.mensalito.api.model.Charge;
import com.mensalito.api.model.Student;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;

@Component
public class WhatsAppMessageBuilder {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public String buildChargeNotification(Charge charge) {
        Student student = charge.getEnrollment().getStudent();
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

    public String buildReminderNotification(Charge charge, int daysOverdue) {
        Student student = charge.getEnrollment().getStudent();
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

    private String pixCode(Charge charge) {
        return charge.getPixCode() != null ? charge.getPixCode() : "Não disponível";
    }

    private String checkoutUrl(Charge charge) {
        return charge.getCheckoutUrl() != null ? charge.getCheckoutUrl() : "Não disponível";
    }
}