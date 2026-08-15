import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../utils/config';
import { isTokenExpired, refreshToken } from '../utils/authService';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Official, calm, smooth MS Teams-style 3-note harmonic chime (F5 -> A5 -> C6)
const playNotificationSound = () => {
    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        
        const now = ctx.currentTime;
        
        // Low-pass filter to make sound smooth, calm, and eliminate harshness
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2200, now);
        filter.connect(ctx.destination);

        const playNote = (freq: number, startTime: number, duration: number, volume: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);
            
            // Soft 15ms attack and smooth exponential decay (MS Teams style)
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(volume, startTime + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
            
            osc.connect(gain);
            gain.connect(filter);
            
            osc.start(startTime);
            osc.stop(startTime + duration);
        };

        // Microsoft Teams style calm 3-note harmonic chime (F5 -> A5 -> C6)
        playNote(698.46, now, 0.45, 0.10);        // F5 (Soft Base)
        playNote(880.00, now + 0.07, 0.50, 0.12); // A5 (Warm Mid)
        playNote(1046.50, now + 0.14, 0.60, 0.14); // C6 (Crisp Top)

    } catch (err) {
        console.warn("Could not play notification sound:", err);
    }
};

export const useWebSocketNotifications = () => {
    const { isAuthenticated } = useAuth();
    const queryClient = useQueryClient();
    const wsRef = useRef<WebSocket | null>(null);
    const authFailedRef = useRef(false);

    useEffect(() => {
        const hasSuperAdminToken = !!localStorage.getItem('superadmin_token');
        if (!isAuthenticated && !hasSuperAdminToken) {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            return;
        }

        const getValidToken = async (): Promise<string | null> => {
            let token = sessionStorage.getItem('access_token') || localStorage.getItem('access_token');
            let isSuperAdmin = false;
            
            if (!token) {
                token = localStorage.getItem('superadmin_token');
                isSuperAdmin = !!token;
            }

            if (isTokenExpired(token)) {
                if (isSuperAdmin) {
                    const refresh = localStorage.getItem('superadmin_refresh');
                    if (!refresh) return null;
                    try {
                        const res = await fetch(`${API_BASE_URL}/api/superadmin/token/refresh/`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ refresh }),
                        });
                        if (res.ok) {
                            const data = await res.json();
                            if (data.access) {
                                localStorage.setItem('superadmin_token', data.access);
                                if (data.refresh) localStorage.setItem('superadmin_refresh', data.refresh);
                                return data.access;
                            }
                        }
                        return null;
                    } catch {
                        return null;
                    }
                } else {
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
                                           (typeof data.event === 'string' && data.event.startsWith('announcement.')) ||
                                           data.title || data.message;

                    if (isNotification) {
                        // Determine if THIS user is the one who created/updated the announcement.
                        const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
                        const parsedUser = userStr ? JSON.parse(userStr) : null;
                        const currentUserId = parsedUser?.id || parsedUser?.user_id || null;
                        const isSelf = data.sender_id != null && currentUserId != null && String(data.sender_id) === String(currentUserId);

                        if (!isSelf) {
                            // Play audio notification chime for incoming WebSocket alerts
                            playNotificationSound();

                            // Show toast notification
                            if (data.event !== 'announcement.deleted') {
                                toast(data.title || "New Notification", {
                                    description: data.message,
                                });
                            }
                            // Update the navbar badge count
                            window.dispatchEvent(new CustomEvent('refresh-unread-count'));
                        }
                        
                        // Invalidate queries & dispatch refresh events
                        queryClient.invalidateQueries({ queryKey: ['studentNotifications'] });
                        queryClient.invalidateQueries({ queryKey: ['notifications'] });
                        queryClient.invalidateQueries({ queryKey: ['announcements'] });
                        queryClient.invalidateQueries({ queryKey: ['campusMonitoring'] });
                        if (!isSelf) {
                            queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
                        }
                        window.dispatchEvent(new CustomEvent('refresh-announcements'));
                        window.dispatchEvent(new CustomEvent('refresh-campus-monitoring'));
                    }
                } catch (err) {
                    console.error('Error parsing websocket message', err);
                }
            };

            ws.onclose = (event) => {
                if (event.code === 1000 || event.code === 1001 || event.code === 4001) return;
                if (authFailedRef.current) return;
                
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
