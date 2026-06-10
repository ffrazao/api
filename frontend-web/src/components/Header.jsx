export default function Header({ usuario }) {
  return (
    <div style={{ background: '#f0f0f0', padding: '15px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center' }}>
      <span>Olá, <strong>{usuario}</strong></span>
    </div>
  );
}