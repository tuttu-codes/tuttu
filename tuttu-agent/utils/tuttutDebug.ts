import type { WebContainer } from '@webcontainer/api';
import type { Message } from 'ai';

type TuttuDebug = {
  messages?: Message[];
  parsedMessages?: Message[];
  webcontainer?: WebContainer;
  setLogLevel?: (level: any) => void;
  chatInitialId?: string;
  sessionId?: string;
};

export function setTuttuDebugProperty(key: keyof TuttuDebug, value: TuttuDebug[keyof TuttuDebug]) {
  if (typeof window === 'undefined') {
    console.warn('setTuttuDebugProperty called on server, ignoring');
    return;
  }
  (window as any).__TUTTU_DEBUG = (window as any).__TUTTU_DEBUG || {};
  (window as any).__TUTTU_DEBUG[key] = value;
}
