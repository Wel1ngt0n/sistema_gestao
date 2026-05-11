import React from 'react';
import { Sparkles } from 'lucide-react';

const Jarvis: React.FC = () => {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <Sparkles size={48} className="text-orange-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold">Jarvis em Manutenção</h2>
        <p className="text-zinc-500">Estamos otimizando o sistema de histórico. Voltamos em instantes!</p>
      </div>
    </div>
  );
};

export default Jarvis;
