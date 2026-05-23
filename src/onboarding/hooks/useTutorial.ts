import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { TUTORIAL_KEYS } from '../constants/tutorialKeys';
import { tutorialAnalytics } from '../services/tutorialAnalytics';
import { studentTour } from '../config/studentTour';
import { facultyTour } from '../config/facultyTour';
import { hodTour } from '../config/hodTour';
import { adminTour } from '../config/adminTour';
import { coeTour } from '../config/coeTour';
import { deanTour } from '../config/deanTour';
import { feesManagerTour } from '../config/feesManagerTour';
import { wardenTour } from '../config/wardenTour';
import { hmsTour } from '../config/hmsTour';

const ROLE_TO_TOUR_MAP: Record<string, any> = {
  student: { steps: studentTour, keys: TUTORIAL_KEYS.STUDENT },
  faculty: { steps: facultyTour, keys: TUTORIAL_KEYS.FACULTY },
  teacher: { steps: facultyTour, keys: TUTORIAL_KEYS.FACULTY },
  hod: { steps: hodTour, keys: TUTORIAL_KEYS.HOD },
  admin: { steps: adminTour, keys: TUTORIAL_KEYS.ADMIN },
  principal: { steps: adminTour, keys: TUTORIAL_KEYS.ADMIN },
  coe: { steps: coeTour, keys: TUTORIAL_KEYS.COE },
  dean: { steps: deanTour, keys: TUTORIAL_KEYS.DEAN },
  feesmanager: { steps: feesManagerTour, keys: TUTORIAL_KEYS.FEES },
  fees_manager: { steps: feesManagerTour, keys: TUTORIAL_KEYS.FEES },
  warden: { steps: wardenTour, keys: TUTORIAL_KEYS.WARDEN },
  hms: { steps: hmsTour, keys: TUTORIAL_KEYS.HMS },
  hms_admin: { steps: hmsTour, keys: TUTORIAL_KEYS.HMS },
};

const transformStepsForHighlights = (originalSteps: any[], isMobile: boolean, role: string): any[] => {
  const steps: any[] = [];

  for (const step of originalSteps) {
    const target = step.target;

    if (typeof target === 'string') {
      if (target === '#sidebar-student-status') {
        steps.push({
          ...step,
          target: '#coe-student-status-container',
          placement: isMobile ? step.placement : 'top',
        });
        continue;
      }

      if (target === '#sidebar-course-statistics') {
        steps.push({
          ...step,
          target: '#coe-course-statistics-container',
          placement: isMobile ? step.placement : 'top',
        });
        continue;
      }

      if (target === '#sidebar-publish-results') {
        steps.push({
          ...step,
          target: '#coe-publish-results-container',
          placement: isMobile ? step.placement : 'top',
        });
        continue;
      }

      if (target === '#sidebar-attendance' && role.toLowerCase() === 'dean') {
        steps.push({
          ...step,
          target: '#dean-attendance-container',
          placement: isMobile ? step.placement : 'top',
        });
        continue;
      }

      if (target === '#sidebar-attendance-filters') {
        steps.push({
          ...step,
          target: '#dean-attendance-filters-container',
          placement: isMobile ? step.placement : 'top',
        });
        continue;
      }

      if (target === '#sidebar-finance') {
        steps.push(
          {
            ...step,
            target: '#dean-finance-stats-grid',
            title: 'Financial Overview',
            content: 'Monitor key financial analytics and metrics at a glance.',
            placement: isMobile ? step.placement : 'bottom',
          },
          {
            ...step,
            target: '#dean-finance-charts-container',
            title: 'Financial Trends',
            content: 'Analyze historical revenue and trend data.',
            placement: isMobile ? step.placement : 'top',
          }
        );
        continue;
      }

      if (target === '#sidebar-residents') {
        steps.push({
          ...step,
          target: '#warden-residents-container',
          placement: isMobile ? step.placement : 'top',
        });
        continue;
      }

      if (target === '#sidebar-issues' && role.toLowerCase() === 'warden') {
        steps.push({
          ...step,
          target: '#warden-issues-container',
          placement: isMobile ? step.placement : 'top',
        });
        continue;
      }

      if (target === '#sidebar-invoices') {
        steps.push({
          ...step,
          target: '#feesmanager-invoices-container',
          placement: isMobile ? step.placement : 'top',
        });
        continue;
      }

      if (target === '#sidebar-payments') {
        steps.push({
          ...step,
          target: '#feesmanager-payments-container',
          placement: isMobile ? step.placement : 'top',
        });
        continue;
      }

      if (target === '#sidebar-attendance') {
        steps.push(
          {
            ...step,
            target: '#attendance-trends-card',
            title: 'Attendance Trends',
            content: 'View your monthly attendance trends and tracking here.',
            placement: isMobile ? step.placement : 'right',
          },
          {
            ...step,
            target: '#attendance-overview-card',
            title: 'Attendance Overview',
            content: 'Check your overall attendance statistics and percentage.',
            placement: isMobile ? step.placement : 'left',
          },
          {
            ...step,
            target: isMobile ? '#attendance-subject-card' : '#attendance-subject-card-header',
            title: 'Subject-wise Attendance',
            content: 'Review detailed attendance records for each subject.',
            placement: isMobile ? step.placement : 'left',
          }
        );
        continue;
      }

      if (target === '#sidebar-timetable') {
        if (role.toLowerCase() === 'hod') {
          steps.push({
            ...step,
            target: '#timetable-header-filters-section',
            placement: isMobile ? step.placement : 'top',
          });
        } else {
          steps.push(
            {
              ...step,
              target: isMobile ? '#timetable-card' : '#timetable-card-header',
              title: 'Weekly Timetable',
              content: 'View your complete class and exam schedule here.',
              placement: isMobile ? step.placement : 'top',
            }
          );
        }
        continue;
      }

      if (target === '#sidebar-marks') {
        steps.push(
          {
            ...step,
            target: isMobile ? '#marks-overview-card' : '#marks-overview-card-header',
            title: 'Performance Overview',
            content: 'Track your internal assessment/test marks and averages.',
            placement: isMobile ? step.placement : 'top',
          },
          {
            ...step,
            target: '#marks-table-card',
            title: 'Subject-wise Marks',
            content: 'Detailed IA marks and grade breakdown for each subject.',
            placement: isMobile ? step.placement : 'top',
          }
        );
        continue;
      }

      if (target === '#sidebar-fees') {
        steps.push(
          {
            ...step,
            target: '#fees-details-card',
            title: 'Student Details',
            content: 'Check your student profile and fee allocation status.',
            placement: isMobile ? step.placement : 'bottom',
          },
          {
            ...step,
            target: '#fees-summary-card',
            title: 'Fee Summary',
            content: 'See your total, paid, and remaining fees at a glance.',
            placement: isMobile ? step.placement : 'bottom',
          },
          {
            ...step,
            target: isMobile ? '#fees-invoices-card' : '#fees-invoices-card-header',
            title: 'Fee Invoices',
            content: 'View and pay individual semester fee invoices.',
            placement: isMobile ? step.placement : 'bottom',
          },
          {
            ...step,
            target: isMobile ? '#fees-history-card' : '#fees-history-card-header',
            title: 'Payment History',
            content: 'Check your transaction history and download payment receipts.',
            placement: isMobile ? step.placement : 'bottom',
          }
        );
        continue;
      }

      if (target === '#sidebar-leave-request') {
        steps.push(
          {
            ...step,
            target: '#leave-form-card',
            title: 'Apply for Leave',
            content: 'Fill out and submit leave requests to your department.',
            placement: isMobile ? step.placement : 'right',
          },
          {
            ...step,
            target: '#leave-status-list',
            title: 'Leave Status',
            content: 'Track and monitor the status of your submitted leave requests.',
            placement: isMobile ? step.placement : 'left',
          }
        );
        continue;
      }

      if (target === '#sidebar-enroll-user') {
        steps.push(
          {
            ...step,
            target: '#enroll-user-header',
            title: 'Enroll Staff',
            content: 'Fill out this form to enroll new HODs, faculty members, Deans, COE, or Fees Managers.',
            placement: isMobile ? step.placement : 'top',
          }
        );
        continue;
      }

      if (target === '#sidebar-branches') {
        steps.push(
          {
            ...step,
            target: '#branches-management-header-section',
            title: 'Branch Management',
            content: 'View and manage all institutional branches, assign department heads, and export records.',
            placement: isMobile ? step.placement : 'top',
          }
        );
        continue;
      }

      if (target === '#sidebar-bulk-upload') {
        steps.push(
          {
            ...step,
            target: '#bulk-upload-form-section',
            title: 'Bulk Upload Faculty',
            content: 'Upload CSV or Excel files to bulk enroll faculty members into the system.',
            placement: isMobile ? step.placement : 'top',
          }
        );
        continue;
      }

      if (target === '#sidebar-teacher-assignments') {
        steps.push(
          {
            ...step,
            target: '#teacher-assignments-header-section',
            title: 'Faculty Assignments',
            content: 'Assign primary branches and departments to faculty members.',
            placement: isMobile ? step.placement : 'top',
          }
        );
        continue;
      }

      if (target === '#sidebar-qp-approvals' && role.toLowerCase() !== 'hod') {
        steps.push(
          {
            ...step,
            target: '#qp-approvals-header-section',
            title: 'Question Paper Approvals',
            content: 'Review and approve question papers pending administrative oversight.',
            placement: isMobile ? step.placement : 'top',
          }
        );
        continue;
      }

      if (target === '#sidebar-batches') {
        steps.push(
          {
            ...step,
            target: '#add-new-batch-card',
            title: 'Batches Management',
            content: 'Configure academic batches, cohort details, and sections.',
            placement: isMobile ? step.placement : 'top',
          }
        );
        continue;
      }

      if (target === '#sidebar-announcement-management') {
        steps.push(
          {
            ...step,
            target: '#announcement-header-section',
            title: 'Announcement Management',
            content: 'Broadcast campus news and updates to students and staff.',
            placement: isMobile ? step.placement : 'top',
          }
        );
        continue;
      }

      if (target === '#sidebar-hod-leaves') {
        steps.push(
          {
            ...step,
            target: '#hod-leaves-header-section',
            title: 'HOD Leave Requests',
            content: 'Review and manage leave applications submitted by department heads.',
            placement: isMobile ? step.placement : 'top',
          }
        );
        continue;
      }

      if (target === '#sidebar-hod-attendance') {
        steps.push(
          {
            ...step,
            target: '#hod-attendance-today-section',
            title: "Today's HOD Attendance",
            content: "View today's attendance snapshot — total HODs, present, absent, and unmarked counts at a glance.",
            placement: isMobile ? step.placement : 'top',
          },
          {
            ...step,
            target: '#hod-attendance-records-section',
            title: 'Attendance Records Filter',
            content: 'Select a start and end date, then apply the filter to view historical HOD attendance records.',
            placement: isMobile ? step.placement : 'top',
            switchTab: 'records',
          }
        );
        continue;
      }

      if (target === '#sidebar-my-attendance' && role.toLowerCase() !== 'hod') {
        steps.push(
          {
            ...step,
            target: '#admin-my-attendance-form',
            title: 'My Attendance',
            content: 'Mark your attendance as present or absent for today and optionally add notes.',
            placement: isMobile ? step.placement : 'top',
          }
        );
        continue;
      }

      if (target === '#sidebar-apply-leave') {
        steps.push(
          {
            ...step,
            target: '#apply-leave-form-card',
            title: 'Apply for Leave',
            content: 'Fill out this form and submit your leave requests.',
            placement: isMobile ? step.placement : 'right',
          },
          {
            ...step,
            target: '#recent-leaves-card',
            title: 'Recent Leaves',
            content: 'Track the status of your submitted leave requests.',
            placement: isMobile ? step.placement : 'left',
          }
        );
        continue;
      }

      if (target === '#sidebar-student-leave') {
        steps.push(
          {
            ...step,
            target: '#manage-student-leave-header-section',
            title: 'Manage Student Leave',
            content: '• Search student: Search for student leave applications by name or USN.\n• Filter status: Filter applications by Pending, Approved, or Rejected.\n• Actions: Review the details, view the leave reasons, and approve or reject requests directly.',
            placement: isMobile ? step.placement : 'top',
          }
        );
        continue;
      }

      if (target === '#sidebar-users') {
        steps.push(
          {
            ...step,
            target: '#users-management-header-filters',
            title: 'Users Directory',
            content: 'View, edit, or deactivate any user profile within the institution.',
            placement: isMobile ? step.placement : 'top',
          }
        );
        continue;
      }

      if (target === '#sidebar-profile') {
        if (role.toLowerCase() === 'student') {
          steps.push(
            {
              ...step,
              target: '#student-profile-header',
              title: 'Manage Your Profile',
              content: 'Update your contact details, personal details, academic details, and set up your face recognition for attendance.',
              placement: isMobile ? step.placement : 'top',
            }
          );
        } else {
          steps.push(
            {
              ...step,
              target: '#admin-profile-header',
              title: 'Admin Profile Information',
              content: 'Manage your profile details, change passwords, and configure settings.',
              placement: isMobile ? step.placement : 'top',
            }
          );
        }
        continue;
      }

      if (target === '#sidebar-take-attendance') {
        steps.push(
          {
            ...step,
            target: '#take-attendance-header-section',
            title: 'Take Attendance',
            content: 'Record student attendance for your classes manually or using the AI attendance mode.',
            placement: isMobile ? step.placement : 'top',
          }
        );
        continue;
      }

      if (target === '#sidebar-attendance-records') {
        steps.push(
          {
            ...step,
            target: '#attendance-records-header',
            title: 'Attendance Logs',
            content: 'Search, view, and export historical student attendance logs for any date range.',
            placement: isMobile ? step.placement : 'top',
          }
        );
        continue;
      }

      if (target === '#sidebar-faculty-attendance') {
        if (role.toLowerCase() === 'hod') {
          steps.push(
            {
              ...step,
              target: '#hod-faculty-attendance-header-section',
              title: 'Faculty Attendance',
              content: 'Monitor today\'s faculty attendance summary and toggle between Today\'s Attendance and Attendance Records.',
              placement: isMobile ? step.placement : 'top',
            },
            {
              ...step,
              target: '#hod-faculty-attendance-filters',
              title: 'Attendance Records',
              content: 'Select the Start Date and End Date range, then click Apply Filter to view attendance records or click Export Report to download as PDF.',
              placement: isMobile ? step.placement : 'top',
              switchTab: 'records',
            }
          );
        } else {
          steps.push(
            {
              ...step,
              target: '#today-attendance-toggle-section',
              title: 'Daily Self-Attendance',
              content: 'Mark your own daily attendance check-in and check campus location verification.',
              placement: isMobile ? step.placement : 'top',
            },
            {
              ...step,
              target: '#faculty-attendance-history',
              title: 'Monthly Attendance History',
              content: 'Review your paginated monthly attendance logs and history.',
              placement: isMobile ? step.placement : 'top',
            }
          );
        }
        continue;
      }

      if (target === '#sidebar-upload-marks') {
        steps.push(
          {
            ...step,
            target: '#upload-marks-header-section',
            title: 'Upload Marks',
            content: 'Select the Subject, Branch, Semester, Section, and Test Type. You can configure and view the Question Paper format details from this active tab.',
            placement: isMobile ? step.placement : 'top',
          },
          {
            ...step,
            target: '#upload-marks-tab-manual',
            title: 'Marks Entry',
            content: 'Marks Entry (to enter grades manually)',
            placement: isMobile ? step.placement : 'top',
          },
          {
            ...step,
            target: '#upload-marks-tab-bulk',
            title: 'Bulk Upload',
            content: 'Bulk Upload (to download templates and import scores via Excel)',
            placement: isMobile ? step.placement : 'top',
          }
        );
        continue;
      }

      if (target === '#sidebar-upload-qp') {
        steps.push(
          {
            ...step,
            target: '#upload-qp-header-section',
            title: 'Upload QP Pattern',
            content: '• Select the Branch, Subject, and Test Type.\n• Use these tabs to manage the question paper:\n  - Question Format: configure questions and max marks.\n  - Question Paper: preview and submit for approval.',
            placement: isMobile ? step.placement : 'top',
          }
        );
        continue;
      }

      if (target === '#sidebar-co-attainment') {
        steps.push(
          {
            ...step,
            target: '#co-attainment-selectors',
            title: 'Calculate CO Attainment',
            content: '• Select a Subject to view and calculate Course Outcome (CO) attainment levels.\n• Configure the Target Threshold percentage (default 60%) to establish student grade targets.\n• Once a subject is selected, overall attainment results and reports will display below.',
            placement: isMobile ? step.placement : 'top',
          }
        );
        continue;
      }

      if (target === '#sidebar-statistics') {
        steps.push(
          {
            ...step,
            target: '#statistics-charts-container',
            title: 'Attendance Overview & Average Marks',
            content: '• Attendance Overview: View real-time line charts for student attendance tracking.\n• Average Marks: View interactive bar charts for average marks analysis.',
            placement: isMobile ? step.placement : 'top',
          },
          {
            ...step,
            target: '#statistics-table-header',
            title: 'Proctor Students & Export PDF',
            content: '• Proctor Students: Review complete proctor student details in the summary table.\n• Export PDF: Use this button to download a comprehensive proctor student statistics report.',
            placement: isMobile ? step.placement : 'top',
          }
        );
        continue;
      }

      if (target === '#sidebar-faculty-announcement-management') {
        steps.push(
          {
            ...step,
            target: '#announcement-header-section',
            title: 'Announcements for Proctor Students',
            content: '• Announcements for Proctor Students: View and manage announcements for your proctor group.\n• New Announcement: Click this button to create a new announcement.\n• My Announcements: View all the announcements that you have created.\n• Received: View the announcements that you have received.\n• Show Archive: Toggle this button to show or hide expired/archived announcements.',
            placement: isMobile ? step.placement : 'top',
          }
        );
        continue;
      }

      if (target === '#sidebar-faculty-profile') {
        steps.push(
          {
            ...step,
            target: '#faculty-profile-header-section',
            title: 'Faculty Profile',
            content: '• Faculty Profile: Manage your profile and academic details.\n• Edit Profile: Click this button to modify your details.\n• Change Password: Click this button to update your account password.',
            placement: isMobile ? step.placement : 'top',
          }
        );
        continue;
      }

      if (target === '#sidebar-semesters' && role.toLowerCase() === 'hod') {
        steps.push({
          ...step,
          target: '#semester-list-header',
          placement: isMobile ? step.placement : 'top',
        });
        continue;
      }

      if (target === '#sidebar-students' && role.toLowerCase() === 'hod') {
        steps.push({
          ...step,
          target: '#add-student-manually-card',
          placement: isMobile ? step.placement : 'top',
        });
        continue;
      }

      if (target === '#sidebar-student-enrollment' && role.toLowerCase() === 'hod') {
        steps.push({
          ...step,
          target: '#elective-enrollment-filters-section',
          placement: isMobile ? step.placement : 'top',
        });
        continue;
      }

      if (target === '#sidebar-subjects' && role.toLowerCase() === 'hod') {
        steps.push({
          ...step,
          target: '#courses-header-filters-section',
          placement: isMobile ? step.placement : 'top',
        });
        continue;
      }

      if (target === '#sidebar-faculty-assignments' && role.toLowerCase() === 'hod') {
        steps.push({
          ...step,
          target: '#add-faculty-assignment-card',
          placement: isMobile ? step.placement : 'top',
        });
        continue;
      }

      if (target === '#sidebar-qp-approvals' && role.toLowerCase() === 'hod') {
        steps.push({
          ...step,
          target: '#qp-approvals-header-section',
          placement: isMobile ? step.placement : 'top',
        });
        continue;
      }

      if (target === '#sidebar-proctors' && role.toLowerCase() === 'hod') {
        steps.push({
          ...step,
          target: '#proctors-stats-cards',
          placement: isMobile ? step.placement : 'top',
        });
        continue;
      }

      // Mobile-only placement fix for Proctor Assignments header (step 14)
      // On mobile, 'top' clips the tooltip — override to 'bottom' so it stays visible
      if (target === '#proctors-header-filters-section' && isMobile) {
        steps.push({
          ...step,
          placement: 'bottom' as const,
        });
        continue;
      }

      if (target === '#sidebar-low-attendance' && role.toLowerCase() === 'hod') {
        steps.push(
          {
            ...step,
            target: '#low-attendance-stats-cards',
            title: 'Low Attendance Overview',
            content: 'Quickly see Total Students, how many have Low Attendance, and the Average Attendance percentage for the selected section.',
            placement: isMobile ? 'bottom' as const : 'top' as const,
          },
          {
            ...step,
            target: '#low-attendance-dashboard-header',
            title: 'Low Attendance Management',
            content: 'Identify students below the attendance threshold. Use the filters to select a semester and section, then export a PDF report or notify students directly.',
            placement: isMobile ? 'bottom' as const : 'top' as const,
          }
        );
        continue;
      }

      if (target === '#sidebar-my-attendance' && role.toLowerCase() === 'hod') {
        steps.push({
          ...step,
          target: '#today-attendance-toggle-section',
          placement: isMobile ? step.placement : 'top',
        });
        continue;
      }

      if (target === '#sidebar-promotion-management' && role.toLowerCase() === 'hod') {
        steps.push({
          ...step,
          target: '#hod-promotion-cards-wrapper',
          placement: isMobile ? step.placement : 'top',
        });
        continue;
      }

      if (target === '#sidebar-leaves' && role.toLowerCase() === 'hod') {
        steps.push({
          ...step,
          target: '#hod-leave-approvals-header-section',
          placement: isMobile ? step.placement : 'top',
        });
        continue;
      }

      if (target === '#sidebar-apply-leaves' && role.toLowerCase() === 'hod') {
        steps.push(
          {
            ...step,
            target: '#hod-leave-application-form',
            title: 'Leave Application Form',
            content: 'Fill in the leave details (title, dates, and reason) to submit a new leave request.',
            placement: isMobile ? step.placement : 'right',
          },
          {
            ...step,
            target: '#hod-recent-leave-applications',
            title: 'Recent Leave Applications',
            content: 'Track and review the approval status of your submitted leave requests here.',
            placement: isMobile ? step.placement : 'left',
          }
        );
        continue;
      }

      if (target === '#sidebar-study-materials' && role.toLowerCase() === 'hod') {
        steps.push({
          ...step,
          target: '#hod-study-materials-header-section',
          placement: isMobile ? step.placement : 'top',
        });
        continue;
      }

      if (target === '#sidebar-scan-student-info' && role.toLowerCase() === 'hod') {
        steps.push({
          ...step,
          target: '#hod-search-student-card',
          placement: isMobile ? step.placement : 'top',
        });
        continue;
      }

      if (target === '#sidebar-hod-announcement-management' && role.toLowerCase() === 'hod') {
        steps.push({
          ...step,
          target: '#announcement-header-section',
          placement: isMobile ? step.placement : 'top',
        });
        continue;
      }

      if (target === '#sidebar-hod-profile' && role.toLowerCase() === 'hod') {
        steps.push({
          ...step,
          target: '#hod-profile-header-section',
          placement: isMobile ? step.placement : 'top',
        });
        continue;
      }

      if (target === '#sidebar-notifications' && role.toLowerCase() === 'hod') {
        steps.push({
          ...step,
          target: '#hod-notifications-container',
          placement: isMobile ? step.placement : 'top',
        });
        continue;
      }

      // Fallback for other sidebar items if any
      if (target.startsWith('#sidebar-')) {
        steps.push({
          ...step,
          target: 'body',
        });
        continue;
      }

    }

    // Default mapping for non-sidebar steps (wording improvements ONLY for mobile)
    let newTitle = step.title;
    let newContent = step.content;

    if (isMobile) {
      const lowercaseTitle = step.title.toLowerCase();

      if (lowercaseTitle.includes('welcome')) {
        newTitle = 'Welcome!';
        newContent = 'Let\'s show you around your portal.';
      } else if (lowercaseTitle.includes('schedule') || lowercaseTitle.includes('timetable')) {
        newTitle = 'Check Classes';
        newContent = 'Check today\'s classes here.';
      } else if (lowercaseTitle.includes('attendance')) {
        newTitle = 'Track Attendance';
        newContent = 'See your attendance here.';
      } else if (lowercaseTitle.includes('performance') || lowercaseTitle.includes('marks') || lowercaseTitle.includes('stats') || lowercaseTitle.includes('metrics') || lowercaseTitle.includes('overview') || lowercaseTitle.includes('charts') || lowercaseTitle.includes('analytics')) {
        newTitle = 'Track Performance';
        newContent = 'Track your performance and grades here.';
      } else if (lowercaseTitle.includes('timeline') || lowercaseTitle.includes('timer')) {
        newTitle = 'Live Sessions';
        newContent = 'Monitor active live sessions here.';
      } else if (lowercaseTitle.includes('fees') || lowercaseTitle.includes('financial')) {
        newTitle = 'Manage Fees';
        newContent = 'View and pay your fees here.';
      } else if (lowercaseTitle.includes('leave')) {
        newTitle = 'Apply Leave';
        newContent = 'Submit and track leave requests.';
      } else if (lowercaseTitle.includes('notifications') || lowercaseTitle.includes('announcement')) {
        newTitle = 'Read Updates';
        newContent = 'Important updates appear here.';
      } else if (lowercaseTitle.includes('profile')) {
        newTitle = 'Manage Profile';
        newContent = 'Check and update your profile details.';
      } else if (lowercaseTitle.includes('users') || lowercaseTitle.includes('resident') || lowercaseTitle.includes('enroll')) {
        newTitle = 'Manage Users';
        newContent = 'Add and manage user profiles here.';
      } else if (lowercaseTitle.includes('branch')) {
        newTitle = 'Manage Branches';
        newContent = 'Configure institution campuses here.';
      } else if (lowercaseTitle.includes('report')) {
        newTitle = 'Generate Reports';
        newContent = 'Create and download summary reports.';
      } else if (lowercaseTitle.includes('search')) {
        newTitle = 'Global Search';
        newContent = 'Search records across the system.';
      }
    }

    steps.push({
      ...step,
      title: newTitle,
      content: newContent,
    });
  }

  return steps;
};

export const useTutorial = () => {
  const { role: authRole } = useAuth();
  const [role, setRole] = useState<string>(authRole || '');
  const [isActive, setIsActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Determine the tour config and keys for the current role
  const { steps, keys } = useMemo(() => {
    const currentRole = role.toLowerCase();
    const tourConfig = ROLE_TO_TOUR_MAP[currentRole] || {
      steps: [],
      keys: TUTORIAL_KEYS.STUDENT,
    };

    // Transform steps for both mobile and laptop to highlight actual page sections
    const processedSteps = transformStepsForHighlights(tourConfig.steps, isMobile, role);

    // Force skipBeacon: true on all steps to avoid pulsing dots (beacons)
    const stepsWithDisabledBeacons = processedSteps.map((step: any) => ({
      ...step,
      disableBeacon: true,
      skipBeacon: true,
      disableOverlayClose: true,
      overlayClickAction: false,
      spotlightClicks: false,
    }));

    return {
      steps: stepsWithDisabledBeacons,
      keys: tourConfig.keys,
    };
  }, [role, isMobile]);

  // Initialize and track role updates from context
  useEffect(() => {
    const resolvedRole = authRole || sessionStorage.getItem('role') || localStorage.getItem('role') || '';
    if (!resolvedRole) return;

    setRole(resolvedRole);

    const tourConfig = ROLE_TO_TOUR_MAP[resolvedRole.toLowerCase()] || {
      steps: [],
      keys: TUTORIAL_KEYS.STUDENT,
    };

    const isCompleted = localStorage.getItem(tourConfig.keys.COMPLETED) === 'true';
    const isSaved = localStorage.getItem(tourConfig.keys.ACTIVE) === 'true';
    const savedStep = parseInt(
      localStorage.getItem(tourConfig.keys.STEP) || '0',
      10
    );

    if (!isCompleted && !isSaved) {
      setShowWelcomeModal(true);
    } else if (isSaved) {
      setIsActive(true);
      setStepIndex(savedStep === 0 ? 1 : savedStep);
    }
  }, [authRole]);

  const handleStartTour = () => {
    setShowWelcomeModal(false);
    setIsActive(true);
    setStepIndex(1);
    localStorage.setItem(keys.ACTIVE, 'true');
    localStorage.setItem(keys.STEP, '1');
    tutorialAnalytics.trackTourStart(role);
  };

  const handleSkipTour = () => {
    setShowWelcomeModal(false);
    setIsActive(false);
    localStorage.removeItem(keys.ACTIVE);
    localStorage.removeItem(keys.STEP);
    tutorialAnalytics.trackTourSkip(role);
  };

  const handleCompleteTour = () => {
    setIsActive(false);
    localStorage.setItem(keys.COMPLETED, 'true');
    localStorage.removeItem(keys.ACTIVE);
    localStorage.removeItem(keys.STEP);
    tutorialAnalytics.trackTourComplete(role);
  };

  const handleStepChange = (index: number) => {
    setStepIndex(index);
    localStorage.setItem(keys.STEP, index.toString());
    tutorialAnalytics.trackStepView(role, index);
  };

  return {
    role,
    steps,
    isActive,
    setIsActive,
    stepIndex,
    setStepIndex,
    showWelcomeModal,
    setShowWelcomeModal,
    handleStartTour,
    handleSkipTour,
    handleCompleteTour,
    handleStepChange,
  };
};
