import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import api from "../api";

export default function FotoBiometrica({ organizacaoId, presencaId }) {
  const [fotoUrl, setFotoUrl] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const buscarFoto = async () => {
      try {
        const response = await api.get(
          `/orgs/${organizacaoId}/presencas/${presencaId}/foto`,
          {
            responseType: "blob",
          },
        );
        const url = URL.createObjectURL(response.data);
        setFotoUrl(url);
      } catch (error) {
        console.error("Foto não encontrada ou sem permissão");
      } finally {
        setCarregando(false);
      }
    };

    if (presencaId && organizacaoId && organizacaoId !== "null") {
      buscarFoto();
    } else {
      // Se faltar algum ID, não fica carregando infinitamente
      setCarregando(false);
    }
  }, [organizacaoId, presencaId]);

  const ampliarFoto = () => {
    Swal.fire({
      // Substituímos o imageUrl pelo HTML customizado para criar o botão sobreposto
      html: `
                <div style="position: relative;">
                    <img id="foto-ampliada" src="${fotoUrl}" style="width: 100%; border-radius: 8px; display: block;" />

                    <!-- Botão idêntico ao do YouTube chamando a API nativa Fullscreen -->
                    <button onclick="
                        const img = document.getElementById('foto-ampliada');
                        if (!document.fullscreenElement) {
                            img.requestFullscreen().catch(err => console.error(err));
                        } else {
                            document.exitFullscreen();
                        }
                    " style="position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.7); color: #fff; border: 1px solid rgba(255,255,255,0.5); padding: 8px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 14px; transition: 0.2s;">
                        ⛶ Tela Inteira
                    </button>
                </div>
            `,
      showConfirmButton: false,
      showCloseButton: true,
      width: 600, // Tamanho padrão grande
      background: "transparent",
      backdrop: `rgba(0, 0, 0, 0.9)`, // Fundo quase preto para destaque
    });
  };

  if (carregando)
    return (
      <span style={{ fontSize: "12px", color: "#666" }}>Carregando...</span>
    );
  if (!fotoUrl)
    return <span style={{ fontSize: "12px", color: "#999" }}>Sem foto</span>;

  return (
    <img
      src={fotoUrl}
      alt="Evidência Biométrica"
      onClick={ampliarFoto}
      style={{
        width: "60px",
        height: "60px",
        borderRadius: "8px",
        objectFit: "cover",
        border: "1px solid #ccc",
        cursor: "pointer",
        transition: "transform 0.2s",
      }}
      onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
      onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
    />
  );
}
