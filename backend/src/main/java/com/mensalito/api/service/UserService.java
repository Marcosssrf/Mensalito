package com.mensalito.api.service;

import com.mensalito.api.dto.request.UserRequestDTO;
import com.mensalito.api.dto.response.UserResponseDTO;
import com.mensalito.api.model.Tenant;
import com.mensalito.api.model.User;
import com.mensalito.api.repository.TenantRepository;
import com.mensalito.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;

    public UserResponseDTO create(UserRequestDTO dto) {
        Tenant tenant = tenantRepository.getReferenceById(dto.tenantId());

        User user = User.builder()
                .name(dto.name())
                .email(dto.email())
//                .password(dto.password())
                .tenant(tenant)
                .build();

        User saved = userRepository.save(user);

        return toResponse(saved);
    }

    public UserResponseDTO findByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        return toResponse(user);
    }

    public UserResponseDTO findById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        return toResponse(user);
    }

    public UserResponseDTO update(UUID id, UserRequestDTO dto) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        if (dto.name() != null) {
            user.setName(dto.name());
        }
        if (dto.email() != null) {
            user.setEmail(dto.email());
        }

        userRepository.save(user);

        return toResponse(user);
    }

    public UserResponseDTO changePassword(UUID id, UserRequestDTO dto) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        if (dto.password() != null) {
            user.setPassword(dto.password());
        }

        userRepository.save(user);

        return toResponse(user);
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
