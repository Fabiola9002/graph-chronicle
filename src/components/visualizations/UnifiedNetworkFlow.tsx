import { useMemo, useCallback } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  MarkerType,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { DatasetAccess } from "../DataJourneyDashboard";
import { Users, Database, Activity } from "lucide-react";

interface UnifiedNetworkFlowProps {
  data: DatasetAccess[];
}

export const UnifiedNetworkFlow = ({ data }: UnifiedNetworkFlowProps) => {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    // Create user and dataset nodes
    const userMap = new Map();
    const datasetMap = new Map();
    const edgeMap = new Map();
    
    data.forEach(access => {
      // Track user nodes
      if (!userMap.has(access.userId)) {
        userMap.set(access.userId, {
          id: access.userId,
          type: 'user',
          data: { 
            label: access.userName,
            role: access.userRole,
            department: access.department,
            accessCount: 0,
            nodeType: 'user'
          },
          position: { x: 0, y: 0 },
          style: {
            width: 80,
            height: 80,
          }
        });
      }
      userMap.get(access.userId).data.accessCount++;
      
      // Track dataset nodes
      if (!datasetMap.has(access.datasetId)) {
        datasetMap.set(access.datasetId, {
          id: access.datasetId,
          type: 'dataset',
          data: { 
            label: access.datasetName,
            type: access.datasetType,
            accessCount: 0,
            nodeType: 'dataset'
          },
          position: { x: 0, y: 0 },
          style: {
            width: 100,
            height: 60,
          }
        });
      }
      datasetMap.get(access.datasetId).data.accessCount++;
      
      // Track edges (connections)
      const edgeId = `${access.userId}-${access.datasetId}`;
      if (!edgeMap.has(edgeId)) {
        edgeMap.set(edgeId, {
          id: edgeId,
          source: access.userId,
          target: access.datasetId,
          type: 'smoothstep',
          data: {
            accessType: access.accessType,
            frequency: 0,
            records: 0
          },
          style: {
            strokeWidth: 2,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
          }
        });
      }
      
      const edge = edgeMap.get(edgeId);
      edge.data.frequency++;
      edge.data.records += access.recordsAccessed;
    });
    
    // Position nodes using force-like algorithm (simplified)
    const users = Array.from(userMap.values());
    const datasets = Array.from(datasetMap.values());
    
    // Department-based clustering for users
    const departments = [...new Set(users.map(u => u.data.department))];
    const departmentRadius = 300;
    
    users.forEach((user, i) => {
      const deptIndex = departments.indexOf(user.data.department);
      const angle = (deptIndex / departments.length) * 2 * Math.PI;
      const userAngle = (i / users.length) * 2 * Math.PI + angle;
      
      user.position.x = Math.cos(userAngle) * departmentRadius + 400;
      user.position.y = Math.sin(userAngle) * departmentRadius + 300;
      
      // Size based on activity
      const size = Math.max(60, Math.min(120, 60 + user.data.accessCount * 2));
      user.style.width = size;
      user.style.height = size;
    });
    
    // Position datasets in center area
    datasets.forEach((dataset, i) => {
      const angle = (i / datasets.length) * 2 * Math.PI;
      dataset.position.x = Math.cos(angle) * 150 + 400;
      dataset.position.y = Math.sin(angle) * 150 + 300;
      
      // Size based on activity
      const width = Math.max(80, Math.min(150, 80 + dataset.data.accessCount * 3));
      dataset.style.width = width;
      dataset.style.height = 60;
    });
    
    // Style edges based on frequency and access type
    const edges = Array.from(edgeMap.values());
    const maxFreq = Math.max(...edges.map(e => e.data.frequency), 1);
    
    edges.forEach(edge => {
      const frequency = edge.data.frequency;
      const strokeWidth = Math.max(1, Math.min(8, (frequency / maxFreq) * 6 + 1));
      
      // Color based on access type
      let strokeColor = '#94a3b8'; // default
      if (edge.data.accessType === 'write') strokeColor = '#ef4444';
      else if (edge.data.accessType === 'execute') strokeColor = '#8b5cf6';
      else if (edge.data.accessType === 'read') strokeColor = '#10b981';
      
      edge.style = {
        strokeWidth,
        stroke: strokeColor,
        opacity: 0.7,
      };
      
      edge.label = `${frequency} accesses`;
      edge.labelStyle = {
        fontSize: '10px',
        fill: strokeColor,
      };
    });
    
    return {
      nodes: [...users, ...datasets],
      edges: edges
    };
  }, [data]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const nodeTypes = useMemo(() => ({
    user: UserNode,
    dataset: DatasetNode,
  }), []);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
        style={{ backgroundColor: "transparent" }}
      >
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
      </ReactFlow>
    </div>
  );
};

// Custom User Node Component
const UserNode = ({ data }: { data: any }) => {
  const departmentColors: { [key: string]: string } = {
    'Engineering': 'bg-blue-500',
    'Analytics': 'bg-purple-500', 
    'Sales': 'bg-green-500',
    'Marketing': 'bg-orange-500',
    'Operations': 'bg-red-500',
  };

  const bgColor = departmentColors[data.department] || 'bg-gray-500';

  return (
    <div className={`${bgColor} rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white`}>
      <div className="text-center">
        <Users className="h-4 w-4 mx-auto mb-1" />
        <div className="text-xs font-medium">{data.label.split('.')[0]}</div>
        <div className="text-xs opacity-80">{data.accessCount}</div>
      </div>
    </div>
  );
};

// Custom Dataset Node Component  
const DatasetNode = ({ data }: { data: any }) => {
  const typeColors: { [key: string]: string } = {
    'table': 'bg-emerald-600',
    'file': 'bg-amber-600',
    'api': 'bg-cyan-600',
    'stream': 'bg-violet-600',
  };

  const bgColor = typeColors[data.type] || 'bg-gray-600';

  return (
    <div className={`${bgColor} rounded-lg flex items-center justify-center text-white shadow-lg border-2 border-white p-2`}>
      <div className="text-center">
        <Database className="h-4 w-4 mx-auto mb-1" />
        <div className="text-xs font-medium">{data.label}</div>
        <div className="text-xs opacity-80">{data.type} • {data.accessCount}</div>
      </div>
    </div>
  );
};