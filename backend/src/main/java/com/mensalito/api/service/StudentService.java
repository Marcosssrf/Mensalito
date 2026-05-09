package com.mensalito.api.service;

import com.mensalito.api.client.AbacatePayClient;
import com.mensalito.api.dto.abacatepay.request.AbacatePayCustomerRequest;
import com.mensalito.api.dto.abacatepay.response.AbacatePayCustomerResponse;
import com.mensalito.api.dto.request.StudentRequestDTO;
import com.mensalito.api.dto.response.StudentResponseDTO;
import com.mensalito.api.exception.ResourceNotFoundException;
import com.mensalito.api.model.Student;
import com.mensalito.api.model.Tenant;
import com.mensalito.api.repository.StudentRepository;
import com.mensalito.api.repository.TenantRepository;
import com.mensalito.api.security.SecurityUtils;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class StudentService {

    private final StudentRepository studentRepository;
    private final SecurityUtils securityUtils;
    private final AbacatePayClient abacatePayClient;
    private final EncryptionService encryptionService;
    private final TenantRepository tenantRepository;

    public StudentResponseDTO create(StudentRequestDTO dto) {
        Tenant tenant = tenantRepository.findById(securityUtils.getAuthenticatedTenantId())
                .orElseThrow(() -> new ResourceNotFoundException("Tenant não encontrado"));

        Student student = Student.builder()
                .name(dto.name())
                .email(dto.email())
                .phone(dto.phone())
                .document(dto.document())
                .tenant(tenant)
                .createdAt(LocalDateTime.now())
                .build();

        student = studentRepository.save(student);

        String encryptedKey = tenant.getAbacatePayApiKey();
        if (encryptedKey != null) {
            AbacatePayCustomerResponse customerResponse = abacatePayClient.createCustomer(
                    new AbacatePayCustomerRequest(
                            dto.name(),
                            dto.email(),
                            dto.phone(),
                            dto.document()
                    ), encryptionService.decrypt(encryptedKey)
            );

            if (customerResponse == null) {
                throw new RuntimeException("Falha ao criar cliente no AbacatePay");
            }

            student.setAbacatePayCustomerId(customerResponse.id());
            student = studentRepository.save(student);
        }

        return toResponse(student);
    }

    public Page<StudentResponseDTO> findAll(Pageable pageable) {
        UUID tenantId = securityUtils.getAuthenticatedTenantId();
        return studentRepository.findByTenantId(tenantId, pageable)
                .map(this::toResponse);
    }

    public StudentResponseDTO findById(UUID id) {
        UUID tenantId = securityUtils.getAuthenticatedTenantId();
        Student student = studentRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Aluno não encontrado"));
        return toResponse(student);
    }

    public StudentResponseDTO update(UUID id, StudentRequestDTO dto) {
        UUID tenantId = securityUtils.getAuthenticatedTenantId();
        Student student = studentRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Aluno não encontrado"));

        if (dto.document() != null && !dto.document().equals(student.getDocument())) {
            studentRepository.findByDocumentAndTenantId(dto.document(), tenantId)
                    .ifPresent(s -> {
                        throw new IllegalArgumentException("Já existe um aluno com o documento informado");
                    });
            student.setDocument(dto.document());
        }

        if (dto.email() != null && !dto.email().equals(student.getEmail())) {
            studentRepository.findByEmailAndTenantId(dto.email(), tenantId)
                    .ifPresent(s -> {
                        throw new IllegalArgumentException("Já existe um aluno com o email informado");
                    });
            student.setEmail(dto.email());
        }

        if (dto.name() != null) student.setName(dto.name());
        if (dto.phone() != null) student.setPhone(dto.phone());

        student = studentRepository.save(student);
        return toResponse(student);
    }

    public StudentResponseDTO deactivate(UUID id) {
        UUID tenantId = securityUtils.getAuthenticatedTenantId();
        Student student = studentRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Aluno não encontrado"));
        student.setActive(false);
        student = studentRepository.save(student);
        return toResponse(student);
    }

    public StudentResponseDTO reactivate(UUID id) {
        UUID tenantId = securityUtils.getAuthenticatedTenantId();
        Student student = studentRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Aluno não encontrado"));
        student.setActive(true);
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