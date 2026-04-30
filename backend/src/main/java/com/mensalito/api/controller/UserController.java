package com.mensalito.api.controller;

import com.mensalito.api.dto.request.ChangePasswordRequestDTO;
import com.mensalito.api.dto.request.UpdateUserRequestDTO;
import com.mensalito.api.dto.response.UserResponseDTO;
import com.mensalito.api.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping(value = "/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping(value = "/{id}")
    public ResponseEntity<UserResponseDTO> findById(@PathVariable UUID id) {
        UserResponseDTO user = userService.findById(id);
        return ResponseEntity.ok(user);
    }

    @GetMapping(value = "/email/{email}")
    public ResponseEntity<UserResponseDTO> findByEmail(@PathVariable String email) {
        UserResponseDTO user = userService.findByEmail(email);
        return ResponseEntity.ok(user);
    }

    // OWNER pode editar qualquer usuário do próprio tenant
    // TEACHER só pode editar a si mesmo — validado dentro do service
    @PatchMapping(value = "/{id}")
    public ResponseEntity<UserResponseDTO> update(@PathVariable UUID id, @RequestBody @Valid UpdateUserRequestDTO dto) {
        return ResponseEntity.ok(userService.update(id, dto));
    }

    // Mesma regra de ownership do update
    @PatchMapping(value = "/{id}/password")
    public ResponseEntity<UserResponseDTO> changePassword(@PathVariable UUID id, @RequestBody @Valid ChangePasswordRequestDTO dto) {
        return ResponseEntity.ok(userService.changePassword(id, dto));
    }
}