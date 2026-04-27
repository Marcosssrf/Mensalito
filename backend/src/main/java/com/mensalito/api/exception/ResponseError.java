package com.mensalito.api.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.time.OffsetDateTime;

@RequiredArgsConstructor
@Getter
public class ResponseError {
    private final OffsetDateTime timestamp;
    private final Integer status;
    private final String error;
    private final String path;
}
