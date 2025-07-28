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

    const marginTop = 10;
    const marginRight = 10;
    const marginBottom = 10;
    const marginLeft = 40;

    const g = svg.append("g")
      .attr("transform", `translate(${marginLeft},${marginTop})`);

    // Create hierarchy
    const root = d3.hierarchy(generateTreeData);
    
    // Rows are separated by dx pixels, columns by dy pixels
    const dx = 25;
    const dy = (width - marginRight - marginLeft) / (1 + root.height);

    // Define the tree layout and the shape for links
    const tree = d3.tree<TreeNode>().nodeSize([dx, dy]);
    const diagonal = d3.linkHorizontal<any, TreeNode>()
      .x(d => d.y)
      .y(d => d.x);

    // Create link and node groups
    const gLink = g.append("g")
      .attr("fill", "none")
      .attr("stroke", "hsl(var(--border))")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 2);

    const gNode = g.append("g")
      .attr("cursor", "pointer")
      .attr("pointer-events", "all");

    // Collapse all children initially except first level
    const collapse = (d: any) => {
      if (d.children) {
        d._children = d.children;
        d._children.forEach(collapse);
        d.children = null;
      }
    };

    if (root.children) {
      root.children.forEach(collapse);
    }

    // Set initial positions
    (root as any).x0 = 0;
    (root as any).y0 = 0;
    root.descendants().forEach((d: any, i) => {
      d.id = i;
      d._children = d.children;
      if (d.depth && d.data.name.length !== 7) d.children = null;
    });

    setTreeRoot(root.data);

    // Update function
    const update = (event: any, source: any) => {
      const duration = event?.altKey ? 2500 : 250;
      const nodes = root.descendants().reverse();
      const links = root.links();

      // Compute the new tree layout
      tree(root);

      let left = root;
      let right = root;
      root.eachBefore(node => {
        if (node.x < left.x) left = node;
        if (node.x > right.x) right = node;
      });

      const heightNeeded = right.x - left.x + marginTop + marginBottom;

      const transition = svg.transition()
        .duration(duration)
        .attr("height", Math.max(height, heightNeeded))
        .attr("viewBox", `${-marginLeft} ${left.x - marginTop} ${width} ${Math.max(height, heightNeeded)}`);

      // Update the nodes
      const node = gNode.selectAll("g")
        .data(nodes, (d: any) => d.id);

      // Enter any new nodes at the parent's previous position
      const nodeEnter = node.enter().append("g")
        .attr("transform", d => `translate(${source.y0 || 0},${source.x0 || 0})`)
        .attr("fill-opacity", 0)
        .attr("stroke-opacity", 0)
        .on("click", (event, d: any) => {
          d.children = d.children ? null : d._children;
          update(event, d);
        });

      // Add circles
      nodeEnter.append("circle")
        .attr("r", 4)
        .attr("fill", (d: any) => d._children ? "hsl(var(--primary))" : "hsl(var(--muted))")
        .attr("stroke", "hsl(var(--border))")
        .attr("stroke-width", 2);

      // Add text labels
      nodeEnter.append("text")
        .attr("dy", "0.31em")
        .attr("x", (d: any) => d._children ? -8 : 8)
        .attr("text-anchor", (d: any) => d._children ? "end" : "start")
        .text((d: any) => d.data.name)
        .attr("stroke-linejoin", "round")
        .attr("stroke-width", 3)
        .attr("stroke", "hsl(var(--background))")
        .attr("paint-order", "stroke")
        .style("font-size", "12px")
        .style("fill", "hsl(var(--foreground))");

      // Add access count badges
      nodeEnter.append("circle")
        .attr("r", 8)
        .attr("cx", 20)
        .attr("cy", -10)
        .style("fill", "hsl(var(--accent))")
        .style("opacity", (d: any) => d.data.data?.accessCount ? 0.8 : 0);

      nodeEnter.append("text")
        .attr("x", 20)
        .attr("y", -7)
        .attr("text-anchor", "middle")
        .text((d: any) => d.data.data?.accessCount || "")
        .style("font-size", "10px")
        .style("fill", "hsl(var(--accent-foreground))")
        .style("opacity", (d: any) => d.data.data?.accessCount ? 1 : 0);

      // Transition nodes to their new position
      const nodeUpdate = node.merge(nodeEnter as any).transition(transition)
        .attr("transform", (d: any) => `translate(${d.y},${d.x})`)
        .attr("fill-opacity", 1)
        .attr("stroke-opacity", 1);

      // Update circle colors
      nodeUpdate.select("circle")
        .attr("fill", (d: any) => d._children ? "hsl(var(--primary))" : "hsl(var(--muted))");

      // Transition exiting nodes to the parent's new position
      const nodeExit = node.exit().transition(transition).remove()
        .attr("transform", (d: any) => `translate(${source.y},${source.x})`)
        .attr("fill-opacity", 0)
        .attr("stroke-opacity", 0);

      // Update the links
      const link = gLink.selectAll("path")
        .data(links, (d: any) => d.target.id);

      // Enter any new links at the parent's previous position
      const linkEnter = link.enter().append("path")
        .attr("d", (d: any) => {
          const o = { x: source.x0 || 0, y: source.y0 || 0 };
          return diagonal({ source: o, target: o });
        });

      // Transition links to their new position
      link.merge(linkEnter as any).transition(transition)
        .attr("d", diagonal);

      // Transition exiting links to the parent's new position
      link.exit().transition(transition).remove()
        .attr("d", (d: any) => {
          const o = { x: source.x, y: source.y };
          return diagonal({ source: o, target: o });
        });

      // Stash the old positions for transition
      root.eachBefore((d: any) => {
        d.x0 = d.x;
        d.y0 = d.y;
      });
    };

    // Initial update
    update(null, root);

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