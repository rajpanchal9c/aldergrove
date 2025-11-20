import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileDown, FileText, Download } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function ExportDialog({ open, onOpenChange, familyMembers, treeContainerRef }) {
    const [isExporting, setIsExporting] = useState(false);

    const handleCSVExport = () => {
        const headers = [
            "first_name",
            "last_name",
            "maiden_name",
            "gender",
            "birth_date",
            "death_date",
            "birth_place",
            "photo_url",
            "bio",
            "occupation",
            "father_id",
            "mother_id",
            "spouse_ids",
            "sibling_ids"
        ];

        const csvContent = [
            headers.join(","),
            ...familyMembers.map(member => {
                return headers.map(header => {
                    let value = member[header] || "";

                    // Handle array fields
                    if (Array.isArray(value)) {
                        value = value.join(";");
                    }

                    // Escape quotes and wrap in quotes if contains comma
                    if (typeof value === "string") {
                        value = value.replace(/"/g, '""');
                        if (value.includes(",") || value.includes("\n") || value.includes('"')) {
                            value = `"${value}"`;
                        }
                    }

                    return value;
                }).join(",");
            })
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);

        link.setAttribute("href", url);
        link.setAttribute("download", `family_tree_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = "hidden";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        onOpenChange(false);
    };

    const handlePDFExport = async () => {
        if (!treeContainerRef?.current) {
            alert("Tree visualization not available");
            return;
        }

        setIsExporting(true);

        try {
            // Get the tree container
            const treeElement = treeContainerRef.current;

            // Capture the tree as canvas
            const canvas = await html2canvas(treeElement, {
                backgroundColor: "#ffffff",
                scale: 2, // Higher quality
                logging: false,
                useCORS: true
            });

            // Calculate PDF dimensions
            const imgWidth = 210; // A4 width in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            // Create PDF
            const pdf = new jsPDF({
                orientation: imgHeight > imgWidth ? "portrait" : "landscape",
                unit: "mm",
                format: "a4"
            });

            // Add title
            pdf.setFontSize(20);
            pdf.text("Family Tree", 10, 15);

            pdf.setFontSize(10);
            pdf.text(`Exported on: ${new Date().toLocaleDateString()}`, 10, 22);
            pdf.text(`Total Members: ${familyMembers.length}`, 10, 27);

            // Add tree image
            const imgData = canvas.toDataURL("image/png");

            if (imgHeight > 270) { // If too tall for one page
                // Add on multiple pages
                let heightLeft = imgHeight;
                let position = 35;

                pdf.addImage(imgData, "PNG", 10, position, imgWidth - 20, imgHeight);
                heightLeft -= 270;

                while (heightLeft > 0) {
                    position = heightLeft - imgHeight + 35;
                    pdf.addPage();
                    pdf.addImage(imgData, "PNG", 10, position, imgWidth - 20, imgHeight);
                    heightLeft -= 270;
                }
            } else {
                pdf.addImage(imgData, "PNG", 10, 35, imgWidth - 20, imgHeight);
            }

            // Save PDF
            pdf.save(`family_tree_${new Date().toISOString().split('T')[0]}.pdf`);

            onOpenChange(false);
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Failed to generate PDF. Please try again.");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">Export Family Tree</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <p className="text-sm text-gray-600">
                        Choose your preferred export format:
                    </p>

                    {/* CSV Export Option */}
                    <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start gap-3">
                            <FileText className="w-6 h-6 text-green-600 mt-1" />
                            <div className="flex-1">
                                <h3 className="font-semibold text-lg">Export as CSV</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    Download all family member data in CSV format. Perfect for importing into spreadsheets or other applications.
                                </p>
                                <Button
                                    onClick={handleCSVExport}
                                    className="mt-3 bg-green-600 hover:bg-green-700"
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Download CSV
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* PDF Export Option */}
                    <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start gap-3">
                            <FileDown className="w-6 h-6 text-red-600 mt-1" />
                            <div className="flex-1">
                                <h3 className="font-semibold text-lg">Export as PDF</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    Generate a PDF document with your family tree visualization. Great for printing or sharing.
                                </p>
                                <Button
                                    onClick={handlePDFExport}
                                    disabled={isExporting}
                                    className="mt-3 bg-red-600 hover:bg-red-700"
                                >
                                    {isExporting ? (
                                        <>
                                            <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-4 h-4 mr-2" />
                                            Download PDF
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
