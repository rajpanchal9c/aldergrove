import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    User, Calendar, Briefcase, MapPin, Heart,
    BookOpen, Edit, Trash2, Users
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function MemberDialog({ member, open, onClose, familyMembers, onDelete }) {
    const navigate = useNavigate();

    if (!member) return null;

    const getFullName = () => `${member.first_name} ${member.last_name}`;

    const getFather = () => familyMembers.find(m => m.id === member.father_id);
    const getMother = () => familyMembers.find(m => m.id === member.mother_id);
    const getSpouses = () => member.spouse_ids?.map(id => familyMembers.find(m => m.id === id)).filter(Boolean) || [];
    const getSiblings = () => member.sibling_ids?.map(id => familyMembers.find(m => m.id === id)).filter(Boolean) || [];
    const getChildren = () => familyMembers.filter(m => m.father_id === member.id || m.mother_id === member.id);

    const handleEdit = () => {
        navigate(`${createPageUrl("AddMember")}?id=${member.id}`);
        onClose();
    };

    const handleDelete = () => {
        if (window.confirm(`Are you sure you want to remove ${getFullName()} from the family tree?`)) {
            onDelete(member.id);
            onClose();
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose} >
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3" >
                        <div
                            className={
                                `w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${member.gender === "male"
                                    ? "bg-gradient-to-br from-blue-500 to-blue-600"
                                    : member.gender === "female"
                                        ? "bg-gradient-to-br from-pink-500 to-pink-600"
                                        : "bg-gradient-to-br from-purple-500 to-purple-600"
                                }`
                            }
                        >
                            {
                                member.photo_url ? (
                                    <img
                                        src={member.photo_url}
                                        alt={getFullName()}
                                        className="w-full h-full rounded-full object-cover"
                                    />
                                ) : (
                                    <User className="w-6 h-6 text-white" />
                                )
                            }
                        </div>
                        < div >
                            <h2 className="text-2xl font-bold" > {getFullName()} </h2>
                            {
                                member.maiden_name && (
                                    <p className="text-sm text-gray-500 font-normal" > née {member.maiden_name} </p>
                                )
                            }
                        </div>
                    </DialogTitle>
                </DialogHeader>

                < div className="space-y-6 mt-4" >
                    {/* Life Details */}
                    < div className="grid md:grid-cols-2 gap-4" >
                        {
                            member.birth_date && (
                                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                    <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
                                    < div >
                                        <p className="text-sm font-medium text-gray-500"> Birth </p>
                                        < p className="text-sm text-gray-900" >
                                            {format(new Date(member.birth_date), "MMMM d, yyyy")
                                            }
                                        </p>
                                    </div>
                                </div>
                            )}

                        {
                            member.death_date && (
                                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg" >
                                    <Calendar className="w-5 h-5 text-gray-600 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-500" > Death </p>
                                        < p className="text-sm text-gray-900" >
                                            {format(new Date(member.death_date), "MMMM d, yyyy")
                                            }
                                        </p>
                                    </div>
                                </div>
                            )}

                        {
                            member.occupation && (
                                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg" >
                                    <Briefcase className="w-5 h-5 text-blue-600 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-500" > Occupation </p>
                                        < p className="text-sm text-gray-900" > {member.occupation} </p>
                                    </div>
                                </div>
                            )
                        }

                        {
                            member.birth_place && (
                                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg" >
                                    <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-500" > Birth Place </p>
                                        < p className="text-sm text-gray-900" > {member.birth_place} </p>
                                    </div>
                                </div>
                            )
                        }
                    </div>

                    {/* Biography */}
                    {
                        member.bio && (
                            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200" >
                                <div className="flex items-center gap-2 mb-2" >
                                    <BookOpen className="w-5 h-5 text-blue-600" />
                                    <h3 className="font-semibold text-gray-900" > Biography </h3>
                                </div>
                                < p className="text-sm text-gray-700 leading-relaxed" > {member.bio} </p>
                            </div>
                        )
                    }

                    {/* Relationships */}
                    <div>
                        <div className="flex items-center gap-2 mb-3" >
                            <Users className="w-5 h-5 text-blue-600" />
                            <h3 className="font-semibold text-gray-900" > Relationships </h3>
                        </div>

                        < div className="space-y-3" >
                            {getFather() && (
                                <div className="flex items-center gap-2 text-sm" >
                                    <span className="font-medium text-gray-500 w-24" > Father: </span>
                                    < span className="text-gray-900" > {getFather().first_name} {getFather().last_name} </span>
                                </div>
                            )}

                            {
                                getMother() && (
                                    <div className="flex items-center gap-2 text-sm" >
                                        <span className="font-medium text-gray-500 w-24" > Mother: </span>
                                        < span className="text-gray-900" > {getMother().first_name} {getMother().last_name} </span>
                                    </div>
                                )
                            }

                            {
                                getSiblings().length > 0 && (
                                    <div className="flex items-start gap-2 text-sm" >
                                        <span className="font-medium text-gray-500 w-24" > Siblings: </span>
                                        < div className="flex flex-wrap gap-2" >
                                            {
                                                getSiblings().map(sibling => (
                                                    <span key={sibling.id} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full" >
                                                        {sibling.first_name} {sibling.last_name}
                                                    </span>
                                                ))
                                            }
                                        </div>
                                    </div>
                                )
                            }

                            {
                                getSpouses().length > 0 && (
                                    <div className="flex items-start gap-2 text-sm" >
                                        <span className="font-medium text-gray-500 w-24" > Spouse: </span>
                                        < div className="flex flex-wrap gap-2" >
                                            {
                                                getSpouses().map(spouse => (
                                                    <span key={spouse.id} className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded-full" >
                                                        <Heart className="w-3 h-3" fill="currentColor" />
                                                        {spouse.first_name} {spouse.last_name}
                                                    </span>
                                                ))
                                            }
                                        </div>
                                    </div>
                                )
                            }

                            {
                                getChildren().length > 0 && (
                                    <div className="flex items-start gap-2 text-sm" >
                                        <span className="font-medium text-gray-500 w-24" > Children: </span>
                                        < div className="flex flex-wrap gap-2" >
                                            {
                                                getChildren().map(child => (
                                                    <span key={child.id} className="px-2 py-1 bg-green-50 text-green-700 rounded-full" >
                                                        {child.first_name} {child.last_name}
                                                    </span>
                                                ))
                                            }
                                        </div>
                                    </div>
                                )
                            }
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t" >
                        <Button
                            onClick={handleEdit}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all"
                        >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Details
                        </Button>
                        < Button
                            onClick={handleDelete}
                            variant="outline"
                            className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}