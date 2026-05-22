import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, Camera, CheckCircle, AlertCircle, Eye, EyeOff, Monitor, Smartphone, Tablet, Globe, RefreshCw, ShieldCheck, Clock } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { getFullStudentProfile } from "@/utils/student_api";
import { useStudentProfileUpdateMutation } from "@/hooks/useApiQueries";
import { useFileUpload } from "../../hooks/useOptimizations";
import { Progress } from "../ui/progress";
import { SkeletonForm } from "../ui/skeleton";
import { showSuccessAlert, showErrorAlert } from "../../utils/sweetalert";
import { API_ENDPOINT } from "../../utils/config";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { performR2Upload } from "../../utils/common_api";

type StudentForm = Record<string, any>;

/* ── Brand / OS / Browser inline SVG logos for Login Activity ── */
const BRAND_LOGOS: Record<string, (size: number) => React.ReactNode> = {
  'Apple': (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
  ),
  'Samsung': (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M5.9 4.1C4.3 4.1 3 5.4 3 7v10c0 1.6 1.3 2.9 2.9 2.9h12.2c1.6 0 2.9-1.3 2.9-2.9V7c0-1.6-1.3-2.9-2.9-2.9H5.9zm.6 7.5h1.1v1.5c0 .3-.1.5-.3.7-.2.2-.5.3-.7.3-.3 0-.5-.1-.7-.3-.2-.2-.3-.4-.3-.7v-.4h.9v.3c0 .1 0 .1.1.2 0 0 .1.1.1.1s.1 0 .1-.1c.1-.1.1-.1.1-.2v-1.4H6.5v-.9h1.1v.9h-1.1v-.9zm2.1 0h.9l.6 1.6.6-1.6h.9l-1.1 2.5h-.9l-1-2.5zm3.7 0h1.7v.7h-1v.3h.9v.6h-.9v.3h1v.7h-1.7v-2.6zm2.4 0h.8v1.9h1v.7h-1.8v-2.6zm2.3 0h1.7v.7h-1v.3h.9v.6h-.9v.3h1v.7h-1.7v-2.6z"/></svg>
  ),
  'OnePlus': (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.5 11h-3v3c0 .55-.45 1-1 1h-1c-.55 0-1-.45-1-1v-3h-3c-.55 0-1-.45-1-1v-1c0-.55.45-1 1-1h3V7c0-.55.45-1 1-1h1c.55 0 1 .45 1 1v3h3c.55 0 1 .45 1 1v1c0 .55-.45 1-1 1z"/></svg>
  ),
  'Motorola': (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.1 0 2.04.74 2.33 1.75L12 10.5 9.67 6.75C9.96 5.74 10.9 5 12 5zm-5.5 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5c.55 0 1.06.18 1.47.48L8 12l-1.97 2.02c-.41.3-.92.48-1.53.48zm11 0c-.61 0-1.12-.18-1.53-.48L14 12l1.97-2.02c.41-.3.92-.48 1.53-.48 1.38 0 2.5 1.12 2.5 2.5s-1.12 2.5-2.5 2.5zm-5.5 4.5c-1.1 0-2.04-.74-2.33-1.75L12 13.5l2.33 3.75C14.04 18.26 13.1 19 12 19z"/></svg>
  ),
  'Xiaomi': (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16v16H4V4zm2 2v12h12V6H6zm2 2h3v3H8V8zm5 0h3v8h-3V8zm-5 5h3v3H8v-3z"/></svg>
  ),
  'Redmi': (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16v16H4V4zm2 2v12h12V6H6zm2 2h3v3H8V8zm5 0h3v8h-3V8zm-5 5h3v3H8v-3z"/></svg>
  ),
  'OPPO': (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/></svg>
  ),
  'Vivo': (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M3 8l4.5 8h1L12 9.5 15.5 16h1L21 8h-2l-3.5 6L12 7.5 8.5 14 5 8H3z"/></svg>
  ),
  'Realme': (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M5 5h14v4H5V5zm0 6h8v8H5v-8zm10 0h4v8h-4v-8z"/></svg>
  ),
  'POCO': (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16v16H4V4zm2 2v12h12V6H6zm3 3h2v6H9V9zm4 0h2v6h-2V9z"/></svg>
  ),
  'Google Pixel': (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.13 15.94c-1.98-.33-3.65-1.53-4.58-3.19l1.74-1.01c.64 1.15 1.8 1.98 3.15 2.2v2zm.26-4.07A3.005 3.005 0 0 1 9 10.87c0-1.66 1.34-3 3-3 1.31 0 2.42.84 2.83 2.01l-1.86 1.08A1.001 1.001 0 0 0 12 9.87c-.55 0-1 .45-1 1 0 .43.27.79.65.93l-1.52.87v.2zm5.11 1.32-1.74-1.01c.42-.74.66-1.59.66-2.49 0-.45-.06-.88-.17-1.29l1.86-1.08c.25.72.39 1.5.39 2.31 0 1.29-.38 2.49-1 3.49v.07z"/></svg>
  ),
  'Nokia': (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h2v12H4V6zm4 0h2l4 7V6h2v12h-2l-4-7v7H8V6zm10 0h2v12h-2V6z"/></svg>
  ),
  'Huawei': (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 6.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5V12h-3V8.5zm-4 3c-.83 0-1.5-.67-1.5-1.5S6.17 8.5 7 8.5H10v3H7zm5 7c-.83 0-1.5-.67-1.5-1.5V14h3v3c0 .83-.67 1.5-1.5 1.5zm5-7h-3V8.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/></svg>
  ),
  'LG': (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-3-11v6h4v-2h-2V9H9zm5 0v4h2v2h-2v-2h-1V9h3v6h-4V9h2z"/></svg>
  ),
  'ASUS': (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M2 16l4-8h1.5l-3 6H20l-3-6h1.5l4 8H2zm7-6h2l1 2 1-2h2l-2.25 4.5h-1.5L9 10z"/></svg>
  ),
  'Sony Xperia': (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M3 8.5C3 6.57 4.57 5 6.5 5h11C19.43 5 21 6.57 21 8.5v7c0 1.93-1.57 3.5-3.5 3.5h-11C4.57 19 3 17.43 3 15.5v-7zM6.5 7C5.67 7 5 7.67 5 8.5v7c0 .83.67 1.5 1.5 1.5h11c.83 0 1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5h-11z"/></svg>
  ),
  'Windows PC': (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M3 12V6.75l7-1.05V12H3zm8-6.3L21 4v8H11V5.7zM3 13h7v6.3l-7-1.05V13zm8 0h10v8l-10-1.5V13z"/></svg>
  ),
  'Linux': (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M12.5 2c-1.77 0-2.71 1.52-2.83 2.55-.06.51.01 1.06.26 1.56.22.44.35.88.35 1.39 0 .77-.32 1.34-.67 1.83-.33.46-.68.85-.82 1.37-.12.46-.1.99.15 1.57.03.07.06.14.1.21-.74.56-1.41 1.3-1.85 2.14-.45.87-.66 1.83-.51 2.79.1.6.4 1.15.83 1.59.13.14.28.26.44.37-.05.22-.07.44-.06.66.02.55.23 1.06.58 1.46.35.4.84.65 1.38.72.28.04.56.02.83-.05.13.27.31.52.55.72.39.33.88.52 1.39.52.51 0 1-.19 1.39-.52.23-.2.42-.44.55-.72.27.07.55.09.83.05.54-.07 1.03-.32 1.38-.72.35-.4.56-.91.58-1.46.01-.22-.01-.44-.06-.66.16-.11.31-.23.44-.37.43-.44.73-.99.83-1.59.15-.96-.06-1.92-.51-2.79-.44-.84-1.11-1.58-1.85-2.14.04-.07.07-.14.1-.21.25-.58.27-1.11.15-1.57-.14-.52-.49-.91-.82-1.37-.35-.49-.67-1.06-.67-1.83 0-.51.13-.95.35-1.39.25-.5.32-1.05.26-1.56C15.21 3.52 14.27 2 12.5 2z"/></svg>
  ),
  'Chromebook': (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-2.76 0-5-2.24-5-5h3c0 1.1.9 2 2 2s2-.9 2-2h3c0 2.76-2.24 5-5 5zm6.65-5H15c0-1.66-1.34-3-3-3s-3 1.34-3 3H5.35C5.13 8.52 8.25 5.8 12 5.8s6.87 2.72 6.65 6.2z"/></svg>
  ),
  'Android Phone': (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 1.23 12.95 1 12 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.97 3.26 6 5.01 6 7h12c0-1.99-.97-3.75-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z"/></svg>
  ),
};

const BROWSER_LOGOS: Record<string, (size: number) => React.ReactNode> = {
  'Chrome': (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#4285F4"/>
      <circle cx="12" cy="12" r="4.5" fill="white"/>
      <path d="M12 7.5l6.93 4a10 10 0 0 0-.43-4H12z" fill="#EA4335"/>
      <path d="M5.07 15.5l3.47-6A4.5 4.5 0 0 0 7.5 12c0 .92.28 1.77.75 2.49L5.07 15.5z" fill="#FBBC05"/>
      <path d="M18.93 15.5H12l3.47 6A10 10 0 0 0 18.93 15.5z" fill="#34A853"/>
      <circle cx="12" cy="12" r="3" fill="white"/>
    </svg>
  ),
  'Firefox': (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="#FF6611"/><path d="M12 4c.7 0 1.38.1 2.03.26-.4.53-.63 1.19-.53 1.89.14 1.02.84 1.73 1.6 2.15.67.37 1.12.94 1.12 1.7 0 1.2-1.16 2-2.22 2-2.76 0-5-2.24-5-5 0-.57.1-1.11.27-1.62A7.97 7.97 0 0 1 12 4z" fill="#FFBD4F"/></svg>
  ),
  'Safari': (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#006CFF"/>
      <circle cx="12" cy="12" r="9" fill="white" stroke="#006CFF" strokeWidth="0.5"/>
      <polygon points="12,3 14,12 12,21 10,12" fill="#FF3B30" opacity="0.9"/>
      <polygon points="3,12 12,10 21,12 12,14" fill="#006CFF" opacity="0.7"/>
    </svg>
  ),
  'Microsoft Edge': (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12c0 3.34 1.64 6.3 4.16 8.1.17-.5.27-1.03.27-1.6 0-2.56-1.42-4.03-1.42-4.03S6.5 12.5 9.5 12.5c2 0 3.5 1.12 3.5 3.5 0 2.5-2 4-4 4-.74 0-1.42-.2-2-.54A9.95 9.95 0 0 0 12 22c5.52 0 10-4.48 10-10 0-1.72-.44-3.34-1.21-4.75C18.52 4.84 15.5 3 12 3c-3.5 0-6.5 2.5-7.5 5.5h5c1.38 0 2.5 1.12 2.5 2.5" fill="#0078D4"/></svg>
  ),
  'Opera': (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM8.5 16.5c-1.38-1.38-2-3.5-2-4.5s.62-3.12 2-4.5c1.38 1.38 2 3.5 2 4.5s-.62 3.12-2 4.5zm7 0c-1.38-1.38-2-3.5-2-4.5s.62-3.12 2-4.5c1.38 1.38 2 3.5 2 4.5s-.62 3.12-2 4.5z" fill="#FF1B2D"/></svg>
  ),
  'Samsung Internet': (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="#1428A0"/><path d="M7 10c1-2 3-3.5 5-3.5S16 7 17 10" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/><path d="M17 14c-1 2-3 3.5-5 3.5S8 17 7 14" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
  ),
  'Brave': (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L3 6v4c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V6l-9-4zm0 2.18L19 8v2c0 4.52-3.15 8.76-7 9.93V4.18z" fill="#FB542B"/></svg>
  ),
};

const OS_LOGOS: Record<string, (size: number) => React.ReactNode> = {
  'windows': (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M3 12V6.75l7-1.05V12H3zm8-6.3L21 4v8H11V5.7zM3 13h7v6.3l-7-1.05V13zm8 0h10v8l-10-1.5V13z" fill="#00ADEF"/></svg>
  ),
  'android': (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 1.23 12.95 1 12 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.97 3.26 6 5.01 6 7h12c0-1.99-.97-3.75-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z" fill="#3DDC84"/></svg>
  ),
  'ios': (s) => BRAND_LOGOS['Apple'](s),
  'ipados': (s) => BRAND_LOGOS['Apple'](s),
  'macos': (s) => BRAND_LOGOS['Apple'](s),
  'linux': (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M12.5 2c-1.77 0-2.71 1.52-2.83 2.55-.06.51.01 1.06.26 1.56.22.44.35.88.35 1.39 0 .77-.32 1.34-.67 1.83-.33.46-.68.85-.82 1.37-.12.46-.1.99.15 1.57.03.07.06.14.1.21-.74.56-1.41 1.3-1.85 2.14-.45.87-.66 1.83-.51 2.79.1.6.4 1.15.83 1.59.13.14.28.26.44.37-.05.22-.07.44-.06.66.02.55.23 1.06.58 1.46.35.4.84.65 1.38.72.28.04.56.02.83-.05.13.27.31.52.55.72.39.33.88.52 1.39.52.51 0 1-.19 1.39-.52.23-.2.42-.44.55-.72.27.07.55.09.83.05.54-.07 1.03-.32 1.38-.72.35-.4.56-.91.58-1.46.01-.22-.01-.44-.06-.66.16-.11.31-.23.44-.37.43-.44.73-.99.83-1.59.15-.96-.06-1.92-.51-2.79-.44-.84-1.11-1.58-1.85-2.14.04-.07.07-.14.1-.21.25-.58.27-1.11.15-1.57-.14-.52-.49-.91-.82-1.37-.35-.49-.67-1.06-.67-1.83 0-.51.13-.95.35-1.39.25-.5.32-1.05.26-1.56C15.21 3.52 14.27 2 12.5 2z" fill="#F0C800"/></svg>
  ),
  'chromeos': (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#4285F4"/>
      <circle cx="12" cy="12" r="4.5" fill="white"/>
      <path d="M12 7.5l6.93 4a10 10 0 0 0-.43-4H12z" fill="#EA4335"/>
      <path d="M5.07 15.5l3.47-6A4.5 4.5 0 0 0 7.5 12c0 .92.28 1.77.75 2.49L5.07 15.5z" fill="#FBBC05"/>
      <path d="M18.93 15.5H12l3.47 6A10 10 0 0 0 18.93 15.5z" fill="#34A853"/>
      <circle cx="12" cy="12" r="3" fill="white"/>
    </svg>
  ),
};

/** Resolves the best brand logo for a login entry. Falls back to a generic Lucide icon. */
const getBrandLogo = (entry: any, size: number): React.ReactNode => {
  // Try exact brand match first
  if (entry.brand && BRAND_LOGOS[entry.brand]) return BRAND_LOGOS[entry.brand](size);
  // Try OS-based match
  const osKey = (entry.os || '').toLowerCase();
  for (const [prefix, renderer] of Object.entries(OS_LOGOS)) {
    if (osKey.startsWith(prefix)) return renderer(size);
  }
  return null;
};

const getBrowserLogo = (browser: string, size: number): React.ReactNode => {
  if (browser && BROWSER_LOGOS[browser]) return BROWSER_LOGOS[browser](size);
  return null;
};

const StudentProfile: React.FC = () => {
  const { theme } = useTheme();
  const updateProfileMutation = useStudentProfileUpdateMutation();

  const [form, setForm] = useState<StudentForm>({
    // Basic User Fields
    user_id: "",
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    date_of_birth: "",
    address: "",
    bio: "",
    about: "",
    profile_picture: "",
    designation: "",
    
    // Student Fields
    name: "",
    usn: "",
    branch: "",
    batch: "",
    course: "",
    semester: "",
    current_semester: "",
    section: "",
    enrollment_year: "",
    expected_graduation: "",
    student_status: "",
    mode_of_admission: "",
    date_of_admission: "",
    year_of_study: "",
    department: "",
    proctor: {},
    
    // Personal Profile Fields
    preferred_name: "",
    nationality: "",
    religion: "",
    caste: "",
    marital_status: "",
    primary_language: "",
    alternate_mobile: "",
    personal_email: "",
    institutional_email: "",
    
    // Official IDs
    aadhaar_number: "",
    passport_number: "",
    pan_number: "",
    
    // Address Fields
    address_permanent: "",
    address_current: "",
    city: "",
    state: "",
    country: "",
    pin_code: "",
    
    // Social Links
    linkedin: "",
    github: "",
    portfolio: "",
    
    // Parent Details
    father_name: "",
    father_contact: "",
    mother_name: "",
    mother_contact: "",
    
    // Guardian Details
    guardian_name: "",
    guardian_relationship: "",
    guardian_phone: "",
    guardian_email: "",
    
    // Socio-economic
    occupation: "",
    income_range: "",
    
    // Medical Information
    blood_group: "",
    emergency_contact: "",
    allergies: "",
    disabilities: "",
    medical_history: "",
    medical_conditions: ""
  });
  
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile'|'personal'|'academic'|'face'|'activity'>('profile');
  
  // Toggle states for Guardian Details and Address
  const [showGuardianDetails, setShowGuardianDetails] = useState(false);
  const [sameAsPermament, setSameAsPermament] = useState(false);

  // Face upload / training states
  const [faceImages, setFaceImages] = useState<File[]>([]);
  const [faceTrainingStatus, setFaceTrainingStatus] = useState<'idle'|'training'|'success'|'error'>('idle');
  const [faceTrainingProgress, setFaceTrainingProgress] = useState<number>(0);
  const [faceTrainingMessage, setFaceTrainingMessage] = useState<string>('');
  const [hasFaceTrained, setHasFaceTrained] = useState<boolean>(false);

  // Login activity state
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [loginHistoryLoading, setLoginHistoryLoading] = useState(false);

  // Profile picture upload state
  const [isUploadingPicture, setIsUploadingPicture] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const resetUpload = () => { setIsUploadingPicture(false); setUploadProgress(0); };

  // Password dialog state
  const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showPasswords, setShowPasswords] = useState({ current: false, next: false, confirm: false });
  const passwordDialogContentRef = useRef<HTMLDivElement | null>(null);
  // Extended personal fields not previously exposed in the UI
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getFullStudentProfile();
        if (data?.success && data.profile) {
          const pd = data.profile;
          const newForm = { ...form } as StudentForm;
          Object.keys(pd).forEach((k) => {
            if (k === 'profile_picture' && pd[k]) {
              newForm[k] = pd[k].startsWith('http') ? pd[k] : `${API_ENDPOINT.replace('/api', '')}${pd[k]}`;
              return;
            }

            if (k === 'mobile_number') {
              newForm['phone'] = pd[k] ?? "";
              return;
            }

            if (k === 'date_of_birth' && pd[k]) {
              const raw = pd[k];
              let iso = raw;
              if (typeof raw === 'string') {
                const parts = raw.split('/');
                if (parts.length === 3) {
                  const [d, m, y] = parts;
                  iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                } else {
                  const parsed = new Date(raw);
                  if (!isNaN(parsed.getTime())) iso = parsed.toLocaleDateString('sv-SE');
                }
              }
              newForm['date_of_birth'] = iso ?? "";
              return;
            }

            newForm[k] = pd[k] ?? "";
          });

          // Map structured/JSON fields into form-friendly fields
          try {
            if (pd.guardian) {
              const g = typeof pd.guardian === 'string' ? JSON.parse(pd.guardian) : pd.guardian;
              if (g) {
                newForm.guardian_name = g.name || g.full_name || newForm.guardian_name || '';
                newForm.guardian_relationship = g.relationship || newForm.guardian_relationship || '';
                newForm.guardian_phone = g.phone || g.mobile || '';
                newForm.guardian_email = g.email || '';
              }
            }
          } catch (e) {
            // ignore malformed guardian
          }

          // If backend provides combined parent_name / parent_contact, attempt to split into father/mother
          try {
            if (!newForm.father_name && pd.parent_name) {
              const parts = String(pd.parent_name).split(/[,\/|&]| and /i).map(s => s.trim()).filter(Boolean);
              if (parts.length >= 2) {
                newForm.father_name = parts[0];
                newForm.mother_name = parts.slice(1).join(' / ');
              } else {
                newForm.father_name = pd.parent_name;
              }
            }
            if (!newForm.father_contact && pd.parent_contact) {
              const parts = String(pd.parent_contact).split(/[,\/|&]| and /i).map(s => s.trim()).filter(Boolean);
              if (parts.length >= 2) {
                newForm.father_contact = parts[0];
                newForm.mother_contact = parts.slice(1).join(' / ');
              } else {
                newForm.father_contact = pd.parent_contact;
              }
            }
          } catch (e) {}

          setForm(newForm);
          // Initialize guardian details visibility based on existing data
          setShowGuardianDetails(!!(newForm.guardian_name || newForm.guardian_phone || newForm.guardian_email));
        }
      } catch (err) {

      }

      // check face status
      try {
        const resp = await fetch(`${API_ENDPOINT}/student/check-face-status/`, { headers: { 'Authorization': `Bearer ${sessionStorage.getItem("access_token")}` } });
        const j = await resp.json();
        if (j.success) setHasFaceTrained(Boolean(j.has_face));
      } catch (err) {

      }
    };

    fetchProfile().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchLoginHistory = async () => {
    setLoginHistoryLoading(true);
    try {
      const resp = await fetchWithTokenRefresh(`${API_ENDPOINT}/profile/login-history/`, {
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('access_token')}` }
      });
      const j = await resp.json();
      if (j.success) setLoginHistory(j.history || []);
    } catch (err) {
      // silent
    } finally {
      setLoginHistoryLoading(false);
    }
  };

  const handleProfilePictureSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadProfilePictureDirectly(file);
  };

  const uploadProfilePictureDirectly = async (file: File) => {
    try {
      // Step 1 & 2: Upload to R2 via common utility
      const fileUrl = await performR2Upload(file, 'profiles');
      
      if (fileUrl) {
        // Step 3: Finalize update with backend
        const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/profile/upload-picture/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile_picture_url: fileUrl })
        });
        const result = await response.json();

        if (result?.success) {
          setForm((p) => ({ ...p, profile_picture: fileUrl }));
          const currentUserData = JSON.parse(sessionStorage.getItem("user") || '{}');
          currentUserData.profile_picture = fileUrl;
          sessionStorage.setItem("user", JSON.stringify(currentUserData));
          showSuccessAlert('Success', 'Profile picture updated successfully!');
        } else {
          showErrorAlert('Error', result.message || 'Failed to update backend with new photo');
        }
      } else {
        showErrorAlert('Error', 'Failed to upload image to R2');
      }
    } catch (err) {
      console.error("Profile picture upload error:", err);
      showErrorAlert('Error', 'Failed to upload profile picture');
    } finally {
      resetUpload();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target as HTMLInputElement & HTMLTextAreaElement;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSave = async () => {
    try {
      // Send all editable fields from the form to backend. Backend will ignore unknown keys.
      // assemble guardian object and attempt to parse JSON fields
      const guardianObj = (form.guardian_name || form.guardian_phone || form.guardian_relationship || form.guardian_email) ? {
        name: form.guardian_name || '',
        relationship: form.guardian_relationship || '',
        phone: form.guardian_phone || '',
        email: form.guardian_email || ''
      } : undefined;

      const tryParseJson = (s: any) => {
        if (!s && s !== '') return undefined;
        if (typeof s === 'object') return s;
        try { return JSON.parse(s); } catch (e) { return s; }
      };

      const payload = {
        // Basic User Fields
        first_name: form.first_name || '',
        last_name: form.last_name || '',
        email: form.email || '',
        mobile_number: form.phone || '',
        address: form.address || '',
        bio: form.about || '',
        date_of_birth: form.date_of_birth || '',
        gender: form.gender || '',
        designation: form.designation || '',
        
        // Personal Profile Fields (all optional, can be empty)
        preferred_name: form.preferred_name || '',
        nationality: form.nationality || '',
        religion: form.religion || '',
        caste: form.caste || '',
        marital_status: form.marital_status || '',
        primary_language: form.primary_language || '',
        alternate_mobile: form.alternate_mobile || '',
        personal_email: form.personal_email || '',
        institutional_email: form.institutional_email || '',
        
        // Official IDs (all optional)
        aadhaar_number: form.aadhaar_number || '',
        passport_number: form.passport_number || '',
        pan_number: form.pan_number || '',
        
        // Address Fields (all optional)
        address_permanent: form.address_permanent || '',
        address_current: form.address_current || '',
        city: form.city || '',
        state: form.state || '',
        country: form.country || '',
        pin_code: form.pin_code || '',
        
        // Social Links (all optional)
        linkedin: form.linkedin || '',
        github: form.github || '',
        portfolio: form.portfolio || '',
        
        // Parent Details (all optional - can be empty)
        father_name: form.father_name || '',
        father_contact: form.father_contact || '',
        mother_name: form.mother_name || '',
        mother_contact: form.mother_contact || '',
        
        // Guardian Details (all optional)
        guardian: guardianObj,
        
        // Socio-economic (all optional)
        occupation: form.occupation || '',
        income_range: form.income_range || '',
        
        // Medical Information (all optional - can be empty)
        blood_group: form.blood_group || '',
        emergency_contact: form.emergency_contact || '',
        allergies: form.allergies || '',
        disabilities: form.disabilities || '',
        medical_history: form.medical_history || '',
        medical_conditions: form.medical_conditions || ''
      };

      await updateProfileMutation.mutateAsync(payload);
      
      // Use the mutation response to update UI immediately (no extra GET call)
      setForm(prev => ({
        ...prev,
        ...payload,
        phone: payload.mobile_number,
      }));
      
      // Update guardian details visibility based on saved data
      setShowGuardianDetails(!!(payload.guardian_name || payload.guardian_phone || payload.guardian_email));
      setSameAsPermament(false);

      showSuccessAlert('Profile Updated', 'Your profile has been successfully updated.');
      setEditing(false);
    } catch (err) {

      showErrorAlert('Error', 'Failed to update profile');
    }
  };

  const handleFaceImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const arr = Array.from(files);
    if (faceImages.length + arr.length > 5) {showErrorAlert('Error', 'Maximum 5 images allowed');return;}
    setFaceImages((p) => [...p, ...arr]);
  };

  const removeFaceImage = (index: number) => setFaceImages((p) => p.filter((_, i) => i !== index));

  const trainFace = async () => {
    if (faceImages.length < 3) {showErrorAlert('Error', 'Please upload at least 3 face images');return;}
    setFaceTrainingStatus('training');setFaceTrainingProgress(0);setFaceTrainingMessage('Preparing images...');
    try {
      const fd = new FormData();
      faceImages.forEach((f) => fd.append('images', f));
      setFaceTrainingProgress(25);setFaceTrainingMessage('Uploading images...');
      const resp = await fetch(`${API_ENDPOINT}/student/train-face/`, { method: 'POST', headers: { 'Authorization': `Bearer ${sessionStorage.getItem("access_token")}` }, body: fd });
      const j = await resp.json();
      setFaceTrainingProgress(75);setFaceTrainingMessage('Training face recognition...');
      if (j.success) {setFaceTrainingProgress(100);setFaceTrainingStatus('success');setHasFaceTrained(true);setFaceImages([]);showSuccessAlert('Success', 'Face updated successfully!');} else
      {setFaceTrainingStatus('error');setFaceTrainingMessage(j.message || 'Face training failed');showErrorAlert('Error', j.message || 'Face training failed');}
    } catch (err) {
      setFaceTrainingStatus('error');setFaceTrainingMessage('Network error occurred');showErrorAlert('Error', 'Network error occurred');
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password) {showErrorAlert('Missing fields', 'Please fill all password fields');return;}
    if (passwordData.new_password !== passwordData.confirm_password) {showErrorAlert('Password mismatch', 'New passwords do not match');return;}
    try {
      const resp = await fetchWithTokenRefresh(`${API_ENDPOINT}/profile/change-password/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(passwordData) });
      const j = await resp.json();
      if (j.success) {setShowPasswordDialog(false);setPasswordData({ current_password: '', new_password: '', confirm_password: '' });showSuccessAlert('Password changed', 'Your password has been updated successfully.');} else
      showErrorAlert('Unable to change password', j.message || 'Failed to change password');
    } catch (err) {showErrorAlert('Unable to change password', 'Network error');}
  };

  if (loading) {
    return (
      <div className={`min-h-screen p-6 ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50'}`}>
        <SkeletonForm />
      </div>);

  }

  return (
    <div id="student-profile-container" className="min-h-screen flex justify-center items-start">
      <Card className={`w-full max-w-none mx-auto ${theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'}`}>
        <CardHeader id="student-profile-header" className="px-2 sm:px-3 md:px-4 lg:px-6 py-3 sm:py-4 md:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 border-b">
          <div className="flex-1 min-w-0">
            <CardTitle className={`tracking-tight text-xl sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Profile</CardTitle>
            <p className={`text-[16px] sm:text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>View and update your personal information</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap ml-auto">
            <Button size="sm" onClick={() => {if (editing) handleSave();else setEditing(true);}} className="text-md sm:text-md px-3 sm:px-4 py-1.5 sm:py-2 h-auto bg-primary text-white border-primary hover:bg-primary/90">
              {editing ? updateProfileMutation.isPending ? 'Saving...' : 'Save' : 'Edit Profile'}
            </Button>

            <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
              <DialogTrigger asChild>
                <Button className="text-md sm:text-md px-3 sm:px-4 py-1.5 sm:py-2 h-auto bg-primary text-white border-primary hover:bg-primary/90">Change Password</Button>
              </DialogTrigger>
              <DialogContent ref={passwordDialogContentRef} className="w-[calc(100vw-1.5rem)] sm:w-full max-w-[420px] rounded-xl sm:rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="current_password" className="text-[16px] sm:text-sm">Current Password</Label>
                    <div className="relative">
                      <Input id="current_password" type={showPasswords.current ? 'text' : 'password'} value={passwordData.current_password} onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })} className="pr-10 text-[16px] sm:text-sm" />
                      <button type="button" onClick={() => setShowPasswords((p) => ({ ...p, current: !p.current }))} className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground" aria-label="Toggle current password visibility">{showPasswords.current ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="new_password" className="text-[16px] sm:text-sm">New Password</Label>
                    <div className="relative">
                      <Input id="new_password" type={showPasswords.next ? 'text' : 'password'} value={passwordData.new_password} onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })} className="pr-10 text-[16px] sm:text-sm" />
                      <button type="button" onClick={() => setShowPasswords((p) => ({ ...p, next: !p.next }))} className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground" aria-label="Toggle new password visibility">{showPasswords.next ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="confirm_password" className="text-[16px] sm:text-sm">Confirm New Password</Label>
                    <div className="relative">
                      <Input id="confirm_password" type={showPasswords.confirm ? 'text' : 'password'} value={passwordData.confirm_password} onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })} className="pr-10 text-[16px] sm:text-sm" />
                      <button type="button" onClick={() => setShowPasswords((p) => ({ ...p, confirm: !p.confirm }))} className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground" aria-label="Toggle confirm password visibility">{showPasswords.confirm ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>Cancel</Button>
                    <Button className="font-medium bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90" onClick={handleChangePassword}>Change Password</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-6 pt-2 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6 lg:gap-8 items-start">
            <div className="col-span-1 flex flex-col items-center">
              <div className="relative mb-3 mt-3 sm:mb-4 flex-shrink-0">
                <Avatar className="w-20 h-20 sm:w-24 sm:h-24">
                  {form.profile_picture ? <AvatarImage src={form.profile_picture} alt={`${form.first_name} ${form.last_name}`} /> : <AvatarFallback>{(form.first_name?.[0] || '') + (form.last_name?.[0] || '')}</AvatarFallback>}
                </Avatar>
                <label htmlFor="profile-picture-upload" className="absolute bottom-0 right-0 bg-primary hover:bg-primary/90 text-white p-2 rounded-full cursor-pointer transition-colors shadow-lg"><Camera className="h-4 w-4" /></label>
                <input id="profile-picture-upload" type="file" accept="image/*" onChange={handleProfilePictureSelect} className="hidden" />
              </div>

              {isUploadingPicture &&
              <div className="mb-2 text-center">
                  <div className="space-y-1">
                    <Progress value={uploadProgress} className="w-full h-2" />
                    <p className="text-[12px] sm:text-xs text-gray-500">Uploading... {uploadProgress}%</p>
                  </div>
                </div>
              }

              <div className="text-md sm:text-lg font-semibold text-center mb-1">{form.first_name} {form.last_name}</div>
              <div className={`text-md sm:text-md mb-4 text-center ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>{form.username || form.email}</div>

              <div className="w-full mt-4 sm:mt-6 flex flex-col">
                <h4 className={`text-[16px] sm:text-sm font-bold mb-2.5 sm:mb-4 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Quick Info</h4>
                <div className={`border rounded-lg p-2.5 sm:p-4 ${theme === 'dark' ? 'bg-card border-input' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="grid grid-cols-1 gap-2.5 sm:gap-3.5">
                    <div className="flex flex-col justify-start">
                      <span className={`text-[14px] sm:text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Department</span>
                      <span className={`text-[16px] sm:text-sm break-words px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-2xl line-clamp-2 bg-purple-100 text-purple-700`}>{form.branch || '—'}</span>
                    </div>
                    <div className="flex flex-col justify-start">
                      <span className={`text-[14px] sm:text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Year</span>
                      <span className={`text-[16px] sm:text-sm break-words px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-2xl line-clamp-2 bg-purple-100 text-purple-700`}>{form.year_of_study || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-1 sm:col-span-2 lg:col-span-3 w-full flex flex-col h-full">
              <div className="flex items-center gap-1 sm:gap-2 mb-3 sm:mb-4 md:mb-5 lg:mb-6 border-b pb-2 sm:pb-3 overflow-x-auto flex-shrink-0">
                <button onClick={() => setActiveTab('profile')} className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-[14px] sm:text-sm rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${activeTab === 'profile' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Profile</button>
                <button onClick={() => setActiveTab('personal')} className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-[14px] sm:text-sm rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${activeTab === 'personal' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Personal</button>
                <button onClick={() => setActiveTab('academic')} className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-[14px] sm:text-sm rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${activeTab === 'academic' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Academic</button>
                <button onClick={() => setActiveTab('face')} className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-[14px] sm:text-sm rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${activeTab === 'face' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Face Recognition</button>
                <button onClick={() => { setActiveTab('activity'); if (loginHistory.length === 0) fetchLoginHistory(); }} className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-[14px] sm:text-sm rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${activeTab === 'activity' ? 'bg-primary text-white' : theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-600 hover:text-gray-900'}`}>Login Activity</button>
              </div>

              <div className={`p-3 sm:p-4 md:p-5 lg:p-6 rounded-lg border flex-1 ${theme === 'dark' ? 'bg-card border-input' : 'bg-gray-50 border-gray-200'}`}>
                {activeTab === 'profile' &&
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>First Name</Label>
                        <Input name="first_name" value={form.first_name} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                      </div>
                      <div>
                        <Label className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>Last Name</Label>
                        <Input name="last_name" value={form.last_name} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                      </div>
                      <div>
                        <Label className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>USN</Label>
                        <Input name="usn" value={form.usn} readOnly className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-gray-100 text-gray-500 border-gray-300'}`} />
                      </div>
                      <div>
                        <Label className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>Email</Label>
                        <Input name="email" value={form.email} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                      </div>
                      <div>
                        <Label className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>Phone</Label>
                        <Input name="phone" value={form.phone} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                      </div>
                    </div>

                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Address</Label>
                      <Input name="address" value={form.address} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>

                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>About</Label>
                      <Textarea name="about" value={form.about} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                  </div>
                }

                {activeTab === 'personal' &&
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Preferred Name</Label>
                      <Input name="preferred_name" value={form.preferred_name || ''} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Date of Birth</Label>
                      <Input name="date_of_birth" type="date" value={form.date_of_birth || ''} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Blood Group</Label>
                      <Input name="blood_group" value={form.blood_group || ''} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Primary Language</Label>
                      <Input name="primary_language" value={form.primary_language || ''} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Aadhaar Number</Label>
                      <Input name="aadhaar_number" value={form.aadhaar_number || ''} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>PAN / Passport</Label>
                      <Input name="pan_number" value={form.pan_number || ''} onChange={handleChange} placeholder="PAN" readOnly={!editing} className={`text-[16px] sm:text-sm mb-2 ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                      <Input name="passport_number" value={form.passport_number || ''} onChange={handleChange} placeholder="Passport" readOnly={!editing} className={`text-[14px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Nationality</Label>
                      <Input name="nationality" value={form.nationality || ''} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Religion / Caste</Label>
                      <Input name="religion" value={form.religion || ''} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm mb-2 ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                      <Input name="caste" value={form.caste || ''} onChange={handleChange} placeholder="Caste (optional)" readOnly={!editing} className={`text-[14px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Alternate Mobile</Label>
                      <Input name="alternate_mobile" value={form.alternate_mobile || ''} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Personal Email</Label>
                      <Input name="personal_email" value={form.personal_email || ''} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Institutional Email</Label>
                      <Input name="institutional_email" value={form.institutional_email || ''} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>City / State / PIN</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <Input name="city" value={form.city || ''} onChange={handleChange} readOnly={!editing} className={`text-[14px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                        <Input name="state" value={form.state || ''} onChange={handleChange} readOnly={!editing} className={`text-[14px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                        <Input name="pin_code" value={form.pin_code || ''} onChange={handleChange} readOnly={!editing} className={`text-[14px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                      </div>
                    </div>
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Permanent Address</Label>
                      <Textarea name="address_permanent" value={form.address_permanent || ''} onChange={handleChange} readOnly={!editing} className={`text-[14px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Current Address</Label>
                        {editing && (
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sameAsPermament}
                              onChange={(e) => {
                                setSameAsPermament(e.target.checked);
                                if (e.target.checked) {
                                  setForm(prev => ({ ...prev, address_current: prev.address_permanent }));
                                }
                              }}
                              className="w-4 h-4"
                            />
                            <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}>Same as Permanent</span>
                          </label>
                        )}
                      </div>
                      <Textarea name="address_current" value={form.address_current || ''} onChange={handleChange} readOnly={!editing || sameAsPermament} className={`text-[14px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>LinkedIn</Label>
                      <div className="flex gap-2">
                        <Input name="linkedin" value={form.linkedin || ''} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm flex-1 ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                        {form.linkedin && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(form.linkedin.startsWith('http') ? form.linkedin : `https://${form.linkedin}`, '_blank')}
                            className="whitespace-nowrap"
                          >
                            View
                          </Button>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>GitHub / Portfolio</Label>
                      <div className="flex gap-2 mb-2">
                        <Input name="github" value={form.github || ''} onChange={handleChange} placeholder="GitHub" readOnly={!editing} className={`text-[16px] sm:text-sm flex-1 ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                        {form.github && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(form.github.startsWith('http') ? form.github : `https://${form.github}`, '_blank')}
                            className="whitespace-nowrap"
                          >
                            View
                          </Button>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Input name="portfolio" value={form.portfolio || ''} onChange={handleChange} placeholder="Portfolio URL" readOnly={!editing} className={`text-[14px] sm:text-sm flex-1 ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                        {form.portfolio && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(form.portfolio.startsWith('http') ? form.portfolio : `https://${form.portfolio}`, '_blank')}
                            className="whitespace-nowrap"
                          >
                            View
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-lg p-3 border bg-white dark:bg-card">
                      <h4 className="font-semibold mb-2">Parents Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Father's Name</Label>
                          <Input name="father_name" value={form.father_name || ''} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                          <Label className={`mt-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>Father's Contact</Label>
                          <Input name="father_contact" value={form.father_contact || ''} onChange={handleChange} readOnly={!editing} className={`text-[14px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                        </div>
                        <div>
                          <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Mother's Name</Label>
                          <Input name="mother_name" value={form.mother_name || ''} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                          <Label className={`mt-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>Mother's Contact</Label>
                          <Input name="mother_contact" value={form.mother_contact || ''} onChange={handleChange} readOnly={!editing} className={`text-[14px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg p-3 border bg-white dark:bg-card">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold">Guardian Details</h4>
                        {editing && (
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              checked={showGuardianDetails}
                              onChange={(e) => {
                                setShowGuardianDetails(e.target.checked);
                                if (!e.target.checked) {
                                  setForm(prev => ({
                                    ...prev,
                                    guardian_name: '',
                                    guardian_relationship: '',
                                    guardian_phone: '',
                                    guardian_email: ''
                                  }));
                                }
                              }}
                              className="w-4 h-4"
                            />
                            <span className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}>Add Guardian</span>
                          </label>
                        )}
                      </div>
                      {showGuardianDetails && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Guardian Name</Label>
                            <Input name="guardian_name" value={form.guardian_name || ''} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                            <Label className={`mt-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>Relationship</Label>
                            <Input name="guardian_relationship" value={form.guardian_relationship || ''} onChange={handleChange} readOnly={!editing} className={`text-[14px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                          </div>
                          <div>
                            <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Guardian Contact</Label>
                            <Input name="guardian_phone" value={form.guardian_phone || ''} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                            <Label className={`mt-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>Guardian Email</Label>
                            <Input name="guardian_email" value={form.guardian_email || ''} onChange={handleChange} readOnly={!editing} className={`text-[14px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Medical info removed per request */}
                  </div>

                  <div className="rounded-lg p-3 border bg-white dark:bg-card">
                    <h4 className="font-semibold mb-2">Medical Info</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Blood Group</Label>
                        <Input name="blood_group" value={form.blood_group || ''} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                      </div>
                      <div>
                        <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Emergency Contact</Label>
                        <Input name="emergency_contact" value={form.emergency_contact || ''} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                      </div>
                      <div>
                        <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Allergies</Label>
                        <Input name="allergies" value={form.allergies || ''} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                      </div>
                      <div>
                        <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Disabilities</Label>
                        <Input name="disabilities" value={form.disabilities || ''} onChange={handleChange} readOnly={!editing} className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                      </div>
                      <div className="md:col-span-2">
                        <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Medical History / Notes</Label>
                        <Textarea name="medical_history" value={form.medical_history || ''} onChange={handleChange} readOnly={!editing} className={`text-[14px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                      </div>
                    </div>
                  </div>
                </div>
                }

                {activeTab === 'academic' &&
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Current Semester</Label>
                      <Input value={form.current_semester} readOnly className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Section</Label>
                      <Input value={form.section} readOnly className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>

                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Enrollment Year</Label>
                      <Input value={form.enrollment_year || ''} readOnly className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Expected Graduation</Label>
                      <Input value={form.expected_graduation || ''} readOnly className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>

                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Proctor</Label>
                      <Input value={form.proctor ? form.proctor.first_name || form.proctor.username ? `${form.proctor.first_name || ''} ${form.proctor.last_name || ''}`.trim() : form.proctor.username || '' : ''} readOnly className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>

                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Student Status</Label>
                      <Input value={form.student_status || ''} readOnly className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>

                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Mode of Admission</Label>
                      <Input value={form.mode_of_admission || ''} readOnly className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>

                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Batch</Label>
                      <Input value={form.batch || ''} readOnly className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>



                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Date of Admission</Label>
                      <Input value={form.date_of_admission ? form.date_of_admission.length > 10 ? form.date_of_admission.slice(0, 10) : form.date_of_admission : ''} readOnly className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'bg-muted text-muted-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} />
                    </div>
                  </div>
                }

                {activeTab === 'face' &&
                <div className="space-y-4">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold mb-2">Face Recognition Training</h3>
                      <p className="text-[16px] sm:text-sm text-gray-600 dark:text-gray-400">Upload 3-5 clear face photos to train the AI recognition system</p>
                    </div>

                    {hasFaceTrained &&
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-[16px] sm:text-sm text-green-700 dark:text-green-300">Face recognition is active for your account</span>
                      </div>
                  }

                    <div>
                      <Label className={theme === 'dark' ? 'text-foreground' : 'text-gray-700'}>Upload Face Images</Label>
                      <div className="mt-2">
                        <input type="file" multiple accept="image/*" onChange={handleFaceImageSelect} className="hidden" id="face-images" />
                        <label htmlFor="face-images" className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                          <div className="text-center">
                            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-[16px] sm:text-sm text-gray-600 dark:text-gray-400">Click to upload face images</p>
                            <p className="text-[12px] sm:text-xs text-gray-500">PNG, JPG up to 5MB each</p>
                          </div>
                        </label>
                      </div>

                      {faceImages.length > 0 &&
                    <div className="space-y-2">
                          <Label className={`text-[16px] sm:text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>Selected Images ({faceImages.length}/5)</Label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {faceImages.map((image, idx) =>
                        <div key={idx} className="relative">
                                <img src={URL.createObjectURL(image)} alt={`Face ${idx + 1}`} className="w-full h-20 object-cover rounded-lg" />
                                <button onClick={() => removeFaceImage(idx)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600">×</button>
                              </div>
                        )}
                          </div>
                        </div>
                    }

                      {faceTrainingStatus !== 'idle' &&
                    <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {faceTrainingStatus === 'training' && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>}
                            {faceTrainingStatus === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                            {faceTrainingStatus === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                            <span className="text-sm">{faceTrainingMessage}</span>
                          </div>
                          {faceTrainingStatus === 'training' && <Progress value={faceTrainingProgress} className="w-full h-2" />}
                        </div>
                    }

                      <div className="flex justify-center mt-2">
                        <Button onClick={trainFace} disabled={faceImages.length < 3 || faceTrainingStatus === 'training'} className="bg-primary hover:bg-primary/90 text-white">{faceTrainingStatus === 'training' ? 'Training...' : 'Train Face AI'}</Button>
                      </div>
                    </div>
                  </div>
                }

                {activeTab === 'activity' && (
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                          <ShieldCheck className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <h3 className={`font-semibold text-base ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Login Activity</h3>
                          <p className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Recent sessions on your account</p>
                        </div>
                      </div>
                      <button
                        onClick={fetchLoginHistory}
                        disabled={loginHistoryLoading}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all font-medium
                          ${theme === 'dark' ? 'border-border text-muted-foreground hover:text-foreground hover:border-foreground' : 'border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-400'}`}
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${loginHistoryLoading ? 'animate-spin' : ''}`} />
                        Refresh
                      </button>
                    </div>

                    {/* Loading state */}
                    {loginHistoryLoading && (
                      <div className="space-y-3">
                        {[1,2,3].map(i => (
                          <div key={i} className={`animate-pulse rounded-xl p-4 ${theme === 'dark' ? 'bg-muted' : 'bg-gray-100'}`}>
                            <div className="flex items-center gap-4">
                              <div className={`h-12 w-12 rounded-xl ${theme === 'dark' ? 'bg-muted-foreground/20' : 'bg-gray-200'}`} />
                              <div className="flex-1 space-y-2">
                                <div className={`h-4 rounded w-2/5 ${theme === 'dark' ? 'bg-muted-foreground/20' : 'bg-gray-200'}`} />
                                <div className={`h-3 rounded w-3/5 ${theme === 'dark' ? 'bg-muted-foreground/10' : 'bg-gray-150'}`} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Empty state */}
                    {!loginHistoryLoading && loginHistory.length === 0 && (
                      <div className={`flex flex-col items-center justify-center py-12 rounded-xl border-2 border-dashed ${theme === 'dark' ? 'border-border text-muted-foreground' : 'border-gray-200 text-gray-400'}`}>
                        <Clock className="h-12 w-12 mb-3 opacity-40" />
                        <p className="font-medium">No login history yet</p>
                        <p className="text-sm mt-1">Login events will appear here after your next sign-in.</p>
                      </div>
                    )}

                    {/* Login history list */}
                    {!loginHistoryLoading && loginHistory.length > 0 && (
                      <div className="space-y-3">
                        {loginHistory.map((entry: any, idx: number) => {
                          const dt = new Date(entry.timestamp);
                          const isRecent = idx === 0;
                          const timeAgo = (() => {
                            const diff = Date.now() - dt.getTime();
                            const mins = Math.floor(diff / 60000);
                            const hrs = Math.floor(mins / 60);
                            const days = Math.floor(hrs / 24);
                            if (mins < 2) return 'Just now';
                            if (mins < 60) return `${mins}m ago`;
                            if (hrs < 24) return `${hrs}h ago`;
                            if (days < 7) return `${days}d ago`;
                            return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                          })();

                          // Device icon
                          const DeviceIcon = entry.device_type === 'mobile' ? Smartphone
                            : entry.device_type === 'tablet' ? Tablet
                            : entry.device_type === 'desktop' ? Monitor
                            : Globe;

                          // Color scheme per device type
                          const iconColor = entry.device_type === 'mobile' ? 'text-emerald-600'
                            : entry.device_type === 'tablet' ? 'text-blue-600'
                            : entry.device_type === 'desktop' ? 'text-violet-600'
                            : 'text-orange-500';

                          const iconBg = entry.device_type === 'mobile'
                            ? (theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-50')
                            : entry.device_type === 'tablet'
                            ? (theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-50')
                            : entry.device_type === 'desktop'
                            ? (theme === 'dark' ? 'bg-violet-900/30' : 'bg-violet-50')
                            : (theme === 'dark' ? 'bg-orange-900/30' : 'bg-orange-50');

                          return (
                            <div
                              key={entry.id}
                              className={`relative flex items-start gap-4 p-4 rounded-xl border transition-all
                                ${isRecent
                                  ? (theme === 'dark' ? 'border-primary/40 bg-primary/5' : 'border-primary/30 bg-primary/3')
                                  : (theme === 'dark' ? 'border-border bg-card hover:border-border/80' : 'border-gray-100 bg-white hover:border-gray-200 shadow-sm')
                                }`}
                            >
                              {/* Current session badge */}
                              {isRecent && (
                                <span className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary text-white">
                                  Latest
                                </span>
                              )}

                              {/* Device Icon */}
                              <div className={`flex-shrink-0 h-12 w-12 rounded-xl flex items-center justify-center ${iconBg}`}>
                                <DeviceIcon className={`h-6 w-6 ${iconColor}`} />
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`font-semibold text-sm truncate ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
                                    {entry.device}
                                  </span>
                                  {entry.brand && entry.brand !== 'Unknown' && entry.brand !== entry.device && (
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${theme === 'dark' ? 'bg-muted text-muted-foreground' : 'bg-gray-100 text-gray-600'}`}>
                                      {entry.brand}
                                    </span>
                                  )}
                                </div>

                                {/* OS + Browser */}
                                <div className={`flex items-center gap-2 mt-1 text-xs flex-wrap ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                                  <span>{entry.os}</span>
                                  <span className="opacity-40">·</span>
                                  <span>{entry.browser}</span>
                                </div>

                                {/* IP + Time */}
                                <div className={`flex items-center gap-3 mt-2 flex-wrap`}>
                                  <span className={`flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-md ${theme === 'dark' ? 'bg-muted text-muted-foreground' : 'bg-gray-100 text-gray-600'}`}>
                                    <Globe className="h-3 w-3 opacity-60" />
                                    {entry.ip_address}
                                  </span>
                                  <span className={`flex items-center gap-1 text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                                    <Clock className="h-3 w-3 opacity-60" />
                                    <span title={dt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}>{timeAgo}</span>
                                    <span className="opacity-50 ml-1">{dt.toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Security tip */}
                    {!loginHistoryLoading && loginHistory.length > 0 && (
                      <div className={`flex items-start gap-3 p-3 rounded-lg border text-xs ${theme === 'dark' ? 'bg-amber-900/10 border-amber-800/30 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                        <ShieldCheck className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>If you notice any unfamiliar login, change your password immediately or contact your admin.</span>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>



        </CardContent>
      </Card>
    </div>);

};

export default StudentProfile;