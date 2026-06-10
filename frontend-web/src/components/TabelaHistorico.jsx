import MapaLocalizacao from "./MapaLocalizacao";
import FotoBiometrica from "./FotoBiometrica";

export default function TabelaHistorico({ historico }) {
  return (
    <div
      style={{ border: "1px solid #ccc", padding: "20px", borderRadius: "8px" }}
    >
      <h3>Seu Histórico Recente</h3>
      {historico.length === 0 ? (
        <p style={{ color: "#777" }}>Nenhum registro encontrado.</p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            textAlign: "left",
          }}
        >
          <thead>
            <tr style={{ borderBottom: "2px solid #eee" }}>
              <th style={{ padding: "10px" }}>Data / Hora</th>
              <th style={{ padding: "10px" }}>Status Técnico</th>
              <th style={{ padding: "10px" }}>Status Administrativo</th>
              <th style={{ padding: "10px" }}>Foto</th>
              <th>Localização</th>
            </tr>
          </thead>
          <tbody>
            {historico.map((registro) => (
              <tr key={registro.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "10px" }}>
                  {new Date(registro.capturadoEm).toLocaleString(/*'pt-BR'*/)}
                </td>
                <td style={{ padding: "10px", color: "#666" }}>
                  {registro.statusTecnico}
                </td>
                <td style={{ padding: "10px" }}>
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: "bold",
                      background:
                        registro.statusAdministrativo === "VALIDO"
                          ? "#e6ffe6"
                          : "#fff3cd",
                      color:
                        registro.statusAdministrativo === "VALIDO"
                          ? "green"
                          : "#856404",
                    }}
                  >
                    {registro.statusAdministrativo === "VALIDO"
                      ? "🟢 VÁLIDO"
                      : "🟡 PENDENTE"}
                  </span>
                </td>
                <td>
                  {registro.referenciaBiometrica ? (
                    <FotoBiometrica
                      organizacaoId={registro.organizacaoId}
                      presencaId={registro.id}
                    />
                  ) : (
                    <span style={{ fontSize: "12px", color: "#999" }}>
                      Sem foto
                    </span>
                  )}
                </td>
                <td>
                  <MapaLocalizacao
                    latitude={registro.latitude}
                    longitude={registro.longitude}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
