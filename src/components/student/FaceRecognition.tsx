import { useTheme } from "@/context/ThemeContext";
import FaceRecognitionUploader from "../common/FaceRecognitionUploader";
import { showInfoAlert } from "@/utils/sweetalert";

const FaceRecognition = () => {
  const { theme } = useTheme();

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
              onClick={() => showInfoAlert('Action Restricted', 'Face registration and updates can only be performed by your assigned Proctor. Please contact them to complete this setup.')}
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
              <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                Upload Face Image
              </label>
              <div
                onClick={() => showInfoAlert('Action Restricted', 'Face registration and updates can only be performed by your assigned Proctor. Please contact them to complete this setup.')}
                className={`block w-full text-sm p-4 cursor-pointer text-center border-2 border-dashed rounded-lg
                  ${theme === 'dark' ? 'text-muted-foreground border-border hover:border-gray-500' : 'text-gray-500 border-gray-300 hover:border-gray-400'}`}
              >
                Click to upload face images
              </div>
              <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
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