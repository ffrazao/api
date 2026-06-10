package br.gov.df.seagri.dominio_central.web;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.util.List;
import java.util.stream.Collectors;

@ControllerAdvice
public class GlobalExceptionHandler {

    // 1. Erros de Segurança (ex: Violação de Isolamento Multi-Tenant)
    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<ApiResponse<Void>> handleSecurityException(SecurityException ex) {
        return buildErrorResponse(HttpStatus.FORBIDDEN, "Acesso Negado", List.of(ex.getMessage()));
    }

    // 1.5 Erros de Acesso Negado do Interceptador (PDP / Spring Security)
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDeniedException(AccessDeniedException ex) {
        return buildErrorResponse(HttpStatus.FORBIDDEN, "Acesso Negado", List.of(ex.getMessage()));
    }

    // 2. Erros de Violação de RFC (ex: Tentativa de Editar Entidade Imutável - RFC-0005)
    @ExceptionHandler(UnsupportedOperationException.class)
    public ResponseEntity<ApiResponse<Void>> handleUnsupportedOperation(UnsupportedOperationException ex) {
        return buildErrorResponse(HttpStatus.METHOD_NOT_ALLOWED, "Operação Não Permitida", List.of(ex.getMessage()));
    }

    // 3. Erros de Validação Automática de DTOs (Anotações @Valid)
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        List<String> errors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .collect(Collectors.toList());
                
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "Erro de Validação dos Dados", errors);
    }

    // 4. Erros de Negócio Genéricos
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgument(IllegalArgumentException ex) {
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "Requisição Inválida", List.of(ex.getMessage()));
    }

    // 5. Erro Técnico Não Tratado (Fallback)
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleAllExceptions(Exception ex) {
        return buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Erro Interno no Servidor", List.of(ex.getMessage()));
    }

    // Utilitário interno para montar a resposta de erro padronizada
    private ResponseEntity<ApiResponse<Void>> buildErrorResponse(HttpStatus status, String message, List<String> errors) {
        ApiResponse<Void> response = ApiResponse.<Void>builder()
                .status(status.value())
                .message(message)
                .errors(errors)
                .build();
                
        return ResponseEntity.status(status).body(response);
    }
}

