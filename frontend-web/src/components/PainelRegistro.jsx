import { useState, useEffect, useRef } from "react";
import api from "../api";

export default function PainelRegistro({
  organizacaoId,
  unidadeId,
  onRegistroSucesso,
}) {
  const [mensagem, setMensagem] = useState(null);
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
      // Não bloqueamos a tela! Apenas avisamos o estado. (RFC-008)
      setPermissaoCamera(false);
    }
  };

  // Função que tenta pegar o GPS, mas devolve null pacificamente se o usuário negar
  const obterLocalizacao = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ latitude: null, longitude: null, precisaoGps: null });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            precisaoGps: pos.coords.accuracy,
          }),
        (err) => {
          console.warn("GPS negado ou indisponível:", err);
          resolve({ latitude: null, longitude: null, precisaoGps: null });
        },
        { timeout: 5000, enableHighAccuracy: true },
      );
    });
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
    setLoading(true);
    setMensagem(null);

    try {
      // 1. Captura a prova de vida no exato milissegundo do clique
      const fotoBase64 = capturarFoto();

      // 2. Captura a geolocalização de forma assíncrona
      const gps = await obterLocalizacao();

      // 3. Monta o Evento Bruto Imutável (RFC-008)
      const formData = new FormData();

      // Metadados como campos de texto
      formData.append("unidadeId", unidadeId);
      formData.append("dispositivoId", navigator.userAgent.substring(0, 128));
      formData.append("modoRegistro", "SELF");
      formData.append("capturadoEm", new Date().toISOString());
      if (gps.latitude != null) formData.append("latitude", gps.latitude);
      if (gps.longitude != null) formData.append("longitude", gps.longitude);
      if (gps.precisaoGps != null)
        formData.append("precisaoGps", gps.precisaoGps);

      // Foto como arquivo binário — converte base64 → Blob
      if (fotoBase64) {
        const blob = base64ToBlob(fotoBase64, "image/jpeg");
        formData.append("foto", blob, "captura.jpg");
      }

      await api.post(`/orgs/${organizacaoId}/presencas`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMensagem({
        tipo: "sucesso",
        texto: "Registro enviado para validação.",
      });

      if (onRegistroSucesso) onRegistroSucesso();
    } catch (error) {
      setMensagem({
        tipo: "erro",
        texto: error.message || "Falha ao comunicar com o servidor.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Converte o base64 do canvas para Blob binário
  function base64ToBlob(base64, mimeType) {
    const partes = base64.split(",");
    const dados = atob(partes[1] ?? partes[0]);
    const bytes = new Uint8Array(dados.length);
    for (let i = 0; i < dados.length; i++) {
      bytes[i] = dados.charCodeAt(i);
    }
    return new Blob([bytes], { type: mimeType });
  }

  return (
    <div
      style={{
        border: "1px solid #ccc",
        padding: "30px",
        borderRadius: "8px",
        textAlign: "center",
        marginBottom: "30px",
        background: "#fff",
      }}
    >
      <p style={{ marginBottom: "20px", color: "#555", fontWeight: "bold" }}>
        Posicione seu rosto na câmera e clique em Registrar.
      </p>

      {/* Câmera Espelho Circular */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: "20px",
        }}
      >
        <canvas ref={canvasRef} style={{ display: "none" }}></canvas>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{
            width: "100%",
            maxWidth: "250px",
            borderRadius: "50%", // Transforma o vídeo em um círculo perfeito
            border: "4px solid #007bff",
            transform: "scaleX(-1)", // Espelha a imagem para o usuário
            objectFit: "cover",
            aspectRatio: "1/1",
          }}
        ></video>
      </div>

      {!permissaoCamera && (
        <p style={{ color: "red", fontSize: "12px" }}>
          Acesso à câmera bloqueado. O registro não poderá ser validado.
        </p>
      )}

      {/* O Comando Único */}
      <button
        onClick={handleRegistrar}
        disabled={loading}
        style={{
          padding: "15px 40px",
          fontSize: "18px",
          fontWeight: "bold",
          background: loading ? "#ccc" : "#28a745",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: loading ? "not-allowed" : "pointer",
          width: "100%",
          maxWidth: "250px",
        }}
      >
        {loading ? "Enviando..." : "Registrar"}
      </button>

      {mensagem && (
        <p
          style={{
            marginTop: "20px",
            fontWeight: "bold",
            color: mensagem.tipo === "sucesso" ? "green" : "#d32f2f",
          }}
        >
          {mensagem.texto}
        </p>
      )}
    </div>
  );
}
