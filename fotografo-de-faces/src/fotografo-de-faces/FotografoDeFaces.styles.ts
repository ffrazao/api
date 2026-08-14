/**
 * Estilos visuais do FotografoDeFaces via styled-components — F4/F8.
 *
 * §20.10: o componente nunca aceita/expõe width/height/cameraWidth/
 * cameraHeight — `Root` sempre preenche 100% do contêiner que a aplicação
 * hospedeira disponibilizar; quem decide o tamanho é sempre o pai.
 *
 * F8 (WCAG 2.2 AA): `Root` não corta mais conteúdo (`overflow: hidden` foi
 * para `VideoClip`, que envolve só vídeo/molduras) — um anel de foco em um
 * botão próximo da borda não pode ser cortado (§2.4.11). Cores de texto usam
 * painéis sólidos (nunca semitransparentes) atrás para garantir contraste
 * independente do que estiver passando no vídeo (§1.4.3) — valores
 * verificados em a11y.test.ts via A11Y_COLORS.
 */
import styled, { css } from 'styled-components'
import { A11Y_COLORS } from './presentation'

/** §2.4.7/§2.4.11/§2.4.13 (AAA opcional): anel de foco em duas cores — uma das
 * duas sempre contrasta ≥3:1 com o que estiver atrás, claro ou escuro. */
const focusRing = css`
  &:focus-visible {
    outline: 3px solid ${A11Y_COLORS.focusOutline};
    outline-offset: 2px;
    box-shadow: 0 0 0 5px ${A11Y_COLORS.focusHalo};
  }
`

/** §2.5.8: alvo interativo mínimo de 24×24px CSS — usamos 44×44 por margem de segurança. */
const minTargetSize = css`
  min-width: 44px;
  min-height: 44px;
`

export const Root = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  background: #111;
  border-radius: 8px;
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
`

/** Envelope que corta vídeo/molduras nas bordas arredondadas — nunca controles interativos (§2.4.11). */
export const VideoClip = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: 8px;
`

/**
 * §17.10 (F9): espelha o preview só visualmente no modo autorretrato, para a
 * experiência natural de selfie. É puramente CSS — não afeta em nada o que
 * `drawImage()` lê do elemento (ver imageProcessor.ts), então a fotografia
 * final produzida nunca sai espelhada (§17.9), sem precisar desfazer nada.
 */
export const Video = styled.video<{ $mirrored?: boolean }>`
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #000;
  transform: ${(props) => (props.$mirrored ? 'scaleX(-1)' : 'none')};
`

export const OverlayLayer = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
`

/** Guia oval estática para ajudar o posicionamento do rosto (§02.1 item 4, §20.4). */
export const FramingGuideOval = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 55%;
  height: 78%;
  transform: translate(-50%, -50%);
  border: 2px dashed rgba(255, 255, 255, 0.75);
  border-radius: 50%;
`

/**
 * Moldura sobre a face detectada, colorida conforme o estado (§07.9, §14.11).
 * A sombra escura adicional é uma mitigação de design (não uma garantia
 * matemática) para permanecer perceptível contra qualquer conteúdo de vídeo.
 */
export const FaceFrameOval = styled.div<{ $color: string }>`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 52%;
  height: 74%;
  transform: translate(-50%, -50%);
  border: 4px solid ${(props) => props.$color};
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.6);
  transition: border-color 200ms ease;
`

/**
 * Moldura posicionada sobre uma face específica — usada no quiosque (F6),
 * onde várias faces podem estar visíveis ao mesmo tempo (§09.6).
 *
 * §07.9.1 item 2: as faces NÃO travadas recebem uma moldura "fina e discreta"
 * (`$thin`), para que a candidata protegida pelo Face Lock continue sendo o
 * único elemento visualmente dominante da cena. A diferença é de espessura e
 * de opacidade — a cor amarela das secundárias já é a mesma da detecção
 * passiva (§09.1).
 */
export const FaceFrameBox = styled.div<{ $color: string; $thin?: boolean }>`
  position: absolute;
  border: ${(props) => (props.$thin ? '1px' : '3px')} solid ${(props) => props.$color};
  opacity: ${(props) => (props.$thin ? 0.7 : 1)};
  border-radius: 8px;
  box-sizing: border-box;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.6);
  transition:
    border-color 200ms ease,
    left 120ms ease,
    top 120ms ease,
    width 120ms ease,
    height 120ms ease;
`

export const Countdown = styled.div`
  position: absolute;
  top: 12px;
  right: 12px;
  min-width: 24px;
  min-height: 24px;
  padding: 4px 10px;
  border-radius: 999px;
  background: ${A11Y_COLORS.panelBackground};
  color: ${A11Y_COLORS.textOnPanel};
  font-weight: 700;
  font-size: 18px;
  line-height: 1.4;
  text-align: center;
`

/** §2.4.7/§2.5.8 — também é um alvo interativo focável (F8), então recebe o mesmo anel de foco. */
export const FullscreenButton = styled.button`
  position: absolute;
  top: 12px;
  left: 12px;
  ${minTargetSize}
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: ${A11Y_COLORS.panelBackground};
  color: ${A11Y_COLORS.textOnPanel};
  cursor: pointer;
  pointer-events: auto;
  font-size: 18px;
  line-height: 1;
  ${focusRing}
`

/**
 * Agrupa mensagem e controles na parte inferior em fluxo normal (flex), em
 * vez de várias camadas absolutas na mesma coordenada — é o que impede a
 * barra de mensagem de sobrepor/ocultar o botão em foco (§2.4.11).
 */
export const BottomBar = styled.div`
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  pointer-events: none;
`

export const MessageBar = styled.p<{ $visuallyHidden?: boolean }>`
  margin: 0;
  text-align: center;
  font-size: 14px;
  line-height: 1.4;

  ${(props) =>
    props.$visuallyHidden
      ? css`
          position: absolute;
          width: 1px;
          height: 1px;
          margin: -1px;
          padding: 0;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        `
      : css`
          padding: 4px 12px;
          border-radius: 8px;
          background: ${A11Y_COLORS.panelBackground};
          color: ${A11Y_COLORS.textOnPanel};
          pointer-events: none;
        `}
`

export const CaptureButton = styled.button`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 3px solid #fff;
  background: rgba(255, 255, 255, 0.2);
  pointer-events: auto;
  cursor: pointer;
  flex-shrink: 0;
  ${focusRing}

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
`

/** Painel das ações de revisão — Trocar/Limpar/Confirmar/Cancelar (§04.13, §13.5, F5). */
export const ReviewActions = styled.div`
  display: flex;
  justify-content: center;
  gap: 10px;
  pointer-events: auto;
`

export const ReviewButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  ${minTargetSize}
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 18px;
  border: none;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  background: ${(props) =>
    props.$variant === 'primary' ? A11Y_COLORS.reviewPrimaryBackground : A11Y_COLORS.reviewSecondaryBackground};
  color: ${(props) => (props.$variant === 'primary' ? A11Y_COLORS.reviewPrimaryText : A11Y_COLORS.reviewSecondaryText)};
  ${focusRing}
`
