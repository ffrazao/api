package br.gov.df.seagri.infraestrutura.config;

import java.io.File;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.PropertySource;

import io.github.cdimascio.dotenv.Dotenv;
import io.github.cdimascio.dotenv.DotenvEntry;

public class DotenvEnvironmentPostProcessor implements EnvironmentPostProcessor {

    private static final String ARQUIVO_ENV_PADRAO = ".env";

    private static final String PROPERTY_SOURCE_NAME = "dotenvProperties";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        System.out.printf(
                ">>> [DOTENV] Iniciando o carregamento de variáveis de ambiente a partir de arquivos .env...\n");

        System.out.printf(">>> [DOTENV] CWD: [%s]\n", System.getProperty("user.dir"));

        // Definir a ordem de carregamento dos arquivos .env
        final List<String> envFiles = new ArrayList<>(Arrays.asList(ARQUIVO_ENV_PADRAO));

        // Buscar o perfil ativo para determinar se deve carregar um arquivo .env
        // específico do perfil
        String[] activeProfile = getActiveProfile(environment);
        if (activeProfile != null && activeProfile.length > 0) {
            Arrays.stream(activeProfile)
                    // remover perfis nulos ou vazios
                    .filter(p -> p != null && !p.trim().isEmpty())
                    // logar os perfis detectados
                    .forEach(p -> {
                        p = p.trim();
                        envFiles.add(String.format("%s.%s", ARQUIVO_ENV_PADRAO, p));
                        System.out.printf(">>> [DOTENV] Perfil ativo detectado: [%s]. Arquivo de variáveis: [%s]\n", p,
                                envFiles.get(envFiles.size() - 1));
                    });
        } else {
            System.out.printf(">>> [DOTENV] Nenhum perfil ativo. Tentando carregar apenas o arquivo [%s] padrão\n",
                    ARQUIVO_ENV_PADRAO);
        }

        // Carregar os arquivos .env
        Map<String, Object> envMap = new HashMap<>();

        envFiles.forEach(file -> loadDotenvFile(environment, envMap, file));

        if (!envMap.isEmpty()) {
            // logar as variáveis finais que serão adicionadas ao ambiente
            envMap.forEach((key, value) -> System.out.printf(">>> [DOTENV] Variável final a ser adicionada ao ambiente: [%s]=[***]\n",
                    key));
            // Criar um PropertySource com as variáveis do .env
            PropertySource<?> propertySource = new MapPropertySource(PROPERTY_SOURCE_NAME + "_", envMap);
            // Adicionar o PropertySource ao ambiente (com alta prioridade)
            environment.getPropertySources().addFirst(propertySource);
            System.out.printf(">>> [DOTENV] Carregamento com sucesso de [%d] variável(eis) a partir de arquivos .env.\n",
                    envMap.size());
        }

        System.out
                .printf(">>> [DOTENV] Finalizado o carregamento de variáveis de ambiente a partir de arquivos .env.\n");
    }

    private String[] getActiveProfile(ConfigurableEnvironment environment) {
        // Tenta obter o perfil de múltiplas fontes

        // Inicialmente, verifica os perfis ativos definidos no ambiente do Spring
        String[] result = environment.getActiveProfiles();
        if (result == null || result.length == 0) {
            // Se não encontrar nos perfis ativos do Spring, verifica se o usuário definiu
            // manualmente a variável de ambiente "spring.profiles.active" como propriedade
            // do sistema (ex: -Dspring.profiles.active=dev)
            String profiles = Optional.of(System.getProperty("spring.profiles.active"))
                    .orElse(System.getenv("SPRING_PROFILES_ACTIVE"));
            if (profiles != null && !profiles.isEmpty()) {
                result = profiles.trim().split("\\s*,\\s*");
            }
        }

        return result;
    }

    private void loadDotenvFile(ConfigurableEnvironment environment, Map<String, Object> envMap, String filename) {
        // Tentar carregar do diretório pai
        Dotenv dotenv = loadDotenvFromDirectory("../", filename);
        // Se não encontrar, tentar do diretório atual
        if (dotenv == null || dotenv.entries().isEmpty()) {
            dotenv = loadDotenvFromDirectory("./", filename);
        }

        if (dotenv == null || dotenv.entries().isEmpty()) {
            // System.out.printf(">>> [DOTENV] Arquivo [%s] não encontrado nos diretórios ./ ou ../\n", filename);
        } else {
            envMap.putAll(
                dotenv.entries().stream()
                    .filter((entry) -> {
                        String valorNoSO = System.getenv(entry.getKey());

                        // Só adicionamos ao mapa se o valor for diferente do SO
                        // (ou seja, foi definido/sobrescrito no arquivo .env)
                        if (valorNoSO == null || !valorNoSO.equals(entry.getValue())) {
                            //System.out.printf(">>> [DOTENV] [%s] -> Arquivo definiu: %s=%s\n",
                            //        filename, entry.getKey(), entry.getValue());
                            return true;
                        } else {
                            //System.out.printf(
                            //        ">>> [DOTENV] [%s] -> Ignorando [%s] porque já existe no ambiente do sistema com o mesmo valor: %s=%s\n",
                            //        filename, entry.getKey(), entry.getKey(), valorNoSO);
                            return false;
                        }
                    })
                    //.peek(entry -> System.out.printf(">>> [DOTENV] Variável carregada: [%s]=[%s]\n", entry.getKey(),
                    //        entry.getValue()))
                    .collect(Collectors.toMap(
                            DotenvEntry::getKey,
                            DotenvEntry::getValue,
                            (v1, v2) -> v1)));
        }
        return;
    }

    private Dotenv loadDotenvFromDirectory(String directory, String filename) {
        try {
            File dir = new File(directory);
            if (dir.exists() && dir.isDirectory()) {
                File envFile = new File(dir, filename);
                if (envFile.exists() && envFile.isFile()) {
                    return Dotenv.configure()
                            .filename(filename)
                            .directory(directory)
                            // .ignoreIfMalformed()
                            .ignoreIfMissing()
                            .load();
                }
            }
        } catch (Exception e) {
            System.err.printf(">>> [DOTENV] Erro ao carregar [%s] de [%s]: [%s]\n", filename, directory,
                    e.getMessage());
        }
        return null;
    }

}