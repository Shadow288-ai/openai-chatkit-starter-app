import { useEffect, useRef, useState } from "react";

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  addEventListener(
    type: "result",
    listener: (event: SpeechRecognitionEvent) => void
  ): void;
  addEventListener(
    type: "error",
    listener: (event: SpeechRecognitionErrorEvent) => void
  ): void;
  addEventListener(type: "end", listener: () => void): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isStartingRef = useRef(false);
  
  // Check support synchronously
  const isSupported = typeof window !== "undefined" && 
    (window.SpeechRecognition !== undefined || window.webkitSpeechRecognition !== undefined);

  useEffect(() => {
    // Check if browser supports speech recognition
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.addEventListener("result", (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let hasFinalResults = false;

      // Only process final results to avoid duplicates from interim results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const transcript = event.results[i][0].transcript;
          finalTranscript += transcript + " ";
          hasFinalResults = true;
        }
      }

      // Only update transcript with final results
      if (hasFinalResults && finalTranscript.trim()) {
        setTranscript((prev) => {
          // Append only the new final transcript part
          const newTranscript = (prev + " " + finalTranscript).trim();
          return newTranscript;
        });
      }
    });

    recognition.addEventListener("error", (event: SpeechRecognitionErrorEvent) => {
      const errorType = String(event.error).toLowerCase();
      
      // "aborted" error is often not a real error - it happens when recognition is stopped
      // before it fully starts, or when restarting quickly. Never show this as an error.
      if (errorType === "aborted" || errorType.includes("aborted")) {
        // Silently handle aborted errors - just reset state
        setIsListening(false);
        isStartingRef.current = false;
        setError(null); // Clear any existing error
        return;
      }
      
      // Also ignore these harmless errors
      if (errorType === "no-speech" || errorType === "audio-capture") {
        setIsListening(false);
        isStartingRef.current = false;
        setError(null); // Clear any existing error
        return;
      }
      
      // For other errors, show them but don't block future attempts
      console.error("Speech recognition error:", event.error);
      setError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
      isStartingRef.current = false;
    });

    recognition.addEventListener("end", () => {
      setIsListening(false);
      isStartingRef.current = false;
    });

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startListening = () => {
    if (!recognitionRef.current) {
      setError("Speech recognition not available");
      return;
    }

    // Prevent multiple simultaneous starts
    if (isStartingRef.current || isListening) {
      return;
    }

    // Stop any existing recognition first
    try {
      recognitionRef.current.stop();
    } catch (e) {
      // Ignore errors when stopping
    }

    // Wait a bit before starting to ensure previous instance is fully stopped
    setTimeout(() => {
      if (!recognitionRef.current || isStartingRef.current) {
        return;
      }

      setTranscript("");
      setError(null); // Clear any previous errors
      isStartingRef.current = true;
      setIsListening(true);
      
      try {
        recognitionRef.current.start();
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        const isAborted = errorMessage.toLowerCase().includes("aborted");
        
        if (isAborted) {
          // "aborted" errors are common when restarting quickly - don't show as error
          // Try again after a short delay
          setTimeout(() => {
            if (recognitionRef.current && !isStartingRef.current) {
              try {
                recognitionRef.current.start();
              } catch (retryErr) {
                const retryMessage = retryErr instanceof Error ? retryErr.message : String(retryErr);
                if (!retryMessage.toLowerCase().includes("aborted")) {
                  console.error("Retry failed:", retryErr);
                  setError("Failed to start speech recognition");
                  setIsListening(false);
                  isStartingRef.current = false;
                } else {
                  // Still aborted on retry - just reset silently
                  setIsListening(false);
                  isStartingRef.current = false;
                  setError(null);
                }
              }
            }
          }, 100);
        } else {
          console.error("Failed to start speech recognition:", err);
          setError("Failed to start speech recognition");
          setIsListening(false);
          isStartingRef.current = false;
        }
      }
    }, 50);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore errors when stopping
      }
    }
    setIsListening(false);
    isStartingRef.current = false;
    // Don't clear transcript here - keep it so it can be sent to input
  };

  const clearTranscript = () => {
    setTranscript("");
  };

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    clearTranscript,
    isSupported,
  };
}


