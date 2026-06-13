package com.mensalito.api.dto.response;

public record WhatsAppStatsResponseDTO(
        long sentToday,
        long sentThisMonth,
        long sentTotal
) {}