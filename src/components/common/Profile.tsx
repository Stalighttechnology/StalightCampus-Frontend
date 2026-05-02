import { useState } from "react";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { showSuccessAlert, showErrorAlert } from "../../utils/sweetalert";

const API_BASE_URL = "http://127.0.0.1:8000/api/";

interface ProfileProps {
  role: string;
  user: any;
}

// Helper function to convert image to PNG format
const convertImageToPNG = async (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to convert image to PNG'));
            return;
          }
          const pngFile = new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.png', {
            type: 'image/png',
            lastModified: file.lastModified,
          });
          resolve(pngFile);
        }, 'image/png', 0.95); // 95% quality for PNG
      };
      img.onerror = () => reject(new Error('Failed to load image'));
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
  });
};

const Profile = ({ role, user }: ProfileProps) => {
  const [formData, setFormData] = useState({
    email: user?.email || "",
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
  });
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(user?.profile_image || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      
      // Convert to PNG if not already PNG
      if (selectedFile.type !== 'image/png') {
        convertImageToPNG(selectedFile).then(pngFile => {
          setProfilePicture(pngFile);
          const objectUrl = URL.createObjectURL(pngFile);
          setPreviewUrl(objectUrl);
          return () => URL.revokeObjectURL(objectUrl);
        }).catch(error => {
          console.error('Failed to convert image to PNG:', error);
          setProfilePicture(selectedFile);
          const objectUrl = URL.createObjectURL(selectedFile);
          setPreviewUrl(objectUrl);
          return () => URL.revokeObjectURL(objectUrl);
        });
      } else {
        setProfilePicture(selectedFile);
        const objectUrl = URL.createObjectURL(selectedFile);
        setPreviewUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
      }
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const formDataObj = new FormData();
      formDataObj.append("email", formData.email);
      formDataObj.append("first_name", formData.first_name);
      formDataObj.append("last_name", formData.last_name);
      if (profilePicture) {
        formDataObj.append("profile_image", profilePicture);
      }

      const endpoint =
        role === "admin" || role === "principal"
          ? `${API_BASE_URL}admin/users/`
          : role === "student"
          ? `${API_BASE_URL}student/update-profile/`
          : `${API_BASE_URL}${role}/profile/`;

      const method = (role === "admin" || role === "principal") ? "POST" : role === "student" ? "POST" : "PATCH";
      const body = (role === "admin" || role === "principal") ? { user_id: user.user_id, action: "edit", updates: Object.fromEntries(formDataObj) } : formDataObj;

      const response = await fetchWithTokenRefresh(endpoint, {
        method,
        headers: (role === "admin" || role === "principal") ? { "Content-Type": "application/json" } : {},
        body: (role === "admin" || role === "principal") ? JSON.stringify(body) : formDataObj,
      });

      const data = await response.json();

      if (data.success) {
        setSuccess("Profile updated successfully");
        showSuccessAlert("Success", "Profile updated successfully");
        const updatedUser = { ...user, ...formData };
        if (data.data?.profile_image) {
          updatedUser.profile_image = data.data.profile_image;
        }
        localStorage.setItem("user", JSON.stringify(updatedUser));
      } else {
        setError(data.message || "Failed to update profile");
        showErrorAlert("Error", data.message || "Failed to update profile");
      }
    } catch (err) {
      setError("Error updating profile");
      showErrorAlert("Error", "Error updating profile");
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    const firstName = formData.first_name || user?.first_name || "";
    const lastName = formData.last_name || user?.last_name || "";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Edit Profile</CardTitle>
        <CardDescription>Update your profile information</CardDescription>
      </CardHeader>
      <CardContent>
        {error && <div className="bg-red-500 text-white p-2 rounded mb-4">{error}</div>}
        {success && <div className="bg-green-500 text-white p-2 rounded mb-4">{success}</div>}

        <div className="space-y-6">
          <div className="flex justify-center">
            <Avatar className="w-24 h-24">
              {previewUrl ? (
                <AvatarImage src={previewUrl} alt="Profile" />
              ) : (
                <AvatarFallback>{getInitials()}</AvatarFallback>
              )}
            </Avatar>
          </div>

          <div className="space-y-1">
            <label htmlFor="profile_image" className="text-sm font-medium">
              Profile Picture
            </label>
            <Input
              id="profile_image"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="email@example.com"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="first_name" className="text-sm font-medium">
              First Name
            </label>
            <Input
              id="first_name"
              name="first_name"
              value={formData.first_name}
              onChange={handleInputChange}
              placeholder="First Name"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="last_name" className="text-sm font-medium">
              Last Name
            </label>
            <Input
              id="last_name"
              name="last_name"
              value={formData.last_name}
              onChange={handleInputChange}
              placeholder="Last Name"
            />
          </div>

          <Button className="w-full" onClick={handleSubmit} disabled={loading}>
            {loading ? "Updating..." : "Update Profile"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default Profile;