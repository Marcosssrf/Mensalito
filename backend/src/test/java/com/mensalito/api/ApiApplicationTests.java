package com.mensalito.api;

import com.mensalito.api.config.TestRedisConfig;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(properties = {"ADMIN_SECRET=test-secret", "FRONTEND_URL=http://localhost:3000", "SUPABASE_URL=http://localhost:3000", "SUPABASE_ANON_KEY=test-anon-key"})
@ActiveProfiles("test")
@Import(TestRedisConfig.class)
class ApiApplicationTests {

    @Test
    void contextLoads() {
    }

}