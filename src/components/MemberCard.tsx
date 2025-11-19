import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { User, Calendar, Briefcase, MapPin, Heart, CheckCircle2, Circle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/utils";

export default function MemberCard({
    member,
    onClick,
    familyMembers = [],
    isSelected = false,
    onToggleSelect,
    selectionMode = false
}) {
    const getFullName = () => {
        return `${member.first_name} ${member.last_name}`;
    };

    const getAge = () => {
        if (!member.birth_date) return null;
        const birth = new Date(member.birth_date);
        const end = member.death_date ? new Date(member.death_date) : new Date();
        const age = end.getFullYear() - birth.getFullYear();
        return age;
    };

    const getRelationshipCount = () => {
        let count = 0;
        if (member.father_id) count++;
        if (member.mother_id) count++;
        if (member.spouse_ids?.length) count += member.spouse_ids.length;
        if (member.sibling_ids?.length) count += member.sibling_ids.length;
        const children = familyMembers.filter(
            m => m.father_id === member.id || m.mother_id === member.id
        );
        count += children.length;
        return count;
    };

    const handleCardClick = (e) => {
        // Don't do anything if clicking the checkbox
        if (e.target.closest('.selection-checkbox')) {
            return;
        }
        // Open details dialog
        onClick();
    };

    const handleCheckboxClick = (e) => {
        e.stopPropagation();
        onToggleSelect();
    };

    return (
        <Card
            onClick={handleCardClick}
            className={cn(
                "relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group bg-white",
                isSelected && "ring-4 ring-blue-500 shadow-xl"
            )}
        >
            {/* Selection Checkbox - Always visible */}
            <div
                className="selection-checkbox absolute top-3 right-3 z-10"
            >
                <button
                    onClick={handleCheckboxClick}
                    className={cn(
                        "w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all shadow-sm",
                        isSelected
                            ? "bg-blue-600 border-blue-600"
                            : "bg-white border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                    )}
                >
                    {isSelected ? (
                        <CheckCircle2 className="w-5 h-5 text-white" fill="white" />
                    ) : (
                        <Circle className="w-4 h-4 text-gray-400" />
                    )}
                </button>
            </div>

            {/* Ripple effect container */}
            <div className="absolute inset-0 overflow-hidden">
                <span className={cn(
                    "absolute inset-0 transition-opacity duration-300",
                    isSelected ? "bg-blue-600 opacity-10" : "bg-blue-600 opacity-0 group-hover:opacity-5"
                )}></span>
            </div>

            <CardContent className="p-6">
                <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="relative">
                        <div
                            className={cn(
                                "w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110",
                                member.gender === "male"
                                    ? "bg-gradient-to-br from-blue-500 to-blue-600"
                                    : member.gender === "female"
                                        ? "bg-gradient-to-br from-pink-500 to-pink-600"
                                        : "bg-gradient-to-br from-purple-500 to-purple-600"
                            )}
                        >
                            {member.photo_url ? (
                                <img
                                    src={member.photo_url}
                                    alt={getFullName()}
                                    className="w-full h-full rounded-full object-cover"
                                />
                            ) : (
                                <User className="w-8 h-8 text-white" />
                            )}
                        </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {getFullName()}
                        </h3>
                        {member.maiden_name && (
                            <p className="text-sm text-gray-500">née {member.maiden_name}</p>
                        )}

                        <div className="mt-3 space-y-1.5">
                            {member.birth_date && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    <span>
                                        {format(new Date(member.birth_date), "MMM d, yyyy")}
                                        {getAge() && ` (${getAge()} yrs)`}
                                    </span>
                                </div>
                            )}

                            {member.occupation && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Briefcase className="w-4 h-4 text-gray-400" />
                                    <span className="truncate">{member.occupation}</span>
                                </div>
                            )}

                            {member.birth_place && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <MapPin className="w-4 h-4 text-gray-400" />
                                    <span className="truncate">{member.birth_place}</span>
                                </div>
                            )}
                        </div>

                        {/* Relationship badge */}
                        {getRelationshipCount() > 0 && (
                            <div className="mt-3 inline-flex items-center px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                                {getRelationshipCount()} relationship{getRelationshipCount() !== 1 ? "s" : ""}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}