#!/usr/bin/env node
/**
 * Baixa os pesos do TinyFaceDetector e do FaceLandmark68Net (face-api.js)
 * para public/models/ — F9 (§18.12).
 *
 * O componente carrega os modelos localmente, via `loadFromUri('/models')`
 * (ver faceDetector.ts) — sem estes arquivos em public/models/, esse
 * carregamento falha (dispara CAMERA_ACCESS_FAILED-like/ERRO na F3). Este
 * script busca os mesmos arquivos oficiais do repositório da face-api.js UMA
 * VEZ, em tempo de desenvolvimento/build; depois disso, o carregamento em
 * produção é inteiramente local, sem nenhuma requisição externa em tempo de
 * execução (necessário para funcionar num ambiente seguro/offline).
 *
 * Uso: node scripts/download-face-models.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = path.resolve(__dirname, '..', 'public', 'models')

const BASE_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights'

const FILES = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
]

async function downloadFile(name) {
  const url = `${BASE_URL}/${name}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Falha ao baixar ${name} de ${url}: HTTP ${response.status}`)
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  await writeFile(path.join(OUTPUT_DIR, name), buffer)
  console.log(`  ✓ ${name} (${buffer.byteLength} bytes)`)
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true })
  console.log(`Baixando modelos da face-api.js para ${OUTPUT_DIR}...`)
  for (const file of FILES) {
    await downloadFile(file)
  }
  console.log('Pronto — os modelos estão disponíveis localmente em public/models/.')
}

main().catch((error) => {
  console.error('Falha ao baixar os modelos da face-api.js:', error.message)
  console.error(
    'Baixe manualmente os 4 arquivos listados em FILES a partir de\n' +
      `  ${BASE_URL}/\n` +
      'e salve-os em public/models/ (ver public/models/README.md).',
  )
  process.exitCode = 1
})
