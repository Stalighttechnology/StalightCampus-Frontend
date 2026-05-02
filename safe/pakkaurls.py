from django.urls import path, re_path, include
from .views import profile_views, assignment_views, exam_views, report_views
from .views import student, faculty, hod, ai, coe
from .views import fees_manager_views
from .views import revalv_views
from .views.admin import dashboard, branch_management, notifications, user_management
from .views.ai import student_ai_chatbot, ai_campus_assistant, get_faculty_profile, PDFUploadView, AskQuestionView
from rest_framework_simplejwt.views import TokenRefreshView
from . import views
from .views import run_migrations_view
from .stripe_views import CreateCheckoutSessionView, InvoiceComponentSelectionView, ComponentBasedPaymentView, PaymentStatusView, StripeWebhookView, RefundPaymentView
from .views.co_attainment import co_attainment

app_name = 'api'

urlpatterns = [
    # Authentication endpoints - handle both with/without trailing slash
    re_path(r'^login/?$', student.login_view, name='login'),
    re_path(r'^forgot-password/?$', student.forgot_password, name='forgot_password'),
    re_path(r'^verify-otp/?$', student.verify_otp, name='verify_otp'),
    re_path(r'^resend-otp/?$', student.resend_otp, name='resend_otp'),
    re_path(r'^reset-password/?$', student.reset_password, name='reset_password'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', student.logout, name='logout'),

    # Profile Management endpoints
    path('profile/', profile_views.manage_profile, name='manage_profile'),
    re_path(r'^profile/upload-picture/?$', profile_views.upload_profile_picture, name='upload_profile_picture'),
    re_path(r'^profile/delete-picture/?$', profile_views.delete_profile_picture, name='delete_profile_picture'),
    path('profile/stats/', profile_views.get_user_stats, name='get_user_stats'),

    # Student endpoints
    path('student/dashboard/', student.dashboard_overview, name='student_dashboard'),
    path('student/dashboard-with-notifications/', student.get_dashboard_with_notifications, name='student_dashboard_with_notifications'),
    path('student/timetable/', student.get_timetable, name='get_student_timetable'),
    path('student/attendance/', student.get_student_attendance, name='get_student_attendance'),
    path('student/attendance-with-marks/', student.get_attendance_with_marks, name='get_attendance_with_marks'),
    path('student/internal-marks/', student.get_internal_marks, name='get_student_internal_marks'),
    path('student/submit-leave-request/', student.submit_student_leave_request, name='submit_student_leave_request'),
    path('student/leave-requests/', student.get_student_leave_requests, name='get_student_leave_requests'),
    path('student/upload-certificate/', student.upload_certificate, name='upload_certificate'),
    path('student/bulk-upload-certificates/', student.bulk_upload_certificates, name='bulk_upload_certificates'),
    path('student/certificates/', student.get_certificates, name='get_certificates'),
    path('student/delete-certificate/', student.delete_certificate, name='delete_certificate'),
    path('student/update-profile/', student.update_profile, name='update_profile'),
    path('student/chat/', student.manage_chat, name='student_chat'),
    path('student/notifications/', student.get_notifications, name='get_student_notifications'),
    path('student/announcements/', student.get_announcements, name='get_student_announcements'),
    path('student/full-profile/', student.get_full_student_profile, name='get_full_student_profile'),
    path('student/study-materials/', student.get_study_materials, name='get_study_materials'),
    path('student/assignments/', student.get_student_assignments, name='get_student_assignments'),
    path('student/historical-data/', student.get_historical_student_data, name='get_historical_student_data'),
    path('student/exams/', exam_views.get_student_exams, name='get_student_exams'),
    path('student/fee-data/', student.get_student_fee_data, name='get_student_fee_data'),
    path('ai-chatbot/', ai.student_ai_chatbot, name='ai_chatbot'),
    path('student/ai-chatbot/', ai.student_ai_chatbot, name='student_ai_chatbot'),

    # Face Recognition endpoints
    path('student/train-face/', student.train_face, name='train_face'),
    path('student/check-face-status/', student.check_face_status, name='check_face_status'),
    path('recognize-face/', student.recognize_face, name='recognize_face'),

    # Public API endpoint for student data by USN
    path('public/student-data/', student.get_student_data_by_usn, name='get_student_data_by_usn'),
    path('common/subjects/', student.get_subjects_for_branch_semester, name='common_subjects'),
    path('common/subject-detail/', student.get_subject_detail, name='common_subject_detail'),

    # Faculty endpoints
    path('faculty/dashboard/', faculty.dashboard_overview, name='faculty_dashboard'),
    path('faculty/dashboard/bootstrap/', faculty.faculty_dashboard_bootstrap, name='faculty_dashboard_bootstrap'),
    path('faculty/attendance-records/summary/', faculty.get_attendance_records_with_summary, name='get_attendance_records_with_summary'),
    path('faculty/apply-leave/bootstrap/', faculty.get_apply_leave_bootstrap, name='get_apply_leave_bootstrap'),
    path('faculty/take-attendance/bootstrap/', faculty.get_take_attendance_bootstrap, name='get_take_attendance_bootstrap'),
    path('faculty/assigned-subjects/', faculty.get_assigned_subjects, name='get_assigned_subjects'),
    path('faculty/students/regular/', faculty.get_students_regular, name='get_students_regular'),
    path('faculty/students/elective/', faculty.get_students_elective, name='get_students_elective'),
    path('faculty/students/open-elective/', faculty.get_students_open_elective, name='get_students_open_elective'),
    path('faculty/upload-marks/bootstrap/', faculty.get_upload_marks_bootstrap, name='get_upload_marks_bootstrap'),
    path('faculty/take-attendance/', faculty.take_attendance, name='take_attendance'),
    path('faculty/ai-attendance/', faculty.ai_attendance, name='ai_attendance'),
    path('faculty/upload-marks/', faculty.upload_internal_marks, name='upload_internal_marks'),
    path('faculty/qps/', faculty.question_paper_list_create, name='question_paper_list_create'),
    path('faculty/qps/<int:qp_id>/', faculty.update_question_paper, name='update_question_paper'),
    path('faculty/students-for-marks/', faculty.get_students_for_marks, name='get_students_for_marks'),
    path('faculty/upload-ia-marks/', faculty.upload_ia_marks, name='upload_ia_marks'),
    path('faculty/apply-leave/', faculty.apply_leave, name='apply_leave'),
    path('faculty/leave-requests/', faculty.get_faculty_leave_requests, name='get_faculty_leave_requests'),
    path('faculty/attendance-records/', faculty.view_attendance_records, name='view_attendance_records'),
    path('faculty/attendance-records/list/', faculty.get_attendance_records_list, name='get_attendance_records_list'),
    path('faculty/attendance-records/<int:record_id>/details/', faculty.attendance_record_details, name='attendance_record_details'),
    path('faculty/announcements/', faculty.create_announcement, name='create_announcement'),
    path('faculty/proctor-students/', faculty.get_proctor_students, name='get_proctor_students'),
    path('faculty/manage-student-leave/', faculty.manage_student_leave, name='manage_student_leave'),
    path('faculty/assignments/', faculty.get_faculty_assignments, name='get_faculty_assignments'),
    path('faculty/timetable/', faculty.get_timetable, name='get_faculty_timetable'),
    path('faculty/chat/', faculty.manage_chat, name='manage_chat'),
    path('faculty/profile/', faculty.manage_profile, name='manage_profile'),
    path('faculty/schedule-mentoring/', faculty.schedule_mentoring, name='schedule_mentoring'),
    path('faculty/generate-statistics/', faculty.generate_statistics, name='generate_statistics'),
    path('faculty/download-pdf/<str:filename>/', faculty.download_pdf, name='download_pdf'),
    path('faculty/students/', faculty.get_students_for_class, name='get_students_for_class'),
    path('faculty/internal-marks/', faculty.get_internal_marks_for_class, name='get_internal_marks_for_class'),
    path('faculty/notifications/', faculty.get_notifications, name='get_faculty_notifications'),
    path('faculty/notifications/sent/', faculty.get_sent_notifications, name='get_faculty_sent_notifications'),
    path('faculty/ai-campus-assistant/', ai.ai_campus_assistant, name='ai_campus_assistant'),
    path('faculty/ai-campus-assistant/profile/', ai.get_faculty_profile, name='ai_campus_assistant_profile'),
    path('faculty/mark-attendance/', faculty.mark_faculty_attendance, name='mark_faculty_attendance'),
    path('faculty/my-attendance-records/', faculty.get_faculty_attendance_records, name='get_faculty_attendance_records'),

    # Exam Application endpoints
    path('faculty/exam-applications/', faculty.exam_applications, name='exam_applications'),
    path('faculty/hall-ticket/<int:student_id>/', faculty.download_hall_ticket, name='download_hall_ticket'),
    path('faculty/proctor-students/exam-status/', faculty.proctor_students_exam_status, name='proctor_students_exam_status'),
    # Consolidated endpoint that returns proctor students enriched with exam status when exam_period is provided
    path('faculty/proctor-students/with-exam-status/', faculty.proctor_students_with_exam_status, name='proctor_students_with_exam_status'),
    path('faculty/exam-student-subjects/', faculty.exam_student_subjects, name='exam_student_subjects'),

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
    path('hod/dashboard/', hod.hod_dashboard_bootstrap, name='hod_dashboard'),
    path('hod/bootstrap/', hod.hod_bootstrap, name='hod_bootstrap'),
    path('hod/student-bootstrap/', hod.hod_student_bootstrap, name='hod_student_bootstrap'),
    path('hod/subject-bootstrap/', hod.hod_subjects_bootstrap, name='hod_subjects_bootstrap'),
    path('hod/timetable-bootstrap/', hod.hod_timetable_bootstrap, name='hod_timetable_bootstrap'),
    path('hod/timetable-semester-data/', hod.hod_timetable_semester_data, name='hod_timetable_semester_data'),
    path('hod/attendance-bootstrap/', hod.hod_attendance_bootstrap, name='hod_attendance_bootstrap'),
    path('hod/leave-bootstrap/', hod.hod_leave_bootstrap, name='hod_leave_bootstrap'),
    path('hod/faculty-leaves-bootstrap/', hod.hod_faculty_leaves_bootstrap, name='hod_faculty_leaves_bootstrap'),
    path('hod/proctor-bootstrap/', hod.hod_proctor_bootstrap, name='hod_proctor_bootstrap'),
    path('hod/semester-bootstrap/', hod.hod_semester_bootstrap, name='hod_semester_bootstrap'),
    path('hod/marks-bootstrap/', hod.hod_marks_bootstrap, name='hod_marks_bootstrap'),
    path('hod/faculty-assignments-bootstrap/', hod.hod_faculty_assignments_bootstrap, name='hod_faculty_assignments_bootstrap'),
    path('hod/promotion-bootstrap/', hod.hod_promotion_bootstrap, name='hod_promotion_bootstrap'),
    path('hod/low-attendance-bootstrap/', hod.hod_low_attendance_bootstrap, name='hod_low_attendance_bootstrap'),
    path('hod/low-attendance-students/', hod.hod_low_attendance_students, name='hod_low_attendance_students'),
    path('hod/elective-enrollment-bootstrap/', hod.hod_elective_enrollment_bootstrap, name='hod_elective_enrollment_bootstrap'),
    path('hod/dashboard-stats/', hod.dashboard_stats, name='hod_stats'),
    path('hod/low-attendance/', hod.low_attendance_students, name='hod_low_attendance'),
    path('hod/semesters/', hod.manage_semesters, name='hod_semesters'),
    path('hod/sections/', hod.manage_sections, name='hod_sections'),
    path('hod/students/', hod.manage_students, name='hod_manage_students'),
    path('hod/student-options/', hod.get_student_options, name='hod_student_options'),
    path('hod/batches/', hod.get_batches, name='hod_batches'),
    path('hod/subjects/', hod.manage_subjects, name='hod_subjects'),
    path('hod/faculty-assignments/', hod.manage_faculty_assignments, name='hod_faculty_assignments'),
    path('hod/timetable/', hod.manage_timetable, name='hod_timetable'),
    path('hod/leaves/', hod.manage_leaves, name='hod_leaves'),
    path('hod/attendance/', hod.get_attendance, name='hod_attendance'),
    path('hod/marks/', hod.get_marks, name='hod_marks'),
    path('hod/announcements/', hod.create_announcement, name='hod_create_announcement'),
    path('hod/notifications/', hod.send_notification, name='send_notification'),
    path('hod/notifications/history/', hod.get_notifications, name='get_notifications'),
    path('hod/notifications/sent/', hod.get_sent_notifications, name='get_sent_notifications'),
    path('hod/proctors/', hod.assign_proctor, name='hod_assign_proctor'),
    path('hod/proctors/bulk/', hod.assign_proctors_bulk, name='hod_assign_proctors_bulk'),
    path('hod/proctors/list/', hod.get_proctors, name='hod_get_proctors'),
    path('hod/chat/', hod.manage_chat, name='hod_chat'),
    path('hod/branches/', hod.get_branches, name='hod_branches'),
    path('hod/faculties/', hod.manage_faculties, name='hod_faculties'),
    
    # Semester Progression and Exam Failure Management endpoints
    # Note: Some endpoints removed as functions not implemented
 
    # Admin endpoints
    path('admin/stats-overview/', dashboard.stats_overview, name='admin_stats_overview'),
    path('admin/enroll-user/', user_management.enroll_user, name='admin_enroll_user'),
    path('admin/bulk-upload-faculty/', user_management.bulk_upload_faculty, name='admin_bulk_upload_faculty'),
    path('admin/branches/', branch_management.manage_branches, name='admin_manage_branches'),
    path('admin/branches/<int:branch_id>/', branch_management.manage_branches, name='admin_manage_branch'),
    path('admin/branches-with-hods/', branch_management.get_branches_with_hods, name='admin_branches_with_hods'),
    path('admin/batches/', branch_management.manage_batches, name='admin_manage_batches'),
    path('admin/batches/<int:batch_id>/', branch_management.manage_batches, name='admin_manage_batch'),
    path('admin/notifications/', notifications.manage_notifications, name='admin_manage_notifications'),
    path('admin/hod-leaves/', notifications.manage_hod_leaves, name='admin_manage_hod_leaves'),
    path('admin/hod-leaves/bulk-process/', notifications.bulk_process_hod_leaves, name='admin_bulk_process_hod_leaves'),
    path('admin/users/', user_management.user_directory, name='admin_user_directory'),
    path('admin/users/bulk-actions/', user_management.bulk_user_actions, name='admin_bulk_user_actions'),
    path('admin/profile/<int:user_id>/', user_management.manageAdminProfile, name='admin_profile_management'),
    path('admin/campus-locations/', branch_management.manage_campus_location, name='admin_manage_campus_locations'),
    path('admin/campus-locations/<int:location_id>/', branch_management.manage_campus_location, name='admin_manage_campus_location'),
    
    # Teacher-Branch Assignment endpoints
    path('admin/teacher-assignments/', branch_management.get_teacher_branch_assignments, name='admin_teacher_assignments'),
    path('admin/assign-teacher-branch/', branch_management.assign_teacher_to_branch, name='admin_assign_teacher_branch'),
    path('admin/assign-teacher-subject/', branch_management.assign_teacher_to_subject, name='admin_assign_teacher_subject'),
    path('admin/remove-teacher-assignment/<int:assignment_id>/', branch_management.remove_teacher_assignment, name='admin_remove_teacher_assignment'),
    path('admin/assignment-options/', branch_management.get_assignment_options, name='admin_assignment_options'),
    
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
    path('coe/dashboard-stats/', coe.dashboard_stats, name='coe_dashboard_stats'),
    path('coe/exam-applications/', coe.exam_applications, name='coe_exam_applications'),
    path('coe/exam-applications/<int:application_id>/action/', coe.action_exam_application, name='coe_action_exam_application'),
    path('coe/exam-applications/students/', coe.StudentApplicationStatusView.as_view(), name='coe_student_application_status'),
    path('coe/exam-applications/courses/', coe.CourseApplicationStatsView.as_view(), name='coe_course_application_stats'),
    path('coe/filter-options/', coe.get_filter_options, name='coe_filter_options'),
    path('coe/reports/', coe.reports, name='coe_reports'),
    path('coe/reports/generate/', coe.generate_report, name='coe_generate_report'),
    path('coe/exam-schedule/', coe.exam_schedule, name='coe_exam_schedule'),
    path('coe/export-not-applied/', coe.export_not_applied, name='coe_export_not_applied'),
    path('coe/export-not-applied', coe.export_not_applied, name='coe_export_not_applied_no_slash'),
    path('coe/export-not-applied-debug/', coe.export_not_applied_debug, name='coe_export_not_applied_debug'),
    # COE result upload endpoints
    path('coe/result-upload/', coe.create_result_upload_batch, name='coe_create_result_upload'),
    path('coe/result-upload/<int:upload_id>/students/', coe.get_students_for_upload, name='coe_result_upload_students'),
    path('coe/result-upload/<int:upload_id>/marks/', coe.save_marks_for_upload, name='coe_result_upload_marks'),
    path('coe/result-upload/<int:upload_id>/publish/', coe.publish_upload_batch, name='coe_result_upload_publish'),
    path('coe/result-upload/<int:upload_id>/unpublish/', coe.unpublish_upload_batch, name='coe_result_upload_unpublish'),
    path('coe/published-results/', coe.get_published_results, name='coe_published_results'),
    path('coe/published-results/<int:result_id>/toggle-withhold/', coe.toggle_withhold_result, name='coe_toggle_withhold_result'),
    path('results/view/<str:token>/', coe.public_view_result_by_token, name='public_view_result_by_token'),
    # Revaluation / Makeup endpoints for frontend
    path('revaluation/students/', revalv_views.get_students_for_revaluation, name='revaluation_students'),
    path('revaluation/request/', revalv_views.request_revaluation, name='revaluation_request'),
    path('revaluation/initiate-payment/', revalv_views.initiate_revaluation_payment, name='revaluation_initiate_payment'),
    path('makeup/request/', revalv_views.request_makeup, name='makeup_request'),
    path('makeup/initiate-payment/', revalv_views.initiate_makeup_payment, name='makeup_initiate_payment'),
    path('makeup/students/', revalv_views.get_students_for_makeup, name='makeup_students'),
    path('revaluation/filter-options/', revalv_views.get_revaluation_filter_options, name='revaluation_filter_options'),

    # PDF Processing endpoints
    path('upload-pdf/', PDFUploadView.as_view(), name='upload_pdf'),
    path('ask-question/', AskQuestionView.as_view(), name='ask_question'),
    
    # Migration endpoint (only available in debug mode)
    path('run-migrations/', run_migrations_view, name='run_migrations'),
]