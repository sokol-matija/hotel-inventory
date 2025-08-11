// useEmailTestState - State management hook for email and notification testing
// Consolidates all state management from EmailTestPage into reusable hook

import { useState, useCallback, useMemo } from 'react';
import { EmailTestService, TestResult, EmailTestConfiguration, EmailTestData } from '../services/EmailTestService';
import { EmailLanguage, EmailType } from '../emailService';

export interface EmailTestState {
  // Email configuration state
  emailAddress: string;
  selectedLanguage: EmailLanguage;
  selectedEmailType: EmailType;
  
  // Loading states
  isSendingEmail: boolean;
  isSendingNotification: boolean;
  
  // Result states
  lastEmailResult: TestResult | null;
  lastNotificationResult: TestResult | null;
  
  // Test data
  testData: EmailTestData;
  
  // Computed states
  emailConfiguration: EmailTestConfiguration;
  isValidEmail: boolean;
  emailValidationError?: string;
}

export interface EmailTestActions {
  // Configuration actions
  setEmailAddress: (email: string) => void;
  setSelectedLanguage: (language: EmailLanguage) => void;
  setSelectedEmailType: (type: EmailType) => void;
  
  // Test actions
  sendTestEmail: () => Promise<void>;
  sendTestNotification: () => Promise<void>;
  
  // Utility actions
  clearResults: () => void;
  resetConfiguration: () => void;
  
  // Service methods (exposed for convenience)
  getEmailTypes: () => Array<{ value: EmailType; label: string; description: string }>;
  getEmailLanguages: () => Array<{ value: EmailLanguage; label: string; flag: string }>;
  formatDisplayDate: (date: Date) => string;
  getGuestBadges: (guest: any) => Array<{ type: 'pet' | 'vip' | 'children'; label: string; icon: string }>;
}

export function useEmailTestState(): EmailTestState & EmailTestActions {
  const emailTestService = EmailTestService.getInstance();
  
  // Core configuration state
  const [emailAddress, setEmailAddress] = useState('sokol.matija@gmail.com');
  const [selectedLanguage, setSelectedLanguage] = useState<EmailLanguage>('en');
  const [selectedEmailType, setSelectedEmailType] = useState<EmailType>('welcome');
  
  // Loading states
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  
  // Result states
  const [lastEmailResult, setLastEmailResult] = useState<TestResult | null>(null);
  const [lastNotificationResult, setLastNotificationResult] = useState<TestResult | null>(null);
  
  // Test data (static for now)
  const testData = useMemo(() => emailTestService.getTestData(), [emailTestService]);
  
  // Email validation
  const emailValidation = useMemo(() => 
    emailTestService.validateEmailAddress(emailAddress), 
    [emailAddress, emailTestService]
  );
  
  // Email configuration object
  const emailConfiguration = useMemo(() => ({
    emailAddress,
    language: selectedLanguage,
    emailType: selectedEmailType
  }), [emailAddress, selectedLanguage, selectedEmailType]);
  
  // Send test email action
  const sendTestEmail = useCallback(async () => {
    if (!emailValidation.valid) {
      return;
    }
    
    setIsSendingEmail(true);
    setLastEmailResult(null);
    
    try {
      const result = await emailTestService.sendTestEmail(emailConfiguration, testData);
      setLastEmailResult(result);
    } finally {
      setIsSendingEmail(false);
    }
  }, [emailTestService, emailConfiguration, testData, emailValidation.valid]);
  
  // Send test notification action
  const sendTestNotification = useCallback(async () => {
    setIsSendingNotification(true);
    setLastNotificationResult(null);
    
    try {
      const result = await emailTestService.sendTestNotification(testData);
      setLastNotificationResult(result);
    } finally {
      setIsSendingNotification(false);
    }
  }, [emailTestService, testData]);
  
  // Utility actions
  const clearResults = useCallback(() => {
    setLastEmailResult(null);
    setLastNotificationResult(null);
  }, []);
  
  const resetConfiguration = useCallback(() => {
    setEmailAddress('sokol.matija@gmail.com');
    setSelectedLanguage('en');
    setSelectedEmailType('welcome');
    clearResults();
  }, [clearResults]);
  
  // Service method proxies
  const getEmailTypes = useCallback(() => 
    emailTestService.getEmailTypes(), 
    [emailTestService]
  );
  
  const getEmailLanguages = useCallback(() => 
    emailTestService.getEmailLanguages(), 
    [emailTestService]
  );
  
  const formatDisplayDate = useCallback((date: Date) => 
    emailTestService.formatDisplayDate(date), 
    [emailTestService]
  );
  
  const getGuestBadges = useCallback((guest: any) => 
    emailTestService.getGuestBadges(guest), 
    [emailTestService]
  );
  
  // Return combined state and actions
  return {
    // State
    emailAddress,
    selectedLanguage,
    selectedEmailType,
    isSendingEmail,
    isSendingNotification,
    lastEmailResult,
    lastNotificationResult,
    testData,
    emailConfiguration,
    isValidEmail: emailValidation.valid,
    emailValidationError: emailValidation.error,
    
    // Actions
    setEmailAddress,
    setSelectedLanguage,
    setSelectedEmailType,
    sendTestEmail,
    sendTestNotification,
    clearResults,
    resetConfiguration,
    getEmailTypes,
    getEmailLanguages,
    formatDisplayDate,
    getGuestBadges
  };
}