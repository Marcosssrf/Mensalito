package com.mensalito.api.dto.request;

import java.time.LocalDate;

public record TrialRequestDTO(
        LocalDate trialEndsAt
) {}
