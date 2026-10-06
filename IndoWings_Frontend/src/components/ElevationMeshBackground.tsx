import React, { useEffect, useRef, useState } from 'react';

interface ElevationMeshBackgroundProps {
  className?: string;
}

interface GridPoint {
  x: number;
  y: number;
  z: number;
  targetZ: number;
}

export const ElevationMeshBackground: React.FC<ElevationMeshBackgroundProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: -1000, y: -1000, active: false });
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number; active: boolean }>({ x: -1000, y: -1000, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    const SPACING = 54; // Minimal spacious grid
    const INFLUENCE_RADIUS = 150; // Focused subtle radius
    const MAX_LIFT = 16; // Elegant subtle lift
    const SPRING_FACTOR = 0.09; // Smooth butter easing

    let cols = 0;
    let rows = 0;
    let points: GridPoint[][] = [];

    const initGrid = () => {
      const rect = container.getBoundingClientRect();
      width = rect.width;
      height = rect.height;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      cols = Math.ceil(width / SPACING) + 2;
      rows = Math.ceil(height / SPACING) + 2;

      points = [];
      for (let r = 0; r < rows; r++) {
        const row: GridPoint[] = [];
        for (let c = 0; c < cols; c++) {
          row.push({
            x: (c - 0.5) * SPACING,
            y: (r - 0.5) * SPACING,
            z: 0,
            targetZ: 0,
          });
        }
        points.push(row);
      }
    };

    initGrid();

    const handleResize = () => {
      initGrid();
    };

    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      mouseRef.current = { x, y, active: true };
      setCursorPos({ x, y, active: true });
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000, active: false };
      setCursorPos({ x: -1000, y: -1000, active: false });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!e.touches.length) return;
      const rect = container.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;
      mouseRef.current = { x, y, active: true };
      setCursorPos({ x, y, active: true });
    };

    const handleTouchEnd = () => {
      mouseRef.current = { x: -1000, y: -1000, active: false };
      setCursorPos({ x: -1000, y: -1000, active: false });
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('touchstart', handleTouchMove, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd);

    // Render loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const mouse = mouseRef.current;

      // 1. Calculate subtle target lift & interpolate
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const pt = points[r][c];

          let targetElevation = 0;
          if (mouse.active) {
            const dx = pt.x - mouse.x;
            const dy = pt.y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < INFLUENCE_RADIUS) {
              const norm = dist / INFLUENCE_RADIUS;
              // Smooth soft bell curve
              const bell = Math.cos(norm * (Math.PI / 2));
              targetElevation = Math.pow(bell, 2) * MAX_LIFT;
            }
          }

          pt.targetZ = targetElevation;
          pt.z += (pt.targetZ - pt.z) * SPRING_FACTOR;
        }
      }

      // Projected coordinates (gentle 3D elevation towards viewer)
      const projected: { x: number; y: number; z: number }[][] = [];
      for (let r = 0; r < rows; r++) {
        const rowProj: { x: number; y: number; z: number }[] = [];
        for (let c = 0; c < cols; c++) {
          const pt = points[r][c];
          const z = pt.z;
          // Very subtle upward displacement
          const liftY = pt.y - z * 0.9;
          rowProj.push({ x: pt.x, y: liftY, z });
        }
        projected.push(rowProj);
      }

      // 2. Horizontal Lines
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols - 1; c++) {
          const p1 = projected[r][c];
          const p2 = projected[r][c + 1];
          const avgZ = (p1.z + p2.z) * 0.5;

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);

          if (avgZ > 1) {
            const intensity = Math.min(avgZ / MAX_LIFT, 1);
            // Subtle luxury violet glow on lifted segment
            ctx.strokeStyle = `rgba(192, 132, 252, ${0.06 + intensity * 0.18})`;
            ctx.lineWidth = 1;
          } else {
            ctx.strokeStyle = 'rgba(167, 139, 250, 0.05)';
            ctx.lineWidth = 1;
          }
          ctx.stroke();
        }
      }

      // 3. Vertical Lines
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows - 1; r++) {
          const p1 = projected[r][c];
          const p2 = projected[r + 1][c];
          const avgZ = (p1.z + p2.z) * 0.5;

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);

          if (avgZ > 1) {
            const intensity = Math.min(avgZ / MAX_LIFT, 1);
            ctx.strokeStyle = `rgba(168, 85, 247, ${0.06 + intensity * 0.18})`;
            ctx.lineWidth = 1;
          } else {
            ctx.strokeStyle = 'rgba(167, 139, 250, 0.05)';
            ctx.lineWidth = 1;
          }
          ctx.stroke();
        }
      }

      // 4. Subtle micro-nodes on lifted intersections
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const p = projected[r][c];

          if (p.z > 2) {
            const intensity = Math.min(p.z / MAX_LIFT, 1);
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1.2 + intensity * 0.8, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(216, 180, 254, ${0.2 + intensity * 0.4})`;
            ctx.fill();
          } else if ((r + c) % 4 === 0) {
            // Ambient faint micro-dot
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(167, 139, 250, 0.12)';
            ctx.fill();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('touchstart', handleTouchMove);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden pointer-events-auto ${className}`}
      style={{ zIndex: 1 }}
    >
      {/* Soft, minimal luxury ambient spotlight that moves smoothly with cursor/touch */}
      {cursorPos.active && (
        <div
          className="pointer-events-none absolute transition-opacity duration-500 rounded-full"
          style={{
            left: `${cursorPos.x}px`,
            top: `${cursorPos.y}px`,
            width: '240px',
            height: '240px',
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.08) 0%, rgba(99, 102, 241, 0.03) 50%, transparent 70%)',
            filter: 'blur(28px)',
          }}
        />
      )}

      {/* Clean, minimal elevation mesh canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block w-full h-full pointer-events-none"
      />
    </div>
  );
};
