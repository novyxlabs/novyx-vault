"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";

interface GraphNode {
  id: string;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface GraphLink {
  source: string;
  target: string;
}

interface GraphViewProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNote: (path: string) => void;
  activeNote: string | null;
}

export default function GraphView({ isOpen, onClose, onSelectNote, activeNote }: GraphViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<GraphLink[]>([]);
  const animRef = useRef<number>(0);
  const dragRef = useRef<{ node: GraphNode; offsetX: number; offsetY: number } | null>(null);
  const panRef = useRef({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const toScreen = useCallback((x: number, y: number) => {
    return {
      x: x * zoomRef.current + panRef.current.x,
      y: y * zoomRef.current + panRef.current.y,
    };
  }, []);

  const toWorld = useCallback((sx: number, sy: number) => {
    return {
      x: (sx - panRef.current.x) / zoomRef.current,
      y: (sy - panRef.current.y) / zoomRef.current,
    };
  }, []);

  // Load graph data
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    fetch("/api/notes/graph")
      .then((res) => res.json())
      .then((data) => {
        const canvas = canvasRef.current;
        const w = canvas?.width || 800;
        const h = canvas?.height || 600;

        // Initialize node positions in a circle
        const nodes: GraphNode[] = data.nodes.map((n: { id: string; name: string }, i: number) => {
          const angle = (2 * Math.PI * i) / data.nodes.length;
          const radius = Math.min(w, h) * 0.3;
          return {
            ...n,
            x: w / 2 + Math.cos(angle) * radius + (Math.random() - 0.5) * 50,
            y: h / 2 + Math.sin(angle) * radius + (Math.random() - 0.5) * 50,
            vx: 0,
            vy: 0,
          };
        });

        nodesRef.current = nodes;
        linksRef.current = data.links;

        // Center the pan
        panRef.current = { x: 0, y: 0 };
        zoomRef.current = 1;

        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isOpen]);

  // Physics simulation + rendering
  useEffect(() => {
    if (!isOpen || loading) return;
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

    const nodeMap = new Map<string, GraphNode>();
    for (const n of nodesRef.current) {
      nodeMap.set(n.id, n);
    }

    // Count connections per node for sizing
    const connectionCount = new Map<string, number>();
    for (const link of linksRef.current) {
      connectionCount.set(link.source, (connectionCount.get(link.source) || 0) + 1);
      connectionCount.set(link.target, (connectionCount.get(link.target) || 0) + 1);
    }

    const simulate = () => {
      if (!running) return;
      const nodes = nodesRef.current;
      const links = linksRef.current;
      const damping = 0.85;
      const repulsion = 3000;
      const attraction = 0.005;
      const idealDist = 120;
      const centerPull = 0.01;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Repulsion between all nodes
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

      // Attraction along links
      for (const link of links) {
        const s = nodeMap.get(link.source);
        const t = nodeMap.get(link.target);
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

      // Links
      for (const link of links) {
        const s = nodeMap.get(link.source);
        const t = nodeMap.get(link.target);
        if (!s || !t) continue;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.strokeStyle = "rgba(139, 92, 246, 0.25)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Nodes
      for (const node of nodes) {
        const connections = connectionCount.get(node.id) || 0;
        const radius = Math.max(5, Math.min(16, 5 + connections * 2));
        const isActive = node.id === activeNote;
        const isHovered = node.id === hoveredNode;

        // Glow for active/hovered
        if (isActive || isHovered) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius + 4, 0, Math.PI * 2);
          ctx.fillStyle = isActive ? "rgba(139, 92, 246, 0.3)" : "rgba(139, 92, 246, 0.15)";
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = isActive ? "#8b5cf6" : isHovered ? "#a78bfa" : "#6d28d9";
        ctx.fill();

        // Label
        ctx.font = `${isActive || isHovered ? "bold " : ""}11px system-ui`;
        ctx.fillStyle = isActive || isHovered ? "#e4e4e7" : "#a1a1aa";
        ctx.textAlign = "center";
        ctx.fillText(node.name, node.x, node.y + radius + 14);
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
  }, [isOpen, loading, activeNote, hoveredNode]);

  // Mouse interactions
  const findNodeAt = useCallback((sx: number, sy: number): GraphNode | null => {
    const { x, y } = toWorld(sx, sy);
    for (const node of nodesRef.current) {
      const dx = node.x - x;
      const dy = node.y - y;
      if (dx * dx + dy * dy < 20 * 20) return node;
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
    if (dragRef.current) {
      // If barely moved, treat as click
      dragRef.current = null;
    }
    isPanningRef.current = false;
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const node = findNodeAt(sx, sy);
    if (node) {
      onSelectNote(node.id);
    }
  }, [findNodeAt, onSelectNote]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const oldZoom = zoomRef.current;
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.2, Math.min(5, oldZoom * factor));

    // Zoom toward cursor
    panRef.current.x = sx - (sx - panRef.current.x) * (newZoom / oldZoom);
    panRef.current.y = sy - (sy - panRef.current.y) * (newZoom / oldZoom);
    zoomRef.current = newZoom;
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border">
        <h2 className="text-sm font-medium">Graph View</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">
            {nodesRef.current.length} notes · {linksRef.current.length} connections
          </span>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-muted hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-muted text-sm">
            Loading graph...
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleClick}
            onWheel={handleWheel}
          />
        )}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 text-xs text-muted space-y-1">
          <p>Scroll to zoom · Drag to pan · Click node to open</p>
        </div>
      </div>
    </div>
  );
}
