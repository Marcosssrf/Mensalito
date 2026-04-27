package com.mensalito.api.controller;

import com.mensalito.api.dto.request.ChangePasswordRequestDTO;
import com.mensalito.api.dto.request.UpdateUserRequestDTO;
import com.mensalito.api.dto.request.UserRequestDTO;
import com.mensalito.api.dto.response.UserResponseDTO;
import com.mensalito.api.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
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

    @PostMapping
    public ResponseEntity<UserResponseDTO> create(@RequestBody @Valid UserRequestDTO dto) {
        UserResponseDTO user = userService.create(dto);
        URI uri = ServletUriComponentsBuilder
                .fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(user.id())
                .toUri();
        return ResponseEntity.created(uri).body(user);
    }

    @PatchMapping(value = "/{id}")
    public ResponseEntity<UserResponseDTO> update(@PathVariable UUID id, @RequestBody @Valid UpdateUserRequestDTO dto) {
        return ResponseEntity.ok(userService.update(id, dto));
    }

    @PatchMapping(value = "/{id}/password")
    public ResponseEntity<UserResponseDTO> changePassword(@PathVariable UUID id, @RequestBody @Valid ChangePasswordRequestDTO dto) {
        return ResponseEntity.ok(userService.changePassword(id, dto));
    }

}
