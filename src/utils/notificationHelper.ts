import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { FCM } from '@capacitor-community/fcm';
import { requestForToken } from '../lib/firebase';
import { API_ENDPOINT } from './config';
import { showSuccessAlert, showErrorAlert, showInfoAlert } from './sweetalert';

export const handleNotificationToggle = async (
  checked: boolean,
  setNotificationsEnabled: (enabled: boolean) => void
) => {
  try {
    const userToken = sessionStorage.getItem('access_token') || localStorage.getItem('access_token');
    if (!userToken) {
      showErrorAlert('Error', 'Session token not found. Please log in again.');
      setNotificationsEnabled(!checked);
      return;
    }

    if (Capacitor.isNativePlatform()) {
      if (checked) {
        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive !== 'granted') {
          permStatus = await PushNotifications.requestPermissions();
        }
        if (permStatus.receive === 'granted') {
          await PushNotifications.register();
          
          // Setup registration listener to send token to backend
          const regListener = await PushNotifications.addListener('registration', async (token) => {
            try {
              let finalToken = token.value;
              if (Capacitor.getPlatform() === 'ios') {
                const fcmTokenResult = await FCM.getToken();
                finalToken = fcmTokenResult.token;
              }
              const res = await fetch(`${API_ENDPOINT}/profile/register-device/`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${userToken}`
                },
                body: JSON.stringify({
                  fcm_token: finalToken,
                  device_type: Capacitor.getPlatform() === 'ios' ? 'ios' : 'android'
                })
              });
              if (res.ok) {
                setNotificationsEnabled(true);
                showSuccessAlert('Success', 'Push notifications enabled!');
              } else {
                const errData = await res.json();
                showErrorAlert('Error', errData.error || 'Failed to register notification token');
                setNotificationsEnabled(false);
              }
              regListener.remove();
            } catch (e: any) {
              console.error(e);
              showErrorAlert('Error', e.message || 'Failed to contact notification registration server');
              setNotificationsEnabled(false);
              regListener.remove();
            }
          });
          
          const errListener = await PushNotifications.addListener('registrationError', (error: any) => {
            console.error(error);
            showErrorAlert('Registration Error', error.error || 'FCM registration failed');
            setNotificationsEnabled(false);
            errListener.remove();
          });
        } else {
          setNotificationsEnabled(false);
          showErrorAlert('Permission Denied', 'Please enable notification permissions in your device Settings.');
        }
      } else {
        try {
          await PushNotifications.removeAllListeners();
          setNotificationsEnabled(false);
          showInfoAlert('Disabled', 'Push notifications disabled for this device.');
        } catch (e) {
          console.error(e);
        }
      }
    } else {
      // Web / PWA platform logic
      if (checked) {
        const token = await requestForToken();
        if (token) {
          const res = await fetch(`${API_ENDPOINT}/profile/register-device/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${userToken}`
            },
            body: JSON.stringify({ fcm_token: token, device_type: 'web' })
          });
          if (res.ok) {
            setNotificationsEnabled(true);
            showSuccessAlert('Success', 'Push notifications enabled!');
          } else {
            setNotificationsEnabled(false);
            showErrorAlert('Error', 'Failed to register notification token on backend.');
          }
        } else {
          setNotificationsEnabled(false);
          showErrorAlert('Error', 'Failed to retrieve web notification token.');
        }
      } else {
        const token = await requestForToken();
        if (token) {
          await fetch(`${API_ENDPOINT}/profile/unregister-device/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${userToken}`
            },
            body: JSON.stringify({ fcm_token: token })
          });
        }
        setNotificationsEnabled(false);
        showInfoAlert('Disabled', 'Push notifications disabled.');
      }
    }
  } catch (error) {
    console.error('Error toggling notifications:', error);
    setNotificationsEnabled(!checked);
    showErrorAlert('Error', 'Failed to update notification settings');
  }
};

export const checkNotificationPermission = async (setNotificationsEnabled: (enabled: boolean) => void) => {
  if (Capacitor.isNativePlatform()) {
    try {
      const perm = await PushNotifications.checkPermissions();
      setNotificationsEnabled(perm.receive === 'granted');
    } catch (e) {
      console.error("Error checking native notifications permission:", e);
    }
  } else {
    setNotificationsEnabled(typeof Notification !== 'undefined' && Notification.permission === 'granted');
  }
};
