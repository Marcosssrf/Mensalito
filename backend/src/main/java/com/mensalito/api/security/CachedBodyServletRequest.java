package com.mensalito.api.security;

import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;

import java.io.ByteArrayInputStream;
import java.io.IOException;


public class CachedBodyServletRequest extends HttpServletRequestWrapper {

    private final byte[] cachedBody;

    public CachedBodyServletRequest(HttpServletRequest request, byte[] body) {
        super(request);
        this.cachedBody = body;
    }

    @Override
    public ServletInputStream getInputStream() {
        ByteArrayInputStream stream = new ByteArrayInputStream(cachedBody);
        return new ServletInputStream() {
            @Override public boolean isFinished() { return stream.available() == 0; }
            @Override public boolean isReady() { return true; }
            @Override public void setReadListener(ReadListener l) {}
            @Override public int read() throws IOException { return stream.read(); }
        };
    }
}
