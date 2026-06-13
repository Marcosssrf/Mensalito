package com.mensalito.api.controller;

import com.mensalito.api.dto.request.StudentRequestDTO;
import com.mensalito.api.dto.request.TrialRequestDTO;
import com.mensalito.api.dto.request.WhatsAppCustomMessageRequestDTO;
import com.mensalito.api.dto.response.StudentResponseDTO;
import com.mensalito.api.dto.response.WhatsAppSendResultDTO;
import com.mensalito.api.service.StudentService;
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
import java.util.UUID;

@RestController
@RequestMapping("/api/students")
@RequiredArgsConstructor
public class StudentController {

    private final StudentService studentService;

    @GetMapping
    public ResponseEntity<Page<StudentResponseDTO>> findAll(
            @PageableDefault(size = 20, sort = "name", direction = Sort.Direction.ASC) Pageable pageable
    ) {
        return ResponseEntity.ok(studentService.findAll(pageable));
    }

    @GetMapping(value = "/{id}")
    public ResponseEntity<StudentResponseDTO> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(studentService.findById(id));
    }

    @PostMapping
    public ResponseEntity<StudentResponseDTO> create(@RequestBody @Valid StudentRequestDTO dto) {
        StudentResponseDTO student = studentService.create(dto);
        URI uri = ServletUriComponentsBuilder
                .fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(student.id())
                .toUri();
        return ResponseEntity.created(uri).body(student);
    }

    @PatchMapping(value = "/{id}")
    public ResponseEntity<StudentResponseDTO> update(@PathVariable UUID id, @RequestBody @Valid StudentRequestDTO dto) {
        return ResponseEntity.ok(studentService.update(id, dto));
    }

    /**
     * Define ou remove o período de trial de um aluno.
     * PATCH /api/students/{id}/trial
     *
     * Body: { "trialEndsAt": "2026-08-31" }  → define trial
     * Body: { "trialEndsAt": null }           → remove trial
     */
    @PreAuthorize("hasRole('OWNER')")
    @PatchMapping(value = "/{id}/trial")
    public ResponseEntity<StudentResponseDTO> setTrial(
            @PathVariable UUID id,
            @RequestBody TrialRequestDTO dto) {
        return ResponseEntity.ok(studentService.setTrial(id, dto));
    }

    @PreAuthorize("hasRole('OWNER')")
    @PatchMapping(value = "/{id}/deactivate")
    public ResponseEntity<StudentResponseDTO> deactivate(@PathVariable UUID id) {
        return ResponseEntity.ok(studentService.deactivate(id));
    }

    @PreAuthorize("hasRole('OWNER')")
    @PatchMapping(value = "/{id}/reactivate")
    public ResponseEntity<StudentResponseDTO> reactivate(@PathVariable UUID id) {
        return ResponseEntity.ok(studentService.reactivate(id));
    }

    /**
     * Envia uma mensagem de texto personalizada via WhatsApp para o aluno.
     * POST /api/students/{id}/whatsapp/message
     */
    @PostMapping(value = "/{id}/whatsapp/message")
    public ResponseEntity<WhatsAppSendResultDTO> sendWhatsAppMessage(
            @PathVariable UUID id,
            @RequestBody @Valid WhatsAppCustomMessageRequestDTO dto) {
        WhatsAppSendResultDTO result = studentService.sendCustomWhatsAppMessage(id, dto.message());
        return result.sent()
                ? ResponseEntity.ok(result)
                : ResponseEntity.badRequest().body(result);
    }
}