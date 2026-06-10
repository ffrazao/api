import { useState } from 'react';
import api from '../api';

// NOVO: Recebendo a prop onConviteAceito
export default function PainelConvite({ onConviteAceito }) {
  const [codigo, setCodigo] = useState('');
  const [mensagem, setMensagem] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleVincular = async () => {
    if (!codigo.trim()) return;
    setLoading(true);
    setMensagem(null);
    try {
      const response = await api.post(`/convites/${codigo}/aceitar`);
      
      // Ajuste de segurança para pegar o payload caso a resposta mude
      const textoSucesso = response.data?.payload || response.data || 'Convite aceito com sucesso!';
      setMensagem({ tipo: 'sucesso', texto: textoSucesso });
      setCodigo(''); // Limpa o campo após sucesso

      // NOVO: Avisa o App.jsx para recarregar o contexto após 1.5 segundos
      if (onConviteAceito) {
        setTimeout(() => {
          onConviteAceito();
        }, 1500);
      }

    } catch (error) {
      setMensagem({ tipo: 'erro', texto: 'Erro: ' + (error.response?.data?.message || error.message) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px', marginBottom: '30px', background: '#fafafa' }}>
      <h3>Possui um código de convite?</h3>
      <p style={{ color: '#666', fontSize: '14px', marginBottom: '10px' }}>Digite abaixo para se vincular a uma organização.</p>
      <div style={{ display: 'flex', gap: '10px' }}>
        <input 
          type="text" 
          placeholder="Ex: SEAGRI-TESTE"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          style={{ padding: '10px', flex: 1, borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button 
          onClick={handleVincular} disabled={loading}
          style={{ padding: '10px 20px', cursor: loading ? 'not-allowed' : 'pointer', background: loading ? '#ccc' : '#28a745', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}
        >
          {loading ? 'Aguarde...' : 'Vincular'}
        </button>
      </div>
      {mensagem && (
        <p style={{ marginTop: '10px', color: mensagem.tipo === 'sucesso' ? 'green' : '#d32f2f', fontWeight: 'bold' }}>{mensagem.texto}</p>
      )}
    </div>
  );
}