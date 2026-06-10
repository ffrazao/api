package br.gov.df.seagri.modulo_presenca.aplicacao;

import java.util.List;
import java.util.UUID;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import br.gov.df.seagri.modulo_seguranca.infraestrutura.PerfilBiometricoDAO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class VetorBiometricoCache {

    private final PerfilBiometricoDAO perfilBiometrico;

    // A chave explícita chamando .toString() garante compatibilidade perfeita com
    // Redis
    @Cacheable(value = "vetorBiometrico", key = "#result == null")
    public List<Double> obterVetorMatematico(UUID keycloakSub) {
        log.info("🎯 CACHE MISS: Processando vetor biométrico do banco para o usuário: {}", keycloakSub);

        try {
            byte[] vetorBanco = perfilBiometrico.findByKeycloakSub(keycloakSub)
                    .orElseThrow(() -> new RuntimeException("Perfil biométrico não encontrado"))
                    .getModeloBiometrico();

            ObjectMapper mapper = new ObjectMapper();
            JsonNode rootNode = mapper.readTree(vetorBanco);

            return mapper.convertValue(
                    rootNode.get("template_vector"),
                    new TypeReference<List<Double>>() {
                    });
        } catch (Exception e) {
            throw new RuntimeException("Falha ao extrair vetor biométrico", e);
        }
    }

    @CacheEvict(value = "vetorBiometrico", key = "#keycloakSub.toString()")
    public void invalidarCacheBiometria(UUID keycloakSub) {
        log.info("🗑️ Cache evitado/limpo para o usuário: {}", keycloakSub);
    }

}
