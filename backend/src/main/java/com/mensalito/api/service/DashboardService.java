package com.mensalito.api.service;

import com.mensalito.api.dto.response.DashboardResponseDTO;
import com.mensalito.api.model.Charge;
import com.mensalito.api.model.enums.ChargeStatus;
import com.mensalito.api.repository.ChargeRepository;
import com.mensalito.api.repository.StudentRepository;
import com.mensalito.api.security.SecurityUtils;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class DashboardService {

    private final ChargeRepository chargeRepository;
    private final StudentRepository studentRepository;
    private final SecurityUtils securityUtils;

    public DashboardResponseDTO getDashboard() {
        UUID tenantId = securityUtils.getAuthenticatedTenantId();
        LocalDate now = LocalDate.now();
        LocalDate startOfMonth = now.withDayOfMonth(1);
        LocalDate endOfMonth = now.withDayOfMonth(now.lengthOfMonth());

        List<Charge> monthCharges = chargeRepository
                .findByTenantIdAndDueDateBetween(tenantId, startOfMonth, endOfMonth);

        BigDecimal expectedRevenue = monthCharges.stream()
                .filter(c -> c.getStatus() == ChargeStatus.PENDING || c.getStatus() == ChargeStatus.PAID)
                .map(Charge::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal receivedRevenue = monthCharges.stream()
                .filter(c -> c.getStatus() == ChargeStatus.PAID)
                .map(Charge::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal overdueRevenue = chargeRepository
                .findByTenantIdAndStatusAndDueDateBefore(tenantId, ChargeStatus.PENDING, now)
                .stream()
                .map(Charge::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Long totalActiveStudents = studentRepository.countByTenantIdAndActiveTrue(tenantId);

        Long totalPending = monthCharges.stream()
                .filter(c -> c.getStatus() == ChargeStatus.PENDING).count();
        Long totalPaid = monthCharges.stream()
                .filter(c -> c.getStatus() == ChargeStatus.PAID).count();
        Long totalOverdue = chargeRepository
                .countByTenantIdAndStatusAndDueDateBefore(tenantId, ChargeStatus.PENDING, now);

        return new DashboardResponseDTO(
                expectedRevenue,
                receivedRevenue,
                overdueRevenue,
                totalActiveStudents,
                totalPending,
                totalPaid,
                totalOverdue
        );
    }
}