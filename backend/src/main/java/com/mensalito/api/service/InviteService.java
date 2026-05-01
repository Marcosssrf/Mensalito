package com.mensalito.api.service;

import com.mensalito.api.dto.request.InviteRequestDTO;
import com.mensalito.api.dto.request.RegisterWithInviteRequestDTO;
import com.mensalito.api.dto.response.InvitePreviewResponseDTO;
import com.mensalito.api.dto.response.InviteResponseDTO;
import com.mensalito.api.dto.response.LoginResponseDTO;
import com.mensalito.api.exception.InvalidInviteException;
import com.mensalito.api.model.Invite;
import com.mensalito.api.model.Tenant;
import com.mensalito.api.model.User;
import com.mensalito.api.model.enums.Role;
import com.mensalito.api.repository.InviteRepository;
import com.mensalito.api.repository.UserRepository;
import com.mensalito.api.security.JwtService;
import com.mensalito.api.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InviteService {

    private final InviteRepository inviteRepository;
    private final UserRepository userRepository;
    private final SecurityUtils securityUtils;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Transactional
    public InviteResponseDTO createInvite(InviteRequestDTO dto) {
        Tenant tenant = securityUtils.getAuthenticatedTenant();

        String token = UUID.randomUUID().toString().replace("-", "");
        LocalDateTime expiresAt = LocalDateTime.now().plusDays(7);

        Role role = dto.role() != null ? dto.role() : Role.TEACHER;

        Invite invite = Invite.builder()
                .tenant(tenant)
                .email(dto.email())
                .token(token)
                .role(role)
                .expiresAt(expiresAt)
                .build();

        invite = inviteRepository.save(invite);

        String inviteUrl = frontendUrl + "/register?invite=" + token;

        return new InviteResponseDTO(
                invite.getId(),
                invite.getEmail(),
                invite.getRole(),
                inviteUrl,
                invite.getExpiresAt()
        );
    }

    @Transactional(readOnly = true)
    public InvitePreviewResponseDTO previewInvite(String token) {
        Invite invite = findValidInvite(token);
        return new InvitePreviewResponseDTO(
                invite.getTenant().getName(),
                invite.getEmail(),
                invite.getRole()
        );
    }

    @Transactional
    public LoginResponseDTO registerWithInvite(RegisterWithInviteRequestDTO dto) {
        Invite invite = findValidInvite(dto.token());

        if (invite.getEmail() == null) {
            throw new InvalidInviteException("Este convite não possui email associado. Solicite um novo convite ao dono da escola.");
        }

        String email = invite.getEmail();

        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email já cadastrado");
        }

        User user = User.builder()
                .name(dto.name())
                .email(email)
                .password(passwordEncoder.encode(dto.password()))
                .tenant(invite.getTenant())
                .role(invite.getRole())
                .active(true)
                .build();

        user = userRepository.save(user);

        invite.setUsed(true);
        inviteRepository.save(invite);

        String jwtToken = jwtService.generateToken(user);
        return new LoginResponseDTO(jwtToken, user.getName(), invite.getTenant().getId(), user.getRole());
    }

    private Invite findValidInvite(String token) {
        Invite invite = inviteRepository.findByToken(token)
                .orElseThrow(() -> new InvalidInviteException("Convite inválido ou não encontrado"));

        if (invite.getUsed()) {
            throw new InvalidInviteException("Este convite já foi utilizado");
        }

        if (invite.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new InvalidInviteException("Este convite expirou");
        }

        return invite;
    }
}