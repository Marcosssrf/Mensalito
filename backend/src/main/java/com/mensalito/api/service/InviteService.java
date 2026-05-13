package com.mensalito.api.service;

import com.mensalito.api.dto.request.InviteRequestDTO;
import com.mensalito.api.dto.response.InvitePreviewResponseDTO;
import com.mensalito.api.dto.response.InviteResponseDTO;
import com.mensalito.api.exception.InvalidInviteException;
import com.mensalito.api.exception.ResourceNotFoundException;
import com.mensalito.api.model.Invite;
import com.mensalito.api.model.Tenant;
import com.mensalito.api.model.User;
import com.mensalito.api.model.enums.Role;
import com.mensalito.api.repository.InviteRepository;
import com.mensalito.api.repository.TenantRepository;
import com.mensalito.api.repository.UserRepository;
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
    private final TenantRepository tenantRepository;
    private final SecurityUtils securityUtils;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Transactional
    public InviteResponseDTO createInvite(InviteRequestDTO dto) {
        Tenant tenant = tenantRepository.findById(securityUtils.getAuthenticatedTenantId())
                .orElseThrow(() -> new ResourceNotFoundException("Tenant não encontrado"));

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

    /**
     * Chamado pelo frontend após o usuário confirmar o email no Supabase e estar autenticado.
     * Cria o User local vinculado ao Tenant do convite e marca o convite como usado.
     *
     * O email e nome vêm do body (fornecidos pelo frontend após autenticação Supabase).
     */
    @Transactional
    public void acceptInvite(String token, String email, String name) {
        Invite invite = findValidInvite(token);

        // Convite com email fixo → valida que o email autenticado bate com o convite
        if (invite.getEmail() != null && !invite.getEmail().isBlank()) {
            if (!invite.getEmail().equalsIgnoreCase(email)) {
                throw new InvalidInviteException(
                        "Este convite foi emitido para outro email.");
            }
        }

        if (userRepository.existsByEmail(email)) {
            // Usuário já provisionado — apenas marca o convite como usado
            invite.setUsed(true);
            inviteRepository.save(invite);
            return;
        }

        User user = User.builder()
                .name(name)
                .email(email)
                // Senha aleatória — autenticação é feita pelo Supabase
                .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                .tenant(invite.getTenant())
                .role(invite.getRole())
                .active(true)
                .build();

        userRepository.save(user);

        invite.setUsed(true);
        inviteRepository.save(invite);
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
