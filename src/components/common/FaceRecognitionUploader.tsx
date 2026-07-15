import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { useTheme } from "@/context/ThemeContext";
import { API_ENDPOINT } from "@/utils/config";
import { CheckCircle, ShieldAlert, X } from "lucide-react";

interface FaceRecognitionUploaderProps {
  title?: string;
  description?: string;
  statusEndpoint: string;
  trainEndpoint: string;
}

const FaceRecognitionUploader = ({
  title = "Face Recognition",
  description = "Upload your face image for attendance recognition",
  statusEndpoint,
  trainEndpoint
}: FaceRecognitionUploaderProps) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasFace, setHasFace] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const { theme } = useTheme();

  useEffect(() => {
    checkFaceStatus();
  }, [statusEndpoint]);

  const checkFaceStatus = async () => {
    try {
      setChecking(true);
      const response = await fetch(`${API_ENDPOINT}${statusEndpoint}`, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setHasFace(data.has_face);
      }
    } catch (err) {
      console.error("Failed to check face status", err);
    } finally {
      setChecking(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const allFiles = Array.from(e.target.files);
      const validFiles: File[] = [];
      const invalidFiles: File[] = [];

      allFiles.forEach(file => {
        if (file.size > 5 * 1024 * 1024) {
          invalidFiles.push(file);
        } else {
          validFiles.push(file);
        }
      });

      if (invalidFiles.length > 0) {
        Swal.fire({
          title: "File Too Large",
          text: `Some files were skipped because they exceed the 5MB limit.`,
          icon: "warning",
          confirmButtonText: "OK"
        });
      }

      if (validFiles.length > 0) {
        setSelectedFiles(prev => {
          const spaceLeft = 5 - prev.length;
          if (spaceLeft <= 0) {
            Swal.fire({
              title: "Limit Reached",
              text: "You can only select up to 5 images.",
              icon: "warning",
              confirmButtonText: "OK"
            });
            return prev;
          }
          
          const filesToAdd = validFiles.slice(0, spaceLeft);
          if (filesToAdd.length < validFiles.length) {
            Swal.fire({
              title: "Limit Reached",
              text: `Only ${spaceLeft} images were added. You can only select up to 5 images in total.`,
              icon: "warning",
              confirmButtonText: "OK"
            });
          }

          // Create and display previews for the actually added files
          const newUrls = filesToAdd.map(file => URL.createObjectURL(file));
          setPreviewUrls(prevUrls => [...prevUrls, ...newUrls]);

          return [...prev, ...filesToAdd];
        });
      }
      
      // Reset input so the same file can be selected again
      e.target.value = '';
    }
  };

  const removeFile = (indexToRemove: number) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    setPreviewUrls(prev => {
      const newUrls = [...prev];
      URL.revokeObjectURL(newUrls[indexToRemove]); // Clean up memory
      newUrls.splice(indexToRemove, 1);
      return newUrls;
    });
  };

  const handleUpload = async () => {
    if (selectedFiles.length < 3 || selectedFiles.length > 5) {
      setError("Please select between 3 and 5 images for best results");
      return;
    }

    const hasLargeFiles = selectedFiles.some(file => file.size > 5 * 1024 * 1024);
    if (hasLargeFiles) {
      Swal.fire({
        title: "Images Too Large",
        text: "One or more of the selected images exceed the 5MB limit. Please remove them and select smaller photos.",
        icon: "error",
        confirmButtonText: "OK"
      });
      return;
    }

    const confirmation = await Swal.fire({
      title: 'Confirm Guidelines',
      html: `
        <div class="text-left text-sm">
          <p class="mb-2">Are you sure you have followed all the training guidelines?</p>
          <ul class="list-disc pl-5 mb-2 text-red-500 font-medium">
            <li>Solo photos only (no group photos).</li>
            <li>No sunglasses or masks.</li>
            <li>Clear visibility of ONLY your face.</li>
          </ul>
          <p class="text-xs font-semibold">Warning: If you violate these guidelines (e.g., upload someone else's photo), your face will not be registered correctly.</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, proceed'
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append("images", selectedFiles[i]);
      }

      const response = await fetch(`${API_ENDPOINT}${trainEndpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        },
        body: formData,
      });

      if (response.status === 413) {
        Swal.fire({
          title: "Images Too Large",
          text: "The combined size of your selected images is too large for the server. Please compress them or select smaller photos.",
          icon: "error",
          confirmButtonText: "OK"
        });
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message || "Face trained successfully");
        setHasFace(true);
        setSelectedFiles([]);
        setPreviewUrls([]);
        // Reset file input
        const fileInput = document.getElementById("face-images") as HTMLInputElement;
        if (fileInput) {
          fileInput.value = "";
        }
      } else {
        setError(data.message || "Failed to train face");
      }
    } catch (err) {
      console.error(err);
      Swal.fire({
        title: "Upload Failed",
        text: "The images could not be uploaded. This usually happens if the combined file size is too large (Request Entity Too Large). Please try smaller images.",
        icon: "error",
        confirmButtonText: "OK"
      });
      setError("Network error while training face. Images might be too large.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={`border-none shadow-none ${theme === 'dark' ? 'bg-card text-card-foreground' : 'bg-white text-gray-900'}`}>
      <CardHeader className="px-0 pt-0">
        <CardTitle className={theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}>{title}</CardTitle>
        <CardDescription className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {error && <div className={`p-2 rounded mb-4 ${theme === 'dark' ? 'bg-destructive/20 text-destructive-foreground' : 'bg-red-500 text-white'}`}>{error}</div>}
        {success && <div className={`p-2 rounded mb-4 ${theme === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-500 text-white'}`}>{success}</div>}

        {checking ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : hasFace ? (
          <div className={`p-6 rounded-lg flex flex-col items-center justify-center text-center border ${theme === 'dark' ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-200'}`}>
            <CheckCircle className={`w-16 h-16 mb-4 ${theme === 'dark' ? 'text-green-400' : 'text-green-500'}`} />
            <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-green-400' : 'text-green-700'}`}>Face Successfully Registered</h3>
            <p className={`text-sm max-w-md ${theme === 'dark' ? 'text-green-400/80' : 'text-green-600'}`}>
              The face has been enrolled in the system and is ready for AI INFO Scanner.
            </p>
            <Button
              variant="outline"
              className={`mt-6 ${theme === 'dark' ? 'border-green-500/30 text-green-400 hover:bg-green-500/10' : 'border-green-300 text-green-700 hover:bg-green-100'}`}
              onClick={() => setHasFace(false)}
            >
              Re-train Face
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`p-3 sm:p-4 rounded-lg flex items-start gap-2 sm:gap-3 border ${theme === 'dark' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' : 'bg-yellow-50 border-yellow-200 text-yellow-700'}`}>
              <ShieldAlert className="w-5 h-5 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold mb-1">To Register correctly !</p>
                <p className="opacity-90 text-xs sm:text-sm">Please upload a clear picture of the face to enable student for AI INFO Scanner. Upload 3 to 5 images for best results.</p>
              </div>
            </div>

            <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-primary/5 border-primary/20 text-primary-foreground/90' : 'bg-blue-50 border-blue-100 text-blue-800'}`}>
              <h4 className="font-semibold text-sm mb-2">Face Training Guidelines</h4>
              <ul className="text-xs sm:text-sm space-y-1 list-disc pl-5">
                <li>Upload 3 to 5 clear solo photos of yourself only.</li>
                <li>Ensure only one face is visible in each image.</li>
                <li>Do not upload group photos or use another student's photos.</li>
                <li>Use photos with different angles (front, left, right, slight up/down).</li>
                <li>Ensure good lighting, avoid blurry images, and remove sunglasses or masks.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <label htmlFor="face-images" className={`block text-sm font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                Upload Face Images (Min: 3, Max: 5)
              </label>
              <input
                id="face-images"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className={`block w-full text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}
                  file:mr-2 sm:file:mr-4 file:py-1.5 sm:file:py-2 file:px-3 sm:file:px-4
                  file:rounded-full file:border-0
                  file:text-xs sm:file:text-sm file:font-semibold
                  ${theme === 'dark' ? 'file:bg-primary/10 file:text-primary hover:file:bg-primary/20' : 'file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100'}
                  ${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}`}
              />
              <p className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                Select 3 to 5 images of the face. JPG or PNG format recommended.
              </p>
            </div>

            {previewUrls.length > 0 && (
              <div>
                <h3 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Selected Images ({previewUrls.length}):</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Face ${index + 1}`}
                        className="w-full h-24 sm:h-32 object-cover rounded"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                        title="Remove image"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={loading || selectedFiles.length === 0}
              className={`w-full ${theme === 'dark' ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
            >
              {loading ? "Training Model..." : "Enroll Face"}
            </Button>

            <div className={`p-3 sm:p-4 rounded text-xs sm:text-sm ${theme === 'dark' ? 'bg-primary/10' : 'bg-blue-50'}`}>
              <h3 className={`font-medium mb-1 ${theme === 'dark' ? 'text-primary' : 'text-blue-800'}`}>Privacy Notice:</h3>
              <p className={theme === 'dark' ? 'text-primary/80' : 'text-blue-600'}>
                The image is converted into a mathematical encoding and the original image is discarded immediately. This mathematical representation is used solely for the purpose of AI-powered Student INFO Scanner and cannot be reverse-engineered into a photo.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FaceRecognitionUploader;
