import { translateTerminology, getTerm } from "@/utils/institutionConfig";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/context/ThemeContext";
import { Search, User, Calendar, BookOpen, TrendingUp, CreditCard, Users, Clock, MapPin, Phone, Mail, Heart, QrCode, X, Camera, AlertCircle, FileDown, Loader2 } from "lucide-react";
import { SkeletonCard } from "@/components/ui/skeleton";
import { showErrorAlert, showSuccessAlert } from "../../utils/sweetalert";
import { BrowserMultiFormatReader, NotFoundException, ChecksumException, FormatException } from '@zxing/library';
import { API_ENDPOINT } from "@/utils/config";
import { fetchWithTokenRefresh } from "@/utils/authService";

interface StudentInfo {
  name: string;
  usn: string;
  semester: number;
  section: string;
  branch: string;
  batch: string;
  course: string;
  mode_of_admission: string;
  date_of_admission: string;
  parent_name: string;
  parent_contact: string;
  emergency_contact: string;
  blood_group: string;
  email: string;
  mobile_number: string;
  photo_url?: string | null;
  proctor: {
    name: string;
    email: string;
  };
}

interface PersonalInfo {
  preferred_name?: string | null;
  date_of_birth?: string | null;
  nationality?: string | null;
  religion?: string | null;
  caste?: string | null;
  primary_language?: string | null;
  alternate_mobile?: string | null;
  personal_email?: string | null;
  institutional_email?: string | null;
}

interface OfficialIDs {
  aadhaar_number?: string | null;
  passport_number?: string | null;
  pan_number?: string | null;
}

interface AddressInfo {
  permanent?: string | null;
  current?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pin_code?: string | null;
}

interface ParentInfo {
  father?: { name?: string | null; contact?: string | null } | null;
  mother?: { name?: string | null; contact?: string | null } | null;
  guardian?: any | null;
}

interface MedicalInfo {
  blood_group?: string | null;
  emergency_contact?: any | null;
  emergency_medical_contact?: any | null;
  allergies?: string | null;
  disabilities?: string | null;
  medical_history?: string | null;
  medical_conditions?: string | null;
}

interface AttendanceData {
  overall_percentage: number;
  total_classes: number;
  present_classes: number;
  by_subject: {[key: string]: {present: number;total: number;percentage: number;};};
}

interface CurrentClass {
  subject: string;
  subject_code: string;
  teacher: string;
  room: string;
  start_time: string;
  end_time: string;
  day: string;
}

interface StudentData {
  success: boolean;
  student_info: StudentInfo;
  current_class: CurrentClass | null;
  next_class: CurrentClass | null;
  attendance: AttendanceData;
  internal_marks: {[key: string]: any[];};
  subjects_registered: any[];
  fee_summary: any;
  personal_info?: PersonalInfo | null;
  official_ids?: OfficialIDs | null;
  address_info?: AddressInfo | null;
  social_links?: { linkedin?: string | null; github?: string | null; portfolio?: string | null } | null;
  parent_info?: ParentInfo | null;
  medical_info?: MedicalInfo | null;
}

const StudentInfoScanner = () => {
  const [usn, setUsn] = useState("");
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [showFaceScanner, setShowFaceScanner] = useState(false);
  const [faceScanning, setFaceScanning] = useState(false);
  const [faceScanError, setFaceScanError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const faceVideoRef = useRef<HTMLVideoElement>(null);
  const faceCanvasRef = useRef<HTMLCanvasElement>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);
  const { theme } = useTheme();
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const handleExportPDF = async () => {
    if (!studentData || !studentData.student_info.usn) return;
    setDownloadingPDF(true);
    try {
      const url = `${API_ENDPOINT}/public/student-data/export-pdf/?usn=${studentData.student_info.usn}`;
      const response = await fetchWithTokenRefresh(url);
      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", `Student_Profile_${studentData.student_info.usn}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      showSuccessAlert("Success", "PDF downloaded successfully");
    } catch (err: any) {
      showErrorAlert("Error", err.message || "Failed to download PDF");
    } finally {
      setDownloadingPDF(false);
    }
  };

  // Initialize code reader
  useEffect(() => {
    codeReader.current = new BrowserMultiFormatReader();
    return () => {
      if (codeReader.current) {
        codeReader.current.reset();
      }
    };
  }, []);

  // Clean up scanner when modal closes
  useEffect(() => {
    if (!showScanner && codeReader.current) {
      codeReader.current.reset();
      setScanning(false);
      setScanError(null);
    }
  }, [showScanner]);

  const fetchStudentData = async (usnToFetch?: string) => {
    const usnValue = usnToFetch || usn.trim();
    if (!usnValue) {
      showErrorAlert("Error", "Please enter a USN");
      return;
    }

    setLoading(true);
    setError(null);

    try {

      const url = `${API_ENDPOINT}/public/student-data/?usn=${usnValue.toUpperCase()}`;
      const response = await fetchWithTokenRefresh(url);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || response.statusText || `HTTP ${response.status}`);
      }
      const data = await response.json();

      if (data.success) {
        setStudentData(data);
        showSuccessAlert("Success", "Student data retrieved successfully");
      } else {
        setError(data.message || "Student not found");
        showErrorAlert("Error", data.message || "Student not found");
      }
    } catch (err: any) {
      let errMsg = "Network error occurred";
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.message) {
          errMsg = parsed.message.includes("Student not found") ? "Student not found" : parsed.message;
        }
      } catch (e) {
        errMsg = err.message || "Network error occurred";
      }
      setError(errMsg);
      showErrorAlert("Error", errMsg);
    } finally {
      setLoading(false);
    }
  };

  const startScanning = async () => {
    if (!codeReader.current || !videoRef.current) return;

    setScanning(true);
    setScanError(null);

    try {
      const result = await codeReader.current.decodeOnceFromVideoDevice(undefined, videoRef.current);
      if (result) {
        const scannedText = result.getText();
        const scannedUsn = scannedText.toUpperCase();
        setUsn(scannedUsn);
        setShowScanner(false);
        showSuccessAlert("Barcode Scanned", `USN: ${scannedUsn}`);
        // Automatically fetch data after scanning with the scanned USN
        await fetchStudentData(scannedUsn);
      }
    } catch (err) {
      if (err instanceof NotFoundException) {
        setScanError("No barcode detected. Please ensure the barcode is clearly visible and well-lit.");
      } else if (err instanceof ChecksumException) {
        setScanError("Barcode checksum error. The barcode may be damaged or incomplete.");
      } else if (err instanceof FormatException) {
        setScanError("Invalid barcode format. Please try a different barcode.");
      } else {
        setScanError("Scanning failed. Please try again.");
      }

    } finally {
      setScanning(false);
    }
  };

  const stopScanning = () => {
    if (codeReader.current) {
      codeReader.current.reset();
    }
    setScanning(false);
    setScanError(null);
  };

  const toggleScanner = () => {
    if (showScanner) {
      stopScanning();
    }
    setShowScanner(!showScanner);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      fetchStudentData();
    }
  };

  // Face scanning functions
  const startFaceScanning = async () => {
    setFaceScanning(true);
    setFaceScanError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (faceVideoRef.current) {
        faceVideoRef.current.srcObject = stream;
        faceVideoRef.current.play();
      }
    } catch (error) {
      setFaceScanError('Unable to access camera');
      setFaceScanning(false);
    }
  };

  const stopFaceScanning = () => {
    setFaceScanning(false);
    setFaceScanError(null);
    if (faceVideoRef.current && faceVideoRef.current.srcObject) {
      const stream = faceVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
  };

  const captureAndRecognizeFace = async () => {
    if (!faceVideoRef.current || !faceCanvasRef.current) return;

    const canvas = faceCanvasRef.current;
    const video = faceVideoRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const formData = new FormData();
      formData.append('image', blob, 'face.jpg');

      try {
        const url = `${API_ENDPOINT}/recognize-face/`;

        const response = await fetchWithTokenRefresh(url, {
          method: 'POST',
          body: formData
        });

        const data = await response.json();

        if (data.success) {
          setUsn(data.usn);
          setShowFaceScanner(false);
          stopFaceScanning();
          showSuccessAlert("Face Recognized", `USN: ${data.usn}`);
          // Automatically fetch data after recognition
          await fetchStudentData(data.usn);
        } else {
          setFaceScanError(data.message || 'Face not recognized');
        }
      } catch (error) {
        setFaceScanError('Recognition failed');
      }
    }, 'image/jpeg');
  };

  const toggleFaceScanner = () => {
    if (showFaceScanner) {
      stopFaceScanning();
    } else {
      startFaceScanning();
    }
    setShowFaceScanner(!showFaceScanner);
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.5 }
    }
  };

  return (
    <div id="hod-scan-student-container" className={`sm: min-h-screen ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      {/* Search Card */}
      <Card id="hod-search-student-card" className={`${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm mb-6' : 'bg-white text-gray-900 border-gray-200 shadow-sm mb-6'}`}>
        <CardHeader id="scan-student-info-header" className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="space-y-1">
            <CardTitle className={`text-2xl font-semibold leading-none tracking-tight text-gray-900'}`}>Search Student</CardTitle>
            <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Enter USN or use scanner to find student information</p>
          </div>
          {studentData && (
            <Button
              onClick={handleExportPDF}
              disabled={downloadingPDF}
              className="bg-primary hover:bg-[#9147e0] text-white flex items-center gap-2 h-10 px-4"
            >
              {downloadingPDF ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              {downloadingPDF ? "Downloading..." : "Download PDF"}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Enter USN (e.g., 1AM22CI079)"
                value={usn}
                onChange={(e) => setUsn(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                className={`pl-10 h-11 ${theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-white border-gray-300 text-gray-900'}`} />
              
            </div>
            <div className="flex gap-2">
              <Button
                onClick={toggleScanner}
                variant="outline"
                size="sm"
                className={`h-11 ${theme === 'dark' ? 'border-border text-foreground hover:bg-accent' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}>
                
                <QrCode className="h-4 w-4" />
              </Button>
              <Button
                onClick={toggleFaceScanner}
                variant="outline"
                size="sm"
                className={`h-11 ${theme === 'dark' ? 'border-border text-foreground hover:bg-accent' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}>
                
                <Camera className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => fetchStudentData()}
                disabled={loading}
                className="h-11 bg-primary hover:bg-[#9147e0] text-white px-6 sm:px-8">
                
                {loading ?
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                  
                    <Search className="h-4 w-4" />
                  </motion.div> :

                "Search"
                }
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

          {/* Personal Information (from UserProfile) */}
          {studentData && studentData.personal_info &&
          <Card className={`${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}`}>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Calendar className="h-5 w-5 text-primary" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">

                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold w-32">Date of Birth:</span>
                    <span className="text-sm">{studentData.personal_info.date_of_birth || '—'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold w-32">Primary Lang:</span>
                    <span className="text-sm">{studentData.personal_info.primary_language || '—'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold w-32">Alternate Mobile:</span>
                    {studentData.personal_info.alternate_mobile ?
                    <a href={`tel:${studentData.personal_info.alternate_mobile}`} className="text-primary hover:underline text-sm">{studentData.personal_info.alternate_mobile}</a> :
                    <span className="text-sm text-muted-foreground italic">Not provided</span>
                    }
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold w-32">Personal Email:</span>
                    {studentData.personal_info.personal_email ?
                      <a href={`mailto:${studentData.personal_info.personal_email}`} className="text-primary hover:underline text-sm">{studentData.personal_info.personal_email}</a> :
                      <span className="text-sm text-muted-foreground italic">Not provided</span>
                    }
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold w-32">Institutional Email:</span>
                    {studentData.personal_info.institutional_email ?
                      <a href={`mailto:${studentData.personal_info.institutional_email}`} className="text-primary hover:underline text-sm">{studentData.personal_info.institutional_email}</a> :
                      <span className="text-sm text-muted-foreground italic">Not provided</span>
                    }
                  </div>
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold w-32">Nationality:</span>
                    <span className="text-sm">{studentData.personal_info.nationality || '—'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold w-32">Religion / Caste:</span>
                    <span className="text-sm">{(studentData.personal_info.religion || '') + (studentData.personal_info.caste ? ` / ${studentData.personal_info.caste}` : '') || '—'}</span>
                  </div>
                </div>
              </div>

              <Separator className="opacity-50 my-4" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-semibold">Official IDs</h4>
                  <div className="mt-2 text-sm">
                    <div>Aadhaar: {studentData.official_ids?.aadhaar_number || '—'}</div>
                    <div>PAN: {studentData.official_ids?.pan_number || '—'}</div>
                    <div>Passport: {studentData.official_ids?.passport_number || '—'}</div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Address</h4>
                  <div className="mt-2 text-sm">
                    <div>Permanent: {studentData.address_info?.permanent || '—'}</div>
                    <div>Current: {studentData.address_info?.current || '—'}</div>
                    <div>{studentData.address_info?.city || ''} {studentData.address_info?.state ? ` / ${studentData.address_info.state}` : ''} {studentData.address_info?.pin_code ? ` - ${studentData.address_info.pin_code}` : ''}</div>
                  </div>
                </div>
              </div>

              <Separator className="opacity-50 my-4" />

              <div className="flex items-center gap-4">
                {studentData.social_links?.linkedin && <a href={studentData.social_links.linkedin} target="_blank" rel="noreferrer" className="text-primary hover:underline">LinkedIn</a>}
                {studentData.social_links?.github && <a href={studentData.social_links.github} target="_blank" rel="noreferrer" className="text-primary hover:underline">GitHub</a>}
                {studentData.social_links?.portfolio && <a href={studentData.social_links.portfolio} target="_blank" rel="noreferrer" className="text-primary hover:underline">Portfolio</a>}
              </div>
            </CardContent>
          </Card>

            }

            {/* Medical Information */}
          {studentData && studentData.medical_info &&
          <Card className={`${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}`}>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Heart className="h-5 w-5 text-destructive" />
                Medical Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold w-32">Blood Group:</span>
                    <span className="text-sm">{studentData.medical_info.blood_group || studentData.student_info.blood_group || '—'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold w-32">Emergency Contact:</span>
                    <span className="text-sm">{(studentData.medical_info.emergency_contact && (studentData.medical_info.emergency_contact.phone || studentData.medical_info.emergency_contact)) || (studentData.student_info.emergency_contact || '—')}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold w-32">Allergies:</span>
                    <span className="text-sm">{studentData.medical_info.allergies || 'None'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold w-32">Disabilities:</span>
                    <span className="text-sm">{studentData.medical_info.disabilities || 'None'}</span>
                  </div>
                </div>
              </div>
              {studentData.medical_info.medical_history && <div className="mt-4 text-sm"><h4 className="font-semibold">Medical Notes</h4><div className="mt-2 text-sm">{studentData.medical_info.medical_history}</div></div>}
            </CardContent>
          </Card>
          }

      {/* Initial Empty State */}
      {!loading && !studentData && !error &&
      <Card className={`border-2 border-dashed flex flex-col items-center justify-center p-12 text-center space-y-4 ${theme === 'dark' ? 'border-border bg-accent/5' : 'border-gray-200 bg-gray-50/50'}`}>
          <div className={`p-4 rounded-full ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/10'}`}>
            <Users className={`w-10 h-10 ${theme === 'dark' ? 'text-primary/70' : 'text-primary/70'}`} />
          </div>
          <div className="max-w-xs mx-auto">
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              Search Student
            </h3>
            <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
              Enter USN or use scanner to find student information
            </p>
          </div>
        </Card>
      }

      {/* Error Message */}
      {error &&
      <div className={`p-4 rounded-lg border mb-6 flex items-start gap-3 ${
      theme === 'dark' ?
      'bg-destructive/10 border-destructive/20 text-destructive-foreground' :
      'bg-red-50 border-red-200 text-red-700'}`
      }>
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div className="flex flex-col">
            <span className="font-semibold text-base">{error}</span>
            {error === "Student not found" && (
              <span className={`text-sm mt-1 ${theme === 'dark' ? 'text-destructive-foreground/80' : 'text-red-600/90'}`}>
                Please check the USN and try again
              </span>
            )}
          </div>
        </div>
      }

      {/* Barcode Scanner Modal */}
      <AnimatePresence>
        {showScanner &&
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowScanner(false)}>
          
            <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={`relative ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'} max-w-[90%] sm:max-w-md mx-auto rounded-3xl shadow-xl p-4 sm:p-6`}
            onClick={(e) => e.stopPropagation()}>
            
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  Scan Student Barcode
                </h3>
                <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowScanner(false)}
                className="h-8 w-8 p-0">
                
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-4">
                <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                  Position the barcode within the camera view and click "Start Scanning"
                </div>
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                  ref={videoRef}
                  className="w-full h-64 object-cover"
                  playsInline
                  muted />
                
                  {!scanning &&
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="text-center text-white">
                        <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Click "Start Scanning" to begin</p>
                      </div>
                    </div>
                }
                </div>
                {scanError &&
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700 dark:text-red-300">{scanError}</p>
                  </div>
              }
                <div className="flex gap-2">
                  {!scanning ?
                <Button
                  onClick={startScanning}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white">
                  
                      <Camera className="h-4 w-4 mr-2" />
                      Start Scanning
                    </Button> :

                <Button
                  onClick={stopScanning}
                  variant="outline"
                  className="flex-1">
                  
                      Stop Scanning
                    </Button>
                }
                  <Button
                  onClick={() => setShowScanner(false)}
                  variant="outline">
                  
                    Close
                  </Button>
                </div>
                <div className="text-center text-xs text-gray-500">
                  Supported formats: Code 128, Code 39, EAN-13, QR Code, and more
                </div>
              </div>
            </motion.div>
          </motion.div>
        }
      </AnimatePresence>

      {/* Loading Skeletons */}
      {loading && !studentData &&
      <div className="space-y-6">
          <SkeletonCard className="h-64" />
          <SkeletonCard className="h-32" />
          <SkeletonCard className="h-64" />
        </div>
      }

      {/* Student Data Display */}
      {studentData && studentData.success &&
      <div className="space-y-6">
          {/* Basic Information */}
          <Card className={`${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}`}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <User className="h-5 w-5 text-primary" />
                  Basic Information
                </CardTitle>
                <div className="flex-shrink-0">
                  {studentData.student_info.photo_url ? (
                    <img 
                      src={studentData.student_info.photo_url} 
                      alt={studentData.student_info.name} 
                      className="h-16 w-16 rounded-full object-cover border-2 border-primary/20 shadow-sm"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full border-2 border-primary/20 shadow-sm flex items-center justify-center bg-primary/10">
                      <User className="h-8 w-8 text-primary/50" />
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold w-24">Name:</span>
                    <span className="text-sm">{studentData.student_info.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold w-24">USN:</span>
                    <Badge variant="secondary" className="font-mono text-xs">{studentData.student_info.usn}</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold w-24">Email:</span>
                    {studentData.student_info.email ?
                  <a
                    href={`mailto:${studentData.student_info.email}`}
                    className="text-primary hover:underline text-sm break-words">
                    
                        {studentData.student_info.email}
                      </a> :

                  <span className="text-sm text-muted-foreground italic">Not provided</span>
                  }
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold w-24">Mobile:</span>
                    {studentData.student_info.mobile_number ?
                  <a
                    href={`tel:${studentData.student_info.mobile_number}`}
                    className="text-primary hover:underline text-sm">
                    
                        {studentData.student_info.mobile_number}
                      </a> :

                  <span className="text-sm text-muted-foreground italic">Not provided</span>
                  }
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold w-24">{translateTerminology("Branch")}:</span>
                    <span className="text-sm">{studentData.student_info.branch}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold w-24">{translateTerminology("Semester")}:</span>
                    <Badge variant="outline" className="text-xs">Semester {studentData.student_info.semester}</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold w-24">Section:</span>
                    <Badge variant="outline" className="text-xs">Section {studentData.student_info.section}</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold w-24">Batch:</span>
                    <span className="text-sm">{studentData.student_info.batch}</span>
                  </div>
                </div>
              </div>

              <Separator className="opacity-50" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold w-24">Course:</span>
                    <span className="text-sm">{studentData.student_info.course}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold w-24">Admission:</span>
                    <span className="text-sm">{studentData.student_info.mode_of_admission}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold w-24">Joined On:</span>
                    <span className="text-sm">{studentData.student_info.date_of_admission}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Heart className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-semibold w-24">Blood Grp:</span>
                    <Badge variant="destructive" className="text-xs">{studentData.student_info.blood_group}</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold w-24">{translateTerminology("Proctor")}:</span>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{studentData.student_info.proctor?.name || 'Not assigned'}</span>
                      {studentData.student_info.proctor?.email &&
                    <a
                      href={`mailto:${studentData.student_info.proctor.email}`}
                      className="text-primary hover:underline text-xs">
                      
                          {studentData.student_info.proctor.email}
                        </a>
                    }
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className={`${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}`}>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Phone className="h-5 w-5 text-primary" />
                Emergency Contacts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold w-32">Parent Name:</span>
                    <span className="text-sm">{studentData.parent_info?.father?.name || studentData.student_info.parent_name || '—'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold w-32">Parent Contact:</span>
                    {studentData.parent_info?.father?.contact ?
                      <a href={`tel:${studentData.parent_info.father.contact}`} className="text-primary hover:underline text-sm">{studentData.parent_info.father.contact}</a> : studentData.student_info.parent_contact ?
                      <a href={`tel:${studentData.student_info.parent_contact}`} className="text-primary hover:underline text-sm">{studentData.student_info.parent_contact}</a> :
                      <span className="text-sm text-muted-foreground italic">Not provided</span>
                    }
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-semibold w-32">Emergency Contact:</span>
                    {studentData.parent_info?.guardian?.phone ?
                      <a href={`tel:${studentData.parent_info.guardian.phone}`} className="text-destructive hover:underline text-sm font-medium">{studentData.parent_info.guardian.phone}</a> : studentData.medical_info?.emergency_contact ?
                      <span className="text-destructive font-medium">{(studentData.medical_info.emergency_contact && (studentData.medical_info.emergency_contact.phone || studentData.medical_info.emergency_contact))}</span> : studentData.student_info.emergency_contact ?
                      <a href={`tel:${studentData.student_info.emergency_contact}`} className="text-destructive hover:underline text-sm font-medium">{studentData.student_info.emergency_contact}</a> :
                      <span className="text-sm text-muted-foreground italic">Not provided</span>
                    }
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Class Schedule */}
          <Card className={`${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}`}>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Clock className="h-5 w-5 text-primary" />
                Class Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Current Class */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <h3 className="font-semibold text-green-600 text-sm">Current Class</h3>
                  </div>
                  {studentData.current_class ?
                <div className="space-y-3 p-4 rounded-xl bg-green-50/50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/50">
                      <div className="flex items-start justify-between gap-4">
                        <span className="font-semibold text-green-700 dark:text-green-300 leading-tight">{studentData.current_class.subject}</span>
                        <Badge variant="outline" className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-800 whitespace-nowrap">
                          {studentData.current_class.subject_code}
                        </Badge>
                      </div>
                      <div className="text-sm space-y-2">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="h-3.5 w-3.5" />
                          <span className="truncate">{studentData.current_class.teacher}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="font-mono font-medium">{studentData.current_class.room}</span>
                          </span>
                          <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-semibold">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{studentData.current_class.start_time} - {studentData.current_class.end_time}</span>
                          </span>
                        </div>
                      </div>
                    </div> :

                <div className="flex flex-col items-center justify-center py-8 rounded-xl bg-gray-50/50 dark:bg-gray-800/30 border border-dashed border-gray-200 dark:border-gray-700">
                      <Clock className="h-8 w-8 text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground italic">No ongoing class</p>
                    </div>
                }
                </div>

                {/* Next Class */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <h3 className="font-semibold text-blue-600 text-sm">Next Class</h3>
                  </div>
                  {studentData.next_class ?
                <div className="space-y-3 p-4 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50">
                      <div className="flex items-start justify-between gap-4">
                        <span className="font-semibold text-blue-700 dark:text-blue-300 leading-tight">{studentData.next_class.subject}</span>
                        <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800 whitespace-nowrap">
                          {studentData.next_class.subject_code}
                        </Badge>
                      </div>
                      <div className="text-sm space-y-2">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="h-3.5 w-3.5" />
                          <span className="truncate">{studentData.next_class.teacher}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="font-mono font-medium">{studentData.next_class.room}</span>
                          </span>
                          <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{studentData.next_class.start_time} - {studentData.next_class.end_time}</span>
                          </span>
                        </div>
                      </div>
                    </div> :

                <div className="flex flex-col items-center justify-center py-8 rounded-xl bg-gray-50/50 dark:bg-gray-800/30 border border-dashed border-gray-200 dark:border-gray-700">
                      <Clock className="h-8 w-8 text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground italic">No upcoming class</p>
                    </div>
                }
                </div>
              </div>

              {/* Schedule Info */}
              <div className="mt-4 pt-4 border-t border-border/50">
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-accent/5 py-2 rounded-lg">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Classes typically scheduled between 9 AM - 5 PM</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attendance Overview */}
          <Card className={`${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}`}>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <TrendingUp className="h-5 w-5 text-primary" />
                Attendance Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-accent/5 border border-border/50">
                  <div className={`text-4xl font-black ${
                studentData.attendance.overall_percentage >= 75 ? 'text-green-500' :
                studentData.attendance.overall_percentage >= 60 ? 'text-yellow-500' : 'text-red-500'}`
                }>
                    {studentData.attendance.overall_percentage}%
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1">Overall</div>
                </div>
                <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-accent/5 border border-border/50">
                  <div className="text-3xl font-black text-primary">
                    {studentData.attendance.present_classes}
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1">Present</div>
                </div>
                <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-accent/5 border border-border/50">
                  <div className="text-3xl font-black text-muted-foreground">
                    {studentData.attendance.total_classes}
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1">Total Classes</div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Subject-wise Attendance
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(studentData.attendance.by_subject).map(([subject, data]) =>
                <div key={subject} className="flex items-center justify-between p-3 rounded-xl bg-accent/5 border border-border/50 hover:bg-accent/10 transition-colors">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold">{subject}</span>
                        <span className="text-xs text-muted-foreground font-medium">{data.present} / {data.total} attended</span>
                      </div>
                      <Badge
                    variant={data.percentage >= 75 ? "default" : data.percentage >= 60 ? "secondary" : "destructive"}
                    className="text-xs font-semibold min-w-[50px] justify-center">
                    
                        {data.percentage}%
                      </Badge>
                    </div>
                )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fee Summary */}
          <Card className={`${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Fee Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {studentData.fee_summary && !studentData.fee_summary.error ?
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-xl font-semibold text-blue-500">
                          ₹{studentData.fee_summary.total_fees?.toLocaleString() || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">Total Fees</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-semibold text-green-500">
                          ₹{studentData.fee_summary.amount_paid?.toLocaleString() || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">Paid</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-semibold text-red-500">
                          ₹{studentData.fee_summary.remaining_fees?.toLocaleString() || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">Remaining</div>
                      </div>
                      <div className="text-center">
                        <Badge
                  variant={
                  studentData.fee_summary.payment_status === 'paid' ? 'default' :
                  studentData.fee_summary.payment_status === 'partial' ? 'secondary' : 'destructive'
                  }
                  className="text-sm px-3 py-1">
                  
                          {studentData.fee_summary.payment_status?.toUpperCase() || 'UNKNOWN'}
                        </Badge>
                      </div>
                    </div> :

            <div className="text-center text-gray-500">
                      Fee data not available
                    </div>
            }
                </CardContent>
              </Card>

          {/* Internal Marks */}
          {Object.keys(studentData.internal_marks).length > 0 &&
        <Card className={`${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      Internal Marks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(studentData.internal_marks).map(([subject, marks]) =>
              <div key={subject} className="space-y-2">
                          <h4 className="font-medium text-lg">{subject}</h4>
                          <div className="space-y-2">
                            {marks.map((mark: any, index: number) =>
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                                <div className="flex items-center gap-4">
                                  <Badge variant="outline">Test {mark.test_number}</Badge>
                                  <span className="font-medium">{mark.mark}/{mark.max_mark}</span>
                                  <Badge variant="secondary">{mark.percentage}%</Badge>
                                </div>
                                <div className="text-sm text-gray-500">
                                  {mark.faculty}
                                </div>
                              </div>
                  )}
                          </div>
                        </div>
              )}
                    </div>
                  </CardContent>
                </Card>
        }

            {/* Registered Subjects */}
            {studentData.subjects_registered.length > 0 &&
        <Card className={`${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Registered Subjects
                  </CardTitle>
                </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {studentData.subjects_registered.map((subject, index) =>
              <div key={index} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{subject.subject_name}</span>
                            <Badge variant="outline">{subject.subject_code}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <span>Credits: {subject.credits}</span>
                            <span>Type: {subject.subject_type}</span>
                          </div>
                          <Badge variant={subject.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                            {subject.status}
                          </Badge>
                        </div>
              )}
                    </div>
                  </CardContent>
                </Card>
        }
        </div>
      }

      {/* Face Scanner Modal */}
      <AnimatePresence>
        {showFaceScanner &&
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setShowFaceScanner(false);
            stopFaceScanning();
          }}>
          
            <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={`relative ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'} max-w-[90%] sm:max-w-md mx-auto rounded-3xl shadow-xl p-4 sm:p-6`}
            onClick={(e) => e.stopPropagation()}>
            
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  Face Recognition Scan
                </h3>
                <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowFaceScanner(false);
                  stopFaceScanning();
                }}
                className="h-8 w-8 p-0">
                
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-4">
                <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                  Position your face in the camera view and click "Capture & Recognize"
                </div>
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                  ref={faceVideoRef}
                  className="w-full h-64 object-cover"
                  playsInline
                  muted />
                
                  <canvas
                  ref={faceCanvasRef}
                  className="hidden" />
                
                  {!faceScanning &&
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="text-center text-white">
                        <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Click "Start Scanning" to begin</p>
                      </div>
                    </div>
                }
                </div>
                {faceScanError &&
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700 dark:text-red-300">{faceScanError}</p>
                  </div>
              }
                <div className="flex gap-2">
                  {!faceScanning ?
                <Button
                  onClick={startFaceScanning}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white">
                  
                      <Camera className="h-4 w-4 mr-2" />
                      Start Scanning
                    </Button> :

                <Button
                  onClick={captureAndRecognizeFace}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                  
                      Capture & Recognize
                    </Button>
                }
                  <Button
                  onClick={() => {
                    setShowFaceScanner(false);
                    stopFaceScanning();
                  }}
                  variant="outline">
                  
                    Close
                  </Button>
                </div>
                <div className="text-center text-xs text-gray-500">
                  Ensure good lighting and clear face visibility for best results
                </div>
              </div>
            </motion.div>
          </motion.div>
        }
      </AnimatePresence>
    </div>);

};

export default StudentInfoScanner;