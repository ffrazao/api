package br.gov.df.seagri.dominio_central.infraestrutura;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Base64;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class LocalArmazenamentoFotoSrv implements ArmazenamentoFotoSrv {

    @Value("${armazenamento.diretorio.fotos:#{systemProperties['user.home'] + '/seagri_fotos'}}")
    private String diretorioRaiz;

    private Path getDiretorioRaiz() {
        Path result = this.diretorioRaiz == null ? null : Paths.get(this.diretorioRaiz);

        try {
            if (!Files.exists(result)) {
                log.trace("Criando o diretório raiz das fotos em {}", diretorioRaiz);
                Files.createDirectories(result);
            }
        } catch (IOException e) {
            log.error("❌ Erro fatal ao criar diretório de biometria: {}", e.getMessage());
            throw new RuntimeException(e);
        }

        return result;
    }

    // Método para salvar a imagem física e retornar um UUID de referência
    @Override
    public UUID salvarFotoBase64(String fotoBase64) {
        if (fotoBase64 == null || fotoBase64.isEmpty()) {
            log.debug("fotoBase64 vazio ou não informado");
            return null;
        }

        try {
            // 1. Isola apenas a string Base64 pura (Remove o prefixo
            // 'data:image/jpeg;base64,')
            String base64Limpo = fotoBase64;
            if (fotoBase64.contains(",")) {
                base64Limpo = fotoBase64.substring(fotoBase64.indexOf(",") + 1);
            }

            // 2. Limpeza profunda: Remove espaços e quebras de linha que o JSON pode ter
            // injetado
            base64Limpo = base64Limpo.replaceAll("\\s+", "");

            // 3. Decodifica a imagem binária
            byte[] bytesImagem = Base64.getDecoder().decode(base64Limpo);

            // 4. Salva no disco (Garante a imutabilidade gerando um UUID único para o
            // arquivo)
            UUID referenciaImagem = UUID.randomUUID();
            Path caminhoArquivo = getDiretorioRaiz().resolve(referenciaImagem.toString() + ".jpg");

            Files.write(caminhoArquivo, bytesImagem);

            log.debug("💾 FOTO SALVA COM SUCESSO NO DISCO: {}", caminhoArquivo.toString());

            return referenciaImagem;

        } catch (IllegalArgumentException e) {
            log.error("❌ ERRO DE DECODIFICAÇÃO BASE64: A imagem não veio no formato correto.");
            e.printStackTrace();
            throw new RuntimeException("Falha de formato da imagem", e);
        } catch (IOException e) {
            log.error("❌ ERRO DE GRAVAÇÃO NO DISCO: O Java não tem permissão para salvar na pasta.");
            e.printStackTrace();
            throw new RuntimeException("Falha de gravação de arquivo", e);
        } catch (Exception e) {
            log.error("❌ ERRO DESCONHECIDO NO ARMAZENAMENTO.");
            e.printStackTrace();
            throw new RuntimeException("Erro interno no armazenamento", e);
        }
    }

    @Override
    public UUID salvarFoto(byte[] bytesImagem) {
        throw new UnsupportedOperationException(
                "Este método não é suportado nesta implementação. Use salvarFotoBase64.");
    }

    // Método para ler a imagem física e devolvê-la para a web
    @Override
    public byte[] recuperarFoto(UUID referenciaImagem) {
        if (referenciaImagem == null) {
            log.debug("ID de Referência da imagem não informado");
            return null;
        }

        try {
            Path caminhoArquivo = getDiretorioRaiz().resolve(referenciaImagem.toString() + ".jpg");
            if (Files.exists(caminhoArquivo)) {
                byte[] result = Files.readAllBytes(caminhoArquivo);
                log.debug("ID de Referência da imagem {} encontrado, tamanho {}.", referenciaImagem.toString(),
                        result.length);
                return result;
            }
            log.debug("ID de Referência ({}) não encontrado no disco", referenciaImagem.toString());
            return null;
        } catch (IOException e) {
            log.error("❌ Erro ao ler imagem do disco: " + e.getMessage());
            throw new RuntimeException("Falha ao ler evidência biométrica", e);
        }
    }

}
