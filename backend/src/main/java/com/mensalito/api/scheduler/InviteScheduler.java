package com.mensalito.api.scheduler;

import com.mensalito.api.repository.InviteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Scheduler responsável por marcar convites expirados como "used" em batch.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class InviteScheduler {

    private final InviteRepository inviteRepository;

    @Scheduled(cron = "0 0 2 * * *")
    @Transactional
    public void expireInvites() {
        int count = inviteRepository.markExpiredInvites(LocalDateTime.now());
        log.info("[InviteScheduler] {} convite(s) expirado(s) em batch", count);
    }
}