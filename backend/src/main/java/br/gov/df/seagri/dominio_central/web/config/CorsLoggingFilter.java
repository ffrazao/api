package br.gov.df.seagri.dominio_central.web.config;

import java.io.IOException;
import java.util.Enumeration;

import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@Order(1)
@RequiredArgsConstructor
public class CorsLoggingFilter implements Filter {

    private final CorsProperties corsProperties;

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        logRequest((HttpServletRequest) request);

        chain.doFilter(request, response);

        logResponse((HttpServletResponse) response);
    }

    private void logRequest(HttpServletRequest req) {

        // Só faz o log se debug estiver ativado
        if (corsProperties.isDebug()) {
            String origin = req.getHeader("Origin");
            String method = req.getMethod();

            log.debug("=== REQUISIÇÃO CORS ===");
            log.debug("Método: {}", method);
            log.debug("Origin: {}", origin != null ? origin : "sem origin (mesma origem)");
            log.debug("URI: {}", req.getRequestURI());

            // Log detalhado apenas para preflight ou quando origin presente
            if (origin != null || "OPTIONS".equals(method)) {
                log.debug("Headers relevantes:");

                if ("OPTIONS".equals(method)) {
                    log.debug("  Access-Control-Request-Method: {}",
                            req.getHeader("Access-Control-Request-Method"));
                    log.debug("  Access-Control-Request-Headers: {}",
                            req.getHeader("Access-Control-Request-Headers"));
                }

                // Log de todos os headers (opcional - pode ser muito verboso)
                if (Boolean.TRUE.toString().equals(req.getParameter("debugHeaders"))) {
                    log.debug("Todos os headers:");
                    Enumeration<String> headerNames = req.getHeaderNames();
                    while (headerNames.hasMoreElements()) {
                        String headerName = headerNames.nextElement();
                        log.debug("  {}: {}", headerName, req.getHeader(headerName));
                    }
                }
            }
        }
    }

    private void logResponse(HttpServletResponse res) {
        if (corsProperties.isDebug()) {
            if (res.getHeader("Access-Control-Allow-Origin") != null) {
                log.debug("=== RESPOSTA CORS ===");
                log.debug("Status: {}", res.getStatus());
                log.debug("Access-Control-Allow-Origin: {}", res.getHeader("Access-Control-Allow-Origin"));
                log.debug("Access-Control-Allow-Methods: {}", res.getHeader("Access-Control-Allow-Methods"));
                log.debug("Access-Control-Allow-Headers: {}", res.getHeader("Access-Control-Allow-Headers"));
                log.debug("Access-Control-Allow-Credentials: {}", res.getHeader("Access-Control-Allow-Credentials"));
                log.debug("Access-Control-Max-Age: {}", res.getHeader("Access-Control-Max-Age"));
            }
        }
    }

}
