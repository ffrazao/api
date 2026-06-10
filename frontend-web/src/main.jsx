import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import keycloak from "./keycloak";

// Inicializa o Keycloak forçando o login e usando PKCE para maior segurança
keycloak
  .init({
    onLoad: "login-required",
    checkLoginIframe: false,
    pkceMethod: "S256",
  })
  .then((authenticated) => {
    if (!authenticated) {
      window.location.reload();
    } else {
      ReactDOM.createRoot(document.getElementById("root")).render(
        <React.StrictMode>
          <App />
        </React.StrictMode>,
      );
    }
  })
  .catch(console.error);
