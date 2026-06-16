import { API_ENDPOINT } from "./config";
import { fetchWithTokenRefresh } from "./authService";

export interface Holiday {
    id: number;
    date: string;
    description: string;
    holiday_type: string;
    created_at: string;
}

export const getHolidays = async (): Promise<Holiday[]> => {
    try {
        const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/admin/holidays/`, {
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
