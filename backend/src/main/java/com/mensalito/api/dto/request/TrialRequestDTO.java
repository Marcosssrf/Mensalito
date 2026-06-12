package com.mensalito.api.dto.request;

import java.time.LocalDate;

/**
 * DTO exclusivo para configurar/remover o período de trial de um aluno.
 * Separado do StudentRequestDTO para evitar sobrescrever trialEndsAt
 * em updates normais de dados cadastrais.
 *
 * trialEndsAt = null → remove o trial
 * trialEndsAt = data → define/atualiza o trial
 */
public record TrialRequestDTO(
        LocalDate trialEndsAt
) {}
