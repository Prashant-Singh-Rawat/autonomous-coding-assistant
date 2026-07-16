"use client";

import React, { useEffect, useState } from "react";
import ReactFlow, { Background, Controls, MiniMap, useNodesState, useEdgesState } from "reactflow";
import "reactflow/dist/style.css";
import { Loader2, AlertCircle } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";


interface CanvasProps {
  repoId: string;
}

export default function VisualizationCanvas({ repoId }: CanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!repoId) return;

    const fetchDiagram = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API}/workspace/${repoId}/generate/diagram`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            diagram_type: "architecture"
          })
        });

        if (!res.ok) throw new Error("Failed to load dependency diagrams");
        const data = await res.json();
        
        // Format diagram nodes for React Flow
        // React Flow expects layout positions
        const flowNodes = (data.nodes || []).map((n: any, index: number) => ({
          id: n.id,
          data: { label: n.label },
          position: { x: 100 + (index % 3) * 200, y: 100 + Math.floor(index / 3) * 150 },
          style: {
            background: "#1E1F29",
            color: "#FFFFFF",
            border: "1px solid #3A3F50",
            borderRadius: "8px",
            fontSize: "12px",
            padding: "10px",
            width: 150,
            textAlign: "center"
          }
        }));

        const flowEdges = (data.edges || []).map((e: any, index: number) => ({
          id: `e-${index}`,
          source: e.source,
          target: e.target,
          animated: true,
          style: { stroke: "#6366F1" }
        }));

        setNodes(flowNodes);
        setEdges(flowEdges);
      } catch (err: any) {
        setError(err.message || "Failed to render visual canvas.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDiagram();
  }, [repoId]);

  if (isLoading) {
    return (
      <div className="h-[55vh] flex flex-col items-center justify-center space-y-3 bg-neutral-900 border border-white/5 rounded-xl">
        <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
        <p className="text-xs text-muted-foreground">Rendering module architecture vectors...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[55vh] flex flex-col items-center justify-center space-y-3 bg-neutral-900 border border-white/5 rounded-xl text-center p-6">
        <AlertCircle className="w-8 h-8 text-rose-500" />
        <p className="text-xs text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="h-[55vh] border border-white/5 bg-neutral-950 rounded-xl overflow-hidden relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
      >
        <Background color="#2A2B3D" gap={16} />
        <Controls showInteractive={false} className="bg-neutral-800 border-white/10 text-white" />
        <MiniMap 
          nodeColor={() => "#6366F1"} 
          maskColor="rgba(0, 0, 0, 0.6)"
          className="bg-neutral-900 border border-white/10" 
        />
      </ReactFlow>
    </div>
  );
}
