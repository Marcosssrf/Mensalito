package com.mensalito.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record WhatsAppCustomMessageRequestDTO(
        @NotBlank(message = "A mensagem não pode estar vazia")
        @Size(max = 4096, message = "Mensagem muito longa (máx 4096 caracteres)")
        String message
) {}