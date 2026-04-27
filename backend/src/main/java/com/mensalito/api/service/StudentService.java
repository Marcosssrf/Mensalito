package com.mensalito.api.service;

import com.mensalito.api.dto.request.StudentRequestDTO;
import com.mensalito.api.dto.response.StudentResponseDTO;
import com.mensalito.api.exception.ResourceNotFoundException;
import com.mensalito.api.model.Student;
import com.mensalito.api.repository.StudentRepository;
import com.mensalito.api.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StudentService {

    private final StudentRepository studentRepository;
    private final TenantRepository tenantRepository;

    public StudentResponseDTO create(StudentRequestDTO dto) {
        Student student = Student.builder()
                .name(dto.name())
                .email(dto.email())
                .phone(dto.phone())
                .document(dto.document())
//                .tenant(tenantRepository.getReferenceById(tenantId))
                .build();

        student = studentRepository.save(student);

        return toResponse(student);
    }

    public List<StudentResponseDTO> findAll() {
        return studentRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public StudentResponseDTO findById(UUID id) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Aluno não encontrado"));
        return toResponse(student);
    }

    public StudentResponseDTO update(UUID id, StudentRequestDTO dto) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Aluno não encontrado"));

        if (dto.name() != null) {
            student.setName(dto.name());
        }

        if (dto.email() != null) {
            student.setEmail(dto.email());
        }

        if (dto.phone() != null) {
            student.setPhone(dto.phone());
        }

        if (dto.document() != null) {
            student.setDocument(dto.document());
        }

        student = studentRepository.save(student);

        return toResponse(student);

    }

    public StudentResponseDTO deactivate(UUID id) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Aluno não encontrado"));
        student.setActive(false);
        student = studentRepository.save(student);
        return toResponse(student);
    }

    private StudentResponseDTO toResponse(Student student) {
        return new StudentResponseDTO(
                student.getId(),
                student.getName(),
                student.getEmail(),
                student.getPhone(),
                student.getDocument(),
                student.getActive(),
                student.getCreatedAt()
        );
    }

}
