package br.gov.df.seagri.dominio_central.util;

import lombok.experimental.UtilityClass;

@UtilityClass
public class TextoSanitizadorUtil {

    /**
     * Sanitiza textos recebidos externamente para:
     * - evitar log injection
     * - evitar quebra de linhas
     * - reduzir poluição de logs
     * - limitar tamanho
     * - remover caracteres não imprimíveis
     */
    public static String sanitizar(String valor, int tamanhoMaximo) {

        if (valor == null || valor.isBlank()) {
            return null;
        }

        // Remove quebras de linha e caracteres de controle
        valor = valor.replaceAll("[\\r\\n\\t]", "");

        // Remove caracteres não imprimíveis
        valor = valor.replaceAll("[^\\p{Print}]", "");

        // Remove espaços excedentes
        valor = valor.trim();

        // Limita tamanho
        if (valor.length() > tamanhoMaximo) {
            valor = valor.substring(0, tamanhoMaximo);
        }

        return valor;
    }

}
