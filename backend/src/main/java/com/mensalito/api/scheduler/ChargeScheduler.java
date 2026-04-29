package com.mensalito.api.scheduler;

import com.mensalito.api.service.ChargeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ChargeScheduler {

    private final ChargeService chargeService;

    @Scheduled(cron = "0 0 8 * * *")
    public void generateMonthlyCharges() {
        chargeService.generateMonthlyCharges();
    }
}
