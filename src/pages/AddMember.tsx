
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
    User, Calendar, MapPin, Briefcase,
    BookOpen, Users, Heart, Save,
    ArrowLeft, Upload, Loader2, X
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function AddMember() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get("id");

    const [isUploading, setIsUploading] = useState(false);
    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        maiden_name: "",
        gender: "", // Changed from "male" to ""
        birth_date: "",
        death_date: "",
        birth_place: "",
        photo_url: "",
        bio: "",
        occupation: "",
        father_id: "",
        mother_id: "",
        spouse_ids: [],
        sibling_ids: [],
    });

    const { data: familyMembers } = useQuery({
        queryKey: ["familyMembers"],
        queryFn: () => base44.entities.FamilyMember.list("-created_date"),
        initialData: [],
    });

    // Load member for editing
    useEffect(() => {
        if (editId && familyMembers.length > 0) {
            const member = familyMembers.find(m => m.id === editId);
            if (member) {
                setFormData({
                    first_name: member.first_name || "",
                    last_name: member.last_name || "",
                    maiden_name: member.maiden_name || "",
                    gender: member.gender || "", // Changed from "male" to ""
                    birth_date: member.birth_date || "",
                    death_date: member.death_date || "",
                    birth_place: member.birth_place || "",
                    photo_url: member.photo_url || "",
                    bio: member.bio || "",
                    occupation: member.occupation || "",
                    father_id: member.father_id || "",
                    mother_id: member.mother_id || "",
                    spouse_ids: member.spouse_ids || [],
                    sibling_ids: member.sibling_ids || [],
                });
            }
        }
    }, [editId, familyMembers]);

    const createMutation = useMutation({
        mutationFn: (data: any) =>
            editId
                ? base44.entities.FamilyMember.update(editId, data)
                : base44.entities.FamilyMember.create(data),
        onSuccess: async (newMember) => {
            const memberId = newMember.id;
            const newSpouseIds = formData.spouse_ids || [];

            // 1. Add connection for new spouses
            const updatePromises = newSpouseIds.map(async (spouseId) => {
                const spouse = familyMembers.find(m => m.id === spouseId);
                if (spouse && (!spouse.spouse_ids || !spouse.spouse_ids.includes(memberId))) {
                    const updatedSpouseIds = [...(spouse.spouse_ids || []), memberId];
                    await base44.entities.FamilyMember.update(spouseId, { spouse_ids: updatedSpouseIds });
                }
            });

            // 2. Remove connection for removed spouses
            // Find members who have this member as spouse but are not in the newSpouseIds list
            const removedSpouses = familyMembers.filter(m =>
                m.spouse_ids?.includes(memberId) && !newSpouseIds.includes(m.id)
            );

            removedSpouses.forEach(spouse => {
                updatePromises.push((async () => {
                    const updatedSpouseIds = spouse.spouse_ids.filter(id => id !== memberId);
                    await base44.entities.FamilyMember.update(spouse.id, { spouse_ids: updatedSpouseIds });
                })());
            });

            await Promise.all(updatePromises);

            queryClient.invalidateQueries({ queryKey: ["familyMembers"] });
            toast.success(editId ? "Member updated successfully!" : "Member added successfully!");
            navigate(createPageUrl("TreeView"));
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validate gender is selected
        if (!formData.gender) {
            toast.error("Please select a gender");
            return;
        }

        // Clean up empty values
        const cleanData = { ...formData };
        if (!cleanData.maiden_name) delete cleanData.maiden_name;
        if (!cleanData.death_date) delete cleanData.death_date;
        if (!cleanData.birth_place) delete cleanData.birth_place;
        if (!cleanData.photo_url) delete cleanData.photo_url;
        if (!cleanData.bio) delete cleanData.bio;
        if (!cleanData.occupation) delete cleanData.occupation;
        if (!cleanData.father_id) delete cleanData.father_id;
        if (!cleanData.mother_id) delete cleanData.mother_id;
        if (!cleanData.spouse_ids?.length) delete cleanData.spouse_ids;
        if (!cleanData.sibling_ids?.length) delete cleanData.sibling_ids;

        createMutation.mutate(cleanData);
    };

    const handlePhotoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file }) as any;
            setFormData(prev => ({ ...prev, photo_url: file_url }));
            toast.success("Photo uploaded!");
        } catch (error) {
            toast.error("Failed to upload photo");
        }
        setIsUploading(false);
    };

    const addSpouse = (spouseId) => {
        if (spouseId && !formData.spouse_ids.includes(spouseId)) {
            setFormData(prev => ({
                ...prev,
                spouse_ids: [...prev.spouse_ids, spouseId]
            }));
        }
    };

    const removeSpouse = (spouseId) => {
        setFormData(prev => ({
            ...prev,
            spouse_ids: prev.spouse_ids.filter(id => id !== spouseId)
        }));
    };

    const addSibling = (siblingId) => {
        if (siblingId && !formData.sibling_ids.includes(siblingId)) {
            setFormData(prev => ({
                ...prev,
                sibling_ids: [...prev.sibling_ids, siblingId]
            }));
        }
    };

    const removeSibling = (siblingId) => {
        setFormData(prev => ({
            ...prev,
            sibling_ids: prev.sibling_ids.filter(id => id !== siblingId)
        }));
    };

    const maleMembersForParents = familyMembers.filter(m => m.gender === "male" && m.id !== editId);
    const femaleMembersForParents = familyMembers.filter(m => m.gender === "female" && m.id !== editId);
    const potentialSpouses = familyMembers.filter(m => m.id !== editId && !formData.spouse_ids.includes(m.id));
    const potentialSiblings = familyMembers.filter(m => m.id !== editId && !formData.sibling_ids.includes(m.id));

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            {/* Header */}
            <div className="mb-8">
                <Button
                    variant="ghost"
                    onClick={() => navigate(createPageUrl("TreeView"))}
                    className="mb-4 -ml-2"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Tree
                </Button>
                <h1 className="text-3xl font-bold text-gray-900">
                    {editId ? "Edit Family Member" : "Add Family Member"}
                </h1>
                <p className="text-gray-600 mt-1">
                    Fill in the details to {editId ? "update" : "add"} a member to your family tree
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <Card className="shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
                        <CardTitle className="flex items-center gap-2">
                            <User className="w-5 h-5 text-blue-600" />
                            Basic Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="first_name" className="text-sm font-medium">
                                    First Name *
                                </Label>
                                <Input
                                    id="first_name"
                                    required
                                    value={formData.first_name}
                                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                    className="mt-1.5 border-2 focus:border-blue-600 transition-colors"
                                />
                            </div>

                            <div>
                                <Label htmlFor="last_name" className="text-sm font-medium">
                                    Last Name *
                                </Label>
                                <Input
                                    id="last_name"
                                    required
                                    value={formData.last_name}
                                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                    className="mt-1.5 border-2 focus:border-blue-600 transition-colors"
                                />
                            </div>

                            <div>
                                <Label htmlFor="maiden_name" className="text-sm font-medium">
                                    Maiden Name
                                </Label>
                                <Input
                                    id="maiden_name"
                                    value={formData.maiden_name}
                                    onChange={(e) => setFormData({ ...formData, maiden_name: e.target.value })}
                                    className="mt-1.5 border-2 focus:border-blue-600 transition-colors"
                                />
                            </div>

                            <div>
                                <Label htmlFor="gender" className="text-sm font-medium">
                                    Gender *
                                </Label>
                                <Select
                                    value={formData.gender}
                                    onValueChange={(value) => setFormData({ ...formData, gender: value })}
                                    required
                                >
                                    <SelectTrigger className={`mt-1.5 border-2 ${!formData.gender ? 'border-amber-400 bg-amber-50' : ''}`}>
                                        <SelectValue placeholder="Select gender" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="male">Male</SelectItem>
                                        <SelectItem value="female">Female</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                                {!formData.gender && (
                                    <p className="text-xs text-amber-600 mt-1">
                                        Required for parent relationships
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Photo Upload */}
                        <div>
                            <Label className="text-sm font-medium">Profile Photo</Label>
                            <div className="mt-1.5 flex items-center gap-4">
                                {formData.photo_url && (
                                    <img
                                        src={formData.photo_url}
                                        alt="Profile"
                                        className="w-16 h-16 rounded-full object-cover shadow-md"
                                    />
                                )}
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => document.getElementById("photo-upload").click()}
                                    disabled={isUploading}
                                    className="border-2"
                                >
                                    {isUploading ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Upload className="w-4 h-4 mr-2" />
                                    )}
                                    Upload Photo
                                </Button>
                                <input
                                    id="photo-upload"
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePhotoUpload}
                                    className="hidden"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Life Events */}
                <Card className="shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b">
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-green-600" />
                            Life Events
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="birth_date" className="text-sm font-medium">
                                    Birth Date
                                </Label>
                                <Input
                                    id="birth_date"
                                    type="date"
                                    value={formData.birth_date}
                                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                                    className="mt-1.5 border-2 focus:border-blue-600 transition-colors"
                                />
                            </div>

                            <div>
                                <Label htmlFor="death_date" className="text-sm font-medium">
                                    Death Date
                                </Label>
                                <Input
                                    id="death_date"
                                    type="date"
                                    value={formData.death_date}
                                    onChange={(e) => setFormData({ ...formData, death_date: e.target.value })}
                                    className="mt-1.5 border-2 focus:border-blue-600 transition-colors"
                                />
                            </div>

                            <div>
                                <Label htmlFor="birth_place" className="text-sm font-medium">
                                    <MapPin className="w-4 h-4 inline mr-1" />
                                    Birth Place
                                </Label>
                                <Input
                                    id="birth_place"
                                    value={formData.birth_place}
                                    onChange={(e) => setFormData({ ...formData, birth_place: e.target.value })}
                                    placeholder="City, Country"
                                    className="mt-1.5 border-2 focus:border-blue-600 transition-colors"
                                />
                            </div>

                            <div>
                                <Label htmlFor="occupation" className="text-sm font-medium">
                                    <Briefcase className="w-4 h-4 inline mr-1" />
                                    Occupation
                                </Label>
                                <Input
                                    id="occupation"
                                    value={formData.occupation}
                                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                                    className="mt-1.5 border-2 focus:border-blue-600 transition-colors"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Biography */}
                <Card className="shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 border-b">
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-purple-600" />
                            Biography
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <Textarea
                            value={formData.bio}
                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            placeholder="Share their life story, achievements, memories..."
                            rows={4}
                            className="border-2 focus:border-blue-600 transition-colors"
                        />
                    </CardContent>
                </Card>

                {/* Relationships */}
                <Card className="shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 border-b">
                        <CardTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-orange-600" />
                            Relationships
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        {/* Parents */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="father_id" className="text-sm font-medium">
                                    Father
                                </Label>
                                <Select
                                    value={formData.father_id}
                                    onValueChange={(value) => setFormData({ ...formData, father_id: value })}
                                >
                                    <SelectTrigger className="mt-1.5 border-2">
                                        <SelectValue placeholder="Select father" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={null}>None</SelectItem>
                                        {maleMembersForParents.map(member => (
                                            <SelectItem key={member.id} value={member.id}>
                                                {member.first_name} {member.last_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="mother_id" className="text-sm font-medium">
                                    Mother
                                </Label>
                                <Select
                                    value={formData.mother_id}
                                    onValueChange={(value) => setFormData({ ...formData, mother_id: value })}
                                >
                                    <SelectTrigger className="mt-1.5 border-2">
                                        <SelectValue placeholder="Select mother" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={null}>None</SelectItem>
                                        {femaleMembersForParents.map(member => (
                                            <SelectItem key={member.id} value={member.id}>
                                                {member.first_name} {member.last_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Spouses/Partners */}
                        <div>
                            <Label className="text-sm font-medium flex items-center gap-2">
                                <Heart className="w-4 h-4 text-red-500" />
                                Spouse(s) / Partner(s)
                            </Label>
                            <div className="mt-2 space-y-3">
                                {formData.spouse_ids.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {formData.spouse_ids.map(spouseId => {
                                            const spouse = familyMembers.find(m => m.id === spouseId);
                                            if (!spouse) return null;
                                            return (
                                                <Badge key={spouseId} className="bg-red-50 text-red-700 border-red-200 pr-1">
                                                    {spouse.first_name} {spouse.last_name}
                                                    <button
                                                        type="button"
                                                        onClick={() => removeSpouse(spouseId)}
                                                        className="ml-2 hover:bg-red-200 rounded-full p-0.5"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </Badge>
                                            );
                                        })}
                                    </div>
                                )}
                                <Select onValueChange={addSpouse}>
                                    <SelectTrigger className="border-2">
                                        <SelectValue placeholder="Add spouse or partner" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {potentialSpouses.map(member => (
                                            <SelectItem key={member.id} value={member.id}>
                                                {member.first_name} {member.last_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Siblings */}
                        <div>
                            <Label className="text-sm font-medium flex items-center gap-2">
                                <Users className="w-4 h-4 text-blue-500" />
                                Siblings
                            </Label>
                            <div className="mt-2 space-y-3">
                                {formData.sibling_ids.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {formData.sibling_ids.map(siblingId => {
                                            const sibling = familyMembers.find(m => m.id === siblingId);
                                            if (!sibling) return null;
                                            return (
                                                <Badge key={siblingId} className="bg-blue-50 text-blue-700 border-blue-200 pr-1">
                                                    {sibling.first_name} {sibling.last_name}
                                                    <button
                                                        type="button"
                                                        onClick={() => removeSibling(siblingId)}
                                                        className="ml-2 hover:bg-blue-200 rounded-full p-0.5"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </Badge>
                                            );
                                        })}
                                    </div>
                                )}
                                <Select onValueChange={addSibling}>
                                    <SelectTrigger className="border-2">
                                        <SelectValue placeholder="Add sibling" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {potentialSiblings.map(member => (
                                            <SelectItem key={member.id} value={member.id}>
                                                {member.first_name} {member.last_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Submit Button */}
                <div className="flex justify-end gap-3 pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate(createPageUrl("TreeView"))}
                        className="border-2"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={createMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all px-8"
                    >
                        {createMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        {editId ? "Update Member" : "Add Member"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
