package com.mensalito.api;

import com.mensalito.api.config.TestRedisConfig;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(properties = {"ADMIN_SECRET=test-secret", "FRONTEND_URL=http://localhost:3000"})
@ActiveProfiles("test")
@Import(TestRedisConfig.class)
class ApiApplicationTests {

    @Test
    void contextLoads() {
    }

}