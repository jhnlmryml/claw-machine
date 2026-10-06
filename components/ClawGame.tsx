'use client';

import React, { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  ArrowRight,
  Volume2,
  VolumeX,
  Sparkles,
  RefreshCw,
  Trophy,
  Gamepad2,
  CheckCircle2,
  X,
  HelpCircle,
  Star,
  ChevronDown
} from 'lucide-react';
import { ClawState, PrizeItem, ClawSceneCallbacks } from '@/game/types';
import { sounds } from '@/utils/audio';
import type { PhaserCanvasHandle } from './PhaserCanvas';

// Dynamic import with SSR: false to prevent window/canvas errors on server
const DynamicPhaserCanvas = dynamic(() => import('./PhaserCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#0d0a21] text-slate-200 p-6">
      <div className="relative mb-4">
        <div className="w-16 h-16 rounded-full border-4 border-indigo-500/30 border-t-cyan-400 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Gamepad2 className="w-7 h-7 text-cyan-400 animate-pulse" />
        </div>
      </div>
      <h3 className="text-lg font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-400 to-amber-300">
        STARTING CLAW CRANE...
      </h3>
      <p className="text-xs text-slate-400 mt-1">
        Getting ready for fun!
      </p>
    </div>
  ),
});

export default function ClawGame() {
  // Game State (Unlimited free plays - no coins needed!)
  const [tickets, setTickets] = useState<number>(0);
  const [clawState, setClawState] = useState<ClawState>('IDLE');
  const [statusMessage, setStatusMessage] = useState<string>('Aim with arrows & press DROP!');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [prizesWon, setPrizesWon] = useState<PrizeItem[]>([]);
  const [activeWonPrize, setActiveWonPrize] = useState<PrizeItem | null>(null);
  const [showPrizeVault, setShowPrizeVault] = useState<boolean>(false);
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(false);

  // Canvas ref for imperative controls
  const canvasRef = useRef<PhaserCanvasHandle>(null);

  // Sync mute state on mount
  useEffect(() => {
    setIsMuted(sounds.isMuted());
  }, []);

  // Audio mute toggle
  const handleToggleMute = () => {
    const next = sounds.toggleMute();
    setIsMuted(next);
  };

  // Scene Callbacks
  const callbacks = useRef<ClawSceneCallbacks>({
    onStateChange: (state, message) => {
      setClawState(state);

      // Friendly status messages with emojis
      let friendlyMessage = message;
      if (state === 'IDLE') {
        friendlyMessage = '🕹️ Aim over a plushie and press DROP!';
      } else if (state === 'MOVING_LEFT' || state === 'MOVING_RIGHT') {
        friendlyMessage = '🎯 Lining up the claw...';
      } else if (state === 'DESCENDING') {
        friendlyMessage = '⬇️ Claw is going down!';
      } else if (state === 'GRABBING') {
        friendlyMessage = '🦀 Clamping the cute plushie!';
      } else if (state === 'ASCENDING') {
        friendlyMessage = message.includes('slipped')
          ? '💨 Oops! The claw grip slipped!'
          : '⬆️ Lifting up... hold tight!';
      } else if (state === 'RETURNING') {
        friendlyMessage = '🎉 Moving to the prize chute!';
      } else if (state === 'DROPPING') {
        friendlyMessage = '🎁 Opening claw & delivering prize!';
      }

      setStatusMessage(friendlyMessage);
    },
    onPrizeWon: (prize) => {
      sounds.playWinFanfare();

      // Confetti Celebration
      try {
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.55 },
          colors: ['#06b6d4', '#3b82f6', '#ec4899', '#f59e0b', '#10b981'],
        });
      } catch {
        // fallback if confetti fails
      }

      setTickets((prev) => prev + prize.score);
      setPrizesWon((prev) => [prize, ...prev]);
      setActiveWonPrize(prize);
    },
    onClawMiss: () => {
      sounds.playMiss();
    },
    onClawSlip: () => {
      sounds.playSlip();
    },
    onClawMove: () => {
      sounds.playClawMove();
    },
    onClawDrop: () => {
      sounds.playClawDrop();
    },
    onClawGrab: () => {
      sounds.playClawGrab();
    },
    onClawRise: () => {
      sounds.playClawRise();
    },
  }).current;

  // Control Actions
  const handleMoveLeftStart = () => {
    if (clawState === 'IDLE' || clawState === 'MOVING_LEFT' || clawState === 'MOVING_RIGHT') {
      canvasRef.current?.moveLeft();
    }
  };

  const handleMoveRightStart = () => {
    if (clawState === 'IDLE' || clawState === 'MOVING_LEFT' || clawState === 'MOVING_RIGHT') {
      canvasRef.current?.moveRight();
    }
  };

  const handleMoveStop = () => {
    canvasRef.current?.stopMoving();
  };

  const handleDropClaw = () => {
    if (clawState !== 'IDLE' && clawState !== 'MOVING_LEFT' && clawState !== 'MOVING_RIGHT') {
      return;
    }

    // Unlimited free plays
    canvasRef.current?.drop();
  };

  const handleResetToys = () => {
    sounds.playButtonClick();
    canvasRef.current?.resetToys();
  };

  const isBusy = clawState !== 'IDLE' && clawState !== 'MOVING_LEFT' && clawState !== 'MOVING_RIGHT';

  return (
    <div className="w-full h-full flex flex-col justify-between overflow-hidden relative">
      {/* 1. COMPACT TOP HEADER BAR (Clean, cheerful, no coins) */}
      <header className="flex-none w-full px-2 sm:px-4 py-2 bg-slate-900/90 border-b border-indigo-500/30 flex items-center justify-between gap-2 z-20">
        {/* Logo Title */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-500 to-cyan-400 p-0.5 shadow-md flex items-center justify-center">
            <div className="w-full h-full bg-[#0d0a21] rounded-[14px] flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 text-pink-400 animate-pulse" />
            </div>
          </div>
          <div>
            <h1 className="text-sm sm:text-lg font-black tracking-tight text-white leading-tight flex items-center gap-1.5">
              <span>CUTE CLAW CRANE</span>
              <span className="text-xs text-yellow-300">⚽</span>
            </h1>
            <p className="text-[10px] text-cyan-300 font-bold hidden sm:block">
              Soccer Plushie Edition • Free Play
            </p>
          </div>
        </div>

        {/* Center Status Banner (Outside canvas, zero overlay!) */}
        <div className="hidden md:flex items-center gap-2 px-3.5 py-1 bg-slate-950/80 rounded-full border border-indigo-500/40 text-xs font-bold text-slate-200 shadow-inner">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{statusMessage}</span>
        </div>

        {/* Right Badges & Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
          {/* Tickets Score */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700/60 px-3 py-1 rounded-full text-slate-200 text-xs font-bold shadow-sm">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="text-amber-400 font-mono font-black">{tickets} PTS</span>
          </div>

          {/* Prize Shelf Drawer Button */}
          <button
            onClick={() => setShowPrizeVault(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/50 text-pink-300 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
            title="Open Prize Shelf"
          >
            <Trophy className="w-3.5 h-3.5 text-pink-400" />
            <span>Prizes:</span>
            <span className="bg-pink-500 text-white px-1.5 py-0.2 rounded-full font-mono text-[10px]">
              {prizesWon.length}
            </span>
          </button>

          {/* Shuffle Toys Button */}
          <button
            onClick={handleResetToys}
            className="p-1.5 sm:p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full transition-colors border border-slate-700 cursor-pointer"
            title="Shuffle plushies in the pit"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Sound Toggle */}
          <button
            onClick={handleToggleMute}
            className="p-1.5 sm:p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full transition-colors border border-slate-700 cursor-pointer"
            title={isMuted ? 'Turn Sound On' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* Help Button */}
          <button
            onClick={() => setShowHowToPlay(true)}
            className="p-1.5 sm:p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full transition-colors border border-slate-700 cursor-pointer"
            title="How to play"
          >
            <HelpCircle className="w-4 h-4 text-indigo-300" />
          </button>
        </div>
      </header>

      {/* 2. CENTRAL PHASER GAME CANVAS (Full Height, Unobstructed Crystal Clear View) */}
      <main className="flex-1 min-h-0 w-full flex items-center justify-center p-1 sm:p-2.5 relative">
        <div className="w-full h-full max-w-5xl relative rounded-2xl sm:rounded-3xl border-3 sm:border-4 border-indigo-500/50 shadow-[0_0_30px_rgba(79,70,229,0.2)] bg-[#0d0a21] overflow-hidden flex items-center justify-center">
          {/* Phaser Canvas renders here without any overlays */}
          <DynamicPhaserCanvas
            ref={canvasRef}
            callbacks={callbacks}
          />
        </div>
      </main>

      {/* 3. KID-FRIENDLY BOTTOM CONTROL DECK */}
      <footer className="flex-none w-full max-w-5xl mx-auto px-2 sm:px-4 py-2 sm:py-3 bg-slate-900/95 border-t border-indigo-600/40 sm:border sm:rounded-2xl shadow-xl z-20">
        {/* Mobile / Compact Status Bar */}
        <div className="flex md:hidden items-center justify-center py-1 mb-1.5 bg-slate-950/70 rounded-lg text-xs font-bold text-slate-300">
          <span>{statusMessage}</span>
        </div>

        <div className="flex items-center justify-between gap-2 sm:gap-4 max-w-3xl mx-auto">
          {/* Left: Directional Buttons */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1">
            <button
              onPointerDown={handleMoveLeftStart}
              onPointerUp={handleMoveStop}
              onPointerLeave={handleMoveStop}
              disabled={isBusy}
              className="flex-1 group flex flex-col items-center justify-center h-14 sm:h-18 bg-gradient-to-b from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:from-blue-700 active:to-blue-800 disabled:opacity-35 disabled:cursor-not-allowed text-white font-black rounded-2xl border-b-4 border-blue-900 shadow-md active:border-b-0 active:translate-y-1 transition-all select-none cursor-pointer"
              aria-label="Move Claw Left"
            >
              <ArrowLeft className="w-6 h-6 sm:w-8 sm:h-8 group-hover:-translate-x-1 transition-transform" />
              <span className="text-[10px] sm:text-xs font-black tracking-wider uppercase">LEFT</span>
            </button>
            {/* Center: Extra-Large Vibrant DROP Action Button */}
            <div className="flex-1 max-w-[220px]">
              <button
                onClick={handleDropClaw}
                disabled={isBusy}
                className={`w-full h-14 sm:h-18 rounded-2xl sm:rounded-3xl font-black text-white shadow-xl transition-all select-none cursor-pointer flex flex-col items-center justify-center ${isBusy
                  ? 'bg-slate-800 opacity-50 cursor-not-allowed border-b-4 border-slate-900'
                  : 'bg-gradient-to-b from-rose-500 via-pink-600 to-rose-600 hover:from-rose-400 hover:to-rose-500 active:translate-y-1 active:border-b-0 border-b-4 border-rose-900 shadow-[0_0_25px_rgba(244,63,94,0.45)]'
                  }`}
              >
                <div className="flex items-center gap-1.5">
                  <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 animate-bounce" />
                  <span className="text-lg sm:text-2xl font-black tracking-wider">DROP!</span>
                </div>
                <span className="text-[9px] sm:text-[10px] font-mono tracking-wider text-rose-100 uppercase opacity-90">
                  SPACEBAR / TAP
                </span>
              </button>
            </div>
            <button
              onPointerDown={handleMoveRightStart}
              onPointerUp={handleMoveStop}
              onPointerLeave={handleMoveStop}
              disabled={isBusy}
              className="flex-1 group flex flex-col items-center justify-center h-14 sm:h-18 bg-gradient-to-b from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:from-blue-700 active:to-blue-800 disabled:opacity-35 disabled:cursor-not-allowed text-white font-black rounded-2xl border-b-4 border-blue-900 shadow-md active:border-b-0 active:translate-y-1 transition-all select-none cursor-pointer"
              aria-label="Move Claw Right"
            >
              <ArrowRight className="w-6 h-6 sm:w-8 sm:h-8 group-hover:translate-x-1 transition-transform" />
              <span className="text-[10px] sm:text-xs font-black tracking-wider uppercase">RIGHT</span>
            </button>
          </div>



          {/* Right: Prize Shelf & Quick Action */}
          {/* <div className="flex items-center justify-end flex-1">
            <button
              onClick={() => setShowPrizeVault(true)}
              className="flex flex-col sm:flex-row items-center justify-center gap-1.5 px-3 sm:px-4 h-14 sm:h-18 rounded-2xl bg-gradient-to-b from-purple-600 to-indigo-800 hover:from-purple-500 hover:to-indigo-700 text-white font-black border-b-4 border-indigo-950 shadow-md active:translate-y-1 active:border-b-0 transition-all cursor-pointer"
            >
              <Trophy className="w-5 h-5 text-amber-300" />
              <div className="text-center sm:text-left">
                <span className="text-[10px] sm:text-xs block leading-tight">MY TOYS</span>
                <span className="text-[9px] text-pink-200 block font-normal">{prizesWon.length} Won</span>
              </div>
            </button>
          </div> */}
        </div>
      </footer>

      {/* 4. CELEBRATORY PRIZE WON VICTORY MODAL */}
      {activeWonPrize && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm sm:max-w-md bg-gradient-to-b from-indigo-900 via-slate-900 to-slate-950 rounded-3xl p-6 border-3 border-pink-500/70 shadow-[0_0_50px_rgba(236,72,153,0.4)] text-center">
            {/* Close */}
            <button
              onClick={() => setActiveWonPrize(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-300 text-xs font-black uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4 text-pink-400 animate-spin" />
              <span>YAY! YOU WON A PRIZE!</span>
            </div>

            {/* Soccer Plushie Bouncing Character */}
            <div className="relative w-36 h-36 mx-auto my-2 flex items-center justify-center">
              <div className="absolute inset-0 bg-pink-500/20 rounded-full blur-xl animate-pulse" />
              <div className="relative w-32 h-32 bg-slate-800/80 rounded-2xl p-2 border border-pink-400/50 shadow-lg flex items-center justify-center">
                <Image
                  src={activeWonPrize.image}
                  alt={activeWonPrize.name}
                  width={120}
                  height={120}
                  className="object-contain animate-bounce"
                  priority
                />
              </div>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-white">
              {activeWonPrize.name}
            </h3>
            <p className="text-xs sm:text-sm text-pink-200 mt-1">
              You held on tight and delivered it to the chute!
            </p>

            <div className="mt-3 py-1.5 px-3 bg-pink-950/40 border border-pink-500/30 rounded-xl inline-flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-amber-300 font-black text-base">+{activeWonPrize.score} Tickets</span>
            </div>

            <div className="mt-5">
              <button
                onClick={() => setActiveWonPrize(null)}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl shadow-lg shadow-emerald-500/25 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Keep Playing! 🎈</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. PRIZE VAULT / TROPHY CASE MODAL */}
      {showPrizeVault && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-indigo-500/50 rounded-3xl p-5 sm:p-6 text-slate-200 shadow-2xl flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-indigo-900/60 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-6 h-6 text-amber-400" />
                <h3 className="text-lg sm:text-xl font-black text-white">
                  My Plushie Collection ({prizesWon.length})
                </h3>
              </div>
              <button
                onClick={() => setShowPrizeVault(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Collection Grid */}
            <div className="flex-1 overflow-y-auto pr-1">
              {prizesWon.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center justify-center">
                  <div className="w-20 h-20 bg-slate-800/60 rounded-full flex items-center justify-center mb-3">
                    <Trophy className="w-10 h-10 text-slate-600" />
                  </div>
                  <h4 className="text-base font-bold text-slate-300">Your Prize Shelf is Empty!</h4>
                  <p className="text-xs text-slate-400 max-w-xs mt-1">
                    Aim the claw over a soccer plushie and press <strong>DROP</strong> to win your first toy!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {prizesWon.map((prize, idx) => (
                    <div
                      key={`${prize.id}-${idx}`}
                      className="bg-slate-950/80 border border-indigo-800/40 rounded-2xl p-3 flex flex-col items-center text-center shadow-md hover:border-pink-500/50 transition-all"
                    >
                      <div className="relative w-20 h-20 my-1 flex items-center justify-center">
                        <Image
                          src={prize.image}
                          alt={prize.name}
                          width={76}
                          height={76}
                          className="object-contain"
                        />
                      </div>
                      <h5 className="font-bold text-xs text-white truncate max-w-full">
                        {prize.name}
                      </h5>
                      <span className="text-[10px] text-amber-400 font-bold mt-0.5">
                        ⭐ +{prize.score} PTS
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-indigo-900/60 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-bold">
                Total Score: <span className="text-amber-400">{tickets} PTS</span>
              </span>
              <button
                onClick={() => setShowPrizeVault(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Back to Game
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. HOW TO PLAY / HELP MODAL */}
      {showHowToPlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-slate-900 border-2 border-indigo-500/50 rounded-3xl p-5 sm:p-6 text-slate-200 shadow-2xl">
            <button
              onClick={() => setShowHowToPlay(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-white flex items-center gap-2 mb-3">
              <Gamepad2 className="w-5 h-5 text-cyan-400" />
              How to Play
            </h3>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-2.5 bg-slate-800/70 rounded-xl border border-slate-700/60">
                <h4 className="font-black text-cyan-300 mb-0.5">1. Move & Aim</h4>
                <p>
                  Press the <strong>LEFT</strong> and <strong>RIGHT</strong> buttons, keyboard arrows (← / →), or tap anywhere on the screen. Follow the aiming laser to center the claw over a soccer plushie!
                </p>
              </div>

              <div className="p-2.5 bg-slate-800/70 rounded-xl border border-slate-700/60">
                <h4 className="font-black text-pink-300 mb-0.5">2. Press DROP!</h4>
                <p>
                  Tap the big pink <strong>DROP!</strong> button or press <strong>SPACEBAR</strong>. The claw will lower down, close its grips around the plushie, and hoist it up!
                </p>
              </div>

              <div className="p-2.5 bg-slate-800/70 rounded-xl border border-slate-700/60">
                <h4 className="font-black text-emerald-300 mb-0.5">3. Realistic Grip</h4>
                <p>
                  Just like a real arcade machine, the claw might loosen its grip on the way up! If it holds tight, it glides to the chute, opens wide, and drops your prize!
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowHowToPlay(false)}
              className="mt-4 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl text-xs transition-colors cursor-pointer"
            >
              Got it, let's play! 🎈
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
