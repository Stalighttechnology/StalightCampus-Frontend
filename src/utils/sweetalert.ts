import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

// Define the theme-aware SweetAlert function
export const showSweetAlert = (title: string, text: string, icon: 'success' | 'error' | 'warning' | 'info' | 'question' = 'info') => {
  const isDarkMode = document.documentElement.classList.contains('dark');
  
  return MySwal.fire({
    title,
    text,
    icon,
    confirmButtonText: 'OK',
    background: isDarkMode ? '#1f1f1f' : '#ffffff',
    color: isDarkMode ? '#ffffff' : '#000000',
    confirmButtonColor: 'hsl(var(--primary))',
    customClass: {
      popup: 'sweetalert-popup',
      title: 'sweetalert-title',
      htmlContainer: 'sweetalert-content',
      confirmButton: 'sweetalert-confirm-button'
    },
    scrollbarPadding: false,
    willOpen: () => {
      // Prevent page scrolling when modal is open
      document.body.style.overflow = 'hidden';
    },
    willClose: () => {
      // Restore page scrolling when modal is closed
      document.body.style.overflow = '';
    },
    backdrop: 'rgba(0, 0, 0, 0.4)'
  });
};

export const showSuccessAlert = (title: string, text: string) => {
  return showSweetAlert(title, text, 'success');
};

export const showErrorAlert = (title: string, text: string) => {
  return showSweetAlert(title, text, 'error');
};

export const showWarningAlert = (title: string, text: string) => {
  return showSweetAlert(title, text, 'warning');
};

export const showInfoAlert = (title: string, text: string) => {
  return showSweetAlert(title, text, 'info');
};

export const showConfirmAlert = (title: string, text: string, confirmButtonText: string = 'Yes, do it!', icon: 'warning' | 'question' = 'warning') => {
  const isDarkMode = document.documentElement.classList.contains('dark');
  
  return MySwal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText: 'Cancel',
    background: isDarkMode ? '#1f1f1f' : '#ffffff',
    color: isDarkMode ? '#ffffff' : '#000000',
    confirmButtonColor: 'hsl(var(--primary))',
    cancelButtonColor: 'hsl(var(--destructive))',
    customClass: {
      popup: 'sweetalert-popup',
      title: 'sweetalert-title',
      htmlContainer: 'sweetalert-content',
      confirmButton: 'sweetalert-confirm-button',
      cancelButton: 'sweetalert-cancel-button'
    },
    scrollbarPadding: false,
    willOpen: () => {
      document.body.style.overflow = 'hidden';
    },
    willClose: () => {
      document.body.style.overflow = '';
    },
    backdrop: 'rgba(0, 0, 0, 0.4)'
  });
};