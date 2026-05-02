import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/context/ThemeContext";
import { Search, User, Calendar, BookOpen, TrendingUp, CreditCard, Users, Clock, MapPin, Phone, Mail, Heart, QrCode, X, Camera, AlertCircle } from "lucide-react";
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
  proctor: {
    name: string;
    email: string;
  };
}

interface AttendanceData {
  overall_percentage: number;
  total_classes: number;
  present_classes: number;
  by_subject: { [key: string]: { present: number; total: number; percentage: number } };
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
  internal_marks: { [key: string]: any[] };
  subjects_registered: any[];
  fee_summary: any;
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
      console.debug('Fetching student data for USN:', usnValue.toUpperCase(), 'using API_ENDPOINT:', API_ENDPOINT);
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
      console.error('Error fetching student data:', err);
      setError(err.message || "Network error occurred");
      showErrorAlert("Error", err.message || "Network error occurred");
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
      console.error("Barcode scan error:", err);
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
      stream.getTracks().forEach(track => track.stop());
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
        console.debug('Posting face blob to:', url);
        const response = await fetchWithTokenRefresh(url, {
          method: 'POST',
          body: formData,
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
    <div className={`sm: min-h-screen ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      {/* Search Card */}
      <Card className={`${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm mb-6' : 'bg-white text-gray-900 border-gray-200 shadow-sm mb-6'}`}>
        <CardHeader>
          <CardTitle className={`text-2xl font-semibold leading-none tracking-tight text-gray-900'}`}>Search Student</CardTitle>
          <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Enter USN or use scanner to find student information</p>
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
                className={`pl-10 h-11 ${theme === 'dark' ? 'bg-background border-border text-foreground' : 'bg-white border-gray-300 text-gray-900'}`}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={toggleScanner}
                variant="outline"
                size="sm"
                className={`h-11 ${theme === 'dark' ? 'border-border text-foreground hover:bg-accent' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
              >
                <QrCode className="h-4 w-4" />
              </Button>
              <Button
                onClick={toggleFaceScanner}
                variant="outline"
                size="sm"
                className={`h-11 ${theme === 'dark' ? 'border-border text-foreground hover:bg-accent' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
              >
                <Camera className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => fetchStudentData()}
                disabled={loading}
                className="h-11 bg-primary hover:bg-[#9147e0] text-white px-6 sm:px-8"
              >
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Search className="h-4 w-4" />
                  </motion.div>
                ) : (
                  "Search"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <div className={`p-4 rounded-lg border mb-6 ${
          theme === 'dark'
            ? 'bg-destructive/10 border-destructive/20 text-destructive-foreground'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      <AnimatePresence>
        {showScanner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowScanner(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`relative ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'} max-w-[90%] sm:max-w-md mx-auto rounded-3xl shadow-xl p-4 sm:p-6`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                  Scan Student Barcode
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowScanner(false)}
                  className="h-8 w-8 p-0"
                >
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
                    muted
                  />
                  {!scanning && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="text-center text-white">
                        <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Click "Start Scanning" to begin</p>
                      </div>
                    </div>
                  )}
                </div>
                {scanError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700 dark:text-red-300">{scanError}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  {!scanning ? (
                    <Button
                      onClick={startScanning}
                      className="flex-1 bg-primary hover:bg-primary/90 text-white"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Start Scanning
                    </Button>
                  ) : (
                    <Button
                      onClick={stopScanning}
                      variant="outline"
                      className="flex-1"
                    >
                      Stop Scanning
                    </Button>
                  )}
                  <Button
                    onClick={() => setShowScanner(false)}
                    variant="outline"
                  >
                    Close
                  </Button>
                </div>
                <div className="text-center text-xs text-gray-500">
                  Supported formats: Code 128, Code 39, EAN-13, QR Code, and more
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Skeletons */}
      {loading && !studentData && (
        <div className="space-y-6">
          <SkeletonCard className="h-64" />
          <SkeletonCard className="h-32" />
          <SkeletonCard className="h-64" />
        </div>
      )}

      {/* Student Data Display */}
      {studentData && studentData.success && (
        <div className="space-y-6">
          {/* Basic Information */}
          <Card className={`${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">Name:</span>
                        <span>{studentData.student_info.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">USN:</span>
                        <Badge variant="secondary" className="font-mono">{studentData.student_info.usn}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">Email:</span>
                        {studentData.student_info.email ? (
                          <a
                            href={`mailto:${studentData.student_info.email}`}
                            className="text-blue-600 hover:text-blue-800 underline text-sm hover:underline"
                          >
                            {studentData.student_info.email}
                          </a>
                        ) : (
                          <span className="text-sm text-gray-500">Not provided</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">Mobile:</span>
                        {studentData.student_info.mobile_number ? (
                          <a
                            href={`tel:${studentData.student_info.mobile_number}`}
                            className="text-blue-600 hover:text-blue-800 underline text-sm hover:underline"
                          >
                            {studentData.student_info.mobile_number}
                          </a>
                        ) : (
                          <span className="text-sm text-gray-500">Not provided</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">Branch:</span>
                        <span>{studentData.student_info.branch}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">Semester:</span>
                        <Badge>{studentData.student_info.semester}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">Section:</span>
                        <Badge variant="outline">{studentData.student_info.section}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Batch:</span>
                        <span>{studentData.student_info.batch}</span>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Course:</span>
                        <span>{studentData.student_info.course}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Mode of Admission:</span>
                        <span>{studentData.student_info.mode_of_admission}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">Date of Admission:</span>
                        <span>{studentData.student_info.date_of_admission}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">Blood Group:</span>
                        <Badge variant="destructive">{studentData.student_info.blood_group}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">Proctor:</span>
                        <div className="flex flex-col">
                          <span>{studentData.student_info.proctor?.name || 'Not assigned'}</span>
                          {studentData.student_info.proctor?.email && (
                            <a
                              href={`mailto:${studentData.student_info.proctor.email}`}
                              className="text-blue-600 hover:text-blue-800 underline text-xs hover:underline"
                            >
                              {studentData.student_info.proctor.email}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

          {/* Contact Information */}
          <Card className={`${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-primary" />
                    Emergency Contacts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">Parent Name:</span>
                        <span>{studentData.student_info.parent_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">Parent Contact:</span>
                        {studentData.student_info.parent_contact ? (
                          <a
                            href={`tel:${studentData.student_info.parent_contact}`}
                            className="text-blue-600 hover:text-blue-800 underline text-sm hover:underline"
                          >
                            {studentData.student_info.parent_contact}
                          </a>
                        ) : (
                          <span className="text-sm text-gray-500">Not provided</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-red-500" />
                        <span className="font-medium">Emergency Contact:</span>
                        {studentData.student_info.emergency_contact ? (
                          <a
                            href={`tel:${studentData.student_info.emergency_contact}`}
                            className="text-red-600 hover:text-red-800 underline text-sm hover:underline"
                          >
                            {studentData.student_info.emergency_contact}
                          </a>
                        ) : (
                          <span className="text-sm text-gray-500">Not provided</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

          {/* Class Schedule */}
          <Card className={`${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
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
                        <h3 className="font-semibold text-green-600">Current Class</h3>
                      </div>
                      {studentData.current_class ? (
                        <div className="space-y-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-green-700 dark:text-green-300">{studentData.current_class.subject}</span>
                            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                              {studentData.current_class.subject_code}
                            </Badge>
                          </div>
                          <div className="text-sm space-y-1">
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3 text-gray-500" />
                              <span>{studentData.current_class.teacher}</span>
                              {studentData.current_class.faculty_email && (
                                <a
                                  href={`mailto:${studentData.current_class.faculty_email}`}
                                  className="text-blue-600 hover:text-blue-800 underline text-xs"
                                >
                                  ✉
                                </a>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span className="font-mono">{studentData.current_class.room}</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span className="font-semibold">{studentData.current_class.start_time} - {studentData.current_class.end_time}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4 px-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                          <Clock className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">No ongoing class</p>
                        </div>
                      )}
                    </div>

                    {/* Next Class */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <h3 className="font-semibold text-blue-600">Next Class</h3>
                      </div>
                      {studentData.next_class ? (
                        <div className="space-y-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-blue-700 dark:text-blue-300">{studentData.next_class.subject}</span>
                            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                              {studentData.next_class.subject_code}
                            </Badge>
                          </div>
                          <div className="text-sm space-y-1">
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3 text-gray-500" />
                              <span>{studentData.next_class.teacher}</span>
                              {studentData.next_class.faculty_email && (
                                <a
                                  href={`mailto:${studentData.next_class.faculty_email}`}
                                  className="text-blue-600 hover:text-blue-800 underline text-xs"
                                >
                                  ✉
                                </a>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span className="font-mono">{studentData.next_class.room}</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span className="font-semibold">{studentData.next_class.start_time} - {studentData.next_class.end_time}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4 px-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                          <Clock className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">No upcoming class</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Schedule Info */}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                      <Calendar className="h-4 w-4" />
                      <span>Classes typically scheduled between 9 AM - 5 PM</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

          {/* Attendance Overview */}
          <Card className={`${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Attendance Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className={`text-3xl font-bold ${
                        studentData.attendance.overall_percentage >= 75 ? 'text-green-500' :
                        studentData.attendance.overall_percentage >= 60 ? 'text-yellow-500' : 'text-red-500'
                      }`}>
                        {studentData.attendance.overall_percentage}%
                      </div>
                      <div className="text-sm text-gray-500">Overall</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-500">
                        {studentData.attendance.present_classes}
                      </div>
                      <div className="text-sm text-gray-500">Present</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-500">
                        {studentData.attendance.total_classes}
                      </div>
                      <div className="text-sm text-gray-500">Total Classes</div>
                    </div>
                  </div>
                  <Separator />
                  <div className="mt-4">
                    <h4 className="font-medium mb-3">Subject-wise Attendance</h4>
                    <div className="space-y-2">
                      {Object.entries(studentData.attendance.by_subject).map(([subject, data]) => (
                        <div key={subject} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                          <span className="font-medium">{subject}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{data.present}/{data.total}</span>
                            <Badge
                              variant={data.percentage >= 75 ? "default" : data.percentage >= 60 ? "secondary" : "destructive"}
                              className="text-xs"
                            >
                              {data.percentage}%
                            </Badge>
                          </div>
                        </div>
                      ))}
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
                  {studentData.fee_summary && !studentData.fee_summary.error ? (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-xl font-bold text-blue-500">
                          ₹{studentData.fee_summary.total_fees?.toLocaleString() || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">Total Fees</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-green-500">
                          ₹{studentData.fee_summary.amount_paid?.toLocaleString() || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">Paid</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-red-500">
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
                          className="text-sm px-3 py-1"
                        >
                          {studentData.fee_summary.payment_status?.toUpperCase() || 'UNKNOWN'}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500">
                      Fee data not available
                    </div>
                  )}
                </CardContent>
              </Card>

          {/* Internal Marks */}
          {Object.keys(studentData.internal_marks).length > 0 && (
            <Card className={`${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      Internal Marks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(studentData.internal_marks).map(([subject, marks]) => (
                        <div key={subject} className="space-y-2">
                          <h4 className="font-medium text-lg">{subject}</h4>
                          <div className="space-y-2">
                            {marks.map((mark: any, index: number) => (
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
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
            )}

            {/* Registered Subjects */}
            {studentData.subjects_registered.length > 0 && (
              <Card className={`${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Registered Subjects
                  </CardTitle>
                </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {studentData.subjects_registered.map((subject, index) => (
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
                      ))}
                    </div>
                  </CardContent>
                </Card>
            )}
        </div>
      )}

      {/* Face Scanner Modal */}
      <AnimatePresence>
        {showFaceScanner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowFaceScanner(false);
              stopFaceScanning();
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`relative ${theme === 'dark' ? 'bg-card border border-border' : 'bg-white border border-gray-200'} max-w-[90%] sm:max-w-md mx-auto rounded-3xl shadow-xl p-4 sm:p-6`}
              onClick={(e) => e.stopPropagation()}
            >
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
                  className="h-8 w-8 p-0"
                >
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
                    muted
                  />
                  <canvas
                    ref={faceCanvasRef}
                    className="hidden"
                  />
                  {!faceScanning && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="text-center text-white">
                        <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Click "Start Scanning" to begin</p>
                      </div>
                    </div>
                  )}
                </div>
                {faceScanError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700 dark:text-red-300">{faceScanError}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  {!faceScanning ? (
                    <Button
                      onClick={startFaceScanning}
                      className="flex-1 bg-primary hover:bg-primary/90 text-white"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Start Scanning
                    </Button>
                  ) : (
                    <Button
                      onClick={captureAndRecognizeFace}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      Capture & Recognize
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      setShowFaceScanner(false);
                      stopFaceScanning();
                    }}
                    variant="outline"
                  >
                    Close
                  </Button>
                </div>
                <div className="text-center text-xs text-gray-500">
                  Ensure good lighting and clear face visibility for best results
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentInfoScanner;