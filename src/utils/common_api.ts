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

export interface R2ProxyUploadResponse {
  success: boolean;
  url?: string;
  message?: string;
}

/**
 * Upload a file through the backend proxy to Cloudflare R2.
 * This eliminates CSP/CORS issues by routing all uploads through the Django backend.
 * Server-to-server communication with R2 bypasses browser security restrictions.
 * 
 * @param file - The file to upload
 * @param folder - Optional destination folder in R2 (default: 'profiles')
 * @returns The public URL of the uploaded file, or null on failure
 */
export const uploadFileViaBackendProxy = async (
  file: File | Blob,
  folder: string = 'profiles'
): Promise<string | null> => {
  try {
    // Create FormData for multipart/form-data upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    // POST to the backend proxy endpoint
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/r2/upload/`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - let the browser set it with the correct boundary
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`Backend proxy upload failed (${response.status}):`, errorData);
      return null;
    }

    const data: R2ProxyUploadResponse = await response.json();
    
    if (!data.success || !data.url) {
      console.error("Backend proxy upload returned unsuccessful response:", data.message);
      return null;
    }

    return data.url;
  } catch (error) {
    console.error("uploadFileViaBackendProxy error:", error);
    return null;
  }
};

/**
 * Helper to download a file from R2 via the backend proxy.
 * This avoids cross-origin download issues by fetching the file
 * from the Django proxy endpoint which returns it with Content-Disposition attachment.
 * 
 * @param fileUrl - The public URL of the file to download
 * @param fileName - Optional fallback filename
 */
export const downloadFileViaBackendProxy = async (
  fileUrl: string,
  fileName?: string
): Promise<void> => {
  try {
    const encodedUrl = encodeURIComponent(fileUrl);
    // Fetch the file from the backend proxy download endpoint
    const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/r2/download/?file_url=${encodedUrl}`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to download file: ${response.statusText}`);
    }
    
    // Resolve filename from URL if not provided
    const resolvedName = fileName || fileUrl.split('/').pop() || 'download';
    
    // Use the unified downloadFile helper to handle web/PWA/mobile downloads correctly
    const { downloadFile } = await import('./downloadHelper');
    await downloadFile(response, resolvedName);
  } catch (error: any) {
    console.error("downloadFileViaBackendProxy error:", error);
    alert(error.message || "Failed to download file.");
  }
};





