
import React, { useMemo, useState, useRef, useEffect } from "react";
import { User, Heart, Minus, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FamilyTreeGraph({ familyMembers, onMemberClick }) {
    const [hoveredMember, setHoveredMember] = useState(null);
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const containerRef = useRef(null);

    // Calculate tree layout
    const treeLayout = useMemo(() => {
        if (!familyMembers.length) return { nodes: [], connections: [] };

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
        const positioned = new Set();
        const levelHeight = 180;
        const nodeSpacing = 220;

        // Recursive function to position family members
        const positionFamily = (memberId, level, xOffset, parentX = null) => {
            if (positioned.has(memberId)) return xOffset;

            const member = familyMembers.find(m => m.id === memberId);
            if (!member) return xOffset;

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
                    const spouseX = currentX + (idx + 1) * 100;
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

                    currentX = spouseX;
                }
            });

            // Get children
            const children = familyMembers.filter(m =>
                m.father_id === memberId || m.mother_id === memberId
            );

            // Position children
            let childX = x - (children.length - 1) * nodeSpacing / 2;
            const midX = (x + currentX) / 2;

            children.forEach((child) => {
                if (!positioned.has(child.id)) {
                    childX = positionFamily(child.id, level + 1, childX, midX);
                    childX += nodeSpacing;
                }
            });

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

        return { nodes, connections };
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
                    {/* Define gradient for connections */}
                    <defs>
                        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.6" />
                            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.3" />
                        </linearGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Draw connections */}
                    <g>
                        {treeLayout.connections.map((conn, idx) => {
                            if (conn.type === 'parent-child') {
                                // Smooth curved line from parent to child
                                const midY = (conn.y1 + conn.y2) / 2;
                                const controlY1 = conn.y1 + (midY - conn.y1) * 0.6;
                                const controlY2 = conn.y2 - (conn.y2 - midY) * 0.6;

                                return (
                                    <g key={`conn-${idx}`}>
                                        <path
                                            d={`M ${conn.x1} ${conn.y1 + 30} 
                          C ${conn.x1} ${controlY1},
                            ${conn.x1} ${midY},
                            ${conn.x1} ${midY}
                          L ${conn.x2} ${midY}
                          C ${conn.x2} ${midY},
                            ${conn.x2} ${controlY2},
                            ${conn.x2} ${conn.y2 - 30}`}
                                            stroke="url(#lineGradient)"
                                            strokeWidth="2.5"
                                            fill="none"
                                            strokeLinecap="round"
                                        />
                                        {/* Label */}
                                        <text
                                            x={(conn.x1 + conn.x2) / 2}
                                            y={midY - 5}
                                            textAnchor="middle"
                                            fontSize="10"
                                            fill="#64748B"
                                            opacity="0.7"
                                            fontWeight="500"
                                        >
                                            child
                                        </text>
                                    </g>
                                );
                            } else if (conn.type === 'spouse') {
                                // Simple curved line between partners - neutral styling
                                const midX = (conn.x1 + conn.x2) / 2;
                                const curveDepth = 15;

                                return (
                                    <g key={`conn-${idx}`}>
                                        <path
                                            d={`M ${conn.x1 + 30} ${conn.y1}
                          Q ${midX} ${conn.y1 - curveDepth}
                          ${conn.x2 - 30} ${conn.y2}`}
                                            stroke="#9333EA"
                                            strokeWidth="2.5"
                                            strokeDasharray="5,3"
                                            fill="none"
                                            strokeLinecap="round"
                                            opacity="0.7"
                                        />
                                        {/* Label */}
                                        <text
                                            x={midX}
                                            y={conn.y1 - curveDepth - 5}
                                            textAnchor="middle"
                                            fontSize="10"
                                            fill="#9333EA"
                                            opacity="0.8"
                                            fontWeight="500"
                                        >
                                            partner
                                        </text>
                                    </g>
                                );
                            } else if (conn.type === 'sibling') {
                                // Smooth curved arc between siblings
                                const midX = (conn.x1 + conn.x2) / 2;
                                const midY = conn.y1 - 35;
                                const distance = Math.abs(conn.x2 - conn.x1);
                                const curveDepth = Math.min(distance * 0.2, 40);

                                return (
                                    <g key={`conn-${idx}`}>
                                        <path
                                            d={`M ${conn.x1} ${conn.y1 - 30} 
                          Q ${midX} ${midY - curveDepth} 
                          ${conn.x2} ${conn.y2 - 30}`}
                                            stroke="#60A5FA"
                                            strokeWidth="2"
                                            fill="none"
                                            strokeDasharray="4,4"
                                            opacity="0.6"
                                            strokeLinecap="round"
                                        />
                                        {/* Label */}
                                        <text
                                            x={midX}
                                            y={midY - curveDepth - 5}
                                            textAnchor="middle"
                                            fontSize="10"
                                            fill="#60A5FA"
                                            opacity="0.8"
                                            fontWeight="500"
                                        >
                                            sibling
                                        </text>
                                    </g>
                                );
                            }
                            return null;
                        })}
                    </g>

                    {/* Draw nodes */}
                    <g>
                        {treeLayout.nodes.map(({ member, x, y }) => {
                            const isHovered = hoveredMember === member.id;
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
                                    {/* Shadow */}
                                    {isHovered && (
                                        <circle
                                            cx={x}
                                            cy={y}
                                            r="38"
                                            fill="#3B82F6"
                                            opacity="0.15"
                                        />
                                    )}

                                    {/* Avatar circle */}
                                    <circle
                                        cx={x}
                                        cy={y}
                                        r={isHovered ? "32" : "30"}
                                        fill={
                                            member.gender === "male"
                                                ? "#3B82F6"
                                                : member.gender === "female"
                                                    ? "#EC4899"
                                                    : "#A855F7"
                                        }
                                        stroke="white"
                                        strokeWidth="3"
                                        style={{ transition: 'all 0.2s ease' }}
                                        filter={isHovered ? "url(#glow)" : ""}
                                    />

                                    {/* Photo or icon */}
                                    {member.photo_url ? (
                                        <>
                                            <defs>
                                                <clipPath id={`clip-${member.id}`}>
                                                    <circle cx={x} cy={y} r="27" />
                                                </clipPath>
                                            </defs>
                                            <image
                                                href={member.photo_url}
                                                x={x - 27}
                                                y={y - 27}
                                                width="54"
                                                height="54"
                                                clipPath={`url(#clip-${member.id})`}
                                                preserveAspectRatio="xMidYMid slice"
                                            />
                                        </>
                                    ) : (
                                        <text
                                            x={x}
                                            y={y + 5}
                                            textAnchor="middle"
                                            fontSize="24"
                                            fill="white"
                                            fontWeight="bold"
                                        >
                                            {member.first_name[0]}{member.last_name[0]}
                                        </text>
                                    )}

                                    {/* Name label */}
                                    <text
                                        x={x}
                                        y={y + 45}
                                        textAnchor="middle"
                                        fontSize="12"
                                        fontWeight="600"
                                        fill="#1F2937"
                                        pointerEvents="none"
                                    >
                                        {member.first_name}
                                    </text>
                                    <text
                                        x={x}
                                        y={y + 58}
                                        textAnchor="middle"
                                        fontSize="11"
                                        fill="#6B7280"
                                        pointerEvents="none"
                                    >
                                        {member.last_name}
                                    </text>

                                    {/* Birth year */}
                                    {member.birth_date && (
                                        <text
                                            x={x}
                                            y={y + 70}
                                            textAnchor="middle"
                                            fontSize="9"
                                            fill="#9CA3AF"
                                            pointerEvents="none"
                                        >
                                            {new Date(member.birth_date).getFullYear()}
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
