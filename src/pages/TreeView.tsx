import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
    Plus, Search, Filter, Users,
    Network, Grid3x3, FileUp, Trash2, X,
    Download, Upload, LayoutGrid, GitBranch
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import MemberCard from "../components/MemberCard";
import MemberDialog from "../components/MemberDialog";
import FamilyTreeGraph from "../components/FamilyTreeGraph";
import CSVImportDialog from "../components/CSVImportDialog";
import ExportDialog from "../components/ExportDialog";

export default function TreeView() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedMember, setSelectedMember] = useState(null);
    const [viewMode, setViewMode] = useState("tree");
    const [showImportDialog, setShowImportDialog] = useState(false);
    const [showExportDialog, setShowExportDialog] = useState(false);
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const treeContainerRef = React.useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();

    const { data: familyMembers, isLoading } = useQuery({
        queryKey: ["familyMembers"],
        queryFn: () => base44.entities.FamilyMember.list("-created_date"),
        initialData: [],
    });

    // Listen for view mode changes from Layout
    useEffect(() => {
        const handleViewModeChange = (e) => {
            setViewMode(e.detail);
            if (e.detail === 'tree') {
                clearSelection();
            }
        };

        const handleOpenImport = () => {
            setShowImportDialog(true);
        };

        window.addEventListener('viewModeChange', handleViewModeChange);
        window.addEventListener('openImportDialog', handleOpenImport);

        return () => {
            window.removeEventListener('viewModeChange', handleViewModeChange);
            window.removeEventListener('openImportDialog', handleOpenImport);
        };
    }, []);

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            // Remove this member from their spouses' lists
            const member = familyMembers.find(m => m.id === id);
            if (member && member.spouse_ids) {
                await Promise.all(member.spouse_ids.map(async (spouseId) => {
                    const spouse = familyMembers.find(m => m.id === spouseId);
                    if (spouse) {
                        const updatedSpouseIds = (spouse.spouse_ids || []).filter(sid => sid !== id);
                        await base44.entities.FamilyMember.update(spouseId, { spouse_ids: updatedSpouseIds });
                    }
                }));
            }
            // Remove from parents' child_ids and siblings' sibling_ids
            // Note: child_ids are not explicitly stored in this schema (derived from father_id/mother_id), 
            // but sibling_ids are.
            if (member && member.sibling_ids) {
                await Promise.all(member.sibling_ids.map(async (siblingId) => {
                    const sibling = familyMembers.find(m => m.id === siblingId);
                    if (sibling) {
                        const updatedSiblingIds = (sibling.sibling_ids || []).filter(sid => sid !== id);
                        await base44.entities.FamilyMember.update(siblingId, { sibling_ids: updatedSiblingIds });
                    }
                }));
            }

            return base44.entities.FamilyMember.delete(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["familyMembers"] });
        },
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            // Remove these members from their spouses' lists and siblings' lists
            await Promise.all(ids.map(async (id) => {
                const member = familyMembers.find(m => m.id === id);

                // Handle spouses
                if (member && member.spouse_ids) {
                    await Promise.all(member.spouse_ids.map(async (spouseId) => {
                        // Skip if the spouse is also being deleted
                        if (ids.includes(spouseId)) return;

                        const spouse = familyMembers.find(m => m.id === spouseId);
                        if (spouse) {
                            const updatedSpouseIds = (spouse.spouse_ids || []).filter(sid => sid !== id);
                            await base44.entities.FamilyMember.update(spouseId, { spouse_ids: updatedSpouseIds });
                        }
                    }));
                }

                // Handle siblings
                if (member && member.sibling_ids) {
                    await Promise.all(member.sibling_ids.map(async (siblingId) => {
                        // Skip if the sibling is also being deleted
                        if (ids.includes(siblingId)) return;

                        const sibling = familyMembers.find(m => m.id === siblingId);
                        if (sibling) {
                            const updatedSiblingIds = (sibling.sibling_ids || []).filter(sid => sid !== id);
                            await base44.entities.FamilyMember.update(siblingId, { sibling_ids: updatedSiblingIds });
                        }
                    }));
                }
            }));

            await Promise.all(ids.map(id => base44.entities.FamilyMember.delete(id)));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["familyMembers"] });
            setSelectedMembers([]);
            toast.success("Selected members deleted successfully");
        },
    });

    const toggleMemberSelection = (memberId) => {
        setSelectedMembers(prev =>
            prev.includes(memberId)
                ? prev.filter(id => id !== memberId)
                : [...prev, memberId]
        );
    };

    const selectAllFiltered = () => {
        setSelectedMembers(filteredMembers.map(m => m.id));
    };

    const clearSelection = () => {
        setSelectedMembers([]);
    };

    const handleBulkDelete = () => {
        if (selectedMembers.length === 0) return;

        const count = selectedMembers.length;
        if (window.confirm(`Are you sure you want to delete ${count} selected member${count > 1 ? 's' : ''}?`)) {
            bulkDeleteMutation.mutate(selectedMembers);
        }
    };

    const filteredMembers = familyMembers.filter(member => {
        const fullName = `${member.first_name} ${member.last_name}`.toLowerCase();
        const search = searchQuery.toLowerCase();
        return fullName.includes(search) ||
            member.occupation?.toLowerCase().includes(search) ||
            member.birth_place?.toLowerCase().includes(search);
    });

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-48 rounded-lg" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-30 px-4 py-3 shadow-sm">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold text-gray-900 hidden md:block">My Family Tree</h1>
                        <div className="flex bg-gray-100 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode("tree")}
                                className={`p-2 rounded-md transition-all ${viewMode === "tree" ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                                title="Tree View"
                            >
                                <GitBranch className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setViewMode("grid")}
                                className={`p-2 rounded-md transition-all ${viewMode === "grid" ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                                title="Grid View"
                            >
                                <LayoutGrid className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4">
                        <div className="relative hidden md:block">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search family..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-gray-100 border-none rounded-full text-sm focus:ring-2 focus:ring-blue-500 w-64"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowExportDialog(true)}
                                className="hidden md:flex items-center gap-2"
                            >
                                <Download className="w-4 h-4" />
                                Export Data
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowImportDialog(true)}
                                className="hidden md:flex items-center gap-2"
                            >
                                <Upload className="w-4 h-4" />
                                Import CSV
                            </Button>
                            <Link to={createPageUrl("AddMember")}>
                                <Button size="sm" className="hidden md:flex bg-blue-600 hover:bg-blue-700">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Member
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Search */}
            <div className="md:hidden px-4 py-2 bg-white border-b">
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search family..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto p-4 md:p-6 min-h-[calc(100vh-80px)]">
                {/* Selection Toolbar */}
                {selectedMembers.length > 0 && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white shadow-xl border rounded-full px-6 py-3 flex items-center gap-4 z-40 animate-in slide-in-from-bottom-4">
                        <span className="font-medium text-gray-900">{selectedMembers.length} selected</span>
                        <div className="h-4 w-px bg-gray-200" />
                        <button
                            onClick={() => bulkDeleteMutation.mutate(selectedMembers)}
                            className="text-red-600 hover:text-red-700 font-medium text-sm flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete
                        </button>
                        <button
                            onClick={() => setSelectedMembers([])}
                            className="text-gray-500 hover:text-gray-700 ml-2"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* Empty State */}
                {familyMembers.length === 0 && (
                    <div className="text-center py-16">
                        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-xl">
                            <Users className="w-12 h-12 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">
                            Start Your Family Tree
                        </h3>
                        <p className="text-gray-600 mb-6 max-w-md mx-auto">
                            Add your first family member or import a CSV file to begin building your family's legacy
                        </p>
                        <div className="flex justify-center gap-3">
                            <Link to={createPageUrl("AddMember")}>
                                <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all">
                                    <Plus className="w-5 h-5 mr-2" />
                                    Add First Member
                                </Button>
                            </Link>
                            <Button
                                variant="outline"
                                onClick={() => setShowImportDialog(true)}
                                className="border-2 border-green-600 text-green-600 hover:bg-green-50"
                            >
                                <FileUp className="w-4 h-4 mr-2" />
                                Import CSV
                            </Button>
                        </div>
                    </div>
                )}

                {/* Tree View */}
                {viewMode === "tree" && filteredMembers.length > 0 && (
                    <div ref={treeContainerRef} className="h-[calc(100vh-140px)] bg-white rounded-xl shadow-sm border overflow-hidden relative">
                        <FamilyTreeGraph
                            familyMembers={filteredMembers}
                            onMemberClick={setSelectedMember}
                        />
                        <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg text-xs text-gray-500 border shadow-sm">
                            Scroll to zoom • Drag to pan
                        </div>
                    </div>
                )}

                {/* Grid View */}
                {viewMode === "grid" && filteredMembers.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredMembers.map((member) => (
                            <MemberCard
                                key={member.id}
                                member={member}
                                familyMembers={familyMembers}
                                onClick={() => setSelectedMember(member)}
                                isSelected={selectedMembers.includes(member.id)}
                                onToggleSelect={() => toggleMemberSelection(member.id)}
                                selectionMode={selectedMembers.length > 0}
                            />
                        ))}
                    </div>
                )}

                {/* No Results */}
                {filteredMembers.length === 0 && familyMembers.length > 0 && (
                    <div className="text-center py-16">
                        <Filter className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No matches found</h3>
                        <p className="text-gray-600">Try adjusting your search</p>
                    </div>
                )}
            </div>

            {/* FAB for mobile */}
            <Link to={createPageUrl("AddMember")}>
                <button className="md:hidden fixed bottom-24 right-6 w-14 h-14 bg-blue-600 rounded-full shadow-2xl flex items-center justify-center text-white hover:bg-blue-700 transition-all hover:scale-110 active:scale-95 z-40">
                    <Plus className="w-6 h-6" />
                </button>
            </Link>

            {/* Member Details Dialog */}
            <MemberDialog
                member={selectedMember}
                open={!!selectedMember}
                onClose={() => setSelectedMember(null)}
                familyMembers={familyMembers}
                onDelete={(id) => deleteMutation.mutate(id)}
            />

            {/* CSV Import Dialog */}
            <CSVImportDialog
                open={showImportDialog}
                onClose={() => setShowImportDialog(false)}
            />

            {/* Export Dialog */}
            <ExportDialog
                open={showExportDialog}
                onOpenChange={setShowExportDialog}
                familyMembers={familyMembers}
                treeContainerRef={treeContainerRef}
            />
        </div>
    );
}