import { useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Upload, X } from "lucide-react";
import clsx from "clsx";
import { bulkUploadFaculty } from "../../utils/admin_api";
import { useToast } from "../../hooks/use-toast";
import { useTheme } from "../../context/ThemeContext";

const API_BASE_URL = "http://127.0.0.1:8000";
const REQUIRED_HEADERS = ["name", "email"]; // Updated to match backend

interface BulkUploadProps {
  setError: (error: string | null) => void;
  toast: (options: any) => void;
}

const BulkUpload = ({ setError, toast }: BulkUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [updatedCount, setUpdatedCount] = useState(0);
  const [successMessage, setSuccessMessage] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { theme } = useTheme();

  const REQUIRED_HEADERS = ["name", "email"];

  const validateFile = (file: File): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const text = e.target?.result as string;

        // Split rows and remove empty lines
        const rows = text.split(/\r?\n/).filter(r => r.trim() !== "");

        if (rows.length < 2) {
          reject("CSV must contain headers and at least one row of data");
          return;
        }

        // Get headers (first row)
        const headers = rows[0].split(",").map(h => h.trim().toLowerCase());
        const required = REQUIRED_HEADERS.map(h => h.toLowerCase());

        const missingHeaders = required.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
          reject(`Missing required column(s): ${missingHeaders.join(", ")}`);
          return;
        }

        // Map headers to indexes
        const nameIndex = headers.indexOf("name");
        const emailIndex = headers.indexOf("email");
        const phoneIndex = headers.indexOf("phone");

        // Validate all rows except the first one (skip header)
        const dataRows = rows.slice(1);
        for (let i = 0; i < dataRows.length; i++) {
          const cols = dataRows[i].split(",").map(c => c.trim());

          // Skip empty rows
          if (cols.every(c => c === "")) continue;

          if (cols.length < headers.length) {
            reject(`Row ${i + 2} does not have enough columns`);
            return;
          }

          const name = cols[nameIndex];
          const email = cols[emailIndex];
          const phone = phoneIndex !== -1 ? cols[phoneIndex] : null;

          // Name validation
          if (!name || name.length < 2) {
            reject(`Invalid name at row ${i + 2}: "${name}"`);
            return;
          }

          // Email validation
          const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/;
          if (!emailRegex.test(email)) {
            reject(`Invalid email at row ${i + 2}: "${email}"`);
            return;
          }

          // Phone validation (if provided)
          if (phone && phone.trim() !== "") {
            const phoneRegex = /^\d{10}$/;
            if (!phoneRegex.test(phone.trim())) {
              reject(`Invalid phone number at row ${i + 2}: "${phone}". Must be exactly 10 digits.`);
              return;
            }
          }
        }

        resolve(true);
      };

      reader.onerror = () => reject("Failed to read file");
      reader.readAsText(file);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setUploadedCount(0);
      setUpdatedCount(0);
      setSuccessMessage("");
      setLocalError(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file to upload");
      return;
    }

    setLoading(true);
    setError(null);
    setLocalError(null);
    setUploadedCount(0);
    setUpdatedCount(0);
    setSuccessMessage("");

    try {
      await validateFile(file);
      const response = await bulkUploadFaculty(file);
      if (response.success) {
        const createdCount = response.created_count || 0;
        const updatedCount = response.updated_count || 0;
        setUploadedCount(createdCount);
        setUpdatedCount(updatedCount);
        
        // Use the backend's detailed message
        const message = response.message || `${createdCount} faculty added, ${updatedCount} faculty updated`;
        setSuccessMessage(message);
        
        toast({ title: "Success", description: message });
        setFile(null);
        if (inputRef.current) inputRef.current.value = "";
        
        // Clear success message after 10 seconds
        setTimeout(() => {
          setUploadedCount(0);
          setUpdatedCount(0);
          setSuccessMessage("");
        }, 10000);
      } else {
        // Backend error - show toast
        setError(response.message || "Failed to upload file");
        toast({
          variant: "destructive",
          title: "Error",
          description: response.message || "Failed to upload file",
        });
      }
    } catch (err: any) {
      // Validation or network error
      setLocalError(err || "Network error while uploading file");
      setError(err || "Network error while uploading file");
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: err || "Network error while uploading file",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = `name,email,phone,designation
    John Doe,john@example.com,9876543210,Assistant Professor`; // Updated template with phone and designation
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "faculty_template.csv");
    link.click();
  };

  return (
    <div className={`px-4  w-full mx-auto ${theme === 'dark' ? 'bg-background' : 'bg-gray-50'}`}>
      <Card className={theme === 'dark' ? 'bg-card shadow-md border border-border text-foreground' : 'bg-white shadow-md border border-gray-200 text-gray-900'}>
        <CardHeader>
          <CardTitle className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Bulk Upload Faculty</CardTitle>
          <CardDescription className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
            Upload CSV or Excel files to bulk enroll faculty members
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onClick={() => inputRef.current?.click()}
            className={clsx(
              "border-2 border-dashed rounded-md px-6 py-10 text-center cursor-pointer transition-all duration-200 relative",
              dragActive
                ? (theme === 'dark' ? "border-primary bg-primary/10 ring-2 ring-primary/20" : "border-blue-400 bg-blue-50 ring-2 ring-blue-200")
                : (theme === 'dark' ? "border-border" : "border-gray-400")
            )}
          >
            <Upload className={`mx-auto mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-400'}`} size={28} />
            <p className={theme === 'dark' ? 'text-foreground' : 'text-gray-400'}>Drag & drop file here</p>
            <p className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`}>Supports CSV, XLS, XLSX (max 5MB)</p>
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                type="button"
                className="text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white"
              >
                Select File
              </Button>
            </div>
            {file && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <span className={`text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-400'}`}>{file.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    if (inputRef.current) inputRef.current.value = "";
                  }}
                  className={theme === 'dark' ? 'text-muted-foreground hover:text-destructive' : 'text-gray-500 hover:text-red-500'}
                >
                  <X size={16} />
                </button>
              </div>
            )}
            <Input
              ref={inputRef}
              id="file"
              type="file"
              accept=".csv,.xls,.xlsx"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <Button
            className="w-full text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white"
            onClick={handleUpload}
            disabled={loading || !file}
          >
            {loading ? "Uploading..." : "Upload File"}
          </Button>

          {(uploadedCount > 0 || updatedCount > 0) && successMessage && (
            <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
              {successMessage}
            </p>
          )}

          {localError && (
            <p className={`text-sm mt-2 font-medium ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
              {localError}
            </p>
          )}

          <div>
            <p className={`font-medium mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Upload Instructions</p>
            <ul className={`list-disc pl-5 text-sm space-y-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
              <li>Use the provided template for proper data formatting</li>
              <li>Required columns: name, email</li>
              <li>Optional columns: phone (10 digits), designation</li>
              <li>role not required, defaults to teacher</li>
              <li>Maximum 500 records per file</li>
              <li>
                <button
                  onClick={handleDownloadTemplate}
                  className={theme === 'dark' ? 'text-primary hover:underline' : 'text-blue-600 hover:underline'}
                >
                  Download Template
                </button>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkUpload;