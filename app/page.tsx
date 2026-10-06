import ClawGame from '@/components/ClawGame';

export default function Home() {
  return (
    <div className="h-dvh max-h-dvh w-screen max-w-full overflow-hidden flex flex-col bg-[#08061a] text-slate-100 select-none">
      {/* Background Subtle Gradient Accents */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-indigo-600/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 -right-32 w-80 h-80 bg-pink-600/10 rounded-full blur-[100px]" />
        <div className="absolute -bottom-32 left-1/3 w-80 h-80 bg-cyan-600/10 rounded-full blur-[100px]" />
      </div>

      {/* Main Full-Height Claw Game Container */}
      <div className="relative z-10 w-full h-full flex flex-col overflow-hidden">
        <ClawGame />
      </div>
    </div>
  );
}
