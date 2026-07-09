import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { useTheme } from "@/context/ThemeContext";
import { API_ENDPOINT } from "@/utils/config";
import { CheckCircle, ShieldAlert } from "lucide-react";

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
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
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
      const files = e.target.files;
      setSelectedFiles(files);

      // Create and display previews
      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const objectUrl = URL.createObjectURL(files[i]);
        urls.push(objectUrl);
      }
      setPreviewUrls(urls);
    }
  };

  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length < 3 || selectedFiles.length > 5) {
      setError("Please select between 3 and 5 images for best results");
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

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message || "Face trained successfully");
        setHasFace(true);
        setSelectedFiles(null);
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
      setError("Network error while training face");
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
                    <div key={index} className="relative">
                      <img
                        src={url}
                        alt={`Face ${index + 1}`}
                        className="w-full h-24 sm:h-32 object-cover rounded"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={loading || !selectedFiles}
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
