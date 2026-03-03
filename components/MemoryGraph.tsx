"use client";

import { useEffect, useRef, useCallback, useState } from "react";

interface KGNode {
  id: string;
  name: string;
  type?: string;
  tripleCount: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface KGEdge {
  source: string;
  target: string;
  predicate: string;
  confidence: number;
}

interface MemoryGraphProps {
  nodes: { id: string; name: string; type?: string; tripleCount: number }[];
  edges: KGEdge[];
}

const TYPE_COLORS: Record<string, string> = {
  person: "#8b5cf6",
  preference: "#f59e0b",
  topic: "#3b82f6",
  location: "#10b981",
  event: "#ef4444",
  concept: "#6366f1",
};

function getNodeColor(type?: string): string {
  if (!type) return "#8b5cf6";
  return TYPE_COLORS[type.toLowerCase()] || "#8b5cf6";
}

export default function MemoryGraph({ nodes: rawNodes, edges }: MemoryGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<KGNode[]>([]);
  const animRef = useRef<number>(0);
  const dragRef = useRef<{ node: KGNode; offsetX: number; offsetY: number } | null>(null);
  const panRef = useRef({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const toWorld = useCallback((sx: number, sy: number) => ({
    x: (sx - panRef.current.x) / zoomRef.current,
    y: (sy - panRef.current.y) / zoomRef.current,
  }), []);

  // Initialize nodes with positions
  useEffect(() => {
    const canvas = canvasRef.current;
    const w = canvas?.width || 800;
    const h = canvas?.height || 600;

    nodesRef.current = rawNodes.map((n, i) => {
      const angle = (2 * Math.PI * i) / rawNodes.length;
      const radius = Math.min(w, h) * 0.25;
      return {
        ...n,
        x: w / 2 + Math.cos(angle) * radius + (Math.random() - 0.5) * 60,
        y: h / 2 + Math.sin(angle) * radius + (Math.random() - 0.5) * 60,
        vx: 0,
        vy: 0,
      };
    });

    panRef.current = { x: 0, y: 0 };
    zoomRef.current = 1;
  }, [rawNodes]);

  // Physics + rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };
    resize();
    window.addEventListener("resize", resize);

    const nodeMap = new Map<string, KGNode>();
    for (const n of nodesRef.current) nodeMap.set(n.id, n);

    const simulate = () => {
      if (!running) return;
      const nodes = nodesRef.current;
      const damping = 0.85;
      const repulsion = 4000;
      const attraction = 0.004;
      const idealDist = 150;
      const centerPull = 0.008;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = repulsion / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          nodes[i].vx -= fx;
          nodes[i].vy -= fy;
          nodes[j].vx += fx;
          nodes[j].vy += fy;
        }
      }

      // Attraction along edges
      for (const edge of edges) {
        const s = nodeMap.get(edge.source);
        const t = nodeMap.get(edge.target);
        if (!s || !t) continue;
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - idealDist) * attraction;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        s.vx += fx;
        s.vy += fy;
        t.vx -= fx;
        t.vy -= fy;
      }

      // Center gravity
      for (const node of nodes) {
        node.vx += (cx - node.x) * centerPull;
        node.vy += (cy - node.y) * centerPull;
      }

      // Apply velocity
      for (const node of nodes) {
        if (dragRef.current?.node === node) continue;
        node.vx *= damping;
        node.vy *= damping;
        node.x += node.vx;
        node.y += node.vy;
      }

      // Draw
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(panRef.current.x, panRef.current.y);
      ctx.scale(zoomRef.current, zoomRef.current);

      // Edges
      for (const edge of edges) {
        const s = nodeMap.get(edge.source);
        const t = nodeMap.get(edge.target);
        if (!s || !t) continue;

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.strokeStyle = `rgba(139, 92, 246, ${0.15 + edge.confidence * 0.35})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Edge label
        const mx = (s.x + t.x) / 2;
        const my = (s.y + t.y) / 2;
        ctx.font = "9px system-ui";
        ctx.fillStyle = "rgba(161, 161, 170, 0.7)";
        ctx.textAlign = "center";
        ctx.fillText(edge.predicate, mx, my - 4);
      }

      // Nodes
      for (const node of nodes) {
        const radius = Math.max(6, Math.min(20, 6 + node.tripleCount * 2));
        const isHovered = node.id === hoveredNode;
        const color = getNodeColor(node.type);

        if (isHovered) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius + 5, 0, Math.PI * 2);
          ctx.fillStyle = color.replace(")", ", 0.25)").replace("rgb", "rgba");
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Label
        ctx.font = `${isHovered ? "bold " : ""}11px system-ui`;
        ctx.fillStyle = isHovered ? "#e4e4e7" : "#a1a1aa";
        ctx.textAlign = "center";
        ctx.fillText(node.name, node.x, node.y + radius + 14);

        // Type badge
        if (node.type && isHovered) {
          ctx.font = "9px system-ui";
          ctx.fillStyle = "rgba(161, 161, 170, 0.6)";
          ctx.fillText(node.type, node.x, node.y + radius + 26);
        }
      }

      ctx.restore();
      animRef.current = requestAnimationFrame(simulate);
    };

    animRef.current = requestAnimationFrame(simulate);

    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [edges, hoveredNode]);

  // Mouse interactions
  const findNodeAt = useCallback((sx: number, sy: number): KGNode | null => {
    const { x, y } = toWorld(sx, sy);
    for (const node of nodesRef.current) {
      const dx = node.x - x;
      const dy = node.y - y;
      if (dx * dx + dy * dy < 25 * 25) return node;
    }
    return null;
  }, [toWorld]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const node = findNodeAt(sx, sy);

    if (node) {
      const { x, y } = toWorld(sx, sy);
      dragRef.current = { node, offsetX: node.x - x, offsetY: node.y - y };
    } else {
      isPanningRef.current = true;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    }
  }, [findNodeAt, toWorld]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (dragRef.current) {
      const { x, y } = toWorld(sx, sy);
      dragRef.current.node.x = x + dragRef.current.offsetX;
      dragRef.current.node.y = y + dragRef.current.offsetY;
      dragRef.current.node.vx = 0;
      dragRef.current.node.vy = 0;
    } else if (isPanningRef.current) {
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      panRef.current.x += dx;
      panRef.current.y += dy;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    } else {
      const node = findNodeAt(sx, sy);
      setHoveredNode(node?.id || null);
    }
  }, [findNodeAt, toWorld]);

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
    isPanningRef.current = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const oldZoom = zoomRef.current;
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.2, Math.min(5, oldZoom * factor));

    panRef.current.x = sx - (sx - panRef.current.x) * (newZoom / oldZoom);
    panRef.current.y = sy - (sy - panRef.current.y) * (newZoom / oldZoom);
    zoomRef.current = newZoom;
  }, []);

  return (
    <div className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />
      <div className="absolute bottom-3 left-3 text-xs text-muted space-y-0.5">
        <p>{rawNodes.length} entities · {edges.length} connections</p>
        <p>Scroll to zoom · Drag to pan</p>
      </div>
    </div>
  );
}
