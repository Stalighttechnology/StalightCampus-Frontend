import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../utils/config';
import { isTokenExpired, refreshToken } from '../utils/authService';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const useWebSocketNotifications = () => {
    const { isAuthenticated } = useAuth();
    const queryClient = useQueryClient();
    const wsRef = useRef<WebSocket | null>(null);
    const authFailedRef = useRef(false);

    useEffect(() => {
        if (!isAuthenticated) {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            return;
        }

        const getValidToken = async (): Promise<string | null> => {
            let token = sessionStorage.getItem('access_token') || localStorage.getItem('access_token');
            if (isTokenExpired(token)) {
                try {
                    const refreshRes = await refreshToken();
                    if (refreshRes.success && refreshRes.access) {
                        sessionStorage.setItem('access_token', refreshRes.access);
                        token = refreshRes.access;
                    } else {
                        return null;
                    }
                } catch (err) {
                    return null;
                }
            }
            return token;
        };

        const connect = async () => {
            const currentToken = await getValidToken();
            if (!currentToken) {
                authFailedRef.current = true;
                return;
            }
            authFailedRef.current = false;

            // Convert http:// to ws:// and https:// to wss://
            const wsProtocol = API_BASE_URL.startsWith('https') ? 'wss://' : 'ws://';
            const wsBaseUrl = API_BASE_URL.replace(/^https?:\/\//, wsProtocol);
            const wsUrl = `${wsBaseUrl}/ws/notifications/?token=${currentToken}`;

            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log("✅ WebSocket Connected!");
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    const isNotification = data.event === 'notification' || 
                                           data.notification_type === 'announcement' || 
                                           data.type === 'announcement' || 
                                           (typeof data.event === 'string' && data.event.startsWith('announcement.'));

                    if (isNotification) {
                        // Show a toast unless it's a deletion
                        if (data.event !== 'announcement.deleted') {
                            toast(data.title || "New Notification", {
                                description: data.message,
                            });
                        }
                        
                        // Invalidate react-query to refetch notifications, announcements, and unread badge count
                        queryClient.invalidateQueries({ queryKey: ['studentNotifications'] });
                        queryClient.invalidateQueries({ queryKey: ['notifications'] });
                        queryClient.invalidateQueries({ queryKey: ['announcements'] });
                        queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
                        
                        // Update the navbar badge count
                        window.dispatchEvent(new CustomEvent('refresh-unread-count'));
                    }
                } catch (err) {
                    console.error('Error parsing websocket message', err);
                }
            };

            ws.onclose = (event) => {
                // Don't reconnect if closed normally, unauthorized, or auth refresh failed
                if (event.code === 1000 || event.code === 1001 || event.code === 4001) return;
                if (authFailedRef.current) return;
                
                // Try reconnecting after 5 seconds
                setTimeout(() => {
                    if (wsRef.current?.readyState !== WebSocket.OPEN) {
                        connect();
                    }
                }, 5000);
            };
        };

        connect();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [isAuthenticated, queryClient]);
};
