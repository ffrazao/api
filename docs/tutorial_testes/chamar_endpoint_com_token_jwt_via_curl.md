

Copie o valor do campo access_token retornado no passo anterior e cole no lugar de SEU_TOKEN_AQUI no comando abaixo. Substitua também os UUIDs por IDs reais que existam no seu banco de dados para organizacao_id e unidade_id.
curl -i -X POST "http://localhost:8081/api/v1/presencas" \
     -H "Authorization: Bearer SEU_TOKEN_AQUI" \
     -H "Content-Type: application/json" \
     -d '{
           "organizacaoId": "123e4567-e89b-12d3-a456-426614174000",
           "unidadeId": "123e4567-e89b-12d3-a456-426614174001",
           "latitude": -15.7942,
           "longitude": -47.8821,
           "precisaoGps": 12.5,
           "dispositivoId": "moto-g-7-XYZ123",
           "modoRegistro": "SELF",
           "capturadoEm": "2026-03-06T15:30:00"
         }'
O que acontece nos bastidores?
A requisição bate na porta 8081.
O Spring Security intercepta, lê o cabeçalho Authorization e valida a assinatura criptográfica do token usando a chave pública do Keycloak.
Se válido, ele extrai o seu ID de usuário (sub) e repassa ao nosso RegistroPresencaController.
O evento bruto é salvo no PostgreSQL como imutável, consolidando o comando único.
Resposta Esperada (HTTP 201 Created): O envelopamento padrão ApiResponse que criamos agirá aqui!
{
  "timestamp": "2026-03-06T18:35:00.123Z",
  "status": 201,
  "message": "Recurso criado com sucesso",
  "payload": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "usuarioId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "statusTecnico": "RECEIVED",
    "statusAdministrativo": "PENDING",
    "recebidoNoServidorEm": "2026-03-06T18:35:00.123"
  },
  "errors": null
}


Exemplo: 
curl -i -X POST "http://localhost:8081/api/v1/presencas" \
     -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJCaEdwUTh6eFgwOXJ0Y1VCajFvQ01uR2t6MHhKSUVBMFFYVnRmOER4STJRIn0.eyJleHAiOjE3NzI4MjYzNzIsImlhdCI6MTc3MjgyNjA3MiwianRpIjoiMDE3MjMwNTMtODM5NS00MDg5LTljNTYtZjBmNDJiOGRkZmUwIiwiaXNzIjoiaHR0cDovL2xvY2FsaG9zdDo4MDgwL3JlYWxtcy9jb3Jwb3JhdGl2byIsInN1YiI6ImY6dm02Y2k2aVpUS21WdFF6Wmp1TTBUZzoxNTAxNzEwMzUxNyIsInR5cCI6IkJlYXJlciIsImF6cCI6ImFjY291bnQiLCJzaWQiOiI3N2Y2ZWY5ZS1jYTM3LTRlNGMtYjFhNy1lZGExZDkxMzc1MzEiLCJhY3IiOiIxIiwicmVzb3VyY2VfYWNjZXNzIjp7ImFjY291bnQiOnsicm9sZXMiOlsibWFuYWdlLWFjY291bnQiLCJtYW5hZ2UtYWNjb3VudC1saW5rcyIsInZpZXctcHJvZmlsZSJdfX0sInNjb3BlIjoicHJvZmlsZSBlbWFpbCIsImVtYWlsX3ZlcmlmaWVkIjpmYWxzZSwibmFtZSI6IkZlcm5hbmRvIEZyYXrDo28gZGEgU2lsdmEiLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiIxNTAxNzEwMzUxNyIsImdpdmVuX25hbWUiOiJGZXJuYW5kbyIsImZhbWlseV9uYW1lIjoiRnJhesOjbyBkYSBTaWx2YSIsImVtYWlsIjoiZmVybmFuZG8uZnJhemFvQHNlYWdyaS5kZi5nb3YuYnIifQ.GbpB0mtffeiDJA2T-HPXH87mfxEKu1mdC9ICHp-aKF7DrNTwBXmKXLYmUengVu6ByXLYokozZb-jG7s5oCzF3YF-EUaYfQpBVgiyfa1f5LLIOJ2EPLDlrb0JjP-Z1kviFzCOzZH8si5d2lziaaFJrxiOiMnicgfungjHpmgnGW7fyqHUoTRcLMcongcCU78WZOFyu5py_lDllXU9TLB64NyyPUf3vhjGTMi_jZPJJXXreE-Qx0DYd6DcavdkEXhP7eFKJkNaSG6Ta1C6E0CWACnR-F1yVQ4MlOQo8KMFR5Fo64CZir9k4mnOa0ZmE6twAc23PYr4K3tnFzh6DJfPAg" \
     -H "Content-Type: application/json" \
     -d '{
           "organizacaoId": "0e533b2f-9542-458e-8495-94f699d22805",
           "unidadeId": "1beca265-61c6-4212-91ce-ae7b525218ed",
           "latitude": -15.7942,
           "longitude": -47.8821,
           "precisaoGps": 12.5,
           "dispositivoId": "moto-g-7-XYZ123",
           "modoRegistro": "SELF",
           "capturadoEm": "2026-03-06T15:30:00"
         }'