import { API_ENDPOINT } from "./config";
import { fetchWithTokenRefresh } from "./authService";

export interface Holiday {
    id: number;
    date: string;
    description: string;
    holiday_type: string;
    created_at: string;
}

export const getHolidays = async (startDate?: string, endDate?: string): Promise<Holiday[]> => {
    try {
        let url = `${API_ENDPOINT}/admin/holidays/`;
        if (startDate && endDate) {
            url += `?start_date=${startDate}&end_date=${endDate}`;
        }
        const response = await fetchWithTokenRefresh(url, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
                "Content-Type": "application/json"
            }
        });
        const result = await response.json();
        return result.holidays || [];
    } catch (error) {
        console.error('Error fetching holidays:', error);
        throw error;
    }
};

export const createHoliday = async (data: { date: string; description: string; holiday_type: string }): Promise<Holiday> => {
    try {
        const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/holidays/`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || "Failed to create holiday");
        }
        return result.holiday;
    } catch (error) {
        console.error('Error creating holiday:', error);
        throw error;
    }
};

export const deleteHoliday = async (id: number): Promise<void> => {
    try {
        await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/holidays/${id}/`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${sessionStorage.getItem("access_token")}`
            }
        });
    } catch (error) {
        console.error('Error deleting holiday:', error);
        throw error;
    }
};

export interface ExamEvent {
    id: number;
    title: string;
    exam_type: string;
    subject: string;
    subject_code: string;
    date: string;
    start_time: string;
    end_time: string;
    room: string;
}

export const getStudentExams = async (startDate?: string, endDate?: string): Promise<ExamEvent[]> => {
    try {
        let queryParams = '';
        if (startDate && endDate) {
            queryParams = `?start_date=${startDate}&end_date=${endDate}`;
        }
        
        const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/student/exams/${queryParams}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
                "Content-Type": "application/json"
            }
        });
        const result = await response.json();
        return result.exams || [];
    } catch (error) {
        console.error('Error fetching student exams:', error);
        return [];
    }
};

export interface LeaveEvent {
    id: number;
    start_date: string;
    end_date: string;
    leave_type: string;
    title: string;
    reason: string;
}

export const getMyApprovedLeaves = async (role?: string, startDate?: string, endDate?: string): Promise<LeaveEvent[]> => {
    try {
        let url = `${API_ENDPOINT}/admin/my-approved-leaves/`;
        
        if (role === 'student' || role === 'parent') {
            url = `${API_ENDPOINT}/student/leave-requests/`;
        } else if (role === 'teacher') {
            url = `${API_ENDPOINT}/faculty/leave-requests/`;
        } else if (role === 'hod') {
            url = `${API_ENDPOINT}/hod/leave-applications/`;
        } else if (role === 'coe') {
            url = `${API_ENDPOINT}/coe/leaves/`;
        } else if (role === 'fees_manager') {
            url = `${API_ENDPOINT}/fees-manager/leaves/`;
        }

        if (startDate && endDate) {
            url += `?date_from=${startDate}&date_to=${endDate}&start_date=${startDate}&end_date=${endDate}`;
        }

        const response = await fetchWithTokenRefresh(url, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
                "Content-Type": "application/json"
            }
        });
        const result = await response.json();
        
        let allLeaves = result.leaves || result.leave_requests || result.data;
        if (!allLeaves && result.results) {
            allLeaves = result.results.data || result.results;
        }
        if (!Array.isArray(allLeaves)) {
            allLeaves = [];
        }
        
        return allLeaves.filter((l: any) => l.status === 'APPROVED');
    } catch (error) {
        console.error('Error fetching approved leaves:', error);
        return [];
    }
};
