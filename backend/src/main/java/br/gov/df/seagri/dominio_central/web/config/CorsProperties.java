package br.gov.df.seagri.dominio_central.web.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import java.util.List;
import java.util.ArrayList;

@Data
@Component
@ConfigurationProperties(prefix = "cors")
public class CorsProperties {

    private List<String> allowedOrigins = new ArrayList<>();

    private List<String> allowedMethods = new ArrayList<>();

    private String allowedHeaders = "*";

    private boolean allowCredentials = true;

    private boolean debug = false;

}