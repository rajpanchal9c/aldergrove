import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
    Plus, Search, Filter, Users,
    Network, Grid3x3, FileUp, Trash2, X
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import MemberCard from "../components/MemberCard";
import MemberDialog from "../components/MemberDialog";
import FamilyTreeGraph from "../components/FamilyTreeGraph";
import CSVImportDialog from "../components/CSVImportDialog";

export default function TreeView() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedMember, setSelectedMember] = useState(null);
    const [viewMode, setViewMode] = useState("tree");
    const [showImportDialog, setShowImportDialog] = useState(false);
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
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
            return base44.entities.FamilyMember.delete(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["familyMembers"] });
        },
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            // Remove these members from their spouses' lists
            await Promise.all(ids.map(async (id) => {
                const member = familyMembers.find(m => m.id === id);
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
        <div className="min-h-screen">
            <div className="container mx-auto px-4 py-8">
                {/* Hero Section */}
                <div className="mb-8 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                        Your Family Tree
                    </h2>
                    <p className="text-gray-600">
                        {familyMembers.length} {familyMembers.length === 1 ? "member" : "members"} in your family
                    </p>
                </div>

                {/* Search Bar */}
                <div className="mb-8 max-w-2xl mx-auto">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Search by name, occupation, or place..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-12 border-2 border-gray-200 focus:border-blue-600 transition-colors shadow-sm"
                        />
                    </div>
                </div>

                {/* Mobile Action Buttons */}
                <div className="md:hidden mb-6 flex justify-center gap-2 flex-wrap">
                    {familyMembers.length > 0 && (
                        <>
                            <Button
                                variant={viewMode === "tree" ? "default" : "outline"}
                                onClick={() => {
                                    setViewMode("tree");
                                    clearSelection();
                                }}
                                className={viewMode === "tree" ? "bg-blue-600" : ""}
                                size="sm"
                            >
                                <Network className="w-4 h-4 mr-2" />
                                Tree View
                            </Button>
                            <Button
                                variant={viewMode === "grid" ? "default" : "outline"}
                                onClick={() => setViewMode("grid")}
                                className={viewMode === "grid" ? "bg-blue-600" : ""}
                                size="sm"
                            >
                                <Grid3x3 className="w-4 h-4 mr-2" />
                                Grid View
                            </Button>
                        </>
                    )}
                    <Button
                        variant="outline"
                        onClick={() => setShowImportDialog(true)}
                        className="border-2 border-green-600 text-green-600 hover:bg-green-50"
                        size="sm"
                    >
                        <FileUp className="w-4 h-4 mr-2" />
                        Import CSV
                    </Button>
                </div>

                {/* Bulk Selection Bar */}
                {viewMode === "grid" && selectedMembers.length > 0 && (
                    <div className="mb-6 max-w-2xl mx-auto">
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                                    {selectedMembers.length}
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900">
                                        {selectedMembers.length} member{selectedMembers.length > 1 ? 's' : ''} selected
                                    </p>
                                    <button
                                        onClick={selectAllFiltered}
                                        className="text-sm text-blue-600 hover:underline"
                                    >
                                        Select all {filteredMembers.length} in view
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={handleBulkDelete}
                                    disabled={bulkDeleteMutation.isPending}
                                    variant="outline"
                                    className="border-red-200 text-red-600 hover:bg-red-50"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Selected
                                </Button>
                                <Button
                                    onClick={clearSelection}
                                    variant="ghost"
                                    size="icon"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
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
                    <div className="mb-8">
                        <FamilyTreeGraph
                            familyMembers={filteredMembers}
                            onMemberClick={(member) => setSelectedMember(member)}
                        />
                    </div>
                )}

                {/* Grid View */}
                {viewMode === "grid" && filteredMembers.length > 0 && (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        </div>
    );
}