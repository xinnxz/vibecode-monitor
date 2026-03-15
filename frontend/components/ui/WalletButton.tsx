"use client";

// components/ui/WalletButton.tsx
// ============================================================
// Tombol connect/disconnect wallet dengan desain floating pill.
// ============================================================

import { useState, useEffect, useRef } from "react";
import { useWallet } from "@/hooks/useWallet";
import { motion } from "framer-motion";

const HEX = "0123456789abcdef";

function SciFiButtonCore({ 
  label, 
  icon, 
  onClick, 
  baseColor = "purple", // 'purple' | 'emerald' | 'yellow'
  disabled = false,
  isConnecting = false,
  showDot = false,
  rightNode = null
}: any) {
  const [displayText, setDisplayText] = useState(label);
  const [isHovered, setIsHovered] = useState(false);
  const rafRef = useRef<number>(0);

  // Sync prop changes
  useEffect(() => {
    if (!isHovered) setDisplayText(label);
  }, [label, isHovered]);

  const triggerHoverEffect = () => {
    if (disabled) return;
    setIsHovered(true);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const target = label;
    const duration = 250; 
    const start = performance.now();

    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const lockedLength = Math.floor(p * target.length);

      let result = "";
      for (let i = 0; i < target.length; i++) {
        result += i < lockedLength ? target[i] : HEX[Math.floor(Math.random() * 16)];
      }

      setDisplayText(result);

      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplayText(target);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  };

  const handleMouseLeave = () => {
    if (disabled) return;
    setIsHovered(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setDisplayText(label);
  };

  const colors = {
    purple: { text: "text-purple-300", accent: "border-purple-500", glow: "bg-purple-500/10", shadow: "drop-shadow-[0_0_8px_#a855f7]" },
    emerald: { text: "text-emerald-300", accent: "border-emerald-500", glow: "bg-emerald-500/10", shadow: "drop-shadow-[0_0_8px_#10b981]" },
    yellow: { text: "text-yellow-300", accent: "border-yellow-500", glow: "bg-yellow-500/10", shadow: "drop-shadow-[0_0_8px_#eab308]" },
    gray: { text: "text-white/40", accent: "border-white/10", glow: "bg-white/5", shadow: "" }
  };

  const c = disabled ? colors.gray : colors[baseColor as keyof typeof colors];

  return (
    <div className="flex items-center">
      <motion.button
        onMouseEnter={triggerHoverEffect}
        onMouseLeave={handleMouseLeave}
        onClick={disabled ? undefined : onClick}
        whileTap={disabled ? undefined : { scale: 0.98 }}
        className={`relative group flex items-center justify-center isolate cursor-pointer ${disabled ? "cursor-not-allowed" : ""}`}
        style={{ 
          padding: "12px 24px", 
          minWidth: "160px",
          // The magic cut-out polygon for Cyberpunk aesthetics : [ /¯¯¯\ ]
          clipPath: "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)",
        }}
      >
        {/* Glow backdrop layer (placed behind to shine through the clip-path) */}
        {!disabled && (
          <div 
            className={`absolute inset-0 ${c.accent.replace('border-', 'bg-')} z-0 transition-opacity duration-300`} 
            style={{ opacity: isHovered ? 0.3 : 0 }} 
          />
        )}

        {/* Outer glowing border loop mapped exactly to the clip-path */}
        <div 
          className="absolute inset-0 z-0 bg-black/60 backdrop-blur-md" 
          style={{
            // Creating a border effect by using a slightly smaller clip-path inside a solid background
            clipPath: "polygon(12px 1px, calc(100% - 1px) 1px, calc(100% - 1px) calc(100% - 12px), calc(100% - 12px) calc(100% - 1px), 1px calc(100% - 1px), 1px 12px)",
          }}
        />

        {/* Dynamic Inner Stroke (replaces the brackets) */}
        <motion.div
           initial={false}
           animate={{ opacity: isHovered && !disabled ? 1 : 0.5 }}
           className={`absolute inset-0 border-[1px] ${c.accent}`}
           style={{
             clipPath: "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)",
             pointerEvents: "none",
             // Hack to render the clipped border stroke correctly
             background: `linear-gradient(to right, ${c.accent.replace("border-", "var(--tw-")}, transparent)`,
             WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
             WebkitMaskComposite: "xor",
             padding: "1px",
           }}
        />

        {/* Angled Accent (Top Left) */}
        <motion.div 
          initial={false}
          animate={{ opacity: isHovered && !disabled ? 1 : 0.3 }}
          className={`absolute top-0 left-0 w-3 h-1 ${c.accent.replace('border-', 'bg-')} z-10`}
        />
        {/* Angled Accent (Bottom Right) */}
        <motion.div 
          initial={false}
          animate={{ opacity: isHovered && !disabled ? 1 : 0.3 }}
          className={`absolute bottom-0 right-0 w-3 h-1 ${c.accent.replace('border-', 'bg-')} z-10`}
        />

        {/* Content */}
        <div className="flex items-center gap-3 relative z-10">
          {showDot && (
            <div className="relative flex items-center justify-center">
              <span className={`w-1.5 h-1.5 rounded-full ${c.accent.replace('border-', 'bg-')} ${c.shadow}`} />
              {!disabled && <span className={`absolute inset-0 w-1.5 h-1.5 rounded-full ${c.accent.replace('border-', 'bg-')} animate-ping opacity-60`} />}
            </div>
          )}
          {icon && <span className={`${c.text} opacity-80 group-hover:opacity-100 transition-opacity`}>{icon}</span>}
          <span
            className={`font-mono text-[12px] tracking-[0.15em] uppercase transition-colors duration-300 ${
              isHovered && !disabled ? `text-white font-bold ${c.shadow}` : c.text
            }`}
          >
            {displayText}
          </span>
        </div>
      </motion.button>

      {/* Optional attached element (like disconnect button) */}
      {rightNode && (
        <div className="ml-2">
          {rightNode}
        </div>
      )}
    </div>
  );
}

export function WalletButton() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  
  const {
    shortAddress,
    isConnected,
    isConnecting,
    isCorrectChain,
    isSwitching,
    connectWallet,
    disconnectWallet,
    switchToSomnia,
  } = useWallet();

  if (!mounted) {
    return <SciFiButtonCore label="SYNCING..." disabled />;
  }

  if (isConnecting) {
    return <SciFiButtonCore label="CONNECTING..." baseColor="purple" isConnecting showDot />;
  }

  if (isConnected && !isCorrectChain) {
    return (
      <SciFiButtonCore 
        label={isSwitching ? "SWITCHING..." : "WRONG CHAIN"} 
        baseColor="yellow" 
        onClick={switchToSomnia} 
        disabled={isSwitching}
        showDot
      />
    );
  }

  if (isConnected && shortAddress) {
    return (
      <SciFiButtonCore 
        label={shortAddress} 
        baseColor="emerald" 
        showDot
        onClick={() => {}} // Usually copying to clipboard 
        rightNode={
          <motion.button
            whileHover={{ scale: 1.1, backgroundColor: "rgba(239, 68, 68, 0.15)" }}
            whileTap={{ scale: 0.9 }}
            onClick={disconnectWallet}
            className="flex items-center justify-center w-10 h-[40px] border border-white/5 bg-black/40 backdrop-blur-md text-white/40 hover:text-red-400 hover:border-red-500/30 transition-all rounded-[2px]"
            title="Disconnect"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
              <line x1="12" y1="2" x2="12" y2="12"></line>
            </svg>
          </motion.button>
        }
      />
    );
  }

  return (
    <SciFiButtonCore 
      label="CONNECT WALLET" 
      baseColor="purple" 
      onClick={connectWallet}
      icon={
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z"/>
          <circle cx="16" cy="12" r="1"/>
        </svg>
      }
    />
  );
}
