
import React from 'react';
import { Home, Clock, PieChart, Settings, Smartphone } from 'lucide-react';

interface BottomNavigatorProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const BottomNavigator: React.FC<BottomNavigatorProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'files', label: 'Files', icon: Smartphone },
    { id: 'recent', label: 'Recent', icon: Clock },
    { id: 'analyze', label: 'Analyze', icon: PieChart },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom)] transition-all duration-300">
      <div className="flex items-center justify-around px-2 pt-2 pb-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative flex flex-col items-center justify-center py-1 px-3 min-w-[64px] group"
            >
              <div className={`
                p-1.5 rounded-2xl mb-1 transition-all duration-300 ease-out
                ${isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 translate-y-[-2px]' 
                  : 'text-slate-500 dark:text-slate-400 group-hover:bg-slate-100 dark:group-hover:bg-slate-800'}
              `}>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`
                text-[10px] font-medium transition-all duration-300
                ${isActive ? 'text-blue-600 dark:text-blue-400 opacity-100' : 'text-slate-500 dark:text-slate-500 opacity-80'}
              `}>
                {tab.label}
              </span>
              
              {/* Active Indicator Dot */}
              {isActive && (
                <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400 animate-in zoom-in" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavigator;
