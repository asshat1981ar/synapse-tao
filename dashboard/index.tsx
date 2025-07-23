import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function TAODashboard() {
  const [diagram, setDiagram] = useState("metaLoop");
  const [log, setLog] = useState("Initializing...");
  const diagramRef = useRef(null);

  const diagrams = {
    metaLoop: `graph TD
      A[Start TAO Iteration] --> B[Think: Plan with Self-Learning from KG]
      B --> C[Act: Execute with Self-Correcting Retries]
      C --> D[Observe: Analyze Metrics & Insights]
      D --> E[Meta-Optimize: Adjust Parameters & Update KG]
      E --> A[Next Iteration]
      subgraph Meta-Loops
          F[Self-Analysis] --> D
          G[Self-Correcting] --> C
          H[Self-Learning] --> B
          I[Self-Optimization] --> E
      end`
  };

  useEffect(() => {
    if (diagramRef.current) {
      mermaid.initialize({ startOnLoad: true });
      mermaid.render("theDiagram", diagrams[diagram], (svgCode) => {
        diagramRef.current.innerHTML = svgCode;
      });
    }
  }, [diagram]);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-3xl font-bold">🧠 TAO Meta-Dashboard</h1>

      <Card>
        <CardContent className="space-y-2">
          <label className="font-semibold">Diagram Selector:</label>
          <select
            value={diagram}
            onChange={(e) => setDiagram(e.target.value)}
            className="border p-1 rounded"
          >
            <option value="metaLoop">Meta-Loop</option>
          </select>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div ref={diagramRef}></div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h2 className="font-semibold text-xl">📜 Live Logs</h2>
          <pre className="bg-gray-100 p-2 rounded text-sm whitespace-pre-wrap">{log}</pre>
        </CardContent>
      </Card>

      <Button onClick={() => setLog(log + "\n[LOG] New cycle detected at " + new Date().toLocaleTimeString())}>
        Simulate Log Update
      </Button>
    </div>
  );
}
