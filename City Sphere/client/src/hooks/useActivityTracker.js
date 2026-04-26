import { useCallback, useRef } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * useActivityTracker
 * ------------------
 * Fire-and-forget hook. Never throws, never blocks the UI.
 * Works with any current or future feature — just call track() with
 * the action type and whatever metadata you have.
 *
 * Usage:
 *   const { track } = useActivityTracker();
 *   track({ action: 'view', placeId: '...', placeName: '...', placeType: 'museum' });
 */
const useActivityTracker = () => {
    // Debounce map: prevent logging the same place:action multiple times in 5s
    const debounceCache = useRef(new Map());

    const track = useCallback(async ({ action, placeId = null, placeName = null, placeType = null, cityName = null }) => {
        const token = localStorage.getItem('token');
        if (!token) return; // User not logged in — silently skip

        // Debounce: Skip if same (placeId + action) was fired in last 5 seconds
        const key = `${placeId}:${action}`;
        const lastFired = debounceCache.current.get(key);
        if (lastFired && Date.now() - lastFired < 5000) return;
        debounceCache.current.set(key, Date.now());

        // Fire and forget — do NOT await this in calling code
        try {
            await axios.post(
                `${API_URL}/api/activity/log`,
                { action, placeId, placeName, placeType, cityName },
                { headers: { Authorization: `Bearer ${token}` }, timeout: 5000 }
            );
        } catch {
            // Silently ignore — activity tracking should never break the UI
        }
    }, []);

    return { track };
};

export default useActivityTracker;
