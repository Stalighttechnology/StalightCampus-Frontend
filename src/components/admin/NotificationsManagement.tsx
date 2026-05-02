import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { manageNotifications } from "../../utils/admin_api";
import { useToast } from "../../hooks/use-toast";
import { useTheme } from "../../context/ThemeContext";
import { SkeletonTable } from "../ui/skeleton";

interface Notification {
  id: number;
  title: string;
  message: string;
  role: string;
  color: string;
  target_role: string; // Added target_role property
}

interface NotificationsManagementProps {
  setError: (error: string | null) => void;
  toast: (options: any) => void;
}

const NotificationsManagement = ({ setError, toast }: NotificationsManagementProps) => {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState("");
  const { theme } = useTheme();

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await manageNotifications();
        console.log("Fetch Notifications Response:", response); // Debug log
        if (response.results && response.results.success) {
          setNotifications(
            response.results.notifications.map((note: any) => ({
              ...note,
              color: getBadgeColor(note.notification_type, theme),
            }))
          );
        } else {
          setError(response.message || "Failed to fetch notifications");
          toast({
            variant: "destructive",
            title: "Error",
            description: response.message || "Failed to fetch notifications",
          });
        }
      } catch (err) {
        setError("Network error");
        toast({
          variant: "destructive",
          title: "Error",
          description: "Network error",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, [setError, toast]);

  const handleSendNotification = async () => {
  // Regex: At least one alphanumeric character required
    const isValidInput = (text: string) => /\w/.test(text.trim());

    if (!isValidInput(title) || !isValidInput(message) || !targetRole) {
      setValidationError("Please enter a valid title and message (not just spaces/symbols).");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Title and Message must contain meaningful text.",
      });
      return;
    }

    setValidationError("");
    setLoading(true);
    setError(null);

    // Map frontend role to backend expected role
    const roleMap: { [key: string]: string } = {
      "All Users": "all",
      "Student": "student",
      "Teacher": "teacher",
      "Head of Department": "hod",
    };
    const backendRole = roleMap[targetRole] || targetRole;

    try {
      const payload = { title: title.trim(), message: message.trim(), target_role: backendRole };
      console.log("Send Notification Payload:", payload);

      const response = await manageNotifications(payload, "POST");
      console.log("Send Notification Response:", response);

      if (response.success) {
        // Refetch notifications to get the new notification with its ID
        const updatedResponse = await manageNotifications();
        if (updatedResponse.results && updatedResponse.results.success) {
          setNotifications(
            updatedResponse.results.notifications.map((note: any) => ({
              ...note,
              color: getBadgeColor(note.notification_type, theme),
            }))
          );
        }
        setTitle("");
        setMessage("");
        setTargetRole("");
        toast({ title: "Success", description: "Notification sent successfully" });
      } else {
        setError(response.message || "Failed to send notification");
        toast({
          variant: "destructive",
          title: "Error",
          description: response.message || "Failed to send notification",
        });
      }
    } catch (err) {
      console.error("Send Notification Error:", err);
      setError("Network error while sending notification");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Network error while sending notification",
      });
    } finally {
      setLoading(false);
    }
  };

  const getBadgeColor = (role: string, theme: string) => {
    switch (role) {
      case "all":
      case "All Users":
      case "announcement":
        return theme === 'dark' ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-800";
      case "teacher":
      case "Teacher":
        return theme === 'dark' ? "bg-purple-900 text-purple-200" : "bg-purple-100 text-purple-800";
      case "hod":
      case "Head of Department":
        return theme === 'dark' ? "bg-green-900 text-green-200" : "bg-green-100 text-green-800";
      case "student":
      case "Student":
        return theme === 'dark' ? "bg-pink-900 text-pink-200" : "bg-pink-100 text-pink-800";
      case "admin":
      case "Admin":
        return theme === 'dark' ? "bg-red-900 text-red-200" : "bg-red-100 text-red-800";
      default:
        return theme === 'dark' ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 p-4 sm:p-6 ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      {/* Notification History */}
      <Card className={theme === 'dark' ? 'lg:col-span-2 bg-card border border-border' : 'lg:col-span-2 bg-white border border-gray-200'}>
        <CardHeader>
          <CardTitle className={`text-xl ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Notification History</CardTitle>
          <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>List of all notifications sent to users</p>
        </CardHeader>
        <CardContent className="overflow-auto max-h-[400px] md:max-h-[500px] thin-scrollbar">
          {loading && notifications.length === 0 ? (
            <SkeletonTable rows={5} cols={2} />
          ) : (
            <table className="w-full text-left text-sm border-collapse">
              <thead className={`border-b ${theme === 'dark' ? 'border-border bg-card' : 'border-gray-200 bg-gray-50'}`}>
                <tr>
                  <th className={`pb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Message</th>
                  <th className={`pb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Target</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((note) => (
                  <tr key={note.id} className={`border-b ${theme === 'dark' ? 'border-border' : 'border-gray-200'}`}>
                    <td className="py-3">
                      <div className={`font-medium ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>{note.title}</div>
                      <div className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{note.message}</div>
                    </td>
                    <td className="py-3">
                      <span className={`px-3 py-1 text-xs rounded-full ${getBadgeColor(note.notification_type, theme)}`}>
                        {note.notification_type.charAt(0).toUpperCase() + note.notification_type.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>

      </Card>

      {/* Create Notification */}
      <Card className={theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'}>
        <CardHeader>
          <CardTitle className={`text-xl ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Create Notification</CardTitle>
          <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Send a new notification to users</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className={`block text-sm mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Title</label>
            <Input
              className={theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-300'}
              placeholder="Notification Title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setValidationError("");
              }}
            />
          </div>
          <div>
            <label className={`block text-sm mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Message</label>
            <Textarea
              className={theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-300'}
              rows={4}
              placeholder="Write your message here..."
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setValidationError("");
              }}
            />
          </div>
          <div>
            <label className={`block text-sm mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Target Role</label>
            <Select
              value={targetRole}
              onValueChange={(val) => {
                setTargetRole(val);
                setValidationError("");
              }}
            >
              <SelectTrigger className={theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-300'}>
                <SelectValue placeholder="Select a target role" />
              </SelectTrigger>
              <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-300'}>
                <SelectItem value="All Users">All Users</SelectItem>
                <SelectItem value="Student">Student</SelectItem>
                <SelectItem value="Teacher">Teacher</SelectItem>
                <SelectItem value="Head of Department">Head of Department</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {validationError && (
            <div className="text-red-600 text-sm font-medium">{validationError}</div>
          )}
          <Button
            className="w-full text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white"
            onClick={handleSendNotification}
            disabled={loading}
          >
            {loading ? "Sending..." : "Send Notification"}
          </Button>
        </CardContent>
      </Card>
    </div>

  );
};

export default NotificationsManagement;