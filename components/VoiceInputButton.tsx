"use client";

import { useEffect, useRef } from "react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

interface VoiceInputButtonProps {
  onTranscriptUpdate: (transcript: string) => void;
}

export function VoiceInputButton({ onTranscriptUpdate }: VoiceInputButtonProps) {
  const { isListening, transcript, error, startListening, stopListening, isSupported } =
    useSpeechRecognition();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const lastTranscriptRef = useRef("");

  useEffect(() => {
    if (transcript && transcript !== lastTranscriptRef.current) {
      // Only send new transcript parts (the difference)
      const newPart = transcript.slice(lastTranscriptRef.current.length).trim();
      if (newPart) {
        onTranscriptUpdate(newPart);
        lastTranscriptRef.current = transcript;
      }
    }
  }, [transcript, onTranscriptUpdate]);

  const handleClick = () => {
    if (isListening) {
      stopListening();
      lastTranscriptRef.current = "";
    } else {
      lastTranscriptRef.current = "";
      startListening();
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleClick}
        className={`absolute right-3 bottom-3 z-50 flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 ${
          isListening
            ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
            : "bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200"
        }`}
        title={isListening ? "Stop recording" : "Start voice input"}
        aria-label={isListening ? "Stop recording" : "Start voice input"}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
        >
          {isListening ? (
            <>
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </>
          ) : (
            <>
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </>
          )}
        </svg>
      </button>
      {error && (
        <div className="absolute right-3 bottom-14 z-50 px-3 py-2 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-sm rounded-lg shadow-lg">
          {error}
        </div>
      )}
    </>
  );
}

