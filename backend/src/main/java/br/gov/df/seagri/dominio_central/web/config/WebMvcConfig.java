package br.gov.df.seagri.dominio_central.web.config;

import java.util.Objects;

import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class WebMvcConfig implements WebMvcConfigurer {

    private final AutorizacaoTenantInterceptor autorizacaoTenantInterceptor;

    private final CorsProperties corsProperties;

    @Override
    public void addInterceptors(@NonNull InterceptorRegistry registry) {
        registry.addInterceptor(
                Objects.requireNonNull(autorizacaoTenantInterceptor, "AutorizacaoTenantInterceptor não pode ser nulo"))
                .addPathPatterns("/api/v1/orgs/*/**")
                .excludePathPatterns("/api/v1/orgs");
    }

    @Override
    public void addCorsMappings(@NonNull CorsRegistry registry) {
        Objects.requireNonNull(corsProperties, "CorsProperties não pode ser nulo");

        // Log estruturado mostrando os valores
        if (corsProperties.isDebug()) {
            log.debug("=== Configurando CORS ===");
            log.debug("allowedOrigins: {}", corsProperties.getAllowedOrigins());
            log.debug("allowedMethods: {}", corsProperties.getAllowedMethods());
            log.debug("allowedHeaders: {}", corsProperties.getAllowedHeaders());
            log.debug("allowCredentials: {}", corsProperties.isAllowCredentials());
        }

        registry.addMapping("/**")
                .allowedOrigins(Objects.requireNonNull(corsProperties.getAllowedOrigins().toArray(new String[0])))
                .allowedMethods(Objects.requireNonNull(corsProperties.getAllowedMethods().toArray(new String[0])))
                .allowedHeaders(Objects.requireNonNull(corsProperties.getAllowedHeaders()))
                .allowCredentials(corsProperties.isAllowCredentials());
    }

}
