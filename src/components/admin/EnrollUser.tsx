import { useState,useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { enrollUser } from "../../utils/admin_api";
import { useToast } from "../../hooks/use-toast";
import { useTheme } from "../../context/ThemeContext";

interface EnrollUserProps {
  setError: (error: string | null) => void;
  toast: (options: any) => void;
}

const EnrollUser = ({ setError, toast }: EnrollUserProps) => {
  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    role: "",
    phone: "",
    designation: "",
  });
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { theme } = useTheme();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let newValue = value;
    if (name === "phone") {
      newValue = value.replace(/\D/g, "").slice(0, 10);
    }

    // Update form data
    setFormData((prev) => ({ ...prev, [name]: newValue }));

    // Clear previous timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // Set a new timeout to validate after user stops typing
    typingTimeoutRef.current = setTimeout(() => {
      if (name === "email") {
        const trimmedValue = value.trim();
        // Strong email regex
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/;

        if (!trimmedValue) {
          setEmailError("Email is required.");
        } else if (!emailRegex.test(trimmedValue)) {
          setEmailError("Please enter a valid email address.");
        } else {
          setEmailError("");
        }
      } else if (name === "phone") {
        const trimmedValue = value.trim();
        if (trimmedValue && !/^\d{10}$/.test(trimmedValue)) {
          setPhoneError("Phone number must be exactly 10 digits.");
        } else {
          setPhoneError("");
        }
      }
    }, 500); // 500ms delay
  };

  const handleRoleChange = (value: string) => {
    setFormData((prev) => ({ ...prev, role: value }));
  };

  const handleSubmit = async () => {
    if (
      !formData.email ||
      !formData.first_name ||
      !formData.last_name ||
      !formData.role
    ) {
      setError("All fields are required");
      toast({
        variant: "destructive",
        title: "Error",
        description: "All fields are required",
      });
      return;
    }

    // Block submission if email or phone is invalid
    if (emailError || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/.test(formData.email)) {
      setError("Please enter a valid email address.");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a valid email address.",
      });
      return;
    }

    if (formData.phone && !/^\d{10}$/.test(formData.phone.trim())) {
      setPhoneError("Phone number must be exactly 10 digits.");
      setError("Please enter a valid 10-digit phone number.");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a valid 10-digit phone number.",
      });
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      email: formData.email.trim(),
      username: formData.first_name.trim(),
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      role: formData.role,
      phone: formData.phone.trim(),
      designation: formData.designation.trim(),
    };

    try {
      const response = await enrollUser(payload);
      if (response.success) {
        toast({ title: "Success", description: "User enrolled successfully" });
        setFormData({
          email: "",
          first_name: "",
          last_name: "",
          role: "",
          phone: "",
          designation: "",
        });
      } else {
        setError(response.message || "Failed to enroll staff");
        toast({
          variant: "destructive",
          title: "Error",
          description: response.message || "Failed to enroll staff",
        });
      }
    } catch (err) {
      setError("Network error while enrolling staff");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Network error while enrolling user",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`overflow-y-hidden ${theme === 'dark' ? 'bg-background' : 'bg-gray-50'}`}>
      <div className="w-full mx-auto">
        <Card className={theme === 'dark' ? 'w-full bg-card border border-border shadow-lg rounded-lg' : 'w-full bg-white border border-gray-200 shadow-lg rounded-lg'}>
          <CardHeader className="pb-4">
            <CardTitle className={`text-2xl font-semibold leading-none tracking-tight text-gray-900 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Staff Enrollment Form</CardTitle>
            <CardDescription className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
              Add a new staff member to the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              <div>
                <label htmlFor="role" className={`text-sm font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                  Role
                </label>
                <Select value={formData.role} onValueChange={handleRoleChange}>
                  <SelectTrigger className={theme === 'dark' ? 'w-full mt-1 bg-card text-foreground border border-border' : 'w-full mt-1 bg-white text-gray-900 border border-gray-300'}>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-300'}>
                    <SelectItem value="hod">HOD</SelectItem>
                    <SelectItem value="teacher">Faculty/Teacher</SelectItem>
                    <SelectItem value="dean">Dean</SelectItem>
                    <SelectItem value="coe">COE</SelectItem>
                    <SelectItem value="fees_manager">Fees Manager</SelectItem>
                    <SelectItem value="hms_admin">HMS Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor="first_name" className={`text-sm font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                  First Name
                </label>
                <Input
                  id="first_name"
                  name="first_name"
                  placeholder="HOD/Faculty name"
                  className={theme === 'dark' ? 'mt-1 bg-card text-foreground border border-border' : 'mt-1 bg-white text-gray-900 border border-gray-300'}
                  value={formData.first_name}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label htmlFor="last_name" className={`text-sm font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                  Last Name
                </label>
                <Input
                  id="last_name"
                  name="last_name"
                  placeholder="initials"
                  className={theme === 'dark' ? 'mt-1 bg-card text-foreground border border-border' : 'mt-1 bg-white text-gray-900 border border-gray-300'}
                  value={formData.last_name}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label htmlFor="designation" className={`text-sm font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                  Designation
                </label>
                <Input
                  id="designation"
                  name="designation"
                  placeholder="Enter designation"
                  className={theme === 'dark' ? 'mt-1 bg-card text-foreground border border-border' : 'mt-1 bg-white text-gray-900 border border-gray-300'}
                  value={formData.designation}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label htmlFor="email" className={`text-sm font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="user@example.com"
                  className={theme === 'dark' ? 'mt-1 bg-card text-foreground border border-border' : 'mt-1 bg-white text-gray-900 border border-gray-300'}
                  value={formData.email}
                  onChange={handleInputChange}
                />
                {emailError && (
                  <p className="mt-1 text-xs text-red-500">{emailError}</p>
                )}
              </div>
              <div>
                <label htmlFor="phone" className={`text-sm font-medium ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                  Phone Number
                </label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="Enter phone number"
                  className={theme === 'dark' ? 'mt-1 bg-card text-foreground border border-border' : 'mt-1 bg-white text-gray-900 border border-gray-300'}
                  value={formData.phone}
                  onChange={handleInputChange}
                />
                {phoneError && (
                  <p className="mt-1 text-xs text-red-500">{phoneError}</p>
                )}
              </div>
              <Button
                className="w-full text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? "Enrolling..." : "Enroll Staff"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EnrollUser;