import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { setupPushListeners } from '../utils/notificationUtils';

export default function PushListener() {
    const navigate = useNavigate();

    useEffect(() => {
        setupPushListeners(navigate);
    }, [navigate]);

    return null;
}
