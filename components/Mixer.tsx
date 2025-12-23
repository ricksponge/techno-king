
import React from 'react';

interface MixerProps {
  crossfader: number;
  onCrossfaderChange: (val: number) => void;
  leftEQ: { low: number; mid: number; high: number };
  rightEQ: { low: number; mid: number; high: number };
  onEQChange: (side: 'left' | 'right', param: 'low' | 'mid' | 'high', val: number) => void;
  vuLevels: { left: number; right: number };
}

const Mixer: React.FC<MixerProps> = ({ 
  crossfader, onCrossfaderChange, leftEQ, rightEQ, onEQChange, vuLevels 
}) => {
  const Knob = ({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) => (
    <div className="flex flex-col items-center group">
      <div className="relative w-10 h-10 bg-zinc-900 rounded-full border-2 border-zinc-700 cursor-pointer flex items-center justify-center shadow-inner overflow-hidden"
           onClick={() => onChange(0)}>
        <div className="absolute w-1 h-full bg-zinc-600 origin-center" style={{ transform: `rotate(${value * 6}deg)` }}></div>
        <div className="absolute w-1.5 h-1.5 bg-zinc-400 rounded-full"></div>
      </div>
      <label className="text-[8px] font-bold text-zinc-500 mt-1 uppercase tracking-tighter">{label}</label>
      <input 
        type="range" min="-20" max="20" step="1" value={value} 
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-12 h-1 mt-1 accent-zinc-600 opacity-50 hover:opacity-100 transition-opacity"
      />
    </div>
  );

  const VUMeter = ({ level, label }: { level: number, label: string }) => {
    const segments = 12;
    const activeSegments = Math.min(segments, Math.floor(level * segments * 1.5));
    
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="text-[8px] font-bold text-zinc-600 mb-1">{label}</div>
        <div className="flex flex-col-reverse gap-0.5 bg-black p-1 rounded-sm border border-zinc-800">
          {[...Array(segments)].map((_, i) => {
            let color = 'bg-green-600';
            if (i >= 8) color = 'bg-yellow-400';
            if (i >= 10) color = 'bg-red-500';
            
            return (
              <div key={i} className={`w-3 h-2 rounded-sm transition-all duration-75 ${i < activeSegments ? `${color} shadow-[0_0_5px_currentColor]` : 'bg-zinc-900'}`}></div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center bg-zinc-800 p-6 rounded-xl border-4 border-zinc-700 shadow-2xl w-full max-w-sm">
      <div className="text-[10px] font-bold text-zinc-500 pixel-font mb-6 tracking-widest">MASTER_MIXER_9000</div>
      
      <div className="flex justify-between w-full gap-4">
        {/* Left EQs */}
        <div className="flex flex-col gap-3">
          <Knob label="High" value={leftEQ.high} onChange={(v) => onEQChange('left', 'high', v)} />
          <Knob label="Mid" value={leftEQ.mid} onChange={(v) => onEQChange('left', 'mid', v)} />
          <Knob label="Low" value={leftEQ.low} onChange={(v) => onEQChange('left', 'low', v)} />
        </div>

        {/* Center Meters */}
        <div className="flex gap-4 items-center px-4 py-2 bg-zinc-900/50 rounded-lg border border-zinc-700 shadow-inner">
            <VUMeter level={vuLevels.left} label="L" />
            <div className="w-[1px] h-32 bg-zinc-800"></div>
            <VUMeter level={vuLevels.right} label="R" />
        </div>

        {/* Right EQs */}
        <div className="flex flex-col gap-3">
          <Knob label="High" value={rightEQ.high} onChange={(v) => onEQChange('right', 'high', v)} />
          <Knob label="Mid" value={rightEQ.mid} onChange={(v) => onEQChange('right', 'mid', v)} />
          <Knob label="Low" value={rightEQ.low} onChange={(v) => onEQChange('right', 'low', v)} />
        </div>
      </div>

      {/* Crossfader */}
      <div className="mt-10 w-full flex flex-col items-center">
        <div className="w-full h-10 bg-black rounded-sm relative border-2 border-zinc-700 flex items-center px-2 shadow-inner">
          <div className="absolute left-1/2 -translate-x-1/2 h-full w-[2px] bg-zinc-800"></div>
          <input 
            type="range" 
            min="-100" 
            max="100" 
            value={crossfader} 
            onChange={(e) => onCrossfaderChange(parseInt(e.target.value))}
            className="w-full h-8 bg-transparent accent-white z-10 appearance-none cursor-pointer"
          />
        </div>
        <div className="flex justify-between w-full mt-2 text-[8px] font-bold text-zinc-500 px-1 uppercase italic tracking-tighter">
          <span>Deck A</span>
          <span className="text-zinc-600">Crossfade</span>
          <span>Deck B</span>
        </div>
      </div>
    </div>
  );
};

export default Mixer;
