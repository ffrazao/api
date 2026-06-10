import Keycloak from "keycloak-js";

// Configuração apontando para o seu Keycloak local e o realm corporativo
const keycloakConfig = {
  // Lê dinamicamente a URL do Keycloak
  url: import.meta.env.VITE_KEYCLOAK_URL || "http://localhost:8080",
  realm: "corporativo",
  clientId: "seagri-web",
};

const keycloak = new Keycloak(keycloakConfig);

export default keycloak;
