package br.gov.df.seagri.dominio_central.infraestrutura;

import java.util.UUID;

public interface ArmazenamentoFotoSrv {

    public UUID salvarFotoBase64(String fotoBase64);

    public UUID salvarFoto(byte[] bytesImagem);

    // Método para ler a imagem física e devolvê-la para a web
    public byte[] recuperarFoto(UUID referenciaImagem);

}
