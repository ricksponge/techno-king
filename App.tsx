
import React, { useState, useEffect, useRef } from 'react';
import { TRACKS, INITIAL_VIBE } from './constants';
import { Track, DeckState, GameState } from './types';
import { AudioDeck } from './services/audioEngine';
import { getDJFeedback } from './services/geminiService';
import Turntable from './components/Turntable';
import Mixer from './components/Mixer';

const App: React.FC = () => {
  const [isAudioInitialized, setIsAudioInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [gameState, setGameState] = useState<GameState>({
    vibe: INITIAL_VIBE,
    score: 0,
    combo: 0,
    message: "BIENVENUE AU RAVE CLUB 1995 !"
  });

  const [leftTrack, setLeftTrack] = useState<Track>(TRACKS[0]);
  const [rightTrack, setRightTrack] = useState<Track>(TRACKS[1]);
  const [isFallbackL, setIsFallbackL] = useState(false);
  const [isFallbackR, setIsFallbackR] = useState(false);

  const [leftDeck, setLeftDeckState] = useState<DeckState>({
    isPlaying: false, volume: 1, pitch: 1, low: 0, mid: 0, high: 0, currentTrack: TRACKS[0], currentTime: 0
  });
  const [rightDeck, setRightDeckState] = useState<DeckState>({
    isPlaying: false, volume: 1, pitch: 1, low: 0, mid: 0, high: 0, currentTrack: TRACKS[1], currentTime: 0
  });

  const [crossfader, setCrossfader] = useState(0); 
  const [vuLevels, setVuLevels] = useState({ left: 0, right: 0 });

  const audioCtxRef = useRef<AudioContext | null>(null);
  const leftAudioRef = useRef<AudioDeck | null>(null);
  const rightAudioRef = useRef<AudioDeck | null>(null);

  const initAudio = async () => {
    if (isAudioInitialized || isLoading) return;
    setIsLoading(true);
    setError(null);
    setGameState(prev => ({ ...prev, message: "CHARGEMENT DES VINYLES..." }));
    
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (ctx.state === 'suspended') await ctx.resume();
      audioCtxRef.current = ctx;
      
      const deckL = new AudioDeck(ctx);
      const deckR = new AudioDeck(ctx);
      
      leftAudioRef.current = deckL;
      rightAudioRef.current = deckR;
      
      await Promise.all([
        deckL.loadTrack(leftTrack.url, leftTrack.id, leftTrack.bpm),
        deckR.loadTrack(rightTrack.url, rightTrack.id, rightTrack.bpm)
      ]);

      setIsFallbackL(deckL.isFallback);
      setIsFallbackR(deckR.isFallback);
      
      setIsAudioInitialized(true);
      const feedback = deckL.isFallback || deckR.isFallback 
        ? "RAVE SÉCURISÉE : MODE SYNTHÉTIQUE ACTIVÉ !" 
        : "FEU VERT ! ENVOIE LE SON !";
      setGameState(prev => ({ ...prev, message: feedback }));
    } catch (err: any) {
      console.error("Initialization Error:", err);
      setError("Erreur fatale. Essayez de recharger la page.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAudioInitialized) return;
    const interval = setInterval(() => {
      setVuLevels({
        left: leftAudioRef.current?.getVolumeLevel() || 0,
        right: rightAudioRef.current?.getVolumeLevel() || 0
      });
    }, 40);
    return () => clearInterval(interval);
  }, [isAudioInitialized]);

  useEffect(() => {
    if (!leftAudioRef.current || !rightAudioRef.current) return;
    
    const leftVol = crossfader <= 0 ? 1 : Math.max(0, 1 - (crossfader / 100));
    const rightVol = crossfader >= 0 ? 1 : Math.max(0, 1 + (crossfader / 100));

    leftAudioRef.current.setVolume(leftVol);
    leftAudioRef.current.setPitch(leftDeck.pitch);
    leftAudioRef.current.setLow(leftDeck.low);
    leftAudioRef.current.setMid(leftDeck.mid);
    leftAudioRef.current.setHigh(leftDeck.high);

    rightAudioRef.current.setVolume(rightVol);
    rightAudioRef.current.setPitch(rightDeck.pitch);
    rightAudioRef.current.setLow(rightDeck.low);
    rightAudioRef.current.setMid(rightDeck.mid);
    rightAudioRef.current.setHigh(rightDeck.high);
  }, [leftDeck, rightDeck, crossfader]);

  useEffect(() => {
    if (!isAudioInitialized) return;
    const checkVibe = setInterval(() => {
      if (leftDeck.isPlaying && rightDeck.isPlaying) {
        const leftBpm = leftTrack.bpm * leftDeck.pitch;
        const rightBpm = rightTrack.bpm * rightDeck.pitch;
        const bpmDiff = Math.abs(leftBpm - rightBpm);
        
        const isMatched = bpmDiff < 0.8;
        const xfadeCenter = Math.abs(crossfader) < 20;

        setGameState(prev => {
          let delta = -0.15;
          let scoreAdd = 0;
          let newCombo = prev.combo;

          if (isMatched && xfadeCenter) {
            delta = 1.8;
            scoreAdd = 25;
            newCombo += 1;
          } else if (isMatched) {
            delta = 0.6;
            scoreAdd = 8;
          }

          return {
            ...prev,
            vibe: Math.max(0, Math.min(100, prev.vibe + delta)),
            score: prev.score + (scoreAdd * (1 + newCombo * 0.1)),
            combo: newCombo
          };
        });
      } else if (!leftDeck.isPlaying && !rightDeck.isPlaying) {
          setGameState(prev => ({ ...prev, vibe: Math.max(0, prev.vibe - 0.4), combo: 0 }));
      }
    }, 1000);
    return () => clearInterval(checkVibe);
  }, [isAudioInitialized, leftDeck.isPlaying, rightDeck.isPlaying, leftDeck.pitch, rightDeck.pitch, crossfader, leftTrack, rightTrack]);

  useEffect(() => {
    if (gameState.score > 0 && Math.floor(gameState.score / 500) > Math.floor((gameState.score - 50) / 500)) {
      getDJFeedback(gameState.vibe, gameState.score, gameState.combo).then(msg => {
        setGameState(prev => ({ ...prev, message: msg }));
      });
    }
  }, [gameState.score]);

  const handleDeckPlay = (side: 'left' | 'right') => {
    const deck = side === 'left' ? leftAudioRef.current : rightAudioRef.current;
    const setDeck = side === 'left' ? setLeftDeckState : setRightDeckState;
    if (deck) {
      deck.play();
      setDeck(prev => ({ ...prev, isPlaying: true }));
    }
  };

  const handleDeckStop = (side: 'left' | 'right') => {
    const deck = side === 'left' ? leftAudioRef.current : rightAudioRef.current;
    const setDeck = side === 'left' ? setLeftDeckState : setRightDeckState;
    if (deck) {
      deck.stop();
      setDeck(prev => ({ ...prev, isPlaying: false }));
    }
  };

  const handleScratch = (side: 'left' | 'right', velocity: number) => {
    const deck = side === 'left' ? leftAudioRef.current : rightAudioRef.current;
    const currentPitch = side === 'left' ? leftDeck.pitch : rightDeck.pitch;
    if (deck) {
      if (velocity !== 0) {
        deck.setPitch(1.0 + velocity, true);
      } else {
        deck.setPitch(currentPitch);
      }
    }
  };

  const changeTrack = async (side: 'left' | 'right', track: Track) => {
    setGameState(prev => ({ ...prev, message: `CHANGEMENT : ${track.name.toUpperCase()}...` }));
    const deck = side === 'left' ? leftAudioRef.current : rightAudioRef.current;
    if (!deck) return;

    try {
        deck.stop();
        if (side === 'left') {
            setLeftDeckState(prev => ({ ...prev, isPlaying: false }));
            setLeftTrack(track);
        } else {
            setRightDeckState(prev => ({ ...prev, isPlaying: false }));
            setRightTrack(track);
        }
        await deck.loadTrack(track.url, track.id, track.bpm);
        if (side === 'left') setIsFallbackL(deck.isFallback);
        else setIsFallbackR(deck.isFallback);
        setGameState(prev => ({ ...prev, message: "VINYLE PRÊT !" }));
    } catch (e) {
        setGameState(prev => ({ ...prev, message: "ERREUR CHARGEMENT !" }));
    }
  };

  if (!isAudioInitialized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black p-6 text-center">
        <div className="relative mb-16">
            <h1 className="text-6xl sm:text-9xl font-bold pixel-font text-cyan-400 neon-text-green animate-pulse tracking-tighter">TECHNO KING</h1>
            <div className="absolute -top-6 -right-8 bg-pink-500 text-black px-4 py-1 -rotate-12 pixel-font text-sm font-bold shadow-xl border-2 border-white">BUNKER_EDITION</div>
        </div>
        
        <div className="max-w-md w-full bg-zinc-900 p-10 border-4 border-cyan-400 rounded-none shadow-[15px_15px_0px_rgba(236,72,153,1)]">
          <p className="retro-font text-3xl text-white mb-8 leading-tight">"Le streaming déconne ? Pas de stress, le bunker a son propre générateur de basses."</p>
          
          {error && <p className="text-red-500 font-mono text-sm mb-4 bg-red-900/20 p-2 border border-red-500/50">{error}</p>}
          
          <button 
            disabled={isLoading}
            onClick={initAudio}
            className={`w-full py-6 px-8 ${isLoading ? 'bg-zinc-800 text-zinc-600' : 'bg-white hover:bg-cyan-400 text-black'} font-bold text-3xl pixel-font transition-all transform active:translate-x-1 active:translate-y-1 flex items-center justify-center gap-6 border-4 border-black`}
          >
            {isLoading ? (
                <>
                    <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
                    READYING...
                </>
            ) : "ENTRER DANS LE CLUB"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-4 lg:p-8 flex flex-col gap-8 select-none">
      {/* Header Dashboard */}
      <div className="flex flex-col md:flex-row gap-8 justify-between items-stretch bg-zinc-900 p-8 border-4 border-zinc-800 shadow-[8px_8px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-col justify-center">
            <h1 className="text-5xl font-black pixel-font text-white leading-none tracking-tighter italic uppercase">TECHNO KING</h1>
            <div className="text-xs text-cyan-400 font-bold mt-2 tracking-[0.2em] flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                SYSTEM STATUS: ACTIVE
            </div>
        </div>
        
        <div className="flex-1 flex flex-col justify-center max-w-lg">
            <div className="flex justify-between w-full mb-2 text-xs font-bold text-zinc-400 uppercase pixel-font">
                <span>AMBIANCE</span>
                <span className={gameState.vibe > 70 ? 'text-green-400' : gameState.vibe < 30 ? 'text-red-500 animate-pulse' : 'text-yellow-400'}>
                    {Math.floor(gameState.vibe)}%
                </span>
            </div>
            <div className="w-full h-6 bg-black border-2 border-zinc-800 p-0.5">
                <div 
                  className={`h-full transition-all duration-300 ${gameState.vibe > 70 ? 'bg-green-500' : gameState.vibe > 30 ? 'bg-yellow-400' : 'bg-red-600'}`}
                  style={{ width: `${gameState.vibe}%` }}
                ></div>
            </div>
        </div>

        <div className="flex gap-12 text-center bg-zinc-800 px-8 py-4 border-4 border-black shadow-inner">
          <div className="flex flex-col justify-center">
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">CASH EARNED</div>
            <div className="text-4xl font-mono text-white font-black tracking-tighter">€{gameState.score.toLocaleString()}</div>
          </div>
          <div className="flex flex-col justify-center">
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">STREAK</div>
            <div className="text-4xl font-mono text-pink-500 font-black">x{gameState.combo}</div>
          </div>
        </div>
      </div>

      {/* Main DJ Area */}
      <div className="flex-1 flex flex-col xl:flex-row gap-10 items-center justify-center">
        
        {/* Left Turntable */}
        <div className="flex flex-col gap-4">
            <div className="relative">
              <Turntable 
                  side="left"
                  track={leftTrack}
                  isPlaying={leftDeck.isPlaying}
                  pitch={leftDeck.pitch}
                  onPlay={() => handleDeckPlay('left')}
                  onStop={() => handleDeckStop('left')}
                  onPitchChange={(val) => setLeftDeckState(s => ({ ...s, pitch: val }))}
                  onScratch={(v) => handleScratch('left', v)}
              />
              {isFallbackL && (
                <div className="absolute top-4 right-4 bg-yellow-400 text-black text-[8px] px-1 font-bold pixel-font shadow-md border border-black animate-pulse">SYNTH FALLBACK</div>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2 bg-zinc-900 p-3 border-2 border-zinc-800 shadow-lg">
                {TRACKS.map(t => (
                    <button 
                        key={t.id} 
                        onClick={() => changeTrack('left', t)}
                        className={`aspect-square border-2 transition-all hover:scale-105 active:scale-95 ${leftTrack.id === t.id ? 'border-cyan-400 ring-2 ring-cyan-500/50' : 'border-black opacity-40'}`}
                        style={{ backgroundColor: t.color }}
                    />
                ))}
            </div>
        </div>

        {/* Mixer */}
        <Mixer 
            crossfader={crossfader}
            onCrossfaderChange={setCrossfader}
            leftEQ={{ low: leftDeck.low, mid: leftDeck.mid, high: leftDeck.high }}
            rightEQ={{ low: rightDeck.low, mid: rightDeck.mid, high: rightDeck.high }}
            onEQChange={(side, param, val) => {
                const set = side === 'left' ? setLeftDeckState : setRightDeckState;
                set(s => ({ ...s, [param]: val }));
            }}
            vuLevels={vuLevels}
        />

        {/* Right Turntable */}
        <div className="flex flex-col gap-4">
            <div className="relative">
              <Turntable 
                  side="right"
                  track={rightTrack}
                  isPlaying={rightDeck.isPlaying}
                  pitch={rightDeck.pitch}
                  onPlay={() => handleDeckPlay('right')}
                  onStop={() => handleDeckStop('right')}
                  onPitchChange={(val) => setRightDeckState(s => ({ ...s, pitch: val }))}
                  onScratch={(v) => handleScratch('right', v)}
              />
              {isFallbackR && (
                <div className="absolute top-4 right-4 bg-yellow-400 text-black text-[8px] px-1 font-bold pixel-font shadow-md border border-black animate-pulse">SYNTH FALLBACK</div>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2 bg-zinc-900 p-3 border-2 border-zinc-800 shadow-lg">
                {TRACKS.map(t => (
                    <button 
                        key={t.id} 
                        onClick={() => changeTrack('right', t)}
                        className={`aspect-square border-2 transition-all hover:scale-105 active:scale-95 ${rightTrack.id === t.id ? 'border-pink-500 ring-2 ring-pink-500/50' : 'border-black opacity-40'}`}
                        style={{ backgroundColor: t.color }}
                    />
                ))}
            </div>
        </div>
      </div>

      {/* MC AI Marquee */}
      <div className="bg-black py-4 border-y-4 border-zinc-900 relative overflow-hidden">
        <div className="flex items-center">
            <div className="px-6 bg-zinc-800 text-white font-bold pixel-font text-sm h-full flex items-center border-r-2 border-black z-10 italic">
                BUNKER_MC
            </div>
            <div className="flex-1 overflow-hidden">
                <div className="inline-block animate-[marquee_25s_linear_infinite] retro-font text-4xl text-cyan-400 uppercase tracking-widest whitespace-nowrap">
                    {gameState.message} &nbsp; • &nbsp; GET DOWN IN THE BUNKER &nbsp; • &nbsp; {gameState.message} &nbsp; • &nbsp; 90s TECHNO RULES &nbsp; • &nbsp;
                </div>
            </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-zinc-900/30 border-t-2 border-zinc-800 rounded-b-xl">
        <div className="border-l-2 border-cyan-400 pl-4">
            <h4 className="text-white font-bold text-[10px] pixel-font">SYNCHRO</h4>
            <p className="text-[10px] text-zinc-500 font-mono">Ajuste le PITCH pour synchroniser les deux tracks. Si c'est sync, la Vibe explose.</p>
        </div>
        <div className="border-l-2 border-pink-500 pl-4">
            <h4 className="text-white font-bold text-[10px] pixel-font">SCRATCHING</h4>
            <p className="text-[10px] text-zinc-500 font-mono">Fais glisser le disque pour scratcher. Attention à ne pas casser le beat !</p>
        </div>
        <div className="border-l-2 border-yellow-400 pl-4">
            <h4 className="text-white font-bold text-[10px] pixel-font">TRANSITION</h4>
            <p className="text-[10px] text-zinc-500 font-mono">Garde le crossfader au centre pour un mix puissant, ou sur les côtés pour isoler.</p>
        </div>
        <div className="border-l-2 border-green-500 pl-4">
            <h4 className="text-white font-bold text-[10px] pixel-font">EQUALIZER</h4>
            <p className="text-[10px] text-zinc-500 font-mono">Mixe les fréquences (High, Mid, Low) pour éviter la saturation du bunker.</p>
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        input[type=range] {
            cursor: pointer;
            -webkit-appearance: none;
            background: transparent;
        }
        input[type=range]::-webkit-slider-thumb {
            -webkit-appearance: none;
            height: 20px;
            width: 10px;
            background: #fff;
            border: 1px solid #000;
            margin-top: -8px;
            box-shadow: 2px 2px 0px #000;
        }
        input[type=range]::-webkit-slider-runnable-track {
            height: 4px;
            background: #222;
            border: 1px solid #444;
        }
      `}</style>
    </div>
  );
};

export default App;
