package br.gov.df.seagri.dominio_central.web.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

import br.gov.df.seagri.dominio_central.web.config.seguranca.CustomAccessDeniedHandler;
import br.gov.df.seagri.dominio_central.web.config.seguranca.CustomAuthenticationEntryPoint;
import br.gov.df.seagri.dominio_central.web.config.seguranca.CustomJwtAuthenticationConverter;

import org.springframework.security.config.Customizer;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final CustomJwtAuthenticationConverter customJwtAuthenticationConverter;
    private final CustomAuthenticationEntryPoint customAuthenticationEntryPoint;
    private final CustomAccessDeniedHandler customAccessDeniedHandler;

    // Injeção via construtor
    public SecurityConfig(CustomJwtAuthenticationConverter customJwtAuthenticationConverter,
            CustomAuthenticationEntryPoint customAuthenticationEntryPoint,
            CustomAccessDeniedHandler customAccessDeniedHandler) {
        this.customJwtAuthenticationConverter = customJwtAuthenticationConverter;
        this.customAuthenticationEntryPoint = customAuthenticationEntryPoint;
        this.customAccessDeniedHandler = customAccessDeniedHandler;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(Customizer.withDefaults())

                // Desabilita CSRF pois nossa API é Stateless e não usa Cookies de sessão
                .csrf(AbstractHttpConfigurer::disable)

                // Define que o Spring não deve criar sessão HTTP (Stateless)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // Exige que qualquer requisição esteja autenticada
                .authorizeHttpRequests(auth -> auth
                        // 1. Endpoints públicos
                        .requestMatchers("/actuator/health", "/api/v1/public/**").permitAll()
                        // 2. ÚNICA rota que um usuário com "perfil incompleto" pode acessar (basta ter o token)
                        .requestMatchers("/api/v1/onboarding/completar-perfil").authenticated()
                        // 3. Todo o restante da API exige que a Identidade Canônica já tenha sido resolvida!
                        .anyRequest().hasAuthority("ROLE_USER")
                    )

                // Configura a aplicação como um Resource Server que aceita JWT do Keycloak
                .oauth2ResourceServer(oauth2 -> oauth2
                        // AQUI ESTÁ O SEGREDO: Plugando o conversor de identidade!
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(customJwtAuthenticationConverter))
                        // PLUGANDO O TRATAMENTO DE EXCEÇÕES AQUI:
                        .authenticationEntryPoint(customAuthenticationEntryPoint)
                        .accessDeniedHandler(customAccessDeniedHandler));

        return http.build();
    }
}
