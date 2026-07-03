import { useTheme } from "@/context/ThemeContext";
import FaceRecognitionUploader from "../common/FaceRecognitionUploader";

const FaceRecognition = () => {
  const { theme } = useTheme();

  return (
    <div className={`p-4 ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'} min-h-[calc(100vh-4rem)]`}>
      <div className="max-w-2xl mx-auto">
        <FaceRecognitionUploader
          title="Face Recognition"
          description="Upload your face image for attendance recognition"
          statusEndpoint="/student/check-face-status/"
          trainEndpoint="/student/train-face/"
        />
      </div>
    </div>
  );
};

export default FaceRecognition;