from django.urls import path, re_path, include
from .views import hod_views, student_views, admin_views, faculty_views, profile_views, assignment_views, exam_views, report_views, hod2_views, faculty2_views, faculty3_views, faculty3_endpoints
from .views import fees_manager_views
from .views import coe_views
from .views import revalv_views
from .views.coe_views import (
    dashboard_stats,
    exam_applications,
    action_exam_application,
    reports,
    generate_report,
    exam_schedule,
    get_filter_options,
    create_result_upload_batch,
    get_students_for_upload,
    save_marks_for_upload,
    publish_upload_batch,
    unpublish_upload_batch,
    get_published_results,
    public_view_result_by_token,
    StudentApplicationStatusView,
    CourseApplicationStatsView
    ,export_not_applied,
    export_not_applied_debug
)
from .views.student_ai_chatbot import student_ai_chatbot
from .views.faculty_ai_chatbot import ai_campus_assistant, get_faculty_profile
from rest_framework_simplejwt.views import TokenRefreshView
from . import views
from .views import run_migrations_view
from .views.pdf_views import PDFUploadView, AskQuestionView
from .stripe_views import CreateCheckoutSessionView, InvoiceComponentSelectionView, ComponentBasedPaymentView, PaymentStatusView, StripeWebhookView, RefundPaymentView
from .views.co_attainment import co_attainment

app_name = 'api'

urlpatterns = [
    # Authentication endpoints - handle both with/without trailing slash
    re_path(r'^login/?$', student_views.login_view, name='login'),
    re_path(r'^forgot-password/?$', student_views.forgot_password, name='forgot_password'),
    re_path(r'^verify-otp/?$', student_views.verify_otp, name='verify_otp'),
    re_path(r'^resend-otp/?$', student_views.resend_otp, name='resend_otp'),
    re_path(r'^reset-password/?$', student_views.reset_password, name='reset_password'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', student_views.logout, name='logout'),

    # Profile Management endpoints
    path('profile/', profile_views.manage_profile, name='manage_profile'),
    re_path(r'^profile/upload-picture/?$', profile_views.upload_profile_picture, name='upload_profile_picture'),
    re_path(r'^profile/delete-picture/?$', profile_views.delete_profile_picture, name='delete_profile_picture'),
    path('profile/stats/', profile_views.get_user_stats, name='get_user_stats'),

    # Student endpoints
    path('student/dashboard/', student_views.dashboard_overview, name='student_dashboard'),
    path('student/dashboard-with-notifications/', student_views.get_dashboard_with_notifications, name='student_dashboard_with_notifications'),
    path('student/timetable/', student_views.get_timetable, name='get_student_timetable'),
    path('student/attendance/', student_views.get_student_attendance, name='get_student_attendance'),
    path('student/attendance-with-marks/', student_views.get_attendance_with_marks, name='get_attendance_with_marks'),
    path('student/internal-marks/', student_views.get_internal_marks, name='get_student_internal_marks'),
    path('student/submit-leave-request/', student_views.submit_student_leave_request, name='submit_student_leave_request'),
    path('student/leave-requests/', student_views.get_student_leave_requests, name='get_student_leave_requests'),
    path('student/upload-certificate/', student_views.upload_certificate, name='upload_certificate'),
    path('student/bulk-upload-certificates/', student_views.bulk_upload_certificates, name='bulk_upload_certificates'),
    path('student/certificates/', student_views.get_certificates, name='get_certificates'),
    path('student/delete-certificate/', student_views.delete_certificate, name='delete_certificate'),
    path('student/update-profile/', student_views.update_profile, name='update_profile'),
    path('student/chat/', student_views.manage_chat, name='student_chat'),
    path('student/notifications/', student_views.get_notifications, name='get_student_notifications'),
    path('student/announcements/', student_views.get_announcements, name='get_student_announcements'),
    path('student/full-profile/', student_views.get_full_student_profile, name='get_full_student_profile'),
    path('student/study-materials/', student_views.get_study_materials, name='get_study_materials'),
    path('student/assignments/', student_views.get_student_assignments, name='get_student_assignments'),
    path('student/historical-data/', student_views.get_historical_student_data, name='get_historical_student_data'),
    path('student/exams/', exam_views.get_student_exams, name='get_student_exams'),
    path('student/fee-data/', student_views.get_student_fee_data, name='get_student_fee_data'),
    path('ai-chatbot/', student_ai_chatbot, name='ai_chatbot'),
    path('student/ai-chatbot/', student_ai_chatbot, name='student_ai_chatbot'),

    # Face Recognition endpoints
    path('student/train-face/', student_views.train_face, name='train_face'),
    path('student/check-face-status/', student_views.check_face_status, name='check_face_status'),
    path('recognize-face/', student_views.recognize_face, name='recognize_face'),

    # Public API endpoint for student data by USN
    path('public/student-data/', student_views.get_student_data_by_usn, name='get_student_data_by_usn'),
    path('common/subjects/', student_views.get_subjects_for_branch_semester, name='common_subjects'),
    path('common/subject-detail/', student_views.get_subject_detail, name='common_subject_detail'),

    # Faculty endpoints
    path('faculty/dashboard/', faculty_views.dashboard_overview, name='faculty_dashboard'),
    path('faculty/dashboard/bootstrap/', faculty2_views.faculty_dashboard_bootstrap, name='faculty_dashboard_bootstrap'),
    path('faculty/attendance-records/summary/', faculty2_views.get_attendance_records_with_summary, name='get_attendance_records_with_summary'),
    path('faculty/apply-leave/bootstrap/', faculty2_views.get_apply_leave_bootstrap, name='get_apply_leave_bootstrap'),
    path('faculty/take-attendance/bootstrap/', faculty2_views.get_take_attendance_bootstrap, name='get_take_attendance_bootstrap'),
    path('faculty/assigned-subjects/', faculty2_views.get_assigned_subjects, name='get_assigned_subjects'),
    path('faculty/students/regular/', faculty2_views.get_students_regular, name='get_students_regular'),
    path('faculty/students/elective/', faculty2_views.get_students_elective, name='get_students_elective'),
    path('faculty/students/open-elective/', faculty2_views.get_students_open_elective, name='get_students_open_elective'),
    path('faculty/upload-marks/bootstrap/', faculty2_views.get_upload_marks_bootstrap, name='get_upload_marks_bootstrap'),
    path('faculty/take-attendance/', faculty_views.take_attendance, name='take_attendance'),
    path('faculty/ai-attendance/', faculty3_views.ai_attendance, name='ai_attendance'),
    path('faculty/upload-marks/', faculty_views.upload_internal_marks, name='upload_internal_marks'),
    path('faculty/qps/', faculty_views.question_paper_list_create, name='question_paper_list_create'),
    path('faculty/qps/<int:qp_id>/', faculty_views.update_question_paper, name='update_question_paper'),
    path('faculty/students-for-marks/', faculty_views.get_students_for_marks, name='get_students_for_marks'),
    path('faculty/upload-ia-marks/', faculty_views.upload_ia_marks, name='upload_ia_marks'),
    path('faculty/apply-leave/', faculty_views.apply_leave, name='apply_leave'),
    path('faculty/leave-requests/', faculty_views.get_faculty_leave_requests, name='get_faculty_leave_requests'),
    path('faculty/attendance-records/', faculty_views.view_attendance_records, name='view_attendance_records'),
    path('faculty/attendance-records/list/', faculty_views.get_attendance_records_list, name='get_attendance_records_list'),
    path('faculty/attendance-records/<int:record_id>/details/', faculty_views.attendance_record_details, name='attendance_record_details'),
    path('faculty/announcements/', faculty_views.create_announcement, name='create_announcement'),
    path('faculty/proctor-students/', faculty_views.get_proctor_students, name='get_proctor_students'),
    path('faculty/manage-student-leave/', faculty_views.manage_student_leave, name='manage_student_leave'),
    path('faculty/assignments/', faculty_views.get_faculty_assignments, name='get_faculty_assignments'),
    path('faculty/timetable/', faculty_views.get_timetable, name='get_faculty_timetable'),
    path('faculty/chat/', faculty_views.manage_chat, name='manage_chat'),
    path('faculty/profile/', faculty_views.manage_profile, name='manage_profile'),
    path('faculty/schedule-mentoring/', faculty_views.schedule_mentoring, name='schedule_mentoring'),
    path('faculty/generate-statistics/', faculty_views.generate_statistics, name='generate_statistics'),
    path('faculty/download-pdf/<str:filename>/', faculty_views.download_pdf, name='download_pdf'),
    path('faculty/students/', faculty_views.get_students_for_class, name='get_students_for_class'),
    path('faculty/internal-marks/', faculty_views.get_internal_marks_for_class, name='get_internal_marks_for_class'),
    path('faculty/notifications/', faculty_views.get_notifications, name='get_faculty_notifications'),
    path('faculty/notifications/sent/', faculty_views.get_sent_notifications, name='get_faculty_sent_notifications'),
    path('faculty/ai-campus-assistant/', ai_campus_assistant, name='ai_campus_assistant'),
    path('faculty/ai-campus-assistant/profile/', get_faculty_profile, name='ai_campus_assistant_profile'),
    path('faculty/mark-attendance/', faculty_views.mark_faculty_attendance, name='mark_faculty_attendance'),
    path('faculty/my-attendance-records/', faculty_views.get_faculty_attendance_records, name='get_faculty_attendance_records'),

    # Exam Application endpoints
    path('faculty/exam-applications/', faculty_views.exam_applications, name='exam_applications'),
    path('faculty/hall-ticket/<int:student_id>/', faculty_views.download_hall_ticket, name='download_hall_ticket'),
    path('faculty/proctor-students/exam-status/', faculty_views.proctor_students_exam_status, name='proctor_students_exam_status'),
    # Consolidated endpoint that returns proctor students enriched with exam status when exam_period is provided
    path('faculty/proctor-students/with-exam-status/', faculty3_endpoints.proctor_students_with_exam_status, name='proctor_students_with_exam_status'),
    path('faculty/exam-student-subjects/', faculty3_views.exam_student_subjects, name='exam_student_subjects'),

    # Assignment Management endpoints
    path('faculty/assignments/manage/', assignment_views.manage_assignments, name='manage_assignments'),
    path('faculty/assignments/<int:assignment_id>/', assignment_views.assignment_detail, name='assignment_detail'),
    path('faculty/assignments/<int:assignment_id>/submissions/', assignment_views.get_assignment_submissions, name='get_assignment_submissions'),
    path('faculty/assignments/submissions/<int:submission_id>/grade/', assignment_views.grade_assignment, name='grade_assignment'),
    path('student/assignments/<int:assignment_id>/submit/', assignment_views.submit_assignment, name='submit_assignment'),

    # Exam Management endpoints
    path('faculty/exams/', exam_views.manage_exams, name='manage_exams'),
    path('faculty/exams/<int:exam_id>/', exam_views.exam_detail, name='exam_detail'),
    path('faculty/exams/<int:exam_id>/results/', exam_views.get_exam_results, name='get_exam_results'),
    path('faculty/exams/<int:exam_id>/record-result/', exam_views.record_exam_result, name='record_exam_result'),
    path('faculty/exams/<int:exam_id>/bulk-record-results/', exam_views.bulk_record_results, name='bulk_record_results'),
    # Report Generation endpoints
    path('faculty/reports/attendance/', report_views.attendance_report, name='attendance_report'),
    path('faculty/reports/marks/', report_views.marks_report, name='marks_report'),


    path('hod/reports/department/', report_views.hod_department_report, name='hod_department_report'),
    path('admin/reports/system/', report_views.admin_system_report, name='admin_system_report'),
    path('reports/export-excel/', report_views.export_report_excel, name='export_report_excel'),
    path('co-attainment/', co_attainment, name='co_attainment'),

    # HOD endpoints
    path('hod/dashboard/', hod2_views.hod_dashboard_bootstrap, name='hod_dashboard'),
    path('hod/bootstrap/', hod2_views.hod_bootstrap, name='hod_bootstrap'),
    path('hod/student-bootstrap/', hod2_views.hod_student_bootstrap, name='hod_student_bootstrap'),
    path('hod/subject-bootstrap/', hod2_views.hod_subjects_bootstrap, name='hod_subjects_bootstrap'),
    path('hod/timetable-bootstrap/', hod2_views.hod_timetable_bootstrap, name='hod_timetable_bootstrap'),
    path('hod/timetable-semester-data/', hod2_views.hod_timetable_semester_data, name='hod_timetable_semester_data'),
    path('hod/attendance-bootstrap/', hod2_views.hod_attendance_bootstrap, name='hod_attendance_bootstrap'),
    path('hod/leave-bootstrap/', hod2_views.hod_leave_bootstrap, name='hod_leave_bootstrap'),
    path('hod/faculty-leaves-bootstrap/', hod2_views.hod_faculty_leaves_bootstrap, name='hod_faculty_leaves_bootstrap'),
    path('hod/proctor-bootstrap/', hod2_views.hod_proctor_bootstrap, name='hod_proctor_bootstrap'),
    path('hod/semester-bootstrap/', hod2_views.hod_semester_bootstrap, name='hod_semester_bootstrap'),
    path('hod/marks-bootstrap/', hod2_views.hod_marks_bootstrap, name='hod_marks_bootstrap'),
    path('hod/faculty-assignments-bootstrap/', hod2_views.hod_faculty_assignments_bootstrap, name='hod_faculty_assignments_bootstrap'),
    path('hod/promotion-bootstrap/', hod2_views.hod_promotion_bootstrap, name='hod_promotion_bootstrap'),
    path('hod/low-attendance-bootstrap/', hod2_views.hod_low_attendance_bootstrap, name='hod_low_attendance_bootstrap'),
    path('hod/low-attendance-students/', hod2_views.hod_low_attendance_students, name='hod_low_attendance_students'),
    path('hod/elective-enrollment-bootstrap/', hod2_views.hod_elective_enrollment_bootstrap, name='hod_elective_enrollment_bootstrap'),
    path('hod/dashboard-stats/', hod_views.dashboard_stats, name='hod_stats'),
    path('hod/low-attendance/', hod_views.low_attendance_students, name='hod_low_attendance'),
    path('hod/semesters/', hod_views.manage_semesters, name='hod_semesters'),
    path('hod/sections/', hod_views.manage_sections, name='hod_sections'),
    path('hod/students/', hod_views.manage_students, name='hod_manage_students'),
    path('hod/student-options/', hod_views.get_student_options, name='hod_student_options'),
    path('hod/batches/', hod_views.get_batches, name='hod_batches'),
    path('hod/subjects/', hod_views.manage_subjects, name='hod_subjects'),
    path('hod/faculty-assignments/', hod_views.manage_faculty_assignments, name='hod_faculty_assignments'),
    path('hod/timetable/', hod_views.manage_timetable, name='hod_timetable'),
    path('hod/leaves/', hod_views.manage_leaves, name='hod_leaves'),
    path('hod/attendance/', hod_views.get_attendance, name='hod_attendance'),
    path('hod/marks/', hod_views.get_marks, name='hod_marks'),
    path('hod/announcements/', hod_views.create_announcement, name='hod_create_announcement'),
    path('hod/notifications/', hod_views.send_notification, name='send_notification'),
    path('hod/notifications/history/', hod_views.get_notifications, name='get_notifications'),
    path('hod/notifications/sent/', hod_views.get_sent_notifications, name='get_sent_notifications'),
    path('hod/proctors/', hod_views.assign_proctor, name='hod_assign_proctor'),
    path('hod/proctors/bulk/', hod_views.assign_proctors_bulk, name='hod_assign_proctors_bulk'),
    path('hod/proctors/list/', hod_views.get_proctors, name='hod_get_proctors'),
    path('hod/chat/', hod_views.manage_chat, name='hod_chat'),
    path('hod/profile/', hod_views.manage_profile, name='hod_profile'),
    path('hod/branches/', hod_views.get_branches, name='hod_branches'),
    path('hod/faculties/', hod_views.manage_faculties, name='hod_faculties'),
    path('hod/performance/', hod_views.get_student_performance, name='hod_student_performance'),
    path('hod/leave-applications/', hod_views.hod_leave_applications, name='hod_leave_applications'),
    path('hod/all-attendance/', hod_views.all_attendance_students, name='all_attendance_students'),
    path('hod/study-materials/', hod_views.upload_study_material, name='hod_upload_study_material'),
    path('hod/faculty-attendance-today/', hod_views.get_faculty_attendance_today, name='get_faculty_attendance_today'),
    path('hod/faculty-attendance-records/', hod_views.get_faculty_attendance_records, name='get_faculty_attendance_records'),
    
    # Semester Progression and Exam Failure Management endpoints
    path('hod/promote-students/', hod_views.promote_students_to_next_semester, name='promote_students'),
    path('hod/promote-selected-students/', hod_views.promote_selected_students, name='promote_selected_students'),
    path('hod/demote-student/', hod_views.demote_student, name='demote_student'),
    path('hod/demote-students/bulk/', hod_views.bulk_demote_students, name='bulk_demote_students'),
 
    # Admin endpoints
    path('admin/stats-overview/', admin_views.stats_overview, name='admin_stats_overview'),
    path('admin/enroll-user/', admin_views.enroll_user, name='admin_enroll_user'),
    path('admin/bulk-upload-faculty/', admin_views.bulk_upload_faculty, name='admin_bulk_upload_faculty'),
    path('admin/branches/', admin_views.manage_branches, name='admin_manage_branches'),
    path('admin/branches/<int:branch_id>/', admin_views.manage_branches, name='admin_manage_branch'),
    path('admin/branches-with-hods/', admin_views.get_branches_with_hods, name='admin_branches_with_hods'),
    path('admin/batches/', admin_views.manage_batches, name='admin_manage_batches'),
    path('admin/batches/<int:batch_id>/', admin_views.manage_batches, name='admin_manage_batch'),
    path('admin/notifications/', admin_views.manage_notifications, name='admin_manage_notifications'),
    path('admin/hod-leaves/', admin_views.manage_hod_leaves, name='admin_manage_hod_leaves'),
    path('admin/hod-leaves/bulk-process/', admin_views.bulk_process_hod_leaves, name='admin_bulk_process_hod_leaves'),
    path('admin/users/', admin_views.user_directory, name='admin_user_directory'),
    path('admin/users/bulk-actions/', admin_views.bulk_user_actions, name='admin_bulk_user_actions'),
    path('admin/profile/<int:user_id>/', admin_views.manageAdminProfile, name='admin_profile_management'),
    path('admin/campus-locations/', admin_views.manage_campus_location, name='admin_manage_campus_locations'),
    path('admin/campus-locations/<int:location_id>/', admin_views.manage_campus_location, name='admin_manage_campus_location'),
    
    # Teacher-Branch Assignment endpoints
    path('admin/teacher-assignments/', admin_views.get_teacher_branch_assignments, name='admin_teacher_assignments'),
    path('admin/assign-teacher-branch/', admin_views.assign_teacher_to_branch, name='admin_assign_teacher_branch'),
    path('admin/assign-teacher-subject/', admin_views.assign_teacher_to_subject, name='admin_assign_teacher_subject'),
    path('admin/remove-teacher-assignment/<int:assignment_id>/', admin_views.remove_teacher_assignment, name='admin_remove_teacher_assignment'),
    path('admin/assignment-options/', admin_views.get_assignment_options, name='admin_assignment_options'),
    
    # Fees Manager endpoints
    path('fees-manager/dashboard/', fees_manager_views.fees_manager_dashboard, name='fees_manager_dashboard'),
    path('fees-manager/profile/', fees_manager_views.manage_fees_manager_profile, name='fees_manager_profile'),
    path('fees-manager/stats/', fees_manager_views.fees_manager_stats, name='fees_manager_stats'),
    
    # Fee Components
    path('fees-manager/components/', fees_manager_views.FeeComponentsListCreateView.as_view(), name='fee_components'),
    path('fees-manager/components/<int:pk>/', fees_manager_views.FeeComponentDetailView.as_view(), name='fee_component_detail'),
    
    # Fee Templates (alias for frontend compatibility)
    path('fees-manager/templates/', fees_manager_views.FeeTemplatesListCreateView.as_view(), name='fee_templates'),
    path('fees-manager/templates/<int:pk>/', fees_manager_views.FeeTemplateDetailView.as_view(), name='fee_template_detail'),
    path('fees-manager/fee-templates/', fees_manager_views.FeeTemplatesListCreateView.as_view(), name='fee_templates_alias'),
    
    # Fee Assignments (alias for frontend compatibility)
    path('fees-manager/assignments/', fees_manager_views.manage_fee_assignments, name='fee_assignments'),
    path('fees-manager/fee-assignments/', fees_manager_views.manage_fee_assignments, name='fee_assignments_alias'),
    
    # Students (for fee assignments)
    path('fees-manager/students/', fees_manager_views.get_students_for_fee_assignment, name='fees_manager_students'),
    path('fees-manager/bulk-assignment-stats/', fees_manager_views.bulk_assignment_stats, name='bulk_assignment_stats'),
    
    # Invoices
    path('fees-manager/invoices/', fees_manager_views.manage_invoices, name='fee_invoices'),
    path('fees-manager/invoices/<int:invoice_id>/', fees_manager_views.invoice_detail, name='invoice_detail'),
    path('fees-manager/invoices/<int:invoice_id>/download/', fees_manager_views.download_invoice, name='download_invoice'),
    path('fees-manager/invoices/<int:invoice_id>/remind/', fees_manager_views.send_invoice_reminder, name='send_invoice_reminder'),
    
    # Payments
    path('fees-manager/payments/', fees_manager_views.manage_payments, name='fee_payments'),
    path('fees-manager/payment-stats/', fees_manager_views.payment_stats, name='payment_stats'),
    
    # Reports (generic endpoint for frontend compatibility)
    path('fees-manager/reports/', fees_manager_views.fees_reports, name='fees_reports'),
    path('fees-manager/reports/collections/', fees_manager_views.collections_report, name='collections_report'),
    path('fees-manager/reports/outstanding/', fees_manager_views.outstanding_fees_report, name='outstanding_fees_report'),
    
    # Student Fee Profiles
    path('fees-manager/students/<int:student_id>/fee-profile/', fees_manager_views.student_fee_profile, name='student_fee_profile'),
    
    # Individual Fee Assignment
    path('fees-manager/students/<int:student_id>/assign-individual-fees/', fees_manager_views.assign_individual_fees, name='assign_individual_fees'),
    path('fees-manager/students/<int:student_id>/remove-individual-fees/', fees_manager_views.remove_individual_fees, name='remove_individual_fees'),
    path('fees-manager/students/<int:student_id>/assign-individual-fees/', fees_manager_views.assign_individual_fees, name='assign_individual_fees'),
    path('fees-manager/students/<int:student_id>/remove-individual-fees/', fees_manager_views.remove_individual_fees, name='remove_individual_fees'),
    
    # Stripe Payment endpoints
    path('payments/create-checkout-session/<int:invoice_id>/', CreateCheckoutSessionView.as_view(), name='create_checkout_session'),
    path('payments/invoice-components/<int:invoice_id>/', InvoiceComponentSelectionView.as_view(), name='invoice_components'),
    path('payments/component-payment/<int:invoice_id>/', ComponentBasedPaymentView.as_view(), name='component_payment'),
    path('payments/status/<str:session_id>/', PaymentStatusView.as_view(), name='payment_status'),
    path('payments/webhook/', StripeWebhookView.as_view(), name='stripe_webhook'),
    path('payments/refund/<int:payment_id>/', RefundPaymentView.as_view(), name='refund_payment'),
    path('payments/receipt/<int:payment_id>/', fees_manager_views.download_receipt, name='download_receipt'),

    # COE endpoints
    path('coe/dashboard-stats/', dashboard_stats, name='coe_dashboard_stats'),
    path('coe/exam-applications/', exam_applications, name='coe_exam_applications'),
    path('coe/exam-applications/<int:application_id>/action/', action_exam_application, name='coe_action_exam_application'),
    path('coe/exam-applications/students/', StudentApplicationStatusView.as_view(), name='coe_student_application_status'),
    path('coe/exam-applications/courses/', CourseApplicationStatsView.as_view(), name='coe_course_application_stats'),
    path('coe/filter-options/', get_filter_options, name='coe_filter_options'),
    path('coe/reports/', reports, name='coe_reports'),
    path('coe/reports/generate/', generate_report, name='coe_generate_report'),
    path('coe/exam-schedule/', exam_schedule, name='coe_exam_schedule'),
    path('coe/export-not-applied/', export_not_applied, name='coe_export_not_applied'),
    path('coe/export-not-applied', export_not_applied, name='coe_export_not_applied_no_slash'),
    path('coe/export-not-applied-debug/', export_not_applied_debug, name='coe_export_not_applied_debug'),
    # COE result upload endpoints
    path('coe/result-upload/', create_result_upload_batch, name='coe_create_result_upload'),
    path('coe/result-upload/<int:upload_id>/students/', get_students_for_upload, name='coe_result_upload_students'),
    path('coe/result-upload/<int:upload_id>/marks/', save_marks_for_upload, name='coe_result_upload_marks'),
    path('coe/result-upload/<int:upload_id>/publish/', publish_upload_batch, name='coe_result_upload_publish'),
    path('coe/result-upload/<int:upload_id>/unpublish/', unpublish_upload_batch, name='coe_result_upload_unpublish'),
    path('coe/published-results/', get_published_results, name='coe_published_results'),
    path('results/view/<str:token>/', public_view_result_by_token, name='public_view_result_by_token'),
    # Revaluation / Makeup endpoints for frontend
    path('revaluation/students/', revalv_views.get_students_for_revaluation, name='revaluation_students'),
    path('revaluation/request/', revalv_views.request_revaluation, name='revaluation_request'),
    path('makeup/request/', revalv_views.request_makeup, name='makeup_request'),
    path('makeup/students/', revalv_views.get_students_for_makeup, name='makeup_students'),
    path('revaluation/filter-options/', revalv_views.get_revaluation_filter_options, name='revaluation_filter_options'),

    # PDF Processing endpoints
    path('upload-pdf/', PDFUploadView.as_view(), name='upload_pdf'),
    path('ask-question/', AskQuestionView.as_view(), name='ask_question'),
    
    # Migration endpoint (only available in debug mode)
    path('run-migrations/', run_migrations_view, name='run_migrations'),
]