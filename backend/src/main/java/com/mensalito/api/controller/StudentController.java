package com.mensalito.api.controller;

import com.mensalito.api.dto.request.StudentRequestDTO;
import com.mensalito.api.dto.response.StudentResponseDTO;
import com.mensalito.api.service.StudentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/students")
@RequiredArgsConstructor
public class StudentController {

    private final StudentService studentService;

    @GetMapping
    public ResponseEntity<List<StudentResponseDTO>> findAll() {
        List<StudentResponseDTO> students = studentService.findAll();
        return ResponseEntity.ok(students);
    }

    @GetMapping(value = "/{id}")
    public ResponseEntity<StudentResponseDTO> findById(@PathVariable UUID id) {
        StudentResponseDTO students = studentService.findById(id);
        return ResponseEntity.ok(students);
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

    @PatchMapping(value = "/{id}/deactivate")
    public ResponseEntity<StudentResponseDTO> deactivate(@PathVariable UUID id) {
        return ResponseEntity.ok(studentService.deactivate(id));
    }
}
