import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';

interface DatasetAccess {
  user: string;
  dataset: string;
  accessType: 'read' | 'write' | 'delete';
  timestamp: Date;
  department: string;
  duration: number;
}

interface TreeNodeData {
  accessCount: number;
  department: string;
  lastAccess: Date;
  users: string[];
}

interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
  parent?: TreeNode;
  data?: TreeNodeData;
  x?: number;
  y?: number;
  x0?: number;
  y0?: number;
  _children?: TreeNode[];
  depth?: number;
}

interface HierarchyTreeNode extends d3.HierarchyNode<TreeNode> {
  x0?: number;
  y0?: number;
  _children?: HierarchyTreeNode[];
}

interface TimelineCollapsibleTreeProps {
  data: DatasetAccess[];
  width?: number;
  height?: number;
}

const TimelineCollapsibleTree: React.FC<TimelineCollapsibleTreeProps> = ({ 
  data, 
  width = 1000, 
  height = 600 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [treeRoot, setTreeRoot] = useState<TreeNode | null>(null);

  // Time range from data
  const timeRange = useMemo(() => {
    if (!data.length) return { start: new Date(), end: new Date() };
    const timestamps = data.map(d => d.timestamp.getTime());
    return {
      start: new Date(Math.min(...timestamps)),
      end: new Date(Math.max(...timestamps))
    };
  }, [data]);

  // Generate tree data based on current time
  const generateTreeData = useMemo(() => {
    const endTime = new Date(timeRange.start.getTime() + (currentTime / 100) * (timeRange.end.getTime() - timeRange.start.getTime()));
    const filteredData = data.filter(d => d.timestamp <= endTime);

    // Group by department -> dataset -> users
    const departmentMap = new Map<string, Map<string, Set<string>>>();
    const accessCounts = new Map<string, number>();
    const lastAccess = new Map<string, Date>();

    filteredData.forEach(access => {
      const deptKey = access.department;
      const datasetKey = `${access.department}-${access.dataset}`;
      
      if (!departmentMap.has(deptKey)) {
        departmentMap.set(deptKey, new Map());
      }
      if (!departmentMap.get(deptKey)!.has(datasetKey)) {
        departmentMap.get(deptKey)!.set(datasetKey, new Set());
      }
      
      departmentMap.get(deptKey)!.get(datasetKey)!.add(access.user);
      accessCounts.set(datasetKey, (accessCounts.get(datasetKey) || 0) + 1);
      
      if (!lastAccess.has(datasetKey) || access.timestamp > lastAccess.get(datasetKey)!) {
        lastAccess.set(datasetKey, access.timestamp);
      }
    });

    // Build tree structure
    const root: TreeNode = {
      id: 'root',
      name: 'Data Access Tree',
      children: Array.from(departmentMap.entries()).map(([dept, datasets]) => ({
        id: dept,
        name: dept,
        data: {
          accessCount: Array.from(datasets.values()).reduce((sum, users) => sum + users.size, 0),
          department: dept,
          lastAccess: new Date(),
          users: []
        },
        children: Array.from(datasets.entries()).map(([datasetKey, users]) => {
          const dataset = datasetKey.replace(`${dept}-`, '');
          return {
            id: datasetKey,
            name: dataset,
            data: {
              accessCount: accessCounts.get(datasetKey) || 0,
              department: dept,
              lastAccess: lastAccess.get(datasetKey) || new Date(),
              users: Array.from(users)
            },
            children: Array.from(users).map(user => ({
              id: `${datasetKey}-${user}`,
              name: user,
              data: {
                accessCount: filteredData.filter(d => d.user === user && `${d.department}-${d.dataset}` === datasetKey).length,
                department: dept,
                lastAccess: new Date(),
                users: [user]
              }
            }))
          };
        })
      }))
    };

    return root;
  }, [data, currentTime, timeRange]);

  // Initialize tree and handle updates
  useEffect(() => {
    if (!svgRef.current || !generateTreeData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 120, bottom: 20, left: 120 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create tree layout
    const tree = d3.tree<TreeNode>()
      .size([innerHeight, innerWidth]);

    // Create hierarchy
    const root = d3.hierarchy(generateTreeData);
    
    // Collapse all children initially except first level
    const collapse = (d: any) => {
      if (d.children) {
        (d as any)._children = d.children;
        (d as any)._children.forEach(collapse);
        d.children = null;
      }
    };

    if (root.children) {
      root.children.forEach(collapse);
    }

    setTreeRoot(root.data);

    // Update function
    let i = 0;
    const update = (source: d3.HierarchyNode<TreeNode>) => {
      const treeData = tree(root);
      const nodes = treeData.descendants();
      const links = treeData.descendants().slice(1);

      // Normalize for fixed-depth
      nodes.forEach(d => d.y = d.depth * 180);

      // Update nodes
      const node = g.selectAll("g.node")
        .data(nodes, (d: any) => d.id || (d.id = ++i));

      const nodeEnter = node.enter().append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${(source as any).y0 || 0},${(source as any).x0 || 0})`)
        .on("click", click);

      // Add circles
      nodeEnter.append("circle")
        .attr("r", 1e-6)
        .style("fill", d => (d as any)._children ? "hsl(var(--primary))" : "hsl(var(--muted))")
        .style("stroke", "hsl(var(--border))")
        .style("stroke-width", "2px");

      // Add labels
      nodeEnter.append("text")
        .attr("dy", ".35em")
        .attr("x", d => d.children || (d as any)._children ? -13 : 13)
        .attr("text-anchor", d => d.children || (d as any)._children ? "end" : "start")
        .text(d => d.data.name)
        .style("fill-opacity", 1e-6)
        .style("font-size", "12px")
        .style("fill", "hsl(var(--foreground))");

      // Add access count badges
      nodeEnter.append("circle")
        .attr("r", 8)
        .attr("cx", 15)
        .attr("cy", -8)
        .style("fill", "hsl(var(--accent))")
        .style("opacity", d => d.data.data?.accessCount ? 0.8 : 0);

      nodeEnter.append("text")
        .attr("x", 15)
        .attr("y", -5)
        .attr("text-anchor", "middle")
        .text(d => d.data.data?.accessCount || "")
        .style("font-size", "10px")
        .style("fill", "hsl(var(--accent-foreground))")
        .style("opacity", d => d.data.data?.accessCount ? 1 : 0);

      // Transition nodes to their new position
      const nodeUpdate = nodeEnter.merge(node as any);

      nodeUpdate.transition()
        .duration(750)
        .attr("transform", d => `translate(${d.y},${d.x})`);

      nodeUpdate.select("circle")
        .transition()
        .duration(750)
        .attr("r", 6)
        .style("fill", d => (d as any)._children ? "hsl(var(--primary))" : "hsl(var(--muted))");

      nodeUpdate.select("text")
        .transition()
        .duration(750)
        .style("fill-opacity", 1);

      // Transition exiting nodes
      const nodeExit = node.exit().transition()
        .duration(750)
        .attr("transform", d => `translate(${source.y},${source.x})`)
        .remove();

      nodeExit.select("circle")
        .attr("r", 1e-6);

      nodeExit.select("text")
        .style("fill-opacity", 1e-6);

      // Update links
      const link = g.selectAll("path.link")
        .data(links, (d: any) => d.id);

      const linkEnter = link.enter().insert("path", "g")
        .attr("class", "link")
        .attr("d", d => {
          const o = { x: (source as any).x0 || 0, y: (source as any).y0 || 0 };
          return diagonal(o, o);
        })
        .style("fill", "none")
        .style("stroke", "hsl(var(--border))")
        .style("stroke-width", "2px");

      const linkUpdate = linkEnter.merge(link as any);

      linkUpdate.transition()
        .duration(750)
        .attr("d", d => diagonal(d, d.parent!));

      link.exit().transition()
        .duration(750)
        .attr("d", d => {
          const o = { x: source.x, y: source.y };
          return diagonal(o, o);
        })
        .remove();

      // Store old positions for transition
      nodes.forEach(d => {
        (d as any).x0 = d.x;
        (d as any).y0 = d.y;
      });
    };

    // Diagonal link generator
    const diagonal = (s: any, d: any) => {
      const path = `M ${s.y} ${s.x}
                   C ${(s.y + d.y) / 2} ${s.x},
                     ${(s.y + d.y) / 2} ${d.x},
                     ${d.y} ${d.x}`;
      return path;
    };

    // Toggle children on click
    function click(event: any, d: any) {
      if (d.children) {
        d._children = d.children;
        d.children = null;
      } else {
        d.children = d._children;
        d._children = null;
      }
      update(d);
    }

    // Initial render
    update(root);

  }, [generateTreeData, width, height]);

  // Handle horizontal scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const maxScroll = e.currentTarget.scrollWidth - e.currentTarget.clientWidth;
    const timeProgress = (scrollLeft / maxScroll) * 100;
    setCurrentTime(timeProgress);
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">
          Timeline Tree Visualization
        </h3>
        <div className="text-sm text-muted-foreground">
          Time: {new Date(timeRange.start.getTime() + (currentTime / 100) * (timeRange.end.getTime() - timeRange.start.getTime())).toLocaleString()}
        </div>
      </div>
      
      <div 
        ref={containerRef}
        className="flex-1 overflow-x-auto overflow-y-hidden"
        onScroll={handleScroll}
        style={{ scrollBehavior: 'smooth' }}
      >
        <div style={{ width: width * 3, height }}>
          <svg
            ref={svgRef}
            width={width}
            height={height}
            className="bg-background"
          />
        </div>
      </div>

      <div className="p-4 border-t border-border">
        <div className="text-sm text-muted-foreground">
          Scroll horizontally to travel through time • Click nodes to expand/collapse • Circle size indicates access frequency
        </div>
      </div>
    </div>
  );
};

export default TimelineCollapsibleTree;