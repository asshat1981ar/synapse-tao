import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { HomeIcon, TestTube, Zap } from "lucide-react";

export function Navigation() {
  const [location] = useLocation();

  const navItems = [
    { path: "/", label: "Dashboard", icon: HomeIcon },
    { path: "/blackbox-test", label: "BlackboxAI Test", icon: Zap },
  ];

  return (
    <nav className="fixed top-4 left-4 right-4 z-50 bg-black/70 backdrop-blur-md border border-purple-500/30 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TestTube className="h-6 w-6 text-purple-400" />
          <h1 className="text-xl font-bold text-white">Synapse AI</h1>
        </div>
        
        <div className="flex gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <Link key={item.path} href={item.path}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className={`flex items-center gap-2 ${
                    isActive 
                      ? "bg-purple-600 text-white" 
                      : "text-gray-300 hover:text-white hover:bg-purple-900/50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}