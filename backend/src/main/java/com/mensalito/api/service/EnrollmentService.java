package com.mensalito.api.service;

import com.mensalito.api.dto.request.EnrollmentRequestDTO;
import com.mensalito.api.dto.response.EnrollmentResponseDTO;
import com.mensalito.api.exception.ResourceNotFoundException;
import com.mensalito.api.model.Enrollment;
import com.mensalito.api.model.Plan;
import com.mensalito.api.model.SchoolClass;
import com.mensalito.api.model.Student;
import com.mensalito.api.repository.EnrollmentRepository;
import com.mensalito.api.repository.PlanRepository;
import com.mensalito.api.repository.SchoolClassRepository;
import com.mensalito.api.repository.StudentRepository;
import com.mensalito.api.security.SecurityUtils;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class EnrollmentService {

    private final EnrollmentRepository enrollmentRepository;
    private final StudentRepository studentRepository;
    private final SchoolClassRepository schoolClassRepository;
    private final PlanRepository planRepository;
    private final SecurityUtils securityUtils;

    public EnrollmentResponseDTO create(EnrollmentRequestDTO dto) {
        UUID tenantId = securityUtils.getAuthenticatedTenantId();
        Student student = studentRepository.findByIdAndTenantId(dto.studentId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Aluno não encontrado"));
        SchoolClass schoolClass = schoolClassRepository.findByIdAndTenantId(dto.classId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Turma não encontrada"));
        Plan plan = planRepository.findByIdAndTenantId(dto.planId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Plano não encontrado"));

        Enrollment enrollment = Enrollment.builder()
                .student(student)
                .schoolClass(schoolClass)
                .plan(plan)
                .startDate(dto.startDate())
                .tenant(securityUtils.getAuthenticatedTenant())
                .build();

        Enrollment saved = enrollmentRepository.save(enrollment);

        return toResponse(saved);
    }

    public List<EnrollmentResponseDTO> findAll() {
        UUID tenantId = securityUtils.getAuthenticatedTenantId();
        return enrollmentRepository.findByTenantId(tenantId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public EnrollmentResponseDTO findById(UUID id) {
        UUID tenantId = securityUtils.getAuthenticatedTenantId();
        Enrollment enrollment = enrollmentRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Matrícula não encontrada"));

        return toResponse(enrollment);
    }

    public List<EnrollmentResponseDTO> findByStudent(UUID studentId) {
        UUID tenantId = securityUtils.getAuthenticatedTenantId();
        return enrollmentRepository.findByStudentIdAndTenantId(studentId, tenantId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public EnrollmentResponseDTO deactivate(UUID id) {
        UUID tenantId = securityUtils.getAuthenticatedTenantId();
        Enrollment enrollment = enrollmentRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Matrícula não encontrada"));

        enrollment.setActive(false);
        enrollment.setEndDate(LocalDate.now());
        enrollment = enrollmentRepository.save(enrollment);
        return toResponse(enrollment);
    }

    public EnrollmentResponseDTO toResponse(Enrollment enrollment) {
        return new EnrollmentResponseDTO(
                enrollment.getId(),
                enrollment.getStudent().getName(),
                enrollment.getSchoolClass().getName(),
                enrollment.getPlan().getName(),
                enrollment.getPlan().getAmount(),
                enrollment.getStartDate(),
                enrollment.getEndDate(),
                enrollment.getActive(),
                enrollment.getCreatedAt()
        );
    }

}
