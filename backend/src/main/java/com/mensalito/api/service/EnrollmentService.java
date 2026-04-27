package com.mensalito.api.service;

import com.mensalito.api.dto.request.EnrollmentRequestDTO;
import com.mensalito.api.dto.response.EnrollmentResponseDTO;
import com.mensalito.api.model.Enrollment;
import com.mensalito.api.model.Plan;
import com.mensalito.api.model.SchoolClass;
import com.mensalito.api.model.Student;
import com.mensalito.api.repository.EnrollmentRepository;
import com.mensalito.api.repository.PlanRepository;
import com.mensalito.api.repository.SchoolClassRepository;
import com.mensalito.api.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EnrollmentService {

    private final EnrollmentRepository enrollmentRepository;
    private final StudentRepository studentRepository;
    private final SchoolClassRepository schoolClassRepository;
    private final PlanRepository planRepository;

    public EnrollmentResponseDTO create(EnrollmentRequestDTO dto) {
        Student student = studentRepository.findById(dto.studentId())
                .orElseThrow(() -> new RuntimeException("Aluno não encontrado"));
        SchoolClass schoolClass = schoolClassRepository.findById(dto.classId())
                .orElseThrow(() -> new RuntimeException("Turma não encontrada"));
        Plan plan = planRepository.findById(dto.planId())
                .orElseThrow(() -> new RuntimeException("Plano não encontrado"));

        Enrollment enrollment = Enrollment.builder()
                .student(student)
                .schoolClass(schoolClass)
                .plan(plan)
                .startDate(dto.startDate())
                .build();

        Enrollment saved = enrollmentRepository.save(enrollment);

        return toResponse(saved);
    }

    public List<EnrollmentResponseDTO> findAll() {
        return enrollmentRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public EnrollmentResponseDTO findById(UUID id) {
        Enrollment enrollment = enrollmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Matrícula não encontrada"));

        return toResponse(enrollment);
    }

    public List<EnrollmentResponseDTO> findByStudent(UUID studentId) {
        return enrollmentRepository.findByStudentId(studentId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public EnrollmentResponseDTO deactivate(UUID id) {
        Enrollment enrollment = enrollmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Matrícula não encontrada"));

        enrollment.setActive(false);
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
