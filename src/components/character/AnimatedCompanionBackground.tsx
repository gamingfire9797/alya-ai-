import React, { useEffect, useRef } from 'react';
import { CompanionCharacter } from '../../types';

interface AnimatedCompanionBackgroundProps {
  character: CompanionCharacter;
}

type ShootingStar = {
  x: number;
  y: number;
  length: number;
  speed: number;
  size: number;
  color: string;
  alpha: number;
  active: boolean;
};

type FloatingPetal = {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  angle: number;
  rotSpeed: number;
  flutterSpeed: number;
  phase: number;
  alpha: number;
  colorType: number;
};

export const AnimatedCompanionBackground: React.FC<AnimatedCompanionBackgroundProps> = ({ character }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    const isJarvis = character === 'jarvis';

    let width = 1;
    let height = 1;
    let time = 0;
    let last = performance.now();
    let visible = !document.hidden;

    const stars = Array.from({ length: 110 }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      r: i % 8 === 0 ? 1.6 + Math.random() * 1.4 : 0.35 + Math.random() * 0.9,
      a: 0.15 + Math.random() * 0.65,
      phase: Math.random() * Math.PI * 2,
      speed: 0.2 + Math.random() * 0.6,
      depth: 0.3 + Math.random() * 0.7,
      isBigStar: i % 12 === 0,
      twinkleSpeed: 1.5 + Math.random() * 2.5,
    }));

    const shootingStars: ShootingStar[] = [];
    const colors = isJarvis
      ? ['#00e5ff', '#ffffff', '#ffd226', '#3b82f6']
      : ['#ff269f', '#ffffff', '#ff94e8', '#c084fc', '#ffd226'];

    const petalCount = 34;
    const petals: FloatingPetal[] = Array.from({ length: petalCount }, (_, i) => ({
      x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 600),
      y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
      size: 5.5 + Math.random() * 5.0,
      speedY: 0.55 + Math.random() * 0.85,
      speedX: -0.25 + Math.random() * 0.55,
      angle: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.025,
      flutterSpeed: 0.018 + Math.random() * 0.025,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.35 + Math.random() * 0.45,
      colorType: i % 3,
    }));

    let lastMeteorSpawn = performance.now();
    const spawnShootingStar = (now: number) => {
      if (now - lastMeteorSpawn > 1800 + Math.random() * 2000) {
        lastMeteorSpawn = now;
        const color = colors[Math.floor(Math.random() * colors.length)];
        shootingStars.push({
          x: Math.random() * width * 0.75 - width * 0.1,
          y: Math.random() * height * 0.35 - height * 0.1,
          length: 60 + Math.random() * 120,
          speed: 9 + Math.random() * 7,
          size: 1.2 + Math.random() * 1.6,
          color,
          alpha: 1.0,
          active: true,
        });
      }
    };

    const resize = () => {
      width = Math.max(1, window.innerWidth);
      height = Math.max(1, window.innerHeight);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();

    const drawGlow = (x: number, y: number, radius: number, inner: string, outer: string) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
      g.addColorStop(0, inner);
      g.addColorStop(0.35, outer);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    };

    const render = (now: number) => {
      if (!visible) return;
      const dt = Math.min(50, now - last);
      last = now;
      time += reduced ? 0.004 : dt * 0.00006;

      ctx.clearRect(0, 0, width, height);

      const base = ctx.createLinearGradient(0, 0, 0, height);
      if (isJarvis) {
        base.addColorStop(0, '#020610');
        base.addColorStop(0.5, '#020409');
        base.addColorStop(1, '#010204');
      } else {
        base.addColorStop(0, '#08010b');
        base.addColorStop(0.5, '#040106');
        base.addColorStop(1, '#020004');
      }
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, width, height);

      const cx = width * 0.5;
      const cy = height * 0.44;
      const scale = Math.min(width, height);
      const auraBreath = 1 + Math.sin(time * 2.8) * 0.08;

      drawGlow(
        cx,
        cy,
        scale * 0.52 * auraBreath,
        isJarvis ? 'rgba(0, 200, 255, 0.08)' : 'rgba(255, 38, 159, 0.09)',
        isJarvis ? 'rgba(0, 100, 255, 0.02)' : 'rgba(180, 20, 150, 0.02)'
      );

      for (const p of stars) {
        const drift = reduced ? 0 : Math.sin(time * p.speed + p.phase) * 0.004 * p.depth;
        const x = ((p.x + drift + 1) % 1) * width;
        const y = p.y * height;
        const twinkle = 0.5 + 0.5 * Math.sin(time * p.twinkleSpeed * 10 + p.phase);
        const alpha = p.a * twinkle;

        if (p.isBigStar) {
          ctx.save();
          ctx.translate(x, y);
          ctx.beginPath();
          ctx.arc(0, 0, p.r * 1.1, 0, Math.PI * 2);
          ctx.fillStyle = isJarvis ? `rgba(200, 245, 255, ${alpha})` : `rgba(255, 220, 245, ${alpha})`;
          ctx.shadowColor = isJarvis ? '#00e5ff' : '#ff269f';
          ctx.shadowBlur = 8;
          ctx.fill();

          const spikeLen = p.r * 3.5 * twinkle;
          ctx.beginPath();
          ctx.moveTo(-spikeLen, 0);
          ctx.lineTo(spikeLen, 0);
          ctx.moveTo(0, -spikeLen);
          ctx.lineTo(0, spikeLen);
          ctx.strokeStyle = isJarvis ? `rgba(200, 245, 255, ${alpha * 0.7})` : `rgba(255, 220, 245, ${alpha * 0.7})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(x, y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = isJarvis ? `rgba(180, 235, 255, ${alpha})` : `rgba(255, 195, 235, ${alpha})`;
          ctx.fill();
        }
      }

      spawnShootingStar(now);

      const angleRad = Math.PI / 4 + 0.15;
      const dx = Math.cos(angleRad);
      const dy = Math.sin(angleRad);

      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i];
        if (!s.active) {
          shootingStars.splice(i, 1);
          continue;
        }

        s.x += dx * s.speed;
        s.y += dy * s.speed;
        s.alpha -= 0.012;

        if (s.alpha <= 0 || s.x > width + 100 || s.y > height + 100) {
          s.active = false;
          continue;
        }

        const tailX = s.x - dx * s.length;
        const tailY = s.y - dy * s.length;

        const grad = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        grad.addColorStop(0.7, s.color);
        grad.addColorStop(1, '#ffffff');

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(s.x, s.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = s.size;
        ctx.lineCap = 'round';
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 10;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * 1.4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.restore();
      }

      for (const p of petals) {
        p.y += p.speedY;
        p.angle += p.rotSpeed;
        p.phase += p.flutterSpeed;
        p.x += Math.sin(p.phase) * 0.75 + p.speedX;

        if (p.y > height + 25) {
          p.y = -25;
          p.x = Math.random() * width;
        }
        if (p.x < -30) p.x = width + 20;
        if (p.x > width + 30) p.x = -20;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);

        if (isJarvis) {
          const s = p.size * 0.45;
          ctx.beginPath();
          ctx.rect(-s * 0.5, -s * 0.5, s, s);
          ctx.fillStyle = `rgba(0, 229, 255, ${p.alpha * 0.75})`;
          ctx.shadowColor = '#00e5ff';
          ctx.shadowBlur = 8;
          ctx.fill();
        } else {
          ctx.scale(Math.cos(p.phase), 1);
          const pw = p.size * 0.75;
          const ph = p.size * 1.45;

          ctx.beginPath();
          ctx.moveTo(0, ph * 0.5);
          ctx.bezierCurveTo(-pw, ph * 0.2, -pw * 0.88, -ph * 0.3, -pw * 0.35, -ph * 0.5);
          ctx.lineTo(0, -ph * 0.32);
          ctx.lineTo(pw * 0.35, -ph * 0.5);
          ctx.bezierCurveTo(pw * 0.88, -ph * 0.3, pw, ph * 0.2, 0, ph * 0.5);
          ctx.closePath();

          const grad = ctx.createLinearGradient(0, -ph * 0.5, 0, ph * 0.5);
          if (p.colorType === 0) {
            grad.addColorStop(0, `rgba(255, 230, 242, ${p.alpha})`);
            grad.addColorStop(0.65, `rgba(255, 140, 200, ${p.alpha * 0.9})`);
            grad.addColorStop(1, `rgba(240, 70, 160, ${p.alpha * 0.75})`);
          } else if (p.colorType === 1) {
            grad.addColorStop(0, `rgba(255, 245, 250, ${p.alpha})`);
            grad.addColorStop(0.6, `rgba(255, 180, 220, ${p.alpha * 0.85})`);
            grad.addColorStop(1, `rgba(255, 110, 180, ${p.alpha * 0.65})`);
          } else {
            grad.addColorStop(0, `rgba(255, 215, 235, ${p.alpha * 0.95})`);
            grad.addColorStop(1, `rgba(255, 95, 175, ${p.alpha * 0.8})`);
          }
          ctx.fillStyle = grad;
          ctx.shadowColor = 'rgba(255, 105, 180, 0.4)';
          ctx.shadowBlur = 5;
          ctx.fill();
        }
        ctx.restore();
      }

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
    window.addEventListener('resize', resize);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', resize);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [character]);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0 select-none" />;
};
