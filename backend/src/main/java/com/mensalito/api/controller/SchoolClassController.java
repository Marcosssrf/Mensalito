package com.mensalito.api.controller;

import com.mensalito.api.dto.request.SchoolClassRequestDTO;
import com.mensalito.api.dto.response.SchoolClassResponseDTO;
import com.mensalito.api.service.SchoolClassService;
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
@RequestMapping(value = "/api/classes")
@RequiredArgsConstructor
public class SchoolClassController {

    private final SchoolClassService schoolClassService;

    @GetMapping
    public ResponseEntity<List<SchoolClassResponseDTO>> findAll() {
        List<SchoolClassResponseDTO> schoolClasses = schoolClassService.findAll();
        return ResponseEntity.ok(schoolClasses);
    }

    @GetMapping(value = "/{id}")
    public ResponseEntity<SchoolClassResponseDTO> findById(@PathVariable UUID id) {
        SchoolClassResponseDTO schoolClass = schoolClassService.findById(id);
        return ResponseEntity.ok(schoolClass);
    }

    @PreAuthorize("hasRole('OWNER')")
    @PostMapping
    public ResponseEntity<SchoolClassResponseDTO> create(@RequestBody @Valid SchoolClassRequestDTO dto) {
        SchoolClassResponseDTO schoolClass = schoolClassService.create(dto);
        URI uri = ServletUriComponentsBuilder
                .fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(schoolClass.id())
                .toUri();
        return ResponseEntity.created(uri).body(schoolClass);
    }

    @PreAuthorize("hasRole('OWNER')")
    @PatchMapping(value = "/{id}")
    public ResponseEntity<SchoolClassResponseDTO> update(@PathVariable UUID id, @RequestBody @Valid SchoolClassRequestDTO dto) {
        return ResponseEntity.ok(schoolClassService.update(id, dto));
    }

    @PreAuthorize("hasRole('OWNER')")
    @PatchMapping(value = "/{id}/deactivate")
    public ResponseEntity<SchoolClassResponseDTO> deactivate(@PathVariable UUID id) {
        return ResponseEntity.ok(schoolClassService.deactivate(id));
    }

    @PreAuthorize("hasRole('OWNER')")
    @PatchMapping(value = "/{id}/reactivate")
    public ResponseEntity<SchoolClassResponseDTO> reactivate(@PathVariable UUID id) {
        return ResponseEntity.ok(schoolClassService.reactivate(id));
    }
}