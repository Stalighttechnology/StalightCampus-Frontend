import { useEffect, useRef, useState, useCallback } from 'react';
import { getSuperAdminToken, getAuthToken } from '@/utils/config';
import { HQChatMessage, HQChatGroup } from '@/utils/hq_chat_api';

interface UseHQChatSocketProps {
    onMessageReceived: (message: HQChatMessage) => void;
    onMessageDeleted: (messageId: number, groupId: number) => void;
    onGroupCreated: (group: HQChatGroup) => void;
    onUserTyping: (userId: number, groupId: number) => void;
}

export const useHQChatSocket = ({
    onMessageReceived,
    onMessageDeleted,
    onGroupCreated,
    onUserTyping
}: UseHQChatSocketProps) => {
    const wsRef = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        let token = getSuperAdminToken();
        if (!token) token = getAuthToken();
        if (!token) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Assuming backend is on port 8000 for local dev or same host
        const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
        const wsUrl = `${protocol}//${host}/ws/hq-chat/?token=${token}`;

        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            setIsConnected(true);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                switch (data.type) {
                    case 'chat_message':
                        onMessageReceived(data.message);
                        break;
                    case 'message_deleted':
                        onMessageDeleted(data.message_id, data.group_id);
                        break;
                    case 'group_created':
                        onGroupCreated(data.group);
                        break;
                    case 'typing':
                        onUserTyping(data.user_id, data.group_id);
                        break;
                    default:
                        break;
                }
            } catch (err) {
                console.error("Failed to parse websocket message", err);
            }
        };

        ws.onclose = () => {
            setIsConnected(false);
            // Optional: Auto-reconnect after 3 seconds
            setTimeout(connect, 3000);
        };

        wsRef.current = ws;
    }, [onMessageReceived, onMessageDeleted, onGroupCreated, onUserTyping]);

    useEffect(() => {
        connect();
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connect]);

    const sendTypingIndicator = (groupId: number) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'typing',
                group_id: groupId
            }));
        }
    };

    return { isConnected, sendTypingIndicator };
};
