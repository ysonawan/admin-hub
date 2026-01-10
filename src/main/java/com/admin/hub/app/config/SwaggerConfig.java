package com.admin.hub.app.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Swagger/OpenAPI Configuration for API documentation.
 * Access Swagger UI at: http://localhost:8089/swagger-ui.html
 * Access OpenAPI JSON at: http://localhost:8089/v3/api-docs
 */
@Configuration
public class SwaggerConfig {

    /**
     * Configure OpenAPI documentation with API info and JWT security scheme.
     */
    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Admin Hub API")
                        .version("1.0.0")
                        .description("API documentation for Admin Hub Application")
                        .contact(new Contact()
                                .name("Admin Hub Team")
                                .email("famvest@hotmail.com")))
                .addSecurityItem(new SecurityRequirement().addList("bearer-jwt"))
                .components(new io.swagger.v3.oas.models.Components()
                        .addSecuritySchemes("bearer-jwt",
                                new SecurityScheme()
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                                        .description("Enter JWT token")));
    }
}

