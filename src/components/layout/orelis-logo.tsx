'use client';
import { Stethoscope } from 'lucide-react';

export function OrelisLogo() {
  return (
    <>
      <button
        className="relative px-0 py-0 bg-transparent border-none outline-none cursor-pointer font-headline uppercase tracking-[0.1em] flex items-center gap-2"
        style={{ fontSize: '20px', letterSpacing: '1px' }}
      >
        <Stethoscope className="h-8 w-8 text-primary" />
        <span className="relative">
          <span className="actual-text text-transparent text-stroke select-none">
            &nbsp;Orelis&nbsp;
          </span>
          <span
            aria-hidden="true"
            className="hover-text pointer-events-none absolute inset-0 w-0 overflow-hidden border-r-[3px] animate-wipe"
            style={{
              color: 'hsl(var(--primary))',
              borderColor: 'hsl(var(--primary))',
            }}
          >
            <span className="text-stroke-anim-orange text-transparent select-none">&nbsp;Orelis&nbsp;</span>
          </span>
        </span>
        <div className="particles absolute inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="particle particle-1 absolute bg-primary rounded-full" style={{ width: '1px', height: '1px', left: '20%', top: '30%' }}></div>
          <div className="particle particle-2 absolute bg-primary rounded-full" style={{ width: '1px', height: '1px', left: '50%', top: '60%' }}></div>
          <div className="particle particle-3 absolute bg-primary rounded-full" style={{ width: '1px', height: '1px', left: '70%', top: '40%' }}></div>
          <div className="particle particle-4 absolute bg-primary rounded-full" style={{ width: '1.5px', height: '1.5px', left: '30%', top: '70%' }}></div>
          <div className="particle particle-5 absolute bg-primary rounded-full" style={{ width: '0.5px', height: '0.5px', left: '80%', top: '20%' }}></div>
        </div>
      </button>
      <style jsx>{`
        .particles {
          z-index: -10;
        }
        .particle {
          opacity: 0;
        }
        button:hover .particle-1,
        button:hover .particle-2,
        button:hover .particle-3,
        button:hover .particle-4,
        button:hover .particle-5 {
           animation-name: particleMove;
           animation-duration: 1.5s;
           animation-timing-function: ease-out;
           animation-fill-mode: forwards;
        }

        button:hover .particle-1 { animation-delay: 0.2s; }
        button:hover .particle-2 { animation-delay: 0.5s; }
        button:hover .particle-3 { animation-delay: 0.8s; }
        button:hover .particle-4 { animation-delay: 1.0s; }
        button:hover .particle-5 { animation-delay: 1.2s; }

        @keyframes particleMove {
          0% {
            transform: translate(0, 0) scale(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
            transform: scale(1);
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translate(var(--dx, 0), var(--dy, 0)) scale(0.5);
            opacity: 0;
          }
        }
        .particle-1 { --dx: 15px; --dy: -8px; }
        .particle-2 { --dx: -20px; --dy: 12px; }
        .particle-3 { --dx: 10px; --dy: 18px; }
        .particle-4 { --dx: -12px; --dy: -15px; }
        .particle-5 { --dx: 25px; --dy: 5px; }
      `}</style>
    </>
  );
}
