# Modelos da face-api.js

O `FotografoDeFaces` carrega os modelos de detecção (`TinyFaceDetector`) e de
landmarks (`FaceLandmark68Net`) localmente a partir deste diretório, via
`loadFromUri('/models')` (ver `src/fotografo-de-faces/faceDetector.ts`). Isso
é proposital: o componente precisa funcionar em ambientes seguros/offline,
sem fazer nenhuma requisição externa em tempo de execução (§18.12).

O pacote `face-api.js` no npm **não inclui** os arquivos de peso — eles
precisam ser baixados uma vez, em tempo de desenvolvimento/build, e ficar
versionados/publicados junto com o resto de `public/`.

## Como obter os arquivos

```bash
npm run download:models
```

Isso baixa os 4 arquivos abaixo (script em `scripts/download-face-models.mjs`)
diretamente do repositório oficial da face-api.js:

- `tiny_face_detector_model-weights_manifest.json`
- `tiny_face_detector_model-shard1`
- `face_landmark_68_model-weights_manifest.json`
- `face_landmark_68_model-shard1`

Se a máquina não tiver acesso à internet no momento do build, baixe os mesmos
4 arquivos manualmente em outra máquina (a partir de
`https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/`)
e copie-os para este diretório antes do build/deploy — depois disso, nenhuma
rede é necessária para o componente funcionar.
