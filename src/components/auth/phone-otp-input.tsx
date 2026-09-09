"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Smartphone, RotateCcw } from "lucide-react";

export interface PhoneOtpInputProps {
  phone: string;
  onVerify: (token: string) => Promise<void>;
  onResend: () => Promise<void>;
  isVerifying: boolean;
  isResending?: boolean;
}

export function PhoneOtpInput({
  phone,
  onVerify,
  onResend,
  isVerifying,
  isResending = false,
}: PhoneOtpInputProps) {
  const [digits, setDigits] = React.useState<string[]>(["", "", "", "", "", ""]);
  const [cooldown, setCooldown] = React.useState<number>(60);
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  // 60-second cooldown timer
  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleDigitChange = (index: number, value: string) => {
    const cleanVal = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = cleanVal;
    setDigits(newDigits);

    // Auto-focus next input
    if (cleanVal && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const newDigits = ["", "", "", "", "", ""];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);

    const nextFocusIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextFocusIndex]?.focus();
  };

  const otpCode = digits.join("");
  const isComplete = otpCode.length === 6;

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isComplete && !isVerifying) {
      onVerify(otpCode);
    }
  };

  const handleResendClick = async () => {
    if (cooldown > 0 || isResending) return;
    await onResend();
    setCooldown(60);
    setDigits(["", "", "", "", "", ""]);
    inputRefs.current[0]?.focus();
  };

  return (
    <form onSubmit={handleVerifySubmit} className="space-y-4">
      <div className="text-center space-y-1">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-brand-bg-peach text-brand-orange border border-brand-orange-border">
          <Smartphone className="h-5 w-5" />
        </div>
        <h4 className="text-sm font-bold text-brand-text-primary">
          Verify Mobile Number
        </h4>
        <p className="text-xs text-brand-text-muted">
          Enter the 6-digit SMS verification code sent to{" "}
          <span className="font-semibold text-brand-text-primary">{phone}</span>
        </p>
      </div>

      {/* 6-digit OTP Box */}
      <div className="flex justify-center gap-2 sm:gap-2.5 py-2">
        {digits.map((digit, idx) => (
          <input
            key={idx}
            ref={(el) => {
              inputRefs.current[idx] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleDigitChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            onPaste={handlePaste}
            disabled={isVerifying}
            className="h-12 w-10 sm:w-11 text-center text-lg font-bold text-brand-text-primary bg-brand-surface border border-brand-border rounded-xl focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 outline-none transition-all shadow-sm"
          />
        ))}
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 pt-1">
        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full justify-center"
          disabled={!isComplete || isVerifying}
        >
          {isVerifying ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Verifying Code...
            </>
          ) : (
            "Verify Mobile OTP"
          )}
        </Button>

        <div className="flex items-center justify-between text-xs px-1 text-brand-text-muted">
          <span>Didn&apos;t receive code?</span>
          {cooldown > 0 ? (
            <span className="font-semibold text-brand-text-muted">
              Resend in {cooldown}s
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResendClick}
              disabled={isResending}
              className="font-bold text-brand-orange hover:underline focus:outline-none flex items-center gap-1"
            >
              {isResending ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <RotateCcw className="h-3 w-3" />
                  Resend SMS
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
