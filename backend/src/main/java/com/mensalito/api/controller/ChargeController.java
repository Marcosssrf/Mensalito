package com.mensalito.api.controller;

import com.mensalito.api.dto.request.ChargeRequestDTO;
import com.mensalito.api.dto.request.ChargeStatusRequestDTO;
import com.mensalito.api.dto.request.ManualChargeRequestDTO;
import com.mensalito.api.dto.request.ManualPaymentRequestDTO;
import com.mensalito.api.dto.response.ChargeResponseDTO;
import com.mensalito.api.model.enums.ChargeStatus;
import com.mensalito.api.service.ChargeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping(value = "/api/charges")
@RequiredArgsConstructor
@PreAuthorize("hasRole('OWNER')")
public class ChargeController {

    private final ChargeService chargeService;

    @GetMapping
    public ResponseEntity<Page<ChargeResponseDTO>> findAll(
            @RequestParam(required = false) UUID enrollmentId,
            @RequestParam(required = false) ChargeStatus status,
            @RequestParam(required = false) LocalDate dueDate,
            @PageableDefault(size = 20, sort = "dueDate", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(chargeService.findAll(enrollmentId, status, dueDate, pageable));
    }

    @PostMapping
    public ResponseEntity<ChargeResponseDTO> create(@RequestBody @Valid ChargeRequestDTO dto) {
        ChargeResponseDTO charge = chargeService.create(dto);
        URI uri = ServletUriComponentsBuilder
                .fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(charge.id())
                .toUri();
        return ResponseEntity.created(uri).body(charge);
    }


    @PostMapping("/manual")
    public ResponseEntity<ChargeResponseDTO> createManual(@RequestBody @Valid ManualChargeRequestDTO dto) {
        ChargeResponseDTO charge = chargeService.createManual(dto);
        URI uri = ServletUriComponentsBuilder
                .fromCurrentRequest()
                .replacePath("/api/charges/{id}")
                .buildAndExpand(charge.id())
                .toUri();
        return ResponseEntity.created(uri).body(charge);
    }

    @PatchMapping(value = "/{id}/status")
    public ResponseEntity<ChargeResponseDTO> updateStatus(
            @PathVariable UUID id,
            @RequestBody ChargeStatusRequestDTO dto) {
        return ResponseEntity.ok(chargeService.updateStatus(id, dto.status()));
    }

    @PatchMapping("/{id}/confirm-payment")
    public ResponseEntity<ChargeResponseDTO> confirmManualPayment(
            @PathVariable UUID id,
            @RequestBody @Valid ManualPaymentRequestDTO dto) {
        return ResponseEntity.ok(chargeService.confirmManualPayment(id, dto));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<ChargeResponseDTO> cancel(@PathVariable UUID id) {
        return ResponseEntity.ok(chargeService.cancel(id));
    }

    @PostMapping("/{id}/resend-notification")
    public ResponseEntity<ChargeResponseDTO> resendNotification(@PathVariable UUID id) {
        return ResponseEntity.ok(chargeService.resendAndReturn(id));
    }

    @PostMapping("/generate-charges")
    public ResponseEntity<String> generateCharges(
            @RequestParam(defaultValue = "false") boolean force) {
        chargeService.generateMonthlyCharges(force);
        return ResponseEntity.ok(force
                ? "Geração forçada executada."
                : "Cobranças geradas (ou já haviam sido geradas hoje).");
    }
}
