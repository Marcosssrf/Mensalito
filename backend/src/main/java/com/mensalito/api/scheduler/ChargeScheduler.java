package com.mensalito.api.scheduler;

import com.mensalito.api.model.Charge;
import com.mensalito.api.model.Enrollment;
import com.mensalito.api.repository.ChargeRepository;
import com.mensalito.api.repository.EnrollmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class ChargeScheduler {

    private final EnrollmentRepository enrollmentRepository;
    private final ChargeRepository chargeRepository;

    @Scheduled(cron = "0 0 8 * * *")
    public void generateMonthlyCharges() {
        int today = LocalDate.now().getDayOfMonth();
        log.info("Gerando cobrancas para vencimento dia {}", today);

        List<Enrollment> enrollments = enrollmentRepository
                .findActiveByPlanDueDay(today);

        int generated = 0;
        for (Enrollment enrollment : enrollments) {
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
                chargeRepository.save(charge);
                generated++;
            }
            log.info("Cobranças geradas: {}", generated);

        }

    }

}
