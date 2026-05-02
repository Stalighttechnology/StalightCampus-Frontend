import { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { fetchWithTokenRefresh } from '../utils/authService';

// Pagination Hook
export interface PaginationOptions {
  pageSize?: number;
  initialPage?: number;
  queryKey: string[];
}

export interface PaginationState {
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrev: boolean;
  totalPages: number;
  totalItems: number;
}

export const usePagination = (options: PaginationOptions) => {
  const { pageSize = 50, initialPage = 1, queryKey } = options;

  const [page, setPage] = useState(initialPage);
  const [paginationState, setPaginationState] = useState<PaginationState>({
    page: initialPage,
    pageSize,
    hasNext: false,
    hasPrev: false,
    totalPages: 0,
    totalItems: 0,
  });

  const updatePagination = useCallback((data: any) => {
    if (data?.pagination) {
      const p = data.pagination || {};
      const currentPage = p.current_page ?? p.page ?? page;
      const pageSz = p.page_size ?? p.pageSize ?? pageSize;
      const hasNext = p.has_next ?? p.hasNext ?? false;
      const hasPrev = p.has_prev ?? p.hasPrev ?? false;
      const totalPages = p.total_pages ?? p.totalPages ?? 0;
      const totalItems = p.total_items ?? p.totalItems ?? 0;
      // Sync both the pagination state and the current page value so UI and hook stay consistent
      setPaginationState({
        page: currentPage,
        pageSize: pageSz,
        hasNext,
        hasPrev,
        totalPages,
        totalItems,
      });
      setPage(currentPage);
    }
  }, [page, pageSize]);

  const goToPage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const nextPage = useCallback(() => {
    if (paginationState.hasNext) {
      setPage(prev => prev + 1);
    }
  }, [paginationState.hasNext]);

  const prevPage = useCallback(() => {
    if (paginationState.hasPrev) {
      setPage(prev => prev - 1);
    }
  }, [paginationState.hasPrev]);

  return {
    page,
    pageSize,
    paginationState,
    updatePagination,
    goToPage,
    nextPage,
    prevPage,
    queryKey: [...queryKey, page, pageSize],
  };
};

// Lazy Loading Hook
export interface LazyLoadingOptions {
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
}

export const useLazyLoading = (options: LazyLoadingOptions = {}) => {
  const { threshold = 0.1, rootMargin = '50px', enabled = true } = options;
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [ref, setRef] = useState<Element | null>(null);

  useEffect(() => {
    if (!enabled || !ref) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoaded) {
          setIsVisible(true);
          setHasLoaded(true);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(ref);

    return () => observer.disconnect();
  }, [ref, threshold, rootMargin, enabled, hasLoaded]);

  return { ref: setRef, isVisible, hasLoaded };
};

// Infinite Scroll Hook
export const useInfiniteScroll = (queryKey: string[], fetchMore: () => void) => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    try {
      await fetchMore();
    } finally {
      setIsLoading(false);
    }
  }, [fetchMore, isLoading, hasMore]);

  const observerRef = useCallback(
    (node: Element | null) => {
      if (!node) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && hasMore && !isLoading) {
            loadMore();
          }
        },
        { threshold: 0.1, rootMargin: '100px' }
      );

      observer.observe(node);
      return () => observer.disconnect();
    },
    [loadMore, hasMore, isLoading]
  );

  return {
    observerRef,
    isLoading,
    hasMore,
    setHasMore,
    loadMore,
  };
};

// Optimistic Update Hook
export const useOptimisticUpdate = <T,>(
  mutationFn: (data: T) => Promise<any>,
  queryKey: string[],
  optimisticUpdate: (oldData: any, newData: T) => any,
  options?: { refetchOnSettled?: boolean; onSuccess?: (data: any, variables: T) => void }
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async (newData: T) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(queryKey);

      // Optimistically update to the new value
      queryClient.setQueryData(queryKey, (oldData: any) =>
        optimisticUpdate(oldData, newData)
      );

      // Return a context object with the snapshotted value
      return { previousData };
    },
    onError: (err, newData, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
    onSuccess: (data, variables) => {
      if (options?.onSuccess) {
        options.onSuccess(data, variables);
      }
    },
    onSettled: () => {
      // Refetch only when requested via options (default true)
      const shouldRefetch = options?.refetchOnSettled !== false;
      if (shouldRefetch) {
        queryClient.invalidateQueries({ queryKey });
      }
    },
  });
};

// Virtual Scrolling Hook
export interface VirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export const useVirtualScroll = (
  totalItems: number,
  options: VirtualScrollOptions
) => {
  const { itemHeight, containerHeight, overscan = 5 } = options;
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    totalItems - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = [];
  for (let i = startIndex; i <= endIndex; i++) {
    visibleItems.push({
      index: i,
      style: {
        position: 'absolute' as const,
        top: i * itemHeight,
        height: itemHeight,
        width: '100%',
      },
    });
  }

  const totalHeight = totalItems * itemHeight;

  return {
    visibleItems,
    totalHeight,
    onScroll: (event: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(event.currentTarget.scrollTop);
    },
  };
};

// Progressive Loading Hook
export const useProgressiveLoading = () => {
  const [loadingPhase, setLoadingPhase] = useState<'critical' | 'secondary' | 'complete'>('critical');

  useEffect(() => {
    // Load critical data first
    setLoadingPhase('critical');

    // After critical data loads, load secondary data
    const timer1 = setTimeout(() => {
      setLoadingPhase('secondary');
    }, 100);

    // Mark as complete after secondary data loads
    const timer2 = setTimeout(() => {
      setLoadingPhase('complete');
    }, 500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  return {
    loadingPhase,
    isCriticalLoading: loadingPhase === 'critical',
    isSecondaryLoading: loadingPhase === 'secondary',
    isComplete: loadingPhase === 'complete',
  };
};

// Debounced Search Hook
export const useDebouncedSearch = (initialValue: string = '', delay: number = 300) => {
  const [value, setValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return {
    value,
    debouncedValue,
    setValue,
    isDebouncing: value !== debouncedValue,
  };
};

// Memoization Hook for expensive calculations
export const useMemoizedCalculation = <T,>(
  calculation: () => T,
  dependencies: any[]
) => {
  const [result, setResult] = useState<T>(() => calculation());

  useEffect(() => {
    setResult(calculation());
  }, dependencies);

  return result;
};

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

// File Upload Hook with Compression, Progress, and Validation
export const useFileUpload = (options: {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  compressImages?: boolean;
  allowedTypes?: string[];
  maxFileSize?: number; // in bytes
} = {}) => {
  const {
    maxSizeMB = 1,
    maxWidthOrHeight = 1920,
    useWebWorker = true,
    compressImages = true,
    allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'],
    maxFileSize = 10 * 1024 * 1024, // 10MB default
  } = options;

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compress image if needed
  const compressImage = async (file: File): Promise<File> => {
    if (!compressImages || !file.type.startsWith('image/')) {
      return file;
    }

    try {
      const imageCompression = (await import('browser-image-compression')).default;
      const compressedFile = await imageCompression(file, {
        maxSizeMB,
        maxWidthOrHeight,
        useWebWorker,
        fileType: 'image/png', // Force PNG format
        onProgress: (progress) => {
          setUploadProgress(Math.round(progress * 0.5)); // Compression is 50% of total progress
        },
      });
      return compressedFile;
    } catch (error) {
      console.warn('Image compression failed, using original file:', error);
      return file;
    }
  };

  // Validate file
  const validateFile = (file: File): string | null => {
    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`;
    }

    // Check file size
    if (file.size > maxFileSize) {
      const maxSizeMB = (maxFileSize / (1024 * 1024)).toFixed(1);
      return `File size exceeds ${maxSizeMB}MB limit`;
    }

    return null;
  };

  // Upload file with progress tracking
  const uploadFile = async (
    file: File,
    uploadUrl: string,
    additionalData?: Record<string, any>
  ): Promise<any> => {
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Validate file first
      const validationError = validateFile(file);
      if (validationError) {
        throw new Error(validationError);
      }

      // Compress if it's an image
      let processedFile = await compressImage(file);
      setUploadProgress(50); // Compression complete

      // Convert to PNG format if it's an image
      if (processedFile.type.startsWith('image/') && processedFile.type !== 'image/png') {
        processedFile = await convertImageToPNG(processedFile);
      }

      // Create form data
      const formData = new FormData();
      formData.append('profile_picture', processedFile, `profile_picture.png`);

      // Add additional data
      if (additionalData) {
        Object.entries(additionalData).forEach(([key, value]) => {
          formData.append(key, value as string);
        });
      }

      // Upload with progress tracking
      const response = await fetchWithTokenRefresh(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      setUploadProgress(100);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Upload failed');
      }

      return result;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Upload failed');
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadFile,
    uploadProgress,
    isUploading,
    error,
    reset: () => {
      setUploadProgress(0);
      setError(null);
    },
  };
};

// Form Validation Hook
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
  message?: string;
}

export interface ValidationRules {
  [key: string]: ValidationRule;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export const useFormValidation = (rules: ValidationRules) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = useCallback((fieldName: string, value: any): string | null => {
    const rule = rules[fieldName];
    if (!rule) return null;

    // Required validation
    if (rule.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return rule.message || `${fieldName} is required`;
    }

    // Skip other validations if field is empty and not required
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return null;
    }

    // Min length validation
    if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
      return rule.message || `${fieldName} must be at least ${rule.minLength} characters`;
    }

    // Max length validation
    if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
      return rule.message || `${fieldName} must be no more than ${rule.maxLength} characters`;
    }

    // Pattern validation
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      return rule.message || `${fieldName} format is invalid`;
    }

    // Custom validation
    if (rule.custom) {
      return rule.custom(value);
    }

    return null;
  }, [rules]);

  const validateForm = useCallback((data: Record<string, any>): ValidationResult => {
    const newErrors: Record<string, string> = {};

    Object.keys(rules).forEach(fieldName => {
      const error = validateField(fieldName, data[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
      }
    });

    setErrors(newErrors);
    return {
      isValid: Object.keys(newErrors).length === 0,
      errors: newErrors,
    };
  }, [rules, validateField]);

  const validateSingleField = useCallback((fieldName: string, value: any) => {
    const error = validateField(fieldName, value);
    setErrors(prev => ({
      ...prev,
      [fieldName]: error || '',
    }));
    return !error;
  }, [validateField]);

  const setFieldTouched = useCallback((fieldName: string) => {
    setTouched(prev => ({
      ...prev,
      [fieldName]: true,
    }));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  return {
    errors,
    touched,
    validateForm,
    validateSingleField,
    setFieldTouched,
    clearErrors,
    isFieldValid: (fieldName: string) => !errors[fieldName],
    hasFieldError: (fieldName: string) => !!(errors[fieldName] && touched[fieldName]),
  };
};

// Common Validation Rules
export const validationRules = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address',
  },
  password: {
    required: true,
    minLength: 8,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    message: 'Password must be at least 8 characters with uppercase, lowercase, and number',
  },
  name: {
    required: true,
    minLength: 2,
    maxLength: 50,
    message: 'Name must be between 2 and 50 characters',
  },
  phone: {
    required: true,
    pattern: /^\+?[\d\s\-\(\)]+$/,
    message: 'Please enter a valid phone number',
  },
  required: {
    required: true,
  },
  positiveNumber: {
    required: true,
    custom: (value: any) => {
      const num = Number(value);
      return isNaN(num) || num <= 0 ? 'Must be a positive number' : null;
    },
  },
  date: {
    required: true,
    custom: (value: any) => {
      const date = new Date(value);
      return isNaN(date.getTime()) ? 'Please enter a valid date' : null;
    },
  },
};