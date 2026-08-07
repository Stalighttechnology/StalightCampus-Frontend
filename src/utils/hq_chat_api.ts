import { API_BASE_URL, getSuperAdminToken, getAuthToken } from "./config";

// Since both Superadmins and Developers can use this, we fall back between tokens
const getToken = () => {
    let token = getSuperAdminToken();
    if (!token) {
        token = getAuthToken();
    }
    return token;
};

const getHeaders = () => {
    const token = getToken();
    return {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    };
};

export interface HQChatAttachment {
    id: number;
    url: string;
    file_type: string;
}

export interface HQChatMessage {
    id: number;
    sender_id: number;
    sender_name: string;
    content: string;
    is_deleted: boolean;
    created_at: string;
    attachments: HQChatAttachment[];
}

export interface HQChatGroup {
    id: number;
    name: string;
    is_group: boolean;
    last_message: string;
    last_message_time: string;
    unread: number;
}

export const fetchHQChatGroups = async (): Promise<HQChatGroup[]> => {
    const res = await fetch(`${API_BASE_URL}/api/superadmin/chat/groups/`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Failed to fetch groups");
    const data = await res.json();
    return data.groups || [];
};

export const fetchHQChatMessages = async (groupId: number): Promise<HQChatMessage[]> => {
    const res = await fetch(`${API_BASE_URL}/api/superadmin/chat/groups/${groupId}/messages/`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Failed to fetch messages");
    const data = await res.json();
    return data.messages || [];
};

export const createHQChatGroup = async (name: string, memberIds: number[], isGroup: boolean) => {
    const res = await fetch(`${API_BASE_URL}/api/superadmin/chat/groups/create/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ name, members: memberIds, is_group: isGroup })
    });
    if (!res.ok) throw new Error("Failed to create group");
    return await res.json();
};

export const sendHQChatMessage = async (groupId: number, content: string, file?: File, fileType?: string) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('group_id', groupId.toString());
    formData.append('content', content);
    if (file && fileType) {
        formData.append('file', file);
        formData.append('file_type', fileType);
    }
    
    const res = await fetch(`${API_BASE_URL}/api/superadmin/chat/messages/send/`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}` // No Content-Type for FormData, browser sets multipart/form-data
        },
        body: formData
    });
    
    if (!res.ok) throw new Error("Failed to send message");
    return await res.json();
};

export const deleteHQChatMessage = async (msgId: number) => {
    const res = await fetch(`${API_BASE_URL}/api/superadmin/chat/messages/${msgId}/`, {
        method: "DELETE",
        headers: getHeaders()
    });
    if (!res.ok) throw new Error("Failed to delete message");
    return await res.json();
};

export interface HQGroupMember {
    id: number;
    name: string;
    email: string;
    role?: string;
}

export interface HQGroupInfo {
    id: number;
    name: string;
    is_group: boolean;
    created_by: number;
    members: HQGroupMember[];
}

export const fetchGroupInfo = async (groupId: number): Promise<HQGroupInfo> => {
    const res = await fetch(`${API_BASE_URL}/api/superadmin/chat/groups/${groupId}/info/`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Failed to fetch group info");
    return await res.json();
};

export const addGroupMember = async (groupId: number, userId: number) => {
    const res = await fetch(`${API_BASE_URL}/api/superadmin/chat/groups/${groupId}/members/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ user_id: userId })
    });
    if (!res.ok) throw new Error("Failed to add member");
    return await res.json();
};

export const removeGroupMember = async (groupId: number, userId: number) => {
    const res = await fetch(`${API_BASE_URL}/api/superadmin/chat/groups/${groupId}/members/${userId}/`, {
        method: "DELETE",
        headers: getHeaders()
    });
    if (!res.ok) throw new Error("Failed to remove member");
    return await res.json();
};

export const leaveGroup = async (groupId: number) => {
    const res = await fetch(`${API_BASE_URL}/api/superadmin/chat/groups/${groupId}/leave/`, {
        method: "POST",
        headers: getHeaders()
    });
    if (!res.ok) throw new Error("Failed to leave group");
    return await res.json();
};

export const deleteGroup = async (groupId: number) => {
    const res = await fetch(`${API_BASE_URL}/api/superadmin/chat/groups/${groupId}/`, {
        method: "DELETE",
        headers: getHeaders()
    });
    if (!res.ok) throw new Error("Failed to delete chat");
    return await res.json();
};
