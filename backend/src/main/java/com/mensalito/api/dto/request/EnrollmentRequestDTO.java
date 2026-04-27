package com.mensalito.api.dto.request;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.UUID;

public record EnrollmentRequestDTO(
        @NotNull(message = "Aluno é obrigatório")
        UUID studentId,
        @NotNull(message = "Turma é obrigatória")
        UUID classId,
        @NotNull(message = "Plano é obrigatório")
        UUID planId,
        @NotNull(message = "Data de início é obrigatória")
        @FutureOrPresent(message = "Data de início não pode ser no passado")
        LocalDate startDate
) {
}
