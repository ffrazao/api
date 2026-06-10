import { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import api from "../api";

export default function PainelOnboarding({ onSucesso }) {
  const [cpf, setCpf] = useState("");
  const [loading, setLoading] = useState(false);
  const [permissaoCamera, setPermissaoCamera] = useState(true);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    iniciarCamera();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const iniciarCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setPermissaoCamera(true);
    } catch (err) {
      console.warn("Câmera negada ou indisponível:", err);
      setPermissaoCamera(false);
    }
  };

  const capturarFoto = () => {
    if (!permissaoCamera || !videoRef.current || !videoRef.current.srcObject) {
      return null;
    }
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.8);
  };

  const handleRegistrar = async () => {
    if (!cpf.trim()) {
      Swal.fire("Atenção", "Por favor, informe seu CPF.", "warning");
      return;
    }

    const fotoBase64 = capturarFoto();
    if (!fotoBase64) {
      Swal.fire(
        "Atenção",
        "É necessário capturar a foto para prosseguir.",
        "warning",
      );
      return;
    }

    setLoading(true);
    try {
      // Chama a nossa nova rota pública do Java!
      const response = await api.post("/onboarding/completar-perfil", {
        cpf: cpf,
        fotoBase64: fotoBase64,
      });

      Swal.fire(
        "Sucesso!",
        response.data.message || "Perfil concluído!",
        "success",
      ).then(() => {
        onSucesso(); // Avisa o App.jsx que deu certo para ele buscar o contexto novamente
      });
    } catch (error) {
      console.error("Erro no onboarding:", error);
      Swal.fire("Erro", "Não foi possível concluir o perfil.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        border: "1px solid #ccc",
        padding: "30px",
        borderRadius: "8px",
        textAlign: "center",
        background: "#fff",
      }}
    >
      <h2 style={{ color: "#d32f2f" }}>⚠️ Perfil Incompleto</h2>
      <p style={{ marginBottom: "20px", color: "#555", fontWeight: "bold" }}>
        Para acessar o sistema de presença, precisamos vincular sua conta
        técnica a uma identidade física real (CPF).
      </p>

      <div
        style={{
          marginBottom: "20px",
          textAlign: "left",
          maxWidth: "300px",
          margin: "0 auto 20px auto",
        }}
      >
        <label
          style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}
        >
          Seu CPF:
        </label>
        <input
          type="text"
          placeholder="Apenas números"
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "4px",
            border: "1px solid #ccc",
            boxSizing: "border-box",
          }}
        />
      </div>

      <div
        style={{
          background: "#000",
          width: "100%",
          maxWidth: "300px",
          height: "300px",
          margin: "0 auto 20px auto",
          borderRadius: "8px",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {permissaoCamera ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: "scaleX(-1)",
            }}
          />
        ) : (
          <p style={{ color: "red", padding: "20px" }}>
            Câmera indisponível. Libere o acesso no navegador.
          </p>
        )}
      </div>
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <button
        onClick={handleRegistrar}
        disabled={loading || !permissaoCamera}
        style={{
          padding: "12px 30px",
          fontSize: "16px",
          cursor: loading ? "not-allowed" : "pointer",
          background: loading ? "#ccc" : "#0056b3",
          color: "white",
          border: "none",
          borderRadius: "4px",
          fontWeight: "bold",
        }}
      >
        {loading ? "Processando..." : "Salvar e Validar Identidade"}
      </button>
    </div>
  );
}
