import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Users, Plus, Network, Grid3x3, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LayoutProps {
    children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    const location = useLocation();
    const isTreeView = location.pathname === createPageUrl("TreeView");

    // Pass view controls to TreeView through custom event
    const handleViewModeChange = (mode: string) => {
        window.dispatchEvent(new CustomEvent('viewModeChange', { detail: mode }));
    };

    const handleImportClick = () => {
        window.dispatchEvent(new CustomEvent('openImportDialog'));
    };

    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            {/* Material Design App Bar */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
                                <Users className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-semibold text-gray-900">Family Tree</h1>
                                <p className="text-xs text-gray-500">Build your legacy</p>
                            </div>
                        </div>

                        <nav className="hidden md:flex items-center gap-2">
                            {/* View Mode Buttons - only show on TreeView */}
                            {isTreeView && (
                                <>
                                    <Button
                                        variant="outline"
                                        onClick={() => handleViewModeChange('tree')}
                                        size="sm"
                                    >
                                        <Network className="w-4 h-4 mr-2" />
                                        Tree
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => handleViewModeChange('grid')}
                                        size="sm"
                                    >
                                        <Grid3x3 className="w-4 h-4 mr-2" />
                                        Grid
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={handleImportClick}
                                        className="border-2 border-green-600 text-green-600 hover:bg-green-50"
                                        size="sm"
                                    >
                                        <FileUp className="w-4 h-4 mr-2" />
                                        Import CSV
                                    </Button>
                                </>
                            )}
                        </nav>

                        <Link to={createPageUrl("AddMember")}>
                            <button className="relative px-4 py-2 bg-blue-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all overflow-hidden group">
                                <span className="relative z-10 flex items-center gap-2">
                                    <Plus className="w-4 h-4" />
                                    Add Member
                                </span>
                                <span className="absolute inset-0 bg-blue-700 transform scale-0 group-hover:scale-100 transition-transform rounded-lg"></span>
                            </button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
                <div className="flex justify-around items-center h-16">
                    <Link to={createPageUrl("TreeView")} className="flex-1">
                        <button
                            className={`w-full h-full flex flex-col items-center justify-center gap-1 transition-colors ${isTreeView
                                ? "text-blue-600"
                                : "text-gray-500"
                                }`}
                        >
                            <Network className="w-5 h-5" />
                            <span className="text-xs font-medium">Tree</span>
                        </button>
                    </Link>
                    <Link to={createPageUrl("AddMember")} className="flex-1">
                        <button
                            className={`w-full h-full flex flex-col items-center justify-center gap-1 transition-colors ${location.pathname === createPageUrl("AddMember")
                                ? "text-blue-600"
                                : "text-gray-500"
                                }`}
                        >
                            <Plus className="w-5 h-5" />
                            <span className="text-xs font-medium">Add</span>
                        </button>
                    </Link>
                </div>
            </nav>

            {/* Main Content */}
            <main className="pt-16 pb-20 md:pb-8">
                {children}
            </main>
        </div>
    );
}
