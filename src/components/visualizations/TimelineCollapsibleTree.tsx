import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';

interface DatasetAccess {
  user: string;
  dataset: string;
  accessType: 'read' | 'modify';
  timestamp: Date;
  department: string;
  organization: string;
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
  data: DatasetAccess[] | string | { data: DatasetAccess[] } | any;
  width?: number;
  height?: number;
  hierarchy?: 'dataset-orgs-users' | 'user-platform-dataset';
}

const TimelineCollapsibleTree: React.FC<TimelineCollapsibleTreeProps> = ({ 
  data, 
  width, 
  height,
  hierarchy = 'dataset-orgs-users'
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [treeRoot, setTreeRoot] = useState<TreeNode | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [checkedOrgs, setCheckedOrgs] = useState<Set<string>>(new Set());

  // Parse data if it's a JSON payload
  const parsedData = useMemo(() => {
    // Handle array data directly
    if (Array.isArray(data)) return data;
    
    // Handle JSON string
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : parsed.data || [];
      } catch (error) {
        console.error('Failed to parse JSON data:', error);
        return [];
      }
    }
    
    // Handle object with data property or direct object
    if (data && typeof data === 'object') {
      return data.data || data.records || data.items || [];
    }
    
    return [];
  }, [data]);

  // Time range from data
  const timeRange = useMemo(() => {
    if (!parsedData.length) return { start: new Date(), end: new Date() };
    const timestamps = parsedData.map((d: any) => new Date(d.timestamp).getTime());
    return {
      start: new Date(Math.min(...timestamps)),
      end: new Date(Math.max(...timestamps))
    };
  }, [parsedData]);

  // Generate tree data based on current time and hierarchy
  const generateTreeData = useMemo(() => {
    const endTime = new Date(timeRange.start.getTime() + (currentTime / 100) * (timeRange.end.getTime() - timeRange.start.getTime()));
    const filteredData = parsedData.filter((d: any) => new Date(d.timestamp) <= endTime);

    if (hierarchy === 'dataset-orgs-users') {
      // Group by dataset -> organizations -> users -> access type
      const datasetMap = new Map<string, Map<string, Map<string, Map<string, number>>>>();
      const accessCounts = new Map<string, number>();
      const lastAccess = new Map<string, Date>();

      filteredData.forEach((access: any) => {
        const datasetKey = access.dataset;
        const orgKey = `${access.dataset}-${access.organization}`;
        const userKey = `${access.dataset}-${access.organization}-${access.user}`;
        const accessTypeKey = `${access.dataset}-${access.organization}-${access.user}-${access.accessType}`;
        
        if (!datasetMap.has(datasetKey)) {
          datasetMap.set(datasetKey, new Map());
        }
        if (!datasetMap.get(datasetKey)!.has(orgKey)) {
          datasetMap.get(datasetKey)!.set(orgKey, new Map());
        }
        if (!datasetMap.get(datasetKey)!.get(orgKey)!.has(userKey)) {
          datasetMap.get(datasetKey)!.get(orgKey)!.set(userKey, new Map());
        }
        
        const currentCount = datasetMap.get(datasetKey)!.get(orgKey)!.get(userKey)!.get(accessTypeKey) || 0;
        datasetMap.get(datasetKey)!.get(orgKey)!.get(userKey)!.set(accessTypeKey, currentCount + 1);
        
        accessCounts.set(accessTypeKey, (accessCounts.get(accessTypeKey) || 0) + 1);
        
        if (!lastAccess.has(accessTypeKey) || new Date(access.timestamp) > lastAccess.get(accessTypeKey)!) {
          lastAccess.set(accessTypeKey, new Date(access.timestamp));
        }
      });

      // Build tree structure for dataset -> orgs -> users -> access type
      const root: TreeNode = {
        id: 'root',
        name: 'Dataset Access Tree',
        children: Array.from(datasetMap.entries()).map(([dataset, orgs]) => ({
          id: dataset,
          name: `Dataset: ${dataset}`,
          data: {
            accessCount: Array.from(orgs.values()).reduce((sum, users) => 
              sum + Array.from(users.values()).reduce((userSum, accessTypes) => 
                userSum + Array.from(accessTypes.values()).reduce((typeSum, count) => typeSum + count, 0), 0), 0),
            department: 'Dataset',
            lastAccess: new Date(),
            users: []
          },
          children: Array.from(orgs.entries()).map(([orgKey, users]) => {
            const org = orgKey.replace(`${dataset}-`, '');
            return {
              id: orgKey,
              name: `Org: ${org}`,
              data: {
                accessCount: Array.from(users.values()).reduce((sum, accessTypes) => 
                  sum + Array.from(accessTypes.values()).reduce((typeSum, count) => typeSum + count, 0), 0),
                department: org,
                lastAccess: new Date(),
                users: []
              },
              children: Array.from(users.entries()).map(([userKey, accessTypes]) => {
                const user = userKey.replace(`${dataset}-${org}-`, '');
                return {
                  id: userKey,
                  name: `User: ${user}`,
                  data: {
                    accessCount: Array.from(accessTypes.values()).reduce((sum, count) => sum + count, 0),
                    department: org,
                    lastAccess: new Date(),
                    users: [user]
                  },
                  children: Array.from(accessTypes.entries()).map(([accessTypeKey, count]) => {
                    const accessType = accessTypeKey.replace(`${dataset}-${org}-${user}-`, '');
                    return {
                      id: accessTypeKey,
                      name: `${accessType} (${count})`,
                      data: {
                        accessCount: count,
                        department: org,
                        lastAccess: lastAccess.get(accessTypeKey) || new Date(),
                        users: [user]
                      }
                    };
                  })
                };
              })
            };
          })
        }))
      };
      return root;
    } else {
      // Group by user -> department/platform -> dataset
      const userMap = new Map<string, Map<string, Set<string>>>();
      const accessCounts = new Map<string, number>();
      const lastAccess = new Map<string, Date>();

      filteredData.forEach((access: any) => {
        const userKey = access.user;
        const platformKey = `${access.user}-${access.department}`;
        
        if (!userMap.has(userKey)) {
          userMap.set(userKey, new Map());
        }
        if (!userMap.get(userKey)!.has(platformKey)) {
          userMap.get(userKey)!.set(platformKey, new Set());
        }
        
        userMap.get(userKey)!.get(platformKey)!.add(access.dataset);
        accessCounts.set(platformKey, (accessCounts.get(platformKey) || 0) + 1);
        
        if (!lastAccess.has(platformKey) || new Date(access.timestamp) > lastAccess.get(platformKey)!) {
          lastAccess.set(platformKey, new Date(access.timestamp));
        }
      });

      // Build tree structure for user -> platform -> dataset
      const root: TreeNode = {
        id: 'root',
        name: 'User Access Tree',
        children: Array.from(userMap.entries()).map(([user, platforms]) => ({
          id: user,
          name: user,
          data: {
            accessCount: Array.from(platforms.values()).reduce((sum, datasets) => sum + datasets.size, 0),
            department: 'User',
            lastAccess: new Date(),
            users: [user]
          },
          children: Array.from(platforms.entries()).map(([platformKey, datasets]) => {
            const platform = platformKey.replace(`${user}-`, '');
            return {
              id: platformKey,
              name: platform,
              data: {
                accessCount: accessCounts.get(platformKey) || 0,
                department: platform,
                lastAccess: lastAccess.get(platformKey) || new Date(),
                users: [user]
              },
              children: Array.from(datasets).map(dataset => ({
                id: `${platformKey}-${dataset}`,
                name: dataset,
                data: {
                  accessCount: filteredData.filter((d: any) => d.user === user && d.department === platform && d.dataset === dataset).length,
                  department: platform,
                  lastAccess: new Date(),
                  users: [user]
                }
              }))
            };
          })
        }))
      };
      return root;
    }
  }, [parsedData, currentTime, timeRange, hierarchy]);

  // Handle container resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: width || Math.max(rect.width, 400),
          height: height || Math.max(rect.height - 100, 400) // Account for header/footer
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [width, height]);

  // Initialize tree and handle updates
  useEffect(() => {
    if (!svgRef.current || !generateTreeData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 120, bottom: 20, left: 120 };
    const innerWidth = dimensions.width - margin.left - margin.right;
    const innerHeight = dimensions.height - margin.top - margin.bottom;

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

      // Add organization checkboxes or regular circles
      nodeEnter.each(function(d: any) {
        const selection = d3.select(this);
        const isOrgNode = d.depth === 2 && hierarchy === 'dataset-orgs-users'; // Org level in dataset hierarchy
        
        if (isOrgNode) {
          // Create checkbox for organization nodes
          const isChecked = checkedOrgs.has(d.data.id);
          
          // Checkbox background
          selection.append("rect")
            .attr("x", -8)
            .attr("y", -8)
            .attr("width", 16)
            .attr("height", 16)
            .attr("rx", 2)
            .style("fill", "hsl(var(--background))")
            .style("stroke", "hsl(var(--border))")
            .style("stroke-width", "2px");
          
          // Checkmark
          if (isChecked) {
            selection.append("path")
              .attr("d", "M-4,-1 L-1,2 L4,-3")
              .style("stroke", "hsl(var(--primary))")
              .style("stroke-width", "2px")
              .style("fill", "none");
          }
        } else {
          // Regular circle for non-org nodes
          selection.append("circle")
            .attr("r", 1e-6)
            .style("fill", d => (d as any)._children ? "hsl(var(--primary))" : "hsl(var(--muted))")
            .style("stroke", "hsl(var(--border))")
            .style("stroke-width", "2px");
        }
      });

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
      const isOrgNode = d.depth === 2 && hierarchy === 'dataset-orgs-users';
      
      if (isOrgNode) {
        // Handle checkbox toggle for organization nodes
        const newCheckedOrgs = new Set(checkedOrgs);
        if (checkedOrgs.has(d.data.id)) {
          newCheckedOrgs.delete(d.data.id);
          // Hide user children and their access data
          if (d.children) {
            d._children = d.children;
            d.children = null;
          }
        } else {
          newCheckedOrgs.add(d.data.id);
          // Show user children with populated reads/modifies data
          if (d._children) {
            d.children = d._children;
            d._children = null;
            
            // Populate reads/modifies data for users in this org
            d.children.forEach((userNode: any) => {
              // Filter access data for this specific user and time period
              const userAccessData = parsedData.filter((item: any) => {
                const itemTime = new Date(item.timestamp || item.time || item.date);
                const isInTimeRange = itemTime >= timeRange.start && itemTime <= timeRange.end;
                const belongsToUser = item.userId === userNode.data.id || 
                                    item.user === userNode.data.id ||
                                    item.user_id === userNode.data.id;
                return isInTimeRange && belongsToUser;
              });
              
              // Add reads/modifies as children to user nodes
              const accessNodes = userAccessData.map((access: any) => ({
                id: `${userNode.data.id}-${access.action || access.type}-${access.timestamp || access.time}`,
                name: `${access.action || access.type}: ${access.resource || access.dataset || access.table}`,
                type: access.action || access.type,
                timestamp: access.timestamp || access.time || access.date,
                details: access
              }));
              
              if (accessNodes.length > 0) {
                userNode.children = accessNodes.map((node: any) => ({
                  data: node,
                  children: null,
                  _children: null
                }));
              }
            });
          }
        }
        setCheckedOrgs(newCheckedOrgs);
        update(d);
      } else {
        // Regular expand/collapse for non-org nodes
        if (d.children) {
          d._children = d.children;
          d.children = null;
        } else {
          d.children = d._children;
          d._children = null;
        }
        update(d);
      }
    }

    // Initial render
    update(root);

  }, [generateTreeData, dimensions, checkedOrgs]);

  // Handle horizontal scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const maxScroll = e.currentTarget.scrollWidth - e.currentTarget.clientWidth;
    const timeProgress = (scrollLeft / maxScroll) * 100;
    setCurrentTime(timeProgress);
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-border gap-2">
        <h3 className="text-sm sm:text-lg font-semibold text-foreground">
          {hierarchy === 'dataset-orgs-users' ? 'Dataset → Organization → Users' : 'User → Platform → Dataset'}
        </h3>
        <div className="text-xs sm:text-sm text-muted-foreground">
          Time: {new Date(timeRange.start.getTime() + (currentTime / 100) * (timeRange.end.getTime() - timeRange.start.getTime())).toLocaleString()}
        </div>
      </div>
      
      <div 
        ref={containerRef}
        className="flex-1 overflow-x-auto overflow-y-hidden"
        onScroll={handleScroll}
        style={{ scrollBehavior: 'smooth' }}
      >
        <div style={{ width: Math.max(dimensions.width * 3, 1200), height: dimensions.height }}>
          <svg
            ref={svgRef}
            width={dimensions.width}
            height={dimensions.height}
            className="bg-background"
          />
        </div>
      </div>

      <div className="p-2 sm:p-4 border-t border-border">
        <div className="text-xs sm:text-sm text-muted-foreground">
          Scroll horizontally to travel through time • Click nodes to expand/collapse • Circle size indicates access frequency
        </div>
      </div>
    </div>
  );
};

export default TimelineCollapsibleTree;