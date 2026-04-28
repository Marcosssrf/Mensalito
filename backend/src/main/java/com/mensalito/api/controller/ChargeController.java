package com.mensalito.api.controller;

import com.mensalito.api.dto.request.ChargeRequestDTO;
import com.mensalito.api.dto.request.ChargeStatusRequestDTO;
import com.mensalito.api.dto.response.ChargeResponseDTO;
import com.mensalito.api.model.enums.ChargeStatus;
import com.mensalito.api.scheduler.ChargeScheduler;
import com.mensalito.api.service.ChargeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping(value = "/api/charges")
@RequiredArgsConstructor
public class ChargeController {

    private final ChargeService chargeService;
    private final ChargeScheduler chargeScheduler;

    @GetMapping
    public ResponseEntity<List<ChargeResponseDTO>> findAll(
            @RequestParam(required = false) UUID enrollmentId,
            @RequestParam(required = false) ChargeStatus status,
            @RequestParam(required = false) LocalDate dueDate
    ) {
        List<ChargeResponseDTO> charges = chargeService.findAll(enrollmentId, status, dueDate);
        return ResponseEntity.ok(charges);
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

    @PatchMapping(value = "/{id}/status")
    public ResponseEntity<ChargeResponseDTO> updateStatus(
            @PathVariable UUID id,
            @RequestBody ChargeStatusRequestDTO dto) {
        return ResponseEntity.ok(chargeService.updateStatus(id, dto.status()));
    }

//    teste
    @PostMapping("/generate-charges")
    public ResponseEntity<String> generateCharges() {
        chargeScheduler.generateMonthlyCharges();
        return ResponseEntity.ok("Cobranças geradas!");
    }

}
