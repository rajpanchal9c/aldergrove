import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Upload, Download, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function CSVImportDialog({ open, onClose }) {
    const [file, setFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const queryClient = useQueryClient();

    const downloadTemplate = () => {
        const template = `id,first_name,last_name,maiden_name,gender,birth_date,death_date,birth_place,photo_url,bio,occupation,father_id,mother_id,spouse_ids,sibling_ids
member1,John,Doe,,male,1950-01-15,,,https://example.com/photo.jpg,Loving father and grandfather,Engineer,,,member2,
member2,Jane,Smith,Johnson,female,1952-03-20,,,,,Teacher,,,member1,
member3,James,Doe,,male,1975-06-10,,,,,Software Developer,member1,member2,,
member4,Emily,Doe,Brown,female,1977-08-25,,,,,Doctor,member1,member2,,member3`;

        const blob = new Blob([template], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "family_tree_template.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success("Template downloaded!");
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (!selectedFile.name.endsWith(".csv")) {
                toast.error("Please select a CSV file");
                return;
            }
            setFile(selectedFile);
            setImportResult(null);
        }
    };

    const parseCSV = (text) => {
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const result = [];

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;

            const obj = {};
            let currentLine = lines[i];
            let inQuotes = false;
            let currentValue = '';
            let headerIndex = 0;

            for (let charIndex = 0; charIndex < currentLine.length; charIndex++) {
                const char = currentLine[charIndex];

                if (char === '"') {
                    if (inQuotes && currentLine[charIndex + 1] === '"') {
                        currentValue += '"';
                        charIndex++;
                    } else {
                        inQuotes = !inQuotes;
                    }
                } else if (char === ',' && !inQuotes) {
                    if (headerIndex < headers.length) {
                        obj[headers[headerIndex]] = currentValue.trim();
                    }
                    headerIndex++;
                    currentValue = '';
                } else {
                    currentValue += char;
                }
            }
            // Add last value
            if (headerIndex < headers.length) {
                obj[headers[headerIndex]] = currentValue.trim();
            }

            result.push(obj);
        }
        return result;
    };

    const handleImport = async () => {
        if (!file) {
            toast.error("Please select a file first");
            return;
        }

        setIsProcessing(true);
        setImportResult(null);

        try {
            // Step 1: Read the file
            const text = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result);
                reader.onerror = (e) => reject(e);
                reader.readAsText(file);
            });

            // Step 2: Parse CSV data
            toast.info("Processing CSV data...");
            const membersData = parseCSV(text as string);

            if (membersData.length === 0) {
                throw new Error("No valid data found in CSV file");
            }

            // Step 3: Process and clean the data
            const processedMembers = membersData.map(member => {
                const cleaned = { ...member };

                // Remove empty values
                Object.keys(cleaned).forEach(key => {
                    if (cleaned[key] === "" || cleaned[key] === null || cleaned[key] === undefined) {
                        delete cleaned[key];
                    }
                });

                // Handle comma-separated or semicolon-separated spouse_ids and sibling_ids
                if (cleaned.spouse_ids && typeof cleaned.spouse_ids === "string") {
                    const separator = cleaned.spouse_ids.includes(";") ? ";" : ",";
                    cleaned.spouse_ids = cleaned.spouse_ids.split(separator).map(id => id.trim()).filter(Boolean);
                }
                if (cleaned.sibling_ids && typeof cleaned.sibling_ids === "string") {
                    const separator = cleaned.sibling_ids.includes(";") ? ";" : ",";
                    cleaned.sibling_ids = cleaned.sibling_ids.split(separator).map(id => id.trim()).filter(Boolean);
                }

                // Ensure arrays are arrays
                if (cleaned.spouse_ids && !Array.isArray(cleaned.spouse_ids)) {
                    cleaned.spouse_ids = [cleaned.spouse_ids];
                }
                if (cleaned.sibling_ids && !Array.isArray(cleaned.sibling_ids)) {
                    cleaned.sibling_ids = [cleaned.sibling_ids];
                }

                // Remove id from the data to be created (it will be auto-generated)
                // But we'll need to map old IDs to new IDs for relationships
                delete cleaned.id;

                return cleaned;
            });

            // Step 4: Bulk create members
            toast.info(`Creating ${processedMembers.length} family members...`);
            const createdMembers = await base44.entities.FamilyMember.bulkCreate(processedMembers);

            // Step 5: Update relationships if IDs were provided in CSV
            // This handles the case where CSV has id references
            const idMapping = {};
            membersData.forEach((original, idx) => {
                if (original.id && createdMembers[idx]) {
                    idMapping[original.id] = createdMembers[idx].id;
                }
            });

            // Update members with correct relationship IDs
            const updatePromises = [];
            for (let i = 0; i < membersData.length; i++) {
                const original = membersData[i];
                const created = createdMembers[i];
                const updates: any = {};

                if (original.father_id && idMapping[original.father_id]) {
                    updates.father_id = idMapping[original.father_id];
                }
                if (original.mother_id && idMapping[original.mother_id]) {
                    updates.mother_id = idMapping[original.mother_id];
                }
                if (original.spouse_ids) {
                    const spouseIds = typeof original.spouse_ids === "string"
                        ? original.spouse_ids.split(original.spouse_ids.includes(";") ? ";" : ",").map(id => id.trim()).filter(Boolean)
                        : original.spouse_ids;
                    updates.spouse_ids = spouseIds.map(oldId => idMapping[oldId] || oldId).filter(Boolean);
                }
                if (original.sibling_ids) {
                    const siblingIds = typeof original.sibling_ids === "string"
                        ? original.sibling_ids.split(original.sibling_ids.includes(";") ? ";" : ",").map(id => id.trim()).filter(Boolean)
                        : original.sibling_ids;
                    updates.sibling_ids = siblingIds.map(oldId => idMapping[oldId] || oldId).filter(Boolean);
                }

                if (Object.keys(updates).length > 0) {
                    updatePromises.push(
                        base44.entities.FamilyMember.update(created.id, updates)
                    );
                }
            }

            if (updatePromises.length > 0) {
                toast.info("Updating relationships...");
                await Promise.all(updatePromises);
            }

            // Success!
            queryClient.invalidateQueries({ queryKey: ["familyMembers"] });
            setImportResult({
                status: "success",
                count: createdMembers.length
            });
            toast.success(`Successfully imported ${createdMembers.length} family members!`);

            // Reset file input
            setFile(null);

        } catch (error) {
            console.error("Import error:", error);
            setImportResult({
                status: "error",
                message: error.message || "Failed to import CSV file"
            });
            toast.error(error.message || "Failed to import CSV file");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setImportResult(null);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        Import Family Tree from CSV
                    </DialogTitle>
                    <DialogDescription>
                        Upload a CSV file to bulk import family members and their relationships
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                    {/* Instructions */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                            <Download className="w-4 h-4" />
                            How to use:
                        </h3>
                        <ol className="text-sm text-blue-800 space-y-1 ml-4 list-decimal">
                            <li>Download the CSV template below</li>
                            <li>Fill in your family members' information</li>
                            <li>Use consistent IDs to link relationships (father_id, mother_id, spouse_ids, sibling_ids)</li>
                            <li>Upload the completed CSV file</li>
                        </ol>
                    </div>

                    {/* Download Template */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div>
                            <h4 className="font-semibold text-gray-900">CSV Template</h4>
                            <p className="text-sm text-gray-600">Download a sample template with example data</p>
                        </div>
                        <Button
                            onClick={downloadTemplate}
                            variant="outline"
                            className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Download Template
                        </Button>
                    </div>

                    {/* File Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Upload Your CSV File
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileChange}
                                className="hidden"
                                id="csv-upload"
                                disabled={isProcessing}
                            />
                            <label
                                htmlFor="csv-upload"
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed rounded-lg transition-all cursor-pointer ${file
                                    ? "border-green-400 bg-green-50"
                                    : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50"
                                    } ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                                {file ? (
                                    <>
                                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                                        <span className="text-sm text-green-700 font-medium">{file.name}</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-5 h-5 text-gray-400" />
                                        <span className="text-sm text-gray-600">Click to select CSV file</span>
                                    </>
                                )}
                            </label>
                        </div>
                    </div>

                    {/* Import Result */}
                    {importResult && (
                        <div
                            className={`p-4 rounded-lg border-2 ${importResult.status === "success"
                                ? "bg-green-50 border-green-300"
                                : "bg-red-50 border-red-300"
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                {importResult.status === "success" ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                                ) : (
                                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                                )}
                                <div className="flex-1">
                                    <h4
                                        className={`font-semibold ${importResult.status === "success" ? "text-green-900" : "text-red-900"
                                            }`}
                                    >
                                        {importResult.status === "success" ? "Import Successful!" : "Import Failed"}
                                    </h4>
                                    <p
                                        className={`text-sm mt-1 ${importResult.status === "success" ? "text-green-700" : "text-red-700"
                                            }`}
                                    >
                                        {importResult.status === "success"
                                            ? `Successfully imported ${importResult.count} family members`
                                            : importResult.message}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
                            {importResult?.status === "success" ? "Close" : "Cancel"}
                        </Button>
                        <Button
                            onClick={handleImport}
                            disabled={!file || isProcessing}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Import CSV
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}