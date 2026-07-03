import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { useTheme } from "@/context/ThemeContext";
import { API_ENDPOINT } from "@/utils/config";
import { CheckCircle, ShieldAlert } from "lucide-react";

const FaceRecognition = () => {
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
  }, []);

  const checkFaceStatus = async () => {
    try {
      const response = await fetch(`${API_ENDPOINT}/student/check-face-status/`, {
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

      const response = await fetch(`${API_ENDPOINT}/student/train-face/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setSuccess("Face trained successfully");
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
    <Card className={theme === 'dark' ? 'bg-card text-card-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
      <CardHeader>
        <CardTitle className={theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}>Face Recognition</CardTitle>
        <CardDescription className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>Upload your face image for attendance recognition</CardDescription>
      </CardHeader>
      <CardContent>
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
              Your face has been enrolled in the system. You are ready to use the AI attendance feature in your classes.
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
            <div className={`p-4 rounded-lg flex items-start gap-3 border ${theme === 'dark' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' : 'bg-yellow-50 border-yellow-200 text-yellow-700'}`}>
              <ShieldAlert className="w-5 h-5 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold mb-1">Face Not Registered</p>
                <p className="opacity-90">Please upload a clear picture of your face to enable automatic attendance. Make sure only one face is visible.</p>
              </div>
            </div>
            <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
              <h3 className={`font-semibold text-sm mb-2 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-800'}`}>Face Training Guidelines</h3>
              <ul className={`list-disc pl-5 text-sm space-y-1 ${theme === 'dark' ? 'text-blue-400/90' : 'text-blue-700'}`}>
                <li>Upload 5 clear solo photos of yourself only.</li>
                <li>Ensure only one face is visible in each image.</li>
                <li>Do not upload group photos.</li>
                <li>Do not use another student's photos.</li>
                <li>Use photos with different angles (front, left, right, slight up/down).</li>
                <li>Ensure good lighting and avoid blurry images.</li>
                <li>Remove sunglasses, masks, or objects covering your face.</li>
                <li>Retrain your profile if your appearance changes significantly.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <label htmlFor="face-images" className={`block text-sm font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                Upload Face Image
              </label>
              <input
                id="face-images"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className={`block w-full text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  ${theme === 'dark' ? 'file:bg-primary/10 file:text-primary hover:file:bg-primary/20' : 'file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100'}
                  ${theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}`}
              />
              <p className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                Upload a clear image of your face. JPG or PNG format recommended.
              </p>
            </div>

            {previewUrls.length > 0 && (
              <div>
                <h3 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Selected Image:</h3>
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
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={loading || !selectedFiles}
              className={`w-full ${theme === 'dark' ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
            >
              {loading ? "Training Model..." : "Enroll Face"}
            </Button>

            <div className={`p-4 rounded text-sm ${theme === 'dark' ? 'bg-primary/10' : 'bg-blue-50'}`}>
              <h3 className={`font-medium mb-1 ${theme === 'dark' ? 'text-primary' : 'text-blue-800'}`}>Privacy Notice:</h3>
              <p className={theme === 'dark' ? 'text-primary/80' : 'text-blue-600'}>
                Your image is converted into a mathematical encoding and the original image is discarded immediately. This mathematical representation is used solely for the purpose of AI-powered attendance and cannot be reverse-engineered into your photo.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FaceRecognition;