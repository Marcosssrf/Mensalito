package com.mensalito.api.controller;

import com.mensalito.api.dto.request.EnrollmentRequestDTO;
import com.mensalito.api.dto.response.EnrollmentResponseDTO;
import com.mensalito.api.service.EnrollmentService;
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
@RequestMapping(value = "/api/enrollments")
@RequiredArgsConstructor
public class EnrollmentController {

    private final EnrollmentService enrollmentService;

    @GetMapping
    public ResponseEntity<List<EnrollmentResponseDTO>> findAll() {
        List<EnrollmentResponseDTO> enrollments = enrollmentService.findAll();
        return ResponseEntity.ok(enrollments);
    }

    @GetMapping(value = "/{id}")
    public ResponseEntity<EnrollmentResponseDTO> findById(@PathVariable UUID id) {
        EnrollmentResponseDTO enrollment = enrollmentService.findById(id);
        return ResponseEntity.ok(enrollment);
    }

    @GetMapping(value = "/student/{student}")
    public ResponseEntity<List<EnrollmentResponseDTO>> findByStudent(@PathVariable UUID student) {
        List<EnrollmentResponseDTO> enrollments = enrollmentService.findByStudent(student);
        return ResponseEntity.ok(enrollments);
    }

    @PreAuthorize("hasRole('OWNER')")
    @PostMapping
    public ResponseEntity<EnrollmentResponseDTO> create(@RequestBody @Valid EnrollmentRequestDTO dto) {
        EnrollmentResponseDTO enrollment = enrollmentService.create(dto);
        URI uri = ServletUriComponentsBuilder
                .fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(enrollment.id())
                .toUri();
        return ResponseEntity.created(uri).body(enrollment);
    }

    @PreAuthorize("hasRole('OWNER')")
    @PatchMapping(value = "/{id}/deactivate")
    public ResponseEntity<EnrollmentResponseDTO> deactivate(@PathVariable UUID id) {
        return ResponseEntity.ok(enrollmentService.deactivate(id));
    }
}