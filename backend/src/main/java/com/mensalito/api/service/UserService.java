package com.mensalito.api.service;

import com.mensalito.api.dto.request.ChangePasswordRequestDTO;
import com.mensalito.api.dto.request.UpdateUserRequestDTO;
import com.mensalito.api.dto.response.UserResponseDTO;
import com.mensalito.api.exception.ResourceNotFoundException;
import com.mensalito.api.model.User;
import com.mensalito.api.model.enums.Role;
import com.mensalito.api.repository.UserRepository;
import com.mensalito.api.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecurityUtils securityUtils;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Usuário não encontrado"));
    }

    public UserResponseDTO findByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));
        return toResponse(user);
    }

    public UserResponseDTO findById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));
        return toResponse(user);
    }

    public UserResponseDTO update(UUID id, UpdateUserRequestDTO dto) {
        User authenticated = securityUtils.getAuthenticatedUser();
        User target = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));

        checkEditPermission(authenticated, target);

        if (dto.name() != null) target.setName(dto.name());
        if (dto.email() != null) target.setEmail(dto.email());

        userRepository.save(target);
        return toResponse(target);
    }

    public UserResponseDTO changePassword(UUID id, ChangePasswordRequestDTO dto) {
        User authenticated = securityUtils.getAuthenticatedUser();
        User target = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));

        checkEditPermission(authenticated, target);

        if (dto.password() != null) {
            target.setPassword(passwordEncoder.encode(dto.password()));
        }

        userRepository.save(target);
        return toResponse(target);
    }

    // OWNER pode editar qualquer usuário do próprio tenant
    // TEACHER só pode editar a si mesmo
    // Ninguém pode editar usuário de outro tenant
    private void checkEditPermission(User authenticated, User target) {
        boolean sameTenant = authenticated.getTenant().getId()
                .equals(target.getTenant().getId());

        if (!sameTenant) {
            throw new org.springframework.security.access.AccessDeniedException("Acesso negado");
        }

        if (authenticated.getRole() == Role.TEACHER &&
                !authenticated.getId().equals(target.getId())) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Professores só podem editar os próprios dados");
        }
    }

    public UserResponseDTO toResponse(User user) {
        return new UserResponseDTO(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getActive(),
                user.getCreatedAt()
        );
    }
}