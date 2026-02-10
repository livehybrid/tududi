import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from './Shared/ToastContext';

const MicrosoftAuthCallback: React.FC = () => {
    const { t } = useTranslation();
    const { showSuccessToast, showErrorToast } = useToast();
    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');

    useEffect(() => {
        const handleCallback = async () => {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const code = urlParams.get('code');
                const error = urlParams.get('error');

                if (error) {
                    console.error('Microsoft OAuth error:', error);
                    showErrorToast(t('microsoft_todo.auth_error', 'Microsoft authentication failed. Please try again.'));
                    setStatus('error');
                    return;
                }

                if (!code) {
                    console.error('No authorization code received from Microsoft');
                    showErrorToast(t('microsoft_todo.no_auth_code', 'No authorization code received. Please try again.'));
                    setStatus('error');
                    return;
                }

                // Exchange code for tokens via backend
                const response = await fetch('/api/microsoft-todo/exchange-token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({ code }),
                });

                const data = await response.json();
                
                if (data.success) {
                    showSuccessToast(t('microsoft_todo.connected', 'Successfully connected to Microsoft ToDo!'));
                    setStatus('success');
                    
                    // Redirect to profile page after a short delay
                    setTimeout(() => {
                        window.location.href = '/profile';
                    }, 2000);
                } else {
                    throw new Error(data.error || 'Failed to connect');
                }
            } catch (error) {
                console.error('Token exchange error:', error);
                showErrorToast(t('microsoft_todo.connection_failed', 'Failed to connect to Microsoft ToDo. Please try again.'));
                setStatus('error');
            }
        };

        handleCallback();
    }, [t, showSuccessToast, showErrorToast]);

    if (status === 'processing') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="max-w-md w-full space-y-8">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="animate-spin h-8 w-8 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {t('microsoft_todo.connecting', 'Connecting to Microsoft ToDo...')}
                        </h2>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            {t('microsoft_todo.please_wait', 'Please wait while we complete the connection.')}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="max-w-md w-full space-y-8">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {t('microsoft_todo.connected', 'Successfully Connected!')}
                        </h2>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            {t('microsoft_todo.redirecting', 'Redirecting you back to your profile...')}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {t('microsoft_todo.connection_failed', 'Connection Failed')}
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {t('microsoft_todo.try_again', 'Please try connecting again from your profile settings.')}
                    </p>
                    <div className="mt-6">
                        <a
                            href="/profile"
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            {t('microsoft_todo.back_to_profile', 'Back to Profile')}
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MicrosoftAuthCallback;
