import { API_ENDPOINT } from "./config";
import { fetchWithTokenRefresh } from "./authService";

export interface GetR2PresignedUrlResponse {
  success: boolean;
  message?: string;
  data?: {
    url: string;
    file_url: string;
  };
}

/**
 * Fetch a presigned URL from the backend for R2 upload.
 */
export const getR2PresignedUrl = async (
  fileName: string, 
  fileType: string, 
  folder: string = 'study_materials'
): Promise<GetR2PresignedUrlResponse> => {
  try {
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/common/generate-r2-presigned-url/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_name: fileName, file_type: fileType, folder })
    });
    return await response.json();
  } catch (error: unknown) {
    console.error("Error getting R2 presigned URL:", error);
    return { success: false, message: (error as any).toString() };
  }
};

/**
 * Directly upload a file to R2 using a presigned URL.
 */
export const uploadFileToR2 = async (
  file: File | Blob, 
  presignedUrl: string, 
  fileType: string
): Promise<boolean> => {
  try {
    const response = await fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': fileType,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("R2 Upload failed:", response.status, errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error("R2 Upload network error:", error);
    return false;
  }
};

/**
 * Shared logic for 3-step R2 upload.
 * 1. Get Presigned URL
 * 2. PUT to R2
 * 3. Return final file_url
 */
export const performR2Upload = async (
  file: File | Blob, 
  folder: string = 'profiles'
): Promise<string | null> => {
  try {
    // Generate a unique filename if it's a blob without a name
    const fileName = (file as File).name || `upload_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const fileType = file.type;

    // Step 1: Get Presigned URL
    const presignedResult = await getR2PresignedUrl(fileName, fileType, folder);
    if (!presignedResult.success || !presignedResult.data) {
      console.error("Failed to get presigned URL", presignedResult.message);
      return null;
    }

    const { url, file_url } = presignedResult.data;

    // Step 2: PUT to R2
    const uploadSuccess = await uploadFileToR2(file, url, fileType);
    if (!uploadSuccess) {
      console.error("Failed to upload to R2");
      return null;
    }

    return file_url;
  } catch (error) {
    console.error("performR2Upload error:", error);
    return null;
  }
};
