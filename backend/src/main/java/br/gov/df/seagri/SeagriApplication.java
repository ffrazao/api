package br.gov.df.seagri;

import java.util.TimeZone;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration;

import jakarta.annotation.PostConstruct;

@SpringBootApplication(exclude = { RedisRepositoriesAutoConfiguration.class }/*
                                                                              * Para excluir a análise do REDIS, só
                                                                              * teria sentido se houvessem entidades
                                                                              * geridas pelo REDIS
                                                                              */)
public class SeagriApplication {

    public static void main(String[] args) {
        SpringApplication.run(SeagriApplication.class, args);
    }

    @PostConstruct
    public void init() {
        // Força o Java a rodar em UTC, garantindo total alinhamento com o
        // Banco de Dados e evitando surpresas com fusos horários
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
    }

}
