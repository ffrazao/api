package br.gov.df.seagri.dominio_central.web;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.gov.df.seagri.dominio_central.util.TextoSanitizadorUtil;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/api/v1")
public class UtilitariosPublicosCtrl {

    /**
     * Endpoint público simples para health-check.
     */
    @GetMapping("/public/ping")
    public ResponseEntity<PingResposta> ping() {

        log.debug("Recebido ping público.");

        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(new PingResposta("PONG"));
    }

    /**
     * Endpoint público para obtenção do horário oficial do servidor.
     *
     * Não confia em informações enviadas pelo cliente.
     * Os headers recebidos são usados apenas como telemetria.
     */
    @GetMapping("/public/tempo-oficial")
    public ResponseEntity<TempoOficialResposta> tempoOficial(

            @RequestHeader(value = "X-Fuso-Cliente", required = false) String fusoCliente,

            @RequestHeader(value = "X-App-Versao", required = false) String appVersao,

            @RequestHeader(value = "X-Origem", required = false) String origem) {

        // Sanitização defensiva
        fusoCliente = TextoSanitizadorUtil.sanitizar(fusoCliente, 100);
        appVersao = TextoSanitizadorUtil.sanitizar(appVersao, 30);
        origem = TextoSanitizadorUtil.sanitizar(origem, 30);

        log.debug(
                "Consulta tempo-oficial. origem={} appVersao={} fusoCliente={}",
                origem,
                appVersao,
                fusoCliente);

        Instant agora = Instant.now();

        ZoneId zoneId = ZoneId.systemDefault();

        ZonedDateTime horarioServidor = ZonedDateTime.ofInstant(agora, zoneId);

        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .header(HttpHeaders.PRAGMA, "no-cache")
                .header(HttpHeaders.EXPIRES, "0")
                .body(new TempoOficialResposta(
                        horarioServidor,
                        agora.toEpochMilli(),
                        zoneId.getId()));
    }

    /**
     * Endpoint autenticado para diagnósticos temporais.
     *
     * Pode ser usado futuramente por:
     * - aplicativos internos
     * - suporte técnico
     * - auditoria
     * - monitoramento avançado
     */
    @GetMapping("/diagnostico/tempo")
    public ResponseEntity<DiagnosticoTempoResposta> diagnosticoTempo(
            @RequestHeader(value = "X-App-Versao", required = false) String appVersao,
            @RequestHeader(value = "X-Origem", required = false) String origem,
            @RequestHeader(value = "X-Fuso-Cliente", required = false) String fusoCliente,
            @RequestHeader(value = "X-Horario-Cliente", required = false) String horarioCliente) {

        fusoCliente = TextoSanitizadorUtil.sanitizar(fusoCliente, 100);
        appVersao = TextoSanitizadorUtil.sanitizar(appVersao, 30);
        origem = TextoSanitizadorUtil.sanitizar(origem, 30);
        horarioCliente = TextoSanitizadorUtil.sanitizar(horarioCliente, 100);

        Instant agora = Instant.now();

        ZoneId zoneId = ZoneId.systemDefault();

        ZonedDateTime horarioServidor = ZonedDateTime.ofInstant(agora, zoneId);

        log.debug(
                "Diagnóstico temporal. origem={} appVersao={} fusoCliente={} horarioCliente={}",
                origem,
                appVersao,
                fusoCliente,
                horarioCliente);

        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(new DiagnosticoTempoResposta(
                        horarioServidor,
                        agora.toEpochMilli(),
                        zoneId.getId(),
                        fusoCliente,
                        origem,
                        appVersao,
                        horarioCliente));
    }

    // =========================================================
    // RECORDS
    // =========================================================

    public record PingResposta(
            String status) {
    }

    public record TempoOficialResposta(
            ZonedDateTime horarioServidor,
            Long epochMillis,
            String fusoHorario) {
    }

    public record DiagnosticoTempoResposta(
            ZonedDateTime horarioServidor,
            Long epochMillis,
            String fusoHorarioServidor,
            String fusoHorarioCliente,
            String origem,
            String appVersao,
            String horarioClienteInformado) {
    }
}
