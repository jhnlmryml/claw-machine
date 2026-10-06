'use client';

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import Phaser from 'phaser';
import { ClawScene } from '@/game/scenes/ClawScene';
import { ClawSceneCallbacks } from '@/game/types';

export interface PhaserCanvasHandle {
  moveLeft: () => void;
  moveRight: () => void;
  stopMoving: () => void;
  drop: () => boolean;
  resetToys: () => void;
}

interface PhaserCanvasProps {
  callbacks: ClawSceneCallbacks;
}

const PhaserCanvas = forwardRef<PhaserCanvasHandle, PhaserCanvasProps>(
  ({ callbacks }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const gameRef = useRef<Phaser.Game | null>(null);
    const sceneRef = useRef<ClawScene | null>(null);

    // Expose control methods to parent component
    useImperativeHandle(ref, () => ({
      moveLeft: () => {
        sceneRef.current?.moveClawLeft();
      },
      moveRight: () => {
        sceneRef.current?.moveClawRight();
      },
      stopMoving: () => {
        sceneRef.current?.stopClaw();
      },
      drop: () => {
        return sceneRef.current?.triggerDrop() ?? false;
      },
      resetToys: () => {
        sceneRef.current?.resetToys();
      },
    }));

    // Update scene callbacks whenever they change
    useEffect(() => {
      if (sceneRef.current) {
        sceneRef.current.setCallbacks(callbacks);
      }
    }, [callbacks]);

    // Initialize Phaser lifecycle
    useEffect(() => {
      if (!containerRef.current) return;

      const scene = new ClawScene();
      sceneRef.current = scene;

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: 800,
        height: 600,
        backgroundColor: '#0d0a21',
        transparent: false,
        pixelArt: false,
        roundPixels: true,
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: 800,
          height: 600,
        },
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { x: 0, y: 0 },
            debug: false,
          },
        },
        scene: [scene],
        callbacks: {
          postBoot: () => {
            scene.setCallbacks(callbacks);
          },
        },
      };

      const game = new Phaser.Game(config);
      gameRef.current = game;

      // Handle window and container resize smoothly
      const resizeObserver = new ResizeObserver(() => {
        if (gameRef.current && gameRef.current.scale) {
          gameRef.current.scale.refresh();
        }
      });
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }

      // Clean up Phaser game instance on unmount
      return () => {
        resizeObserver.disconnect();
        if (gameRef.current) {
          gameRef.current.destroy(true);
          gameRef.current = null;
        }
        sceneRef.current = null;
      };
    }, []);

    return (
      <div 
        ref={containerRef}
        id="claw-phaser-container"
        className="w-full h-full relative flex items-center justify-center overflow-hidden rounded-2xl select-none"
        style={{ touchAction: 'none' }}
      />
    );
  }
);

PhaserCanvas.displayName = 'PhaserCanvas';

export default PhaserCanvas;
