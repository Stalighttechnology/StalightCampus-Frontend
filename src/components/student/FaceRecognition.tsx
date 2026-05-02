import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { useTheme } from "@/context/ThemeContext";
import { API_ENDPOINT } from "@/utils/config";

const FaceRecognition = () => {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const { theme } = useTheme();

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
    if (!selectedFiles || selectedFiles.length === 0) {
      setError("Please select at least one image");
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

      const response = await fetch(`${API_ENDPOINT}/student/upload-face-encodings/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setSuccess("Face encodings registered successfully");
        setSelectedFiles(null);
        setPreviewUrls([]);
        // Reset file input
        const fileInput = document.getElementById("face-images") as HTMLInputElement;
        if (fileInput) {
          fileInput.value = "";
        }
      } else {
        setError(data.message || "Failed to upload face images");
      }
    } catch (err) {
      setError("Network error while uploading face images");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={theme === 'dark' ? 'bg-card text-card-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
      <CardHeader>
        <CardTitle className={theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}>Face Recognition</CardTitle>
        <CardDescription className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>Upload your face images for attendance recognition</CardDescription>
      </CardHeader>
      <CardContent>
        {error && <div className={`p-2 rounded mb-4 ${theme === 'dark' ? 'bg-destructive/20 text-destructive-foreground' : 'bg-red-500 text-white'}`}>{error}</div>}
        {success && <div className={`p-2 rounded mb-4 ${theme === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-500 text-white'}`}>{success}</div>}

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="face-images" className={`block text-sm font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              Upload Face Images (3-5 recommended)
            </label>
            <input
              id="face-images"
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className={`block w-full text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                ${theme === 'dark' ? 'file:bg-primary/10 file:text-primary hover:file:bg-primary/20' : 'file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100'}
                ${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}`}
            />
            <p className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
              Upload clear images of your face from different angles. JPG or PNG format recommended.
            </p>
          </div>

          {previewUrls.length > 0 && (
            <div>
              <h3 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Selected Images:</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative">
                    <img
                      src={url}
                      alt={`Face ${index + 1}`}
                      className="w-full h-32 object-cover rounded"
                    />
                  </div>
                ))}
              </div>
              <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                {previewUrls.length} images selected
              </p>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={loading || !selectedFiles}
            className={`w-full ${theme === 'dark' ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
          >
            {loading ? "Uploading..." : "Upload Images"}
          </Button>

          <div className={`p-4 rounded text-sm ${theme === 'dark' ? 'bg-primary/10' : 'bg-blue-50'}`}>
            <h3 className={`font-medium mb-1 ${theme === 'dark' ? 'text-primary' : 'text-blue-800'}`}>Why we need your face images:</h3>
            <p className={theme === 'dark' ? 'text-primary/80' : 'text-blue-600'}>
              These images will be used for automatic attendance marking using facial recognition.
              Your images will be securely stored and only used for attendance purposes.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FaceRecognition;