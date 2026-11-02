import React, { useEffect, useRef, useState } from 'react';
import {
  CompanionCharacter,
  ExpressionType,
  AlyaAnimationStyle,
  JarvisAnimationStyle,
  CoreParticleStyle,
  AnimationState,
} from '../../types';

interface HolographicAvatarProps {
  character: CompanionCharacter;
  expression?: ExpressionType;
  isSpeaking?: boolean;
  isListening?: boolean;
  isThinking?: boolean;
  isError?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onTap?: () => void;
  className?: string;
  customColor?: string;
  stylePreset?: AlyaAnimationStyle | JarvisAnimationStyle | string;
  particleStyle?: CoreParticleStyle;
  forcedState?: AnimationState;
  showPedestal?: boolean;
  stateBadgeText?: string;
  userName?: string;
}

type Particle = {
  angle: number;
  radiusFactor: number;
  speed: number;
  size: number;
  phase: number;
  tilt: number;
  type: 'heart' | 'petal' | 'star' | 'spark';
  alpha: number;
};

export const HolographicAvatar: React.FC<HolographicAvatarProps> = ({
  character,
  expression = 'normal',
  isSpeaking = false,
  isListening = false,
  isThinking = false,
  isError = false,
  size = 'md',
  onTap,
  className = '',
  customColor,
  stylePreset,
  particleStyle = 'default',
  forcedState,
  showPedestal = true,
  stateBadgeText,
  userName = 'friend',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  const isJarvis = character === 'jarvis';

  const handleInteraction = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setRipples((prev) => [
      ...prev.slice(-2),
      { id: Date.now(), x: e.clientX - rect.left, y: e.clientY - rect.top },
    ]);
    onTap?.();
  };

  const currentState: AnimationState = forcedState
    ? forcedState
    : isSpeaking
    ? 'speaking'
    : isListening
    ? 'listening'
    : isThinking
    ? 'thinking'
    : isError
    ? 'offline'
    : 'idle';

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const isCompactViewport = typeof window !== 'undefined' && window.innerWidth < 500;
    const particleCount = reduced ? 16 : isCompactViewport ? 28 : 42;
    const particles: Particle[] = Array.from({ length: particleCount }, (_, i) => {
      let type: Particle['type'] = 'spark';
      if (particleStyle === 'hearts') {
        type = i % 2 === 0 ? 'heart' : 'spark';
      } else if (particleStyle === 'petals') {
        type = i % 2 === 0 ? 'petal' : 'spark';
      } else if (particleStyle === 'stars') {
        type = i % 2 === 0 ? 'star' : 'spark';
      } else {
        if (!isJarvis) {
          type = i % 3 === 0 ? 'heart' : i % 3 === 1 ? 'petal' : 'star';
        } else {
          type = i % 2 === 0 ? 'star' : 'spark';
        }
      }

      return {
        angle: (i / particleCount) * Math.PI * 2,
        radiusFactor: 0.82 + (i % 6) * 0.08,
        speed: 0.16 + (i % 5) * 0.05,
        size: type === 'heart' ? 3.0 : type === 'petal' ? 2.6 : type === 'star' ? 2.2 : 1.1 + (i % 3) * 0.4,
        phase: i * 0.72,
        tilt: (i % 5 - 2) * 0.22,
        type,
        alpha: 0.4 + Math.random() * 0.5,
      };
    });

    let w = 320;
    let h = 240;
    let time = 0;
    let last = performance.now();
    let visible = !document.hidden;

    const resize = () => {
      const container = canvas.parentElement;
      const rect = container?.getBoundingClientRect();
      const parentW = rect && rect.width > 0 ? rect.width : 320;
      const parentH = rect && rect.height > 0 ? rect.height : 240;
      w = Math.min(Math.max(180, Math.floor(parentW)), 760);
      h = Math.min(Math.max(145, Math.floor(parentH)), 520);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' && canvas.parentElement
        ? new ResizeObserver(() => resize())
        : null;
    if (resizeObserver && canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    const mainHex = customColor || (isJarvis ? '#00e5ff' : '#ff269f');

    const drawCelestialEyeStar = (cx: number, cy: number, r: number, alpha: number) => {
      ctx.save();
      ctx.translate(cx, cy);

      const irisGrad = ctx.createRadialGradient(0, 0, r * 0.15, 0, 0, r * 1.05);
      irisGrad.addColorStop(0, '#ffffff');
      irisGrad.addColorStop(0.3, 'rgba(255, 60, 180, 0.7)');
      irisGrad.addColorStop(0.75, 'rgba(210, 30, 180, 0.28)');
      irisGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = irisGrad;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.05, 0, Math.PI * 2);
      ctx.fill();

      const starScale = isSpeaking ? 1.0 + Math.sin(time * 24) * 0.1 : 1.0;
      const sLen = r * 0.88 * starScale;
      const sThick = r * 0.2 * starScale;

      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -sLen);
      ctx.bezierCurveTo(sThick, -sThick, sThick, -sThick, sLen, 0);
      ctx.bezierCurveTo(sThick, sThick, sThick, sThick, 0, sLen);
      ctx.bezierCurveTo(-sThick, sThick, -sThick, sThick, -sLen, 0);
      ctx.bezierCurveTo(-sThick, -sThick, -sThick, -sThick, 0, -sLen);
      ctx.closePath();
      ctx.fill();

      ctx.save();
      ctx.rotate(Math.PI / 4);
      const subLen = sLen * 0.52;
      const subThick = sThick * 0.42;
      ctx.beginPath();
      ctx.moveTo(0, -subLen);
      ctx.bezierCurveTo(subThick, -subThick, subThick, -subThick, subLen, 0);
      ctx.bezierCurveTo(subThick, subThick, subThick, subThick, 0, subLen);
      ctx.bezierCurveTo(-subThick, subThick, -subThick, subThick, -subLen, 0);
      ctx.bezierCurveTo(-subThick, -subThick, -subThick, -subThick, 0, -subLen);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 230, 250, 0.9)';
      ctx.fill();
      ctx.restore();

      ctx.beginPath();
      ctx.arc(-r * 0.26, -r * 0.3, r * 0.15, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(r * 0.22, r * 0.24, r * 0.08, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fill();

      ctx.restore();
    };

    const drawJarvisArcReactor = (cx: number, cy: number, r: number) => {
      ctx.save();
      ctx.translate(cx, cy);

      ctx.beginPath();
      ctx.arc(0, 0, r * 1.22, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
      ctx.lineWidth = 1.0;
      ctx.stroke();

      for (let deg = 0; deg < 360; deg += 30) {
        const rad = (deg * Math.PI) / 180 + time * 0.2;
        const tickInner = r * 1.16;
        const tickOuter = deg % 90 === 0 ? r * 1.25 : r * 1.21;
        ctx.beginPath();
        ctx.moveTo(Math.cos(rad) * tickInner, Math.sin(rad) * tickInner);
        ctx.lineTo(Math.cos(rad) * tickOuter, Math.sin(rad) * tickOuter);
        ctx.strokeStyle = deg % 90 === 0 ? '#00e5ff' : 'rgba(0, 229, 255, 0.55)';
        ctx.lineWidth = deg % 90 === 0 ? 1.8 : 1.0;
        ctx.stroke();
      }

      for (let b = 0; b < 3; b++) {
        const bStart = (b * Math.PI * 2) / 3 + time * 0.5;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.14, bStart, bStart + 0.6);
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.75)';
        ctx.lineWidth = 2.4;
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 8;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(0, 0, r * 1.05, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.85)';
      ctx.lineWidth = 2.0;
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 10;
      ctx.stroke();

      const coilCount = 10;
      for (let c = 0; c < coilCount; c++) {
        const cAngle = (c / coilCount) * Math.PI * 2 + time * 0.8;
        const cR = r * 0.95;
        const cx1 = Math.cos(cAngle) * cR;
        const cy1 = Math.sin(cAngle) * cR;
        ctx.save();
        ctx.translate(cx1, cy1);
        ctx.rotate(cAngle);
        ctx.fillStyle = 'rgba(0, 229, 255, 0.9)';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 10;
        ctx.fillRect(-2.5, -6, 5, 12);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-1, -4, 2, 8);
        ctx.restore();
      }

      ctx.save();
      ctx.rotate(-time * 1.4);
      ctx.setLineDash([7, 5, 2, 5]);
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.76, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(180, 245, 255, 0.95)';
      ctx.lineWidth = 2.2;
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 14;
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.rotate(time * 0.4);
      const hexR = r * 0.52;
      ctx.beginPath();
      for (let h = 0; h < 6; h++) {
        const hAngle = (h * Math.PI) / 3;
        const hx = Math.cos(hAngle) * hexR;
        const hy = Math.sin(hAngle) * hexR;
        if (h === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.65)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.restore();

      const coreGrad = ctx.createRadialGradient(0, 0, r * 0.08, 0, 0, r * 0.58);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.25, 'rgba(180, 250, 255, 0.98)');
      coreGrad.addColorStop(0.55, 'rgba(0, 210, 255, 0.75)');
      coreGrad.addColorStop(0.85, 'rgba(0, 120, 240, 0.45)');
      coreGrad.addColorStop(1, 'rgba(0, 50, 180, 0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.58, 0, Math.PI * 2);
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 28;
      ctx.fill();

      ctx.save();
      ctx.rotate(time * 0.15);
      const crossR = r * 0.36;
      ctx.beginPath();
      ctx.moveTo(-crossR, 0);
      ctx.lineTo(-r * 0.12, 0);
      ctx.moveTo(r * 0.12, 0);
      ctx.lineTo(crossR, 0);
      ctx.moveTo(0, -crossR);
      ctx.lineTo(0, -r * 0.12);
      ctx.moveTo(0, r * 0.12);
      ctx.lineTo(0, crossR);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      ctx.beginPath();
      ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 20;
      ctx.fill();

      ctx.restore();
    };

    const drawHeart = (x: number, y: number, s: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      const topCurveHeight = s * 0.3;
      ctx.moveTo(0, topCurveHeight);
      ctx.bezierCurveTo(-s / 2, -s / 2, -s, topCurveHeight / 3, 0, s);
      ctx.bezierCurveTo(s, topCurveHeight / 3, s / 2, -s / 2, 0, topCurveHeight);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const drawPetal = (x: number, y: number, s: number, angle: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 1.5, s * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const draw3DGlowCrown = (
      radius: number,
      rotX: number,
      rotY: number,
      rotZ: number,
      strokeColor: string,
      lineWidth: number,
      drawPhoton = true,
      photonSpeed = 1,
      dashPattern?: number[],
      tickMarks = false,
      nodesCount = 0
    ) => {
      const steps = isCompactViewport ? 56 : 72;
      const points: { x: number; y: number; z: number; scale: number }[] = [];
      const fov = 340;
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      const cosZ = Math.cos(rotZ), sinZ = Math.sin(rotZ);

      for (let i = 0; i <= steps; i++) {
        const theta = (i / steps) * Math.PI * 2;
        const px = radius * Math.cos(theta);
        const py = radius * Math.sin(theta);
        const pz = 0;

        const x1 = px * cosZ - py * sinZ;
        const y1 = px * sinZ + py * cosZ;
        const z1 = pz;

        const x2 = x1 * cosY + z1 * sinY;
        const y2 = y1;
        const z2 = -x1 * sinY + z1 * cosY;

        const x3 = x2;
        const y3 = y2 * cosX - z2 * sinX;
        const z3 = y2 * sinX + z2 * cosX;

        const scale = fov / (fov + z3);
        points.push({ x: x3 * scale, y: y3 * scale, z: z3, scale });
      }

      ctx.save();
      if (dashPattern) ctx.setLineDash(dashPattern);
      ctx.beginPath();
      for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.closePath();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      ctx.shadowColor = mainHex;
      ctx.shadowBlur = 10;
      ctx.stroke();

      if (tickMarks) {
        ctx.setLineDash([]);
        const tickIndices = [0, Math.floor(steps * 0.25), Math.floor(steps * 0.5), Math.floor(steps * 0.75)];
        for (const idx of tickIndices) {
          const pt = points[idx];
          if (pt) {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 1.8 * pt.scale, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 8;
            ctx.fill();
          }
        }
      }

      if (nodesCount > 0) {
        ctx.setLineDash([]);
        for (let n = 0; n < nodesCount; n++) {
          const nodeIdx = Math.floor((n / nodesCount) * steps);
          const pt = points[nodeIdx];
          if (pt) {
            const isFront = pt.z > 0;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, (isFront ? 2.4 : 1.6) * pt.scale, 0, Math.PI * 2);
            ctx.fillStyle = isJarvis ? 'rgba(0, 240, 255, 0.95)' : 'rgba(255, 120, 210, 0.95)';
            ctx.shadowColor = mainHex;
            ctx.shadowBlur = isFront ? 10 : 4;
            ctx.fill();
          }
        }
      }

      if (drawPhoton) {
        ctx.setLineDash([]);
        const photonIdx = Math.floor((((time * 1.5 * photonSpeed) % 1 + 1) % 1) * steps);
        const pt = points[(photonIdx + steps) % steps];
        if (pt) {
          const isFront = pt.z > 0;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, (isFront ? 3.4 : 2.2) * pt.scale, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = isFront ? 14 : 6;
          ctx.fill();

          const trailIdx = (photonIdx - 2 + steps) % steps;
          const trPt = points[trailIdx];
          if (trPt) {
            ctx.beginPath();
            ctx.arc(trPt.x, trPt.y, 1.8 * trPt.scale, 0, Math.PI * 2);
            ctx.fillStyle = strokeColor;
            ctx.shadowBlur = 6;
            ctx.fill();
          }
        }
      }
      ctx.restore();
    };

    const render = (now: number) => {
      if (!visible) return;
      const dt = Math.min(50, now - last);
      last = now;
      time += reduced ? 0.003 : dt * 0.0001;

      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h * 0.42;

      let stateScale = 1.0;
      let speedFactor = 1.0;
      let glowMultiplier = 1.0;
      let speakingBlink = 1.0;

      switch (currentState) {
        case 'listening':
          stateScale = 1.06 + Math.sin(time * 10) * 0.03;
          speedFactor = 1.1;
          glowMultiplier = 1.35;
          break;
        case 'thinking':
          stateScale = 1.03;
          speedFactor = 2.6;
          glowMultiplier = 1.3;
          break;
        case 'speaking':
          stateScale = 1.05 + Math.sin(time * 18) * 0.035;
          speedFactor = 1.7;
          speakingBlink = 0.85 + Math.sin(time * 26) * 0.15;
          glowMultiplier = 1.4;
          break;
        case 'processing':
          stateScale = 1.03;
          speedFactor = 2.0;
          glowMultiplier = 1.25;
          break;
        case 'responding':
          stateScale = 1.1;
          speedFactor = 1.5;
          glowMultiplier = 1.5;
          break;
        case 'offline':
          stateScale = 0.94;
          speedFactor = 0.4;
          glowMultiplier = 0.4;
          break;
        case 'idle':
        default:
          stateScale = 1.0 + Math.sin(time * 3.2) * 0.02;
          speedFactor = 1.0;
          glowMultiplier = 1.0;
          break;
      }

      const minDim = Math.min(w, h);
      const baseR = Math.max(42, Math.min(minDim * 0.21, 102)) * stateScale;

      if (showPedestal) {
        const pedY = h * 0.85;
        const pedRx = Math.min(w * 0.34, baseR * 2.2, 230);
        const pedRy = pedRx * 0.21;
        ctx.save();
        const beamCount = 9;
        for (let b = 0; b < beamCount; b++) {
          const bAngle = (b / beamCount) * Math.PI * 2 + time * 0.15;
          const bx = cx + Math.cos(bAngle) * pedRx * 0.82;
          const by = pedY + Math.sin(bAngle) * pedRy * 0.82;
          const beamGrad = ctx.createLinearGradient(bx, by, cx, cy);
          beamGrad.addColorStop(0, isJarvis ? 'rgba(0, 229, 255, 0.22)' : 'rgba(255, 38, 159, 0.25)');
          beamGrad.addColorStop(0.5, isJarvis ? 'rgba(0, 229, 255, 0.04)' : 'rgba(255, 38, 159, 0.05)');
          beamGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(cx + (bx - cx) * 0.2, cy + baseR * 0.9);
          ctx.strokeStyle = beamGrad;
          ctx.lineWidth = 1.0;
          ctx.stroke();
        }

        for (let rIdx = 0; rIdx < 3; rIdx++) {
          const curRx = pedRx * (0.65 + rIdx * 0.18);
          const curRy = pedRy * (0.65 + rIdx * 0.18);
          ctx.beginPath();
          ctx.ellipse(cx, pedY, curRx, curRy, 0, 0, Math.PI * 2);
          ctx.strokeStyle = isJarvis
            ? `rgba(0, 229, 255, ${0.4 - rIdx * 0.1})`
            : `rgba(255, 38, 159, ${0.45 - rIdx * 0.1})`;
          ctx.lineWidth = rIdx === 1 ? 1.6 : 1.0;
          ctx.shadowColor = mainHex;
          ctx.shadowBlur = 8;
          ctx.stroke();
        }
        ctx.restore();
      }

      const bloomRadius = baseR * 1.8;
      const bloomGrad = ctx.createRadialGradient(cx, cy, baseR * 0.2, cx, cy, bloomRadius);
      bloomGrad.addColorStop(0, isJarvis ? `rgba(0, 229, 255, ${0.28 * glowMultiplier})` : `rgba(255, 38, 159, ${0.3 * glowMultiplier})`);
      bloomGrad.addColorStop(0.35, isJarvis ? `rgba(0, 150, 255, ${0.1 * glowMultiplier})` : `rgba(220, 40, 190, ${0.11 * glowMultiplier})`);
      bloomGrad.addColorStop(0.7, isJarvis ? 'rgba(40, 70, 200, 0.025)' : 'rgba(150, 20, 160, 0.03)');
      bloomGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = bloomGrad;
      ctx.fillRect(cx - bloomRadius, cy - bloomRadius, bloomRadius * 2, bloomRadius * 2);

      ctx.save();
      ctx.translate(cx, cy);

      const crown1RotX = 0.28 + Math.sin(time * 0.7 * speedFactor) * 0.12;
      const crown1RotY = time * 1.15 * speedFactor;
      const crown1RotZ = Math.sin(time * 0.5 * speedFactor) * 0.15;
      draw3DGlowCrown(
        baseR * 1.18,
        crown1RotX,
        crown1RotY,
        crown1RotZ,
        isJarvis ? 'rgba(0, 229, 255, 0.82)' : 'rgba(255, 38, 159, 0.82)',
        1.4,
        true,
        1.3,
        [14, 8, 4, 8],
        true,
        4
      );

      const crown2RotX = time * 0.95 * speedFactor;
      const crown2RotY = 0.35 + Math.sin(time * 0.4 * speedFactor) * 0.18;
      const crown2RotZ = time * 0.45 * speedFactor;
      draw3DGlowCrown(
        baseR * 1.30,
        crown2RotX,
        crown2RotY,
        crown2RotZ,
        isJarvis ? 'rgba(0, 195, 255, 0.7)' : 'rgba(235, 60, 210, 0.72)',
        1.3,
        true,
        -1.4,
        [20, 10],
        true,
        4
      );

      const crown3RotX = -time * 0.85 * speedFactor;
      const crown3RotY = -time * 1.05 * speedFactor;
      const crown3RotZ = Math.PI / 4 + time * 0.35 * speedFactor;
      draw3DGlowCrown(
        baseR * 1.44,
        crown3RotX,
        crown3RotY,
        crown3RotZ,
        isJarvis ? 'rgba(0, 245, 255, 0.6)' : 'rgba(255, 110, 205, 0.65)',
        1.2,
        true,
        1.6,
        undefined,
        false,
        6
      );

      for (const p of particles) {
        p.angle += p.speed * speedFactor * (reduced ? 0.08 : dt * 0.001);
        const floatWave = Math.sin(time * 2.8 + p.phase) * 0.04;
        const curR = baseR * (p.radiusFactor + floatWave);
        const px = Math.cos(p.angle) * curR;
        const py = Math.sin(p.angle) * curR * (0.58 + p.tilt * 0.2);
        const pAlpha = p.alpha * (0.6 + 0.4 * Math.sin(time * 3 + p.phase)) * speakingBlink;

        ctx.save();
        ctx.translate(px, py);
        if (p.type === 'heart') {
          ctx.fillStyle = `rgba(255, 120, 205, ${pAlpha})`;
          ctx.shadowColor = mainHex;
          ctx.shadowBlur = 6;
          drawHeart(0, -p.size * 0.3, p.size);
        } else if (p.type === 'petal') {
          ctx.fillStyle = `rgba(255, 160, 225, ${pAlpha})`;
          ctx.shadowColor = mainHex;
          ctx.shadowBlur = 6;
          drawPetal(0, 0, p.size, p.angle + Math.PI / 4);
        } else if (p.type === 'star') {
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = mainHex;
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fillStyle = isJarvis ? `rgba(180, 240, 255, ${pAlpha})` : `rgba(255, 210, 245, ${pAlpha})`;
          ctx.shadowColor = mainHex;
          ctx.shadowBlur = 4;
          ctx.fill();
        }
        ctx.restore();
      }

      const coreR = baseR * 0.52;
      if (isJarvis) {
        drawJarvisArcReactor(0, 0, coreR);
        if (isSpeaking) {
          ctx.save();
          ctx.beginPath();
          for (let a = 0; a < Math.PI * 2; a += 0.1) {
            const waveDist = coreR * 0.85 + Math.sin(a * 8 + time * 30) * 4.5;
            const wx = Math.cos(a) * waveDist;
            const wy = Math.sin(a) * waveDist;
            a === 0 ? ctx.moveTo(wx, wy) : ctx.lineTo(wx, wy);
          }
          ctx.closePath();
          ctx.strokeStyle = '#00e5ff';
          ctx.lineWidth = 1.5;
          ctx.shadowColor = '#00e5ff';
          ctx.shadowBlur = 12;
          ctx.stroke();
          ctx.restore();
        }
      } else {
        const shellGrad = ctx.createRadialGradient(-coreR * 0.25, -coreR * 0.28, coreR * 0.08, 0, 0, coreR * 1.04);
        shellGrad.addColorStop(0, 'rgba(255, 255, 255, 0.42)');
        shellGrad.addColorStop(0.35, 'rgba(255, 70, 180, 0.15)');
        shellGrad.addColorStop(0.82, 'rgba(220, 20, 140, 0.24)');
        shellGrad.addColorStop(1, 'rgba(0, 0, 0, 0.03)');
        ctx.beginPath();
        ctx.arc(0, 0, coreR * 1.04, 0, Math.PI * 2);
        ctx.fillStyle = shellGrad;
        ctx.shadowColor = mainHex;
        ctx.shadowBlur = 22 * glowMultiplier;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(0, 0, coreR * 1.02, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        const innerSphereR = coreR * 0.92;
        const innerGrad = ctx.createRadialGradient(-innerSphereR * 0.26, -innerSphereR * 0.3, innerSphereR * 0.04, 0, 0, innerSphereR);
        innerGrad.addColorStop(0, '#ffffff');
        innerGrad.addColorStop(0.18, 'rgba(255, 213, 240, 0.85)');
        innerGrad.addColorStop(0.5, 'rgba(255, 53, 168, 0.45)');
        innerGrad.addColorStop(0.8, 'rgba(214, 0, 126, 0.25)');
        innerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.beginPath();
        ctx.arc(0, 0, innerSphereR, 0, Math.PI * 2);
        ctx.fillStyle = innerGrad;
        ctx.shadowColor = mainHex;
        ctx.shadowBlur = 24 * glowMultiplier;
        ctx.fill();

        if (isSpeaking) {
          ctx.save();
          ctx.beginPath();
          for (let a = 0; a < Math.PI * 2; a += 0.1) {
            const waveDist = innerSphereR * 0.78 + Math.sin(a * 6 + time * 28) * 4.0;
            const wx = Math.cos(a) * waveDist;
            const wy = Math.sin(a) * waveDist;
            a === 0 ? ctx.moveTo(wx, wy) : ctx.lineTo(wx, wy);
          }
          ctx.closePath();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 10;
          ctx.stroke();
          ctx.restore();
        }

        drawCelestialEyeStar(0, 0, innerSphereR * 0.46, speakingBlink);

        ctx.save();
        ctx.beginPath();
        ctx.ellipse(-innerSphereR * 0.32, -innerSphereR * 0.38, innerSphereR * 0.26, innerSphereR * 0.11, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();
      frameRef.current = requestAnimationFrame(render);
    };

    frameRef.current = requestAnimationFrame(render);

    const onVisibility = () => {
      visible = !document.hidden;
      if (visible) {
        last = performance.now();
        frameRef.current = requestAnimationFrame(render);
      } else if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('resize', resize);
      if (resizeObserver) resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [character, currentState, customColor, stylePreset, particleStyle, showPedestal]);

  const badgeLabel = stateBadgeText
    ? stateBadgeText
    : isJarvis
    ? 'Hello, I am Jarvis ⚡'
    : 'Hello, I am Alya 🌸';

  const sizeClasses =
    size === 'sm'
      ? 'h-[135px] sm:h-[165px] max-w-[220px]'
      : size === 'md'
      ? 'h-[175px] sm:h-[220px] md:h-[250px] max-w-[300px]'
      : 'w-full h-full min-h-[145px] max-h-[255px] sm:max-h-[340px] md:max-h-[420px] lg:max-h-[480px] max-w-[340px] sm:max-w-[440px] md:max-w-[540px]';

  return (
    <div
      onClick={handleInteraction}
      className={`relative mx-auto flex flex-col items-center justify-center cursor-pointer group select-none ${sizeClasses} ${className}`}
      title={`${isJarvis ? 'Jarvis' : 'Alya'} Holographic AI Core • Tap to interact`}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain pointer-events-none transition-transform duration-700 group-hover:scale-[1.01]"
      />

      {ripples.map((rip) => (
        <span
          key={rip.id}
          className={`absolute rounded-full pointer-events-none border animate-[coreRipple_900ms_ease-out_forwards] ${
            isJarvis ? 'border-cyan-300 bg-cyan-300/10' : 'border-pink-300 bg-pink-300/10'
          }`}
          style={{
            left: rip.x - 32,
            top: rip.y - 32,
            width: 64,
            height: 64,
          }}
        />
      ))}

      <div
        className={`absolute bottom-1 sm:bottom-2 px-3 sm:px-3.5 py-1 rounded-full text-[10px] sm:text-[11px] font-mono tracking-wide border shadow-lg backdrop-blur-xl transition-all duration-300 ${
          isJarvis
            ? 'bg-[#020d18]/85 border-cyan-400/40 text-cyan-200 shadow-[0_0_20px_rgba(0,210,255,0.25)]'
            : 'bg-[#1a0212]/85 border-pink-400/40 text-pink-200 shadow-[0_0_20px_rgba(255,38,159,0.25)]'
        }`}
      >
        <span className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
              currentState === 'speaking'
                ? 'bg-emerald-400 animate-ping'
                : currentState === 'listening'
                ? 'bg-rose-400 animate-ping'
                : currentState === 'thinking' || currentState === 'processing'
                ? 'bg-cyan-400 animate-pulse'
                : currentState === 'responding'
                ? 'bg-amber-400 animate-bounce'
                : isJarvis
                ? 'bg-cyan-400'
                : 'bg-pink-400 animate-pulse'
            }`}
          />
          <span className="font-semibold whitespace-nowrap">{badgeLabel}</span>
        </span>
      </div>
    </div>
  );
};
