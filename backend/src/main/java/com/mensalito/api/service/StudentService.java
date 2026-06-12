package com.mensalito.api.service;

import com.mensalito.api.dto.request.AddressDTO;
import com.mensalito.api.dto.request.StudentRequestDTO;
import com.mensalito.api.dto.request.TrialRequestDTO;
import com.mensalito.api.dto.response.StudentResponseDTO;
import com.mensalito.api.exception.ResourceNotFoundException;
import com.mensalito.api.model.Address;
import com.mensalito.api.model.Student;
import com.mensalito.api.model.Tenant;
import com.mensalito.api.model.enums.AuditAction;
import com.mensalito.api.model.enums.PaymentPreference;
import com.mensalito.api.repository.StudentRepository;
import com.mensalito.api.repository.TenantRepository;
import com.mensalito.api.security.SecurityUtils;
import com.mensalito.api.util.DocumentUtils;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class StudentService {

    private final StudentRepository studentRepository;
    private final SecurityUtils securityUtils;
    private final TenantRepository tenantRepository;
    private final AuditService auditService;

    public StudentResponseDTO create(StudentRequestDTO dto) {
        Tenant tenant = tenantRepository.findById(securityUtils.getAuthenticatedTenantId())
                .orElseThrow(() -> new ResourceNotFoundException("Tenant não encontrado"));

        Student student = Student.builder()
                .name(dto.name())
                .email(dto.email())
                .phone(dto.phone())
                .document(DocumentUtils.normalize(dto.document()))
                .paymentPreference(dto.paymentPreference() != null ? dto.paymentPreference() : PaymentPreference.BOLETO)
                .address(toAddressModel(dto.address()))
                .tenant(tenant)
                .createdAt(LocalDateTime.now())
                .build();

        student = studentRepository.save(student);
        log.info("Aluno criado: studentId={}, tenantId={}, preferencia={}", student.getId(), tenant.getId(), student.getPaymentPreference());

        auditService.log(AuditAction.STUDENT_CREATED, "Student", student.getId(),
                "Aluno criado: " + student.getName()
                + (student.getDocument() != null ? " — doc: " + DocumentUtils.format(student.getDocument()) : ""));

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

        if (dto.document() != null) {
            String normalizedDoc = DocumentUtils.normalize(dto.document());
            if (!normalizedDoc.equals(student.getDocument())) {
                studentRepository.findByDocumentAndTenantId(normalizedDoc, tenantId)
                        .ifPresent(s -> {
                            throw new IllegalArgumentException("Já existe um aluno com o documento informado");
                        });
                student.setDocument(normalizedDoc);
            }
        }

        if (dto.email() != null && !dto.email().equals(student.getEmail())) {
            studentRepository.findByEmailAndTenantId(dto.email(), tenantId)
                    .ifPresent(s -> {
                        throw new IllegalArgumentException("Já existe um aluno com o email informado");
                    });
            student.setEmail(dto.email());
        }

        if (dto.name() != null)              student.setName(dto.name());
        if (dto.phone() != null)             student.setPhone(dto.phone());
        if (dto.paymentPreference() != null) student.setPaymentPreference(dto.paymentPreference());
        if (dto.address() != null)           student.setAddress(toAddressModel(dto.address()));

        // trialEndsAt NÃO é tocado aqui — use PATCH /students/{id}/trial

        student = studentRepository.save(student);
        log.info("Aluno atualizado: studentId={}, preferencia={}", student.getId(), student.getPaymentPreference());

        auditService.log(AuditAction.STUDENT_UPDATED, "Student", student.getId(),
                "Dados do aluno atualizados: " + student.getName());

        return toResponse(student);
    }

    /**
     * Define ou remove o período de trial do aluno.
     * Endpoint dedicado: PATCH /students/{id}/trial
     * trialEndsAt = null → remove o trial
     */
    public StudentResponseDTO setTrial(UUID id, TrialRequestDTO dto) {
        UUID tenantId = securityUtils.getAuthenticatedTenantId();
        Student student = studentRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Aluno não encontrado"));

        student.setTrialEndsAt(dto.trialEndsAt());
        student = studentRepository.save(student);

        String msg = dto.trialEndsAt() != null
                ? "Trial configurado até " + dto.trialEndsAt() + " para " + student.getName()
                : "Trial removido de " + student.getName();

        log.info("setTrial: studentId={}, trialEndsAt={}", student.getId(), dto.trialEndsAt());
        auditService.log(AuditAction.STUDENT_UPDATED, "Student", student.getId(), msg);

        return toResponse(student);
    }

    public StudentResponseDTO deactivate(UUID id) {
        UUID tenantId = securityUtils.getAuthenticatedTenantId();
        Student student = studentRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Aluno não encontrado"));
        student.setActive(false);
        student = studentRepository.save(student);

        auditService.log(AuditAction.STUDENT_DEACTIVATED, "Student", student.getId(),
                "Aluno inativado: " + student.getName());

        return toResponse(student);
    }

    public StudentResponseDTO reactivate(UUID id) {
        UUID tenantId = securityUtils.getAuthenticatedTenantId();
        Student student = studentRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Aluno não encontrado"));
        student.setActive(true);
        student = studentRepository.save(student);

        auditService.log(AuditAction.STUDENT_REACTIVATED, "Student", student.getId(),
                "Aluno reativado: " + student.getName());

        return toResponse(student);
    }

    // ---------- helpers ----------

    private Address toAddressModel(AddressDTO dto) {
        if (dto == null) return null;
        return Address.builder()
                .zipCode(dto.zipCode())
                .street(dto.street())
                .number(dto.number())
                .complement(dto.complement())
                .neighborhood(dto.neighborhood())
                .city(dto.city())
                .state(dto.state())
                .build();
    }

    private AddressDTO toAddressDTO(Address address) {
        if (address == null) return null;
        return new AddressDTO(
                address.getZipCode(),
                address.getStreet(),
                address.getNumber(),
                address.getComplement(),
                address.getNeighborhood(),
                address.getCity(),
                address.getState()
        );
    }

    public StudentResponseDTO toResponse(Student student) {
        LocalDate today = LocalDate.now();
        return new StudentResponseDTO(
                student.getId(),
                student.getName(),
                student.getEmail(),
                student.getPhone(),
                DocumentUtils.format(student.getDocument()),
                student.getActive(),
                student.getPaymentPreference(),
                toAddressDTO(student.getAddress()),
                student.getCreatedAt(),
                student.getTrialEndsAt(),
                student.isInTrial(today)
        );
    }
}
