package com.mensalito.api.controller;

import com.mensalito.api.dto.request.PlanRequestDTO;
import com.mensalito.api.dto.response.PlanResponseDTO;
import com.mensalito.api.service.PlanService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping(value = "/api/plans")
@RequiredArgsConstructor
public class PlanController {

    private final PlanService planService;

    @GetMapping
    public ResponseEntity<List<PlanResponseDTO>> findAll() {
        List<PlanResponseDTO> plans = planService.findAll();
        return ResponseEntity.ok(plans);
    }

    @GetMapping(value = "/{id}")
    public ResponseEntity<PlanResponseDTO> findById(@PathVariable UUID id) {
        PlanResponseDTO plan = planService.findById(id);
        return ResponseEntity.ok(plan);
    }

    @PreAuthorize("hasRole('OWNER')")
    @PostMapping
    public ResponseEntity<PlanResponseDTO> create(@RequestBody @Valid PlanRequestDTO dto) {
        PlanResponseDTO plan = planService.create(dto);
        URI uri = ServletUriComponentsBuilder
                .fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(plan.id())
                .toUri();
        return ResponseEntity.created(uri).body(plan);
    }

    @PreAuthorize("hasRole('OWNER')")
    @PatchMapping(value = "/{id}")
    public ResponseEntity<PlanResponseDTO> update(@PathVariable UUID id, @RequestBody @Valid PlanRequestDTO dto) {
        return ResponseEntity.ok(planService.update(id, dto));
    }

    @PreAuthorize("hasRole('OWNER')")
    @PatchMapping(value = "/{id}/deactivate")
    public ResponseEntity<PlanResponseDTO> deactivate(@PathVariable UUID id) {
        return ResponseEntity.ok(planService.deactivate(id));
    }

    @PreAuthorize("hasRole('OWNER')")
    @PatchMapping(value = "/{id}/reactivate")
    public ResponseEntity<PlanResponseDTO> reactivate(@PathVariable UUID id) {
        return ResponseEntity.ok(planService.reactivate(id));
    }
}