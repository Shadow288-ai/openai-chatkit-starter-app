"use client";

import { useEffect, useRef, useState } from "react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

interface VoiceInputButtonProps {
  onTranscriptUpdate: (transcript: string) => void;
  containerRef?: React.RefObject<HTMLDivElement>;
}

export function VoiceInputButton({ onTranscriptUpdate, containerRef }: VoiceInputButtonProps) {
  const { isListening, transcript, error, startListening, stopListening, isSupported } =
    useSpeechRecognition();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [buttonPosition, setButtonPosition] = useState<{ right: number; bottom: number } | null>(null);

  const lastTranscriptRef = useRef("");

  // Find the ck-wrapper div and position the button at its bottom right
  useEffect(() => {
    if (!containerRef?.current) return;

    const findWrapperAndPositionButton = () => {
      // Find the ck-wrapper element
      let ckWrapper: HTMLElement | null = null;
      
      // Try to find in the container
      ckWrapper = containerRef.current?.querySelector(".ck-wrapper") as HTMLElement | null;
      
      // If not found, try in shadow DOM
      if (!ckWrapper) {
        const chatKitElement = containerRef.current?.querySelector("openai-chatkit");
        if (chatKitElement?.shadowRoot) {
          ckWrapper = chatKitElement.shadowRoot.querySelector(".ck-wrapper") as HTMLElement | null;
        }
      }

      if (ckWrapper && buttonRef.current && containerRef.current) {
        const wrapperRect = ckWrapper.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        
        // Position button at bottom right of ck-wrapper, relative to container
        // Adjusted: 160px to the left, 20px up
        const right = containerRect.right - wrapperRect.right + 190; // 172px from right edge (160px left + 12px)
        const bottom = containerRect.bottom - wrapperRect.bottom + 32; // 32px from bottom (20px up + 12px)
        
        setButtonPosition({ right, bottom });
      }
    };

    // Initial positioning
    findWrapperAndPositionButton();

    // Re-position on resize or when ChatKit loads
    const observer = new MutationObserver(findWrapperAndPositionButton);
    if (containerRef.current) {
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
      });
    }

    window.addEventListener("resize", findWrapperAndPositionButton);
    
    // Check periodically in case ChatKit loads later
    const interval = setInterval(findWrapperAndPositionButton, 500);
    
    // Cleanup after 10 seconds (should be enough for ChatKit to load)
    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 10000);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", findWrapperAndPositionButton);
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [containerRef]);

  useEffect(() => {
    if (transcript && transcript !== lastTranscriptRef.current) {
      // Get only the new part that was added
      const lastLength = lastTranscriptRef.current.length;
      const newPart = transcript.slice(lastLength).trim();
      
      if (newPart) {
        console.log("Sending transcript update:", newPart, "Full transcript:", transcript);
        // Send only the new part to avoid duplicates
        onTranscriptUpdate(newPart);
        lastTranscriptRef.current = transcript;
      }
    }
  }, [transcript, onTranscriptUpdate]);

  const handleClick = () => {
    if (isListening) {
      stopListening();
      // Clear the last transcript reference when stopping
      lastTranscriptRef.current = "";
    } else {
      // Clear the last transcript reference when starting
      lastTranscriptRef.current = "";
      startListening();
    }
  };

  // Show button even if not supported, but with disabled state
  // Use absolute positioning relative to container, or fallback to fixed
  const positionStyle = buttonPosition
    ? { right: `${buttonPosition.right}px`, bottom: `${buttonPosition.bottom}px` }
    : { right: "210px", bottom: "32px" };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleClick}
        disabled={!isSupported}
        style={positionStyle}
        className={`absolute z-[9999] flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 shadow-md ${
          !isSupported
            ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed opacity-50"
            : isListening
            ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
            : "bg-slate-400 hover:bg-slate-500 dark:bg-slate-600 dark:hover:bg-slate-500 text-white"
        }`}
        title={
          !isSupported
            ? "Speech recognition not supported in this browser"
            : isListening
            ? "Stop recording"
            : "Start voice input"
        }
        aria-label={
          !isSupported
            ? "Speech recognition not supported"
            : isListening
            ? "Stop recording"
            : "Start voice input"
        }
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4 h-4"
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
      {error && buttonRef.current && (
        <div 
          className="absolute z-[9999] px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs rounded shadow-lg max-w-xs"
          style={{
            right: buttonPosition ? `${buttonPosition.right}px` : "14px",
            bottom: buttonPosition ? `${buttonPosition.bottom + 40}px` : "52px",
          }}
        >
          {error}
        </div>
      )}
    </>
  );
}

