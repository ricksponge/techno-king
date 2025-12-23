
import React, { useState, useRef, useEffect } from 'react';
import { Track } from '../types';

interface TurntableProps {
  side: 'left' | 'right';
  track: Track | null;
  isPlaying: boolean;
  pitch: number;
  onPlay: () => void;
  onStop: () => void;
  onPitchChange: (val: number) => void;
  onScratch: (velocity: number) => void;
}

const Turntable: React.FC<TurntableProps> = ({ 
  side, track, isPlaying, pitch, onPlay, onStop, onPitchChange, onScratch 
}) => {
  const [isScratching, setIsScratching] = useState(false);
  const [rotation, setRotation] = useState(0);
  const lastAngleRef = useRef<number | null>(null);
  const vinylRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animationFrame: number;
    const animate = () => {
      if (isPlaying && !isScratching) {
        setRotation(prev => (prev + (pitch * 5)) % 360);
      }
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying, isScratching, pitch]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isPlaying) return;
    setIsScratching(true);
    lastAngleRef.current = null;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isScratching || !vinylRef.current) return;
    
    const rect = vinylRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    
    if (lastAngleRef.current !== null) {
      let delta = angle - lastAngleRef.current;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      
      setRotation(prev => (prev + delta) % 360);
      // Velocity for scratching effect
      onScratch(delta / 5); 
    }
    lastAngleRef.current = angle;
  };

  const handleMouseUp = () => {
    setIsScratching(false);
    onScratch(0); // Reset to normal pitch
  };

  return (
    <div className={`flex flex-col items-center p-6 bg-zinc-900 border-4 ${track ? (side === 'left' ? 'border-cyan-400' : 'border-pink-500') : 'border-zinc-700'} rounded-xl shadow-2xl relative overflow-hidden select-none`}>
      <div className={`absolute top-2 left-2 text-[10px] font-bold ${side === 'left' ? 'text-cyan-400' : 'text-pink-400'} pixel-font`}>DECK_{side.toUpperCase()}</div>
      
      {/* Vinyl Record */}
      <div className="relative mt-4">
        <div 
          ref={vinylRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`w-48 h-48 sm:w-64 sm:h-64 rounded-full bg-zinc-950 border-8 border-zinc-800 flex items-center justify-center relative cursor-grab active:cursor-grabbing shadow-inner`}
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          {/* Grooves */}
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute rounded-full border border-zinc-900 opacity-40" 
                 style={{ inset: `${(i + 1) * 12}px` }}></div>
          ))}
          
          {/* Label */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex flex-col items-center justify-center text-[8px] text-center font-bold overflow-hidden" 
               style={{ backgroundColor: track?.color || '#333' }}>
            <div className="text-black bg-white/50 px-1 font-mono uppercase tracking-tighter">{track?.artist || 'SELECT'}</div>
            <div className="text-black mt-1 leading-tight uppercase">{track?.name || 'TRACK'}</div>
          </div>
          
          {/* Stylus position marker */}
          <div className="absolute top-4 left-1/2 w-1 h-4 bg-white/20 -translate-x-1/2 rounded-full"></div>
          
          {/* Hole */}
          <div className="absolute w-2 h-2 bg-zinc-600 rounded-full border border-zinc-800 shadow-inner"></div>
        </div>
        
        {/* Tonearm */}
        <div className={`absolute -top-4 -right-4 w-4 h-32 bg-zinc-400 ${isPlaying ? 'rotate-12' : '-rotate-6'} origin-top rounded-full shadow-lg border-2 border-zinc-600 transition-transform duration-500`}>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-6 bg-zinc-500 rounded-sm border border-zinc-700"></div>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-8 grid grid-cols-2 gap-4 w-full">
        <div className="flex flex-col gap-2">
          <button 
            onClick={isPlaying ? onStop : onPlay}
            className={`py-3 px-6 rounded-md font-bold text-lg border-b-4 active:border-b-0 active:translate-y-1 transition-all ${isPlaying ? 'bg-red-600 border-red-800 text-white' : 'bg-green-500 border-green-700 text-black'}`}
          >
            {isPlaying ? 'STOP' : 'PLAY'}
          </button>
          <div className="text-[10px] text-zinc-400 text-center font-bold uppercase mt-1">BPM: {Math.round((track?.bpm || 128) * pitch)}</div>
        </div>

        <div className="flex flex-col items-center">
          <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Pitch Control</label>
          <div className="flex items-center gap-2 h-24">
            <input 
                type="range" 
                min="0.9" 
                max="1.1" 
                step="0.001" 
                value={pitch} 
                onChange={(e) => onPitchChange(parseFloat(e.target.value))}
                className="w-4 h-24 accent-white bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                style={{ appearance: 'slider-vertical', WebkitAppearance: 'slider-vertical' } as any}
            />
            <div className="flex flex-col justify-between h-full text-[8px] font-mono text-zinc-500 py-1">
                <span>+10</span>
                <span>0</span>
                <span>-10</span>
            </div>
          </div>
          <span className={`text-[10px] font-mono mt-1 ${pitch === 1 ? 'text-zinc-500' : 'text-cyan-400'}`}>
            {(pitch > 1 ? '+' : '') + ((pitch - 1) * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default Turntable;
