import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// 1. CORREÇÃO DO PINO: Agora com os tamanhos [largura, altura] preenchidos!
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [1, 2],       // Tamanho oficial do pino azul do Leaflet
    iconAnchor: [2, 3],     // Ponto que toca o chão (metade da largura, final da altura)
    popupAnchor: [1, -34],    // Onde o balão flutua
    shadowSize: [2]      // Tamanho da sombra
});
L.Marker.prototype.options.icon = DefaultIcon;

// 2. CORREÇÃO DO MAPA EM BRANCO: Força o recálculo sempre que o componente é montado
function AjusteDeTamanhoDoMapa({ telaInteira }) {
    const map = useMap();
    useEffect(() => {
        // Dispara o recálculo logo que o modal abre e também quando muda a tela inteira
        const timeout = setTimeout(() => {
            map.invalidateSize();
        }, 300); 
        return () => clearTimeout(timeout);
    }, [map, telaInteira]);
    return null;
}

export default function MapaLocalizacao({ latitude, longitude }) {
    const [aberto, setAberto] = useState(false);
    const [telaInteira, setTelaInteira] = useState(false);

    // Se o usuário negou o GPS (nulo), o botão azul nem aparece.
    if (!latitude || !longitude) {
        return <span style={{ fontSize: '12px', color: '#d32f2f', fontWeight: 'bold' }}>📍 Sem GPS</span>;
    }

    return (
        <>
            <button
                onClick={() => setAberto(true)}
                style={{ background: '#e3f2fd', border: '1px solid #90caf9', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', color: '#0d47a1', fontSize: '12px', fontWeight: 'bold' }}
            >
                📍 Ver Mapa
            </button>

            {aberto && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
                }}>
                    <div style={{
                        background: '#fff',
                        padding: telaInteira ? '0' : '20px',
                        borderRadius: telaInteira ? '0' : '8px',
                        width: telaInteira ? '100vw' : '90%',
                        maxWidth: telaInteira ? '100%' : '600px',
                        height: telaInteira ? '100vh' : 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                        transition: 'all 0.3s ease'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: telaInteira ? '15px 20px' : '0 0 15px 0' }}>
                            <h3 style={{ margin: 0, color: '#333' }}>🗺️ Localização do Registro</h3>
                            <div>
                                <button onClick={() => setTelaInteira(!telaInteira)} style={{ background: '#0056b3', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', marginRight: '10px', fontWeight: 'bold' }}>
                                    {telaInteira ? '🗗 Reduzir' : '⛶ Tela Inteira'}
                                </button>
                                <button onClick={() => { setAberto(false); setTelaInteira(false); }} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#666' }}>✖</button>
                            </div>
                        </div>

                        <div style={{ flex: 1, minHeight: telaInteira ? 'calc(100vh - 65px)' : '400px', width: '100%', borderRadius: telaInteira ? '0' : '8px', overflow: 'hidden', border: telaInteira ? 'none' : '1px solid #ccc' }}>
                            {/* O MapContainer renderiza o mapa e o pino */}
                            <MapContainer center={[latitude, longitude]} zoom={16} style={{ height: '100%', width: '100%' }}>
                                <AjusteDeTamanhoDoMapa telaInteira={telaInteira} />
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                />
                                <Marker position={[latitude, longitude]}>
                                    <Popup>Ponto exato capturado no registro.</Popup>
                                </Marker>
                            </MapContainer>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}