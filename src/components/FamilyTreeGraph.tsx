
import React, { useMemo, useState, useRef, useEffect } from "react";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FamilyTreeGraph({ familyMembers, onMemberClick }) {
    const [hoveredMember, setHoveredMember] = useState(null);
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const containerRef = useRef(null);

    // Generational colors
    const generationColors = [
        '#F0F9FF', // blue-50
        '#F0FDF4', // green-50
        '#FEF3C7', // amber-50
        '#FCE7F3', // pink-50
        '#EDE9FE', // purple-50
        '#FEF2F2', // red-50
        '#F0FDFA', // teal-50
        '#FFF7ED', // orange-50
    ];

    // Calculate tree layout
    const treeLayout = useMemo(() => {
        if (!familyMembers.length) return { nodes: [], connections: [], couples: [] };

        // Find root members (people without parents)
        const rootMembers = familyMembers.filter(m => !m.father_id && !m.mother_id);

        if (rootMembers.length === 0) {
            // If no root, use the oldest member by birth date
            const sorted = [...familyMembers].sort((a, b) => {
                if (!a.birth_date) return 1;
                if (!b.birth_date) return -1;
                return new Date(a.birth_date).getTime() - new Date(b.birth_date).getTime();
            });
            rootMembers.push(sorted[0]);
        }

        const nodes = [];
        const connections = [];
        const couples = [];
        const positioned = new Set();
        const levelHeight = 200; // Increased vertical spacing
        const nodeSpacing = 300; // Increased spacing between siblings to accommodate couples
        const partnerSpacing = 140; // Partner spacing - visible separation

        // Recursive function to position family members
        const positionFamily = (memberId, level, xOffset, parentX = null) => {
            const member = familyMembers.find(m => m.id === memberId);
            if (!member) return xOffset;

            // If already positioned, check if it needs to be repositioned at correct level
            if (positioned.has(memberId)) {
                const existingNode = nodes.find(n => n.member.id === memberId);

                // If this member was positioned as a spouse but should be a child at a different level
                if (existingNode && parentX !== null && existingNode.level !== level) {
                    // Get spouse(s) to reposition them together
                    const spousesToReposition = member.spouse_ids?.map(id =>
                        familyMembers.find(m => m.id === id)
                    ).filter(Boolean) || [];

                    // Remove this member from old position
                    const nodeIndex = nodes.findIndex(n => n.member.id === memberId);
                    if (nodeIndex !== -1) {
                        nodes.splice(nodeIndex, 1);
                        positioned.delete(memberId);
                    }

                    // Also remove their spouses from old position
                    spousesToReposition.forEach(spouse => {
                        const spouseNodeIndex = nodes.findIndex(n => n.member.id === spouse.id);
                        if (spouseNodeIndex !== -1) {
                            nodes.splice(spouseNodeIndex, 1);
                            positioned.delete(spouse.id);
                        }
                    });

                    // Remove old couple containers and connections
                    const coupleIndex = couples.findIndex(c =>
                        (c.x1 === existingNode.x || c.x2 === existingNode.x) && c.y === existingNode.y
                    );
                    if (coupleIndex !== -1) {
                        couples.splice(coupleIndex, 1);
                    }

                    // Remove old spouse connections
                    const connIndex = connections.findIndex(c =>
                        c.type === 'spouse' && (c.member1 === memberId || c.member2 === memberId)
                    );
                    if (connIndex !== -1) {
                        connections.splice(connIndex, 1);
                    }

                    // Continue to reposition at correct level with spouse
                } else if (existingNode && parentX !== null) {
                    // Just draw the connection
                    connections.push({
                        type: 'parent-child',
                        x1: parentX,
                        y1: (level - 1) * levelHeight + 60,
                        x2: existingNode.x,
                        y2: existingNode.y,
                        label: 'child'
                    });
                    return xOffset;
                } else {
                    return xOffset;
                }
            }

            // Get spouse(s)
            const spouses = member.spouse_ids?.map(id =>
                familyMembers.find(m => m.id === id)
            ).filter(Boolean) || [];

            // Calculate position
            const y = level * levelHeight + 60;
            let x = xOffset;

            // Position current member
            nodes.push({ member, x, y, level });
            positioned.add(memberId);

            // Draw connection to parent
            if (parentX !== null) {
                connections.push({
                    type: 'parent-child',
                    x1: parentX,
                    y1: (level - 1) * levelHeight + 60,
                    x2: x,
                    y2: y,
                    label: 'child'
                });
            }

            let currentX = x;

            // Position spouses next to each other
            spouses.forEach((spouse, idx) => {
                if (!positioned.has(spouse.id)) {
                    const spouseX = currentX + partnerSpacing;
                    nodes.push({ member: spouse, x: spouseX, y, level });
                    positioned.add(spouse.id);

                    // Draw spouse connection
                    connections.push({
                        type: 'spouse',
                        x1: currentX,
                        y1: y,
                        x2: spouseX,
                        y2: y,
                        member1: member.id,
                        member2: spouse.id,
                        label: 'spouse'
                    });

                    // Add couple container
                    couples.push({
                        x1: currentX,
                        x2: spouseX,
                        y: y,
                        level: level
                    });

                    currentX = spouseX;
                }
            });

            // Get children
            const children = familyMembers.filter(m =>
                m.father_id === memberId || m.mother_id === memberId
            );

            if (children.length > 0) {
                const midX = (x + currentX) / 2;

                // Calculate base positions for children (symmetric, centered under parents)
                // Each child gets a slot of nodeSpacing width
                const totalBaseWidth = children.length * nodeSpacing;
                const startX = midX - (totalBaseWidth / 2) + (nodeSpacing / 2);

                children.forEach((child, idx) => {
                    // Base position for this child (centered in their slot)
                    const childBaseX = startX + (idx * nodeSpacing);

                    // Position this child and their spouse(s)
                    positionFamily(child.id, level + 1, childBaseX, midX);
                });
            }

            return currentX + nodeSpacing;
        };

        // Position from each root
        let startX = 100;
        rootMembers.forEach(root => {
            startX = positionFamily(root.id, 0, startX, null);
            startX += nodeSpacing * 2;
        });

        // Position any remaining unpositioned members (disconnected family members)
        familyMembers.forEach(member => {
            if (!positioned.has(member.id)) {
                nodes.push({
                    member,
                    x: startX,
                    y: 60,
                    level: 0
                });
                startX += nodeSpacing;
            }
        });

        // Add sibling connections
        familyMembers.forEach(member => {
            if (member.sibling_ids?.length) {
                member.sibling_ids.forEach(siblingId => {
                    const node1 = nodes.find(n => n.member.id === member.id);
                    const node2 = nodes.find(n => n.member.id === siblingId);
                    if (node1 && node2 && node1.level === node2.level) {
                        // Only add if not already exists
                        const exists = connections.some(c =>
                            c.type === 'sibling' &&
                            ((c.member1 === member.id && c.member2 === siblingId) ||
                                (c.member1 === siblingId && c.member2 === member.id))
                        );
                        if (!exists) {
                            connections.push({
                                type: 'sibling',
                                x1: node1.x,
                                y1: node1.y,
                                x2: node2.x,
                                y2: node2.y,
                                member1: member.id,
                                member2: siblingId,
                                label: 'sibling'
                            });
                        }
                    }
                });
            }
        });

        return { nodes, connections, couples };
    }, [familyMembers]);

    // Calculate SVG dimensions with extra padding
    const svgWidth = Math.max(
        ...treeLayout.nodes.map(n => n.x),
        1000
    ) + 400;
    const svgHeight = Math.max(
        ...treeLayout.nodes.map(n => n.y),
        400
    ) + 300;

    // Reset to center view
    const recenter = () => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    };

    // Zoom in/out
    const handleZoomIn = () => {
        setScale(prev => Math.min(prev + 0.2, 3));
    };

    const handleZoomOut = () => {
        setScale(prev => Math.max(prev - 0.2, 0.3));
    };

    // Handle mouse wheel zoom
    const handleWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setScale(prev => Math.max(0.3, Math.min(3, prev + delta)));
    };

    // Handle dragging
    const handleMouseDown = (e) => {
        if (e.target.tagName === 'svg' || e.target.tagName === 'g' || e.target.closest('svg')) {
            setIsDragging(true);
            setDragStart({
                x: e.clientX - position.x,
                y: e.clientY - position.y
            });
        }
    };

    const handleMouseMove = (e) => {
        if (isDragging) {
            setPosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, dragStart]);

    if (!familyMembers.length) {
        return (
            <div className="flex items-center justify-center h-96 text-gray-400">
                <p>No family members to display</p>
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Navigation Controls */}
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-lg border border-gray-200">
                <Button
                    size="icon"
                    variant="outline"
                    onClick={handleZoomIn}
                    className="h-9 w-9"
                    title="Zoom in"
                >
                    <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                    size="icon"
                    variant="outline"
                    onClick={handleZoomOut}
                    className="h-9 w-9"
                    title="Zoom out"
                >
                    <ZoomOut className="h-4 w-4" />
                </Button>
                <Button
                    size="icon"
                    variant="outline"
                    onClick={recenter}
                    className="h-9 w-9"
                    title="Re-center"
                >
                    <Maximize2 className="h-4 w-4" />
                </Button>
                <div className="text-xs text-center text-gray-500 mt-1">
                    {Math.round(scale * 100)}%
                </div>
            </div>

            {/* Tree Container */}
            <div
                ref={containerRef}
                className="w-full bg-gradient-to-br from-blue-50 to-white rounded-lg border border-gray-200 shadow-inner relative"
                style={{
                    height: '600px',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    overflow: 'hidden',
                    position: 'relative'
                }}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
            >
                <svg
                    width="100%"
                    height="100%"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%'
                    }}
                    viewBox={`${-position.x / scale} ${-position.y / scale} ${containerRef.current?.clientWidth / scale || 1000} ${600 / scale}`}
                    preserveAspectRatio="xMidYMid meet"
                >
                    {/* Define gradients and markers */}
                    <defs>
                        <linearGradient id="marriageGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#9333EA" />
                            <stop offset="100%" stopColor="#EC4899" />
                        </linearGradient>
                        <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                            <polygon points="0 0, 10 3, 0 6" fill="#3B82F6" />
                        </marker>
                        <filter id="cardShadow">
                            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
                        </filter>
                    </defs>

                    {/* Draw couple containers */}
                    {treeLayout.couples.map((couple, idx) => (
                        <rect
                            key={`couple-${idx}`}
                            x={couple.x1 - 45}
                            y={couple.y - 45}
                            width={couple.x2 - couple.x1 + 90}
                            height={90}
                            rx="12"
                            fill={generationColors[couple.level % generationColors.length]}
                            opacity="0.3"
                            stroke="#E5E7EB"
                            strokeWidth="1"
                        />
                    ))}

                    {/* Draw connections */}
                    <g>
                        {treeLayout.connections.map((conn, idx) => {
                            if (conn.type === 'parent-child') {
                                // Orthogonal routing: vertical down, horizontal, vertical down
                                const midY = (conn.y1 + conn.y2) / 2;

                                return (
                                    <g key={`conn-${idx}`}>
                                        {/* Vertical line from parent */}
                                        <line
                                            x1={conn.x1}
                                            y1={conn.y1 + 40}
                                            x2={conn.x1}
                                            y2={midY}
                                            stroke="#3B82F6"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                        />
                                        {/* Horizontal line */}
                                        <line
                                            x1={conn.x1}
                                            y1={midY}
                                            x2={conn.x2}
                                            y2={midY}
                                            stroke="#3B82F6"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                        />
                                        {/* Vertical line to child with arrow */}
                                        <line
                                            x1={conn.x2}
                                            y1={midY}
                                            x2={conn.x2}
                                            y2={conn.y2 - 40}
                                            stroke="#3B82F6"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            markerEnd="url(#arrowhead)"
                                        />
                                    </g>
                                );
                            } else if (conn.type === 'spouse') {
                                // Horizontal line with heart symbol
                                const midX = (conn.x1 + conn.x2) / 2;

                                return (
                                    <g key={`conn-${idx}`}>
                                        <line
                                            x1={conn.x1 + 40}
                                            y1={conn.y1}
                                            x2={conn.x2 - 40}
                                            y2={conn.y2}
                                            stroke="url(#marriageGradient)"
                                            strokeWidth="3"
                                            strokeLinecap="round"
                                        />
                                        {/* Heart symbol */}
                                        <text
                                            x={midX}
                                            y={conn.y1 + 5}
                                            textAnchor="middle"
                                            fontSize="16"
                                            fill="#EC4899"
                                        >
                                            ♥
                                        </text>
                                    </g>
                                );
                            } else if (conn.type === 'sibling') {
                                // Arc above siblings with circle markers
                                const midX = (conn.x1 + conn.x2) / 2;
                                const arcY = conn.y1 - 50;
                                const distance = Math.abs(conn.x2 - conn.x1);
                                const curveDepth = Math.min(distance * 0.15, 30);

                                return (
                                    <g key={`conn-${idx}`}>
                                        <path
                                            d={`M ${conn.x1} ${conn.y1 - 40} 
                                                L ${conn.x1} ${arcY}
                                                Q ${midX} ${arcY - curveDepth} ${conn.x2} ${arcY}
                                                L ${conn.x2} ${conn.y2 - 40}`}
                                            stroke="#60A5FA"
                                            strokeWidth="2"
                                            fill="none"
                                            strokeDasharray="6,4"
                                            strokeLinecap="round"
                                        />
                                        {/* Circle markers */}
                                        <circle cx={conn.x1} cy={conn.y1 - 40} r="3" fill="#60A5FA" />
                                        <circle cx={conn.x2} cy={conn.y2 - 40} r="3" fill="#60A5FA" />
                                    </g>
                                );
                            }
                            return null;
                        })}
                    </g>

                    {/* Draw nodes */}
                    <g>
                        {treeLayout.nodes.map(({ member, x, y, level }) => {
                            const isHovered = hoveredMember === member.id;
                            const isDeceased = member.death_date;
                            const nodeSize = 40;

                            return (
                                <g
                                    key={member.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onMemberClick(member);
                                    }}
                                    onMouseEnter={() => setHoveredMember(member.id)}
                                    onMouseLeave={() => setHoveredMember(null)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {/* Card background */}
                                    <rect
                                        x={x - 60}
                                        y={y - 45}
                                        width="120"
                                        height="90"
                                        rx="8"
                                        fill="white"
                                        stroke={isDeceased ? "#9CA3AF" : "#10B981"}
                                        strokeWidth={isHovered ? "3" : "2"}
                                        filter="url(#cardShadow)"
                                        style={{ transition: 'all 0.2s ease' }}
                                    />

                                    {/* Avatar circle/square */}
                                    {isDeceased ? (
                                        <rect
                                            x={x - 20}
                                            y={y - 35}
                                            width="40"
                                            height="40"
                                            rx="4"
                                            fill={
                                                member.gender === "male"
                                                    ? "#3B82F6"
                                                    : member.gender === "female"
                                                        ? "#EC4899"
                                                        : "#A855F7"
                                            }
                                            stroke="white"
                                            strokeWidth="2"
                                        />
                                    ) : (
                                        <circle
                                            cx={x}
                                            cy={y - 15}
                                            r="20"
                                            fill={
                                                member.gender === "male"
                                                    ? "#3B82F6"
                                                    : member.gender === "female"
                                                        ? "#EC4899"
                                                        : "#A855F7"
                                            }
                                            stroke="white"
                                            strokeWidth="2"
                                        />
                                    )}

                                    {/* Photo or initials */}
                                    {member.photo_url ? (
                                        <>
                                            <defs>
                                                <clipPath id={`clip-${member.id}`}>
                                                    {isDeceased ? (
                                                        <rect x={x - 20} y={y - 35} width="40" height="40" rx="4" />
                                                    ) : (
                                                        <circle cx={x} cy={y - 15} r="18" />
                                                    )}
                                                </clipPath>
                                            </defs>
                                            <image
                                                href={member.photo_url}
                                                x={isDeceased ? x - 20 : x - 18}
                                                y={isDeceased ? y - 35 : y - 33}
                                                width={isDeceased ? 40 : 36}
                                                height={isDeceased ? 40 : 36}
                                                clipPath={`url(#clip-${member.id})`}
                                                preserveAspectRatio="xMidYMid slice"
                                            />
                                        </>
                                    ) : (
                                        <text
                                            x={x}
                                            y={y - 10}
                                            textAnchor="middle"
                                            fontSize="16"
                                            fill="white"
                                            fontWeight="bold"
                                        >
                                            {member.first_name[0]}{member.last_name[0]}
                                        </text>
                                    )}

                                    {/* Gender symbol */}
                                    <text
                                        x={x + 25}
                                        y={y - 25}
                                        fontSize="12"
                                        fill={member.gender === "male" ? "#3B82F6" : "#EC4899"}
                                    >
                                        {member.gender === "male" ? "♂" : member.gender === "female" ? "♀" : ""}
                                    </text>

                                    {/* Name */}
                                    <text
                                        x={x}
                                        y={y + 20}
                                        textAnchor="middle"
                                        fontSize="11"
                                        fontWeight="600"
                                        fill="#1F2937"
                                        pointerEvents="none"
                                    >
                                        {member.first_name.length > 10 ? member.first_name.substring(0, 10) + '...' : member.first_name}
                                    </text>
                                    <text
                                        x={x}
                                        y={y + 32}
                                        textAnchor="middle"
                                        fontSize="10"
                                        fill="#6B7280"
                                        pointerEvents="none"
                                    >
                                        {member.last_name.length > 10 ? member.last_name.substring(0, 10) + '...' : member.last_name}
                                    </text>

                                    {/* Birth/Death years */}
                                    {member.birth_date && (
                                        <text
                                            x={x}
                                            y={y + 42}
                                            textAnchor="middle"
                                            fontSize="8"
                                            fill="#9CA3AF"
                                            pointerEvents="none"
                                        >
                                            {new Date(member.birth_date).getFullYear()}
                                            {member.death_date && ` - ${new Date(member.death_date).getFullYear()}`}
                                        </text>
                                    )}
                                </g>
                            );
                        })}
                    </g>
                </svg>
            </div>

            {/* Instructions */}
            <div className="mt-2 text-xs text-gray-500 text-center">
                Drag to pan • Scroll to zoom • Click member for details
            </div>
        </div>
    );
}
