package br.gov.df.seagri.modulo_presenca.infraestrutura;

import java.nio.charset.StandardCharsets;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class BiometriaClient {

    // Instanciamos o cliente HTTP do Spring
    private final RestClient restClient;

    // Inicializa o RestClient do Spring 3.5 lendo a URL do application.yml
    public BiometriaClient(@Value("${biometria.url}") @NonNull String biometriaUrl) {
        this.restClient = RestClient.builder()
                .baseUrl(biometriaUrl)
                .build();
    }

    // =========================================================================
    // 0. EXTRAÇÃO VETOR BIOMETRICO: recebe um Arquivo devolve um Vetor Biométrico
    // =========================================================================
    public byte[] extrairVetorBiometrico(byte[] foto) {
        log.info("[BIOMETRIA] Iniciando extração biométrica.");

        Objects.requireNonNull(foto, "A foto não pode ser nula");

        try {
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("image", new ByteArrayResource(foto) {
                @Override
                public String getFilename() {
                    return "selfie.jpg";
                }
            });

            String vetorMatematicoJson = restClient.post()
                    .uri("/api/v1/biometria/extract")
                    .contentType(Objects.requireNonNull(MediaType.MULTIPART_FORM_DATA, "MediaType não pode ser nulo"))
                    .body(body)
                    .retrieve()
                    .body(String.class);

            log.info("[BIOMETRIA] Vetor biométrico extraído com sucesso pela IA!");
            return Objects.requireNonNull(vetorMatematicoJson, "Vetor biométrico não pode ser nulo")
                    .getBytes(StandardCharsets.UTF_8);

        } catch (Exception e) {
            log.error("[BIOMETRIA] Falha na extração: {}", e.getMessage());
            throw new RuntimeException("Não foi possível extrair a biometria da face informada.", e);
        }
    }

    // =========================================================================
    // 1. COMPARAÇÃO: Arquivo x Arquivo (Duas fotos brutas)
    // =========================================================================
    public Map<String, Object> compararArquivoComArquivo(byte[] foto1, byte[] foto2) {
        log.info("[BIOMETRIA] Comparando arquivos biométricos.");

        Objects.requireNonNull(foto1, "foto1 não pode ser nulo");
        Objects.requireNonNull(foto2, "foto2 não pode ser nulo");

        try {

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();

            body.add("image_1", new ByteArrayResource(foto1) {
                @Override
                public String getFilename() {
                    return "ref.jpg";
                }
            });

            body.add("image_2", new ByteArrayResource(foto2) {
                @Override
                public String getFilename() {
                    return "cap.jpg";
                }
            });

            return restClient.post()
                    .uri("/api/v1/biometria/compare_file")
                    .contentType(Objects.requireNonNull(MediaType.MULTIPART_FORM_DATA, "MediaType não pode ser nulo"))
                    .body(body)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {
                    });

        } catch (Exception e) {
            return gerarFallbackDeErro(e);
        }
    }

    // =========================================================================
    // 2. COMPARAÇÃO: Vetor x Arquivo (Usado no Bater do Ponto Oficial)
    // =========================================================================
    public Map<String, Object> compararVetorComArquivo(List<Double> vetorBanco, byte[] fotoCapturada) {
        log.info("[BIOMETRIA] Comparando vetor com arquivo biométrico.");

        Objects.requireNonNull(vetorBanco, "vetorBanco não pode ser nulo");
        Objects.requireNonNull(fotoCapturada, "fotoCapturada não pode ser nulo");

        try {

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();

            body.add("template_1", vetorBanco.toString());

            body.add("image_2", new ByteArrayResource(fotoCapturada) {
                @Override
                public String getFilename() {
                    return "cap.jpg";
                }
            });

            return restClient.post()
                    .uri("/api/v1/biometria/compare_template")
                    .contentType(Objects.requireNonNull(MediaType.MULTIPART_FORM_DATA, "MediaType não pode ser nulo"))
                    .body(body)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {
                    });

        } catch (Exception e) {
            return gerarFallbackDeErro(e);
        }
    }

    // =========================================================================
    // 3. COMPARAÇÃO: Vetor x Vetor (JSON vs JSON)
    // =========================================================================
    public Map<String, Object> compararVetorComVetor(List<Double> vetor1, List<Double> vetor2) {
        log.info("[BIOMETRIA] Comparando vetores biométricos.");

        Objects.requireNonNull(vetor1, "vetor1 não pode ser nulo");
        Objects.requireNonNull(vetor2, "vetor2 não pode ser nulo");

        try {

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();

            body.add("template_1", vetor1.toString());

            body.add("template_2", vetor2.toString());

            return restClient.post()
                    .uri("/api/v1/biometria/compare")
                    .contentType(Objects.requireNonNull(MediaType.APPLICATION_JSON, "MediaType não pode ser nulo"))
                    .body(body)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {
                    });

        } catch (Exception e) {
            return gerarFallbackDeErro(e);
        }
    }

    // Método utilitário privado para evitar repetição de código no catch
    private Map<String, Object> gerarFallbackDeErro(Exception e) {
        log.error("[BIOMETRIA] Falha ao comunicar com o motor Python: {}", e.getMessage());
        Map<String, Object> fallback = new HashMap<>();
        fallback.put("is_match", false);
        fallback.put("biometric_score", 0.0);
        fallback.put("tecnico_falha", true);
        return fallback;
    }

}
